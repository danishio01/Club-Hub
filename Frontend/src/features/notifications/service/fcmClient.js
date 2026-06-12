import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { clearFcmTokenApi, registerFcmTokenApi } from './notificationService';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const requiredConfig = ['apiKey', 'projectId', 'messagingSenderId', 'appId'];
let messagingInstance;
let serviceWorkerRegistration;
let foregroundUnsubscribe;
let refreshTimer;
let lifecycleHandlersAttached = false;
let currentToken = localStorage.getItem('clubhub:fcm-token') || '';
let notificationAudioContext;
let soundUnlocked = false;

const log = (message, details) => {
    if (details === undefined) console.info(`[FCM] ${message}`);
    else console.info(`[FCM] ${message}`, details);
};

const hasValidConfig = () => requiredConfig.every((key) => firebaseConfig[key]) && vapidKey;

export const unlockNotificationSound = async () => {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return false;
        notificationAudioContext ||= new AudioContextClass();
        if (notificationAudioContext.state === 'suspended') {
            await Promise.race([
                notificationAudioContext.resume(),
                new Promise((resolve) => window.setTimeout(resolve, 1000))
            ]);
        }

        if (notificationAudioContext.state !== 'running') {
            console.warn('[FCM] AudioContext remains suspended. Check browser autoplay/sound permissions.');
            return false;
        }
        const buffer = notificationAudioContext.createBuffer(1, 1, 22050);
        const source = notificationAudioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(notificationAudioContext.destination);
        source.start(0);
        soundUnlocked = notificationAudioContext.state === 'running';
        localStorage.setItem('clubhub:notification-sound-enabled', String(soundUnlocked));
        log('Foreground notification sound unlocked', { state: notificationAudioContext.state });
        return soundUnlocked;
    } catch (error) {
        console.warn('[FCM] Foreground sound could not be unlocked.', error);
        return false;
    }
};

export const playNotificationSound = async () => {
    try {
        if (!notificationAudioContext || notificationAudioContext.state !== 'running') {
            soundUnlocked = await unlockNotificationSound();
        }
        if (!soundUnlocked || notificationAudioContext.state !== 'running') {
            console.warn('[FCM] Foreground notification sound is blocked until the user clicks Enable notifications or Test sound.');
            return false;
        }

        const oscillator = notificationAudioContext.createOscillator();
        const gain = notificationAudioContext.createGain();
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.14, notificationAudioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, notificationAudioContext.currentTime + 0.32);
        oscillator.connect(gain);
        gain.connect(notificationAudioContext.destination);
        oscillator.start();
        oscillator.stop(notificationAudioContext.currentTime + 0.32);
        log('Foreground notification sound played');
        return true;
    } catch (error) {
        console.warn('[FCM] Foreground sound could not play.', error);
        return false;
    }
};

const getWorkerRegistration = async () => {
    if (serviceWorkerRegistration) return serviceWorkerRegistration;

    const configQuery = new URLSearchParams(
        Object.fromEntries(Object.entries(firebaseConfig).filter(([, value]) => Boolean(value)))
    );
    serviceWorkerRegistration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?${configQuery.toString()}`
    );
    await navigator.serviceWorker.ready;
    await serviceWorkerRegistration.update();
    log('Service worker registered', { scope: serviceWorkerRegistration.scope });
    return serviceWorkerRegistration;
};

const getMessagingInstance = async () => {
    if (messagingInstance) return messagingInstance;
    if (!hasValidConfig()) {
        console.error('[FCM] Push is not configured. Set all VITE_FIREBASE_* values, including VITE_FIREBASE_VAPID_KEY.');
        return null;
    }
    if (!await isSupported()) {
        console.warn('[FCM] Firebase Messaging is not supported in this browser.');
        return null;
    }

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    messagingInstance = getMessaging(app);
    log('Firebase Messaging initialized', { projectId: firebaseConfig.projectId });
    return messagingInstance;
};

export const syncFcmToken = async () => {
    if (Notification.permission !== 'granted') return null;

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    try {
        const registration = await getWorkerRegistration();
        const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: registration
        });

        if (!token) {
            console.warn('[FCM] Firebase returned no registration token.');
            return null;
        }

        await registerFcmTokenApi(token);
        currentToken = token;
        localStorage.setItem('clubhub:fcm-token', token);
        log('Token registered with ClubHub backend', { suffix: token.slice(-12) });
        return token;
    } catch (error) {
        console.error('[FCM] Token generation or registration failed', error);
        return null;
    }
};

export const requestAndRegisterPushNotifications = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.warn('[FCM] Notifications or service workers are unavailable.');
        return 'unsupported';
    }

    await unlockNotificationSound();
    const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
    log('Notification permission result', permission);
    if (permission === 'granted') await syncFcmToken();
    return permission;
};

export const initializePushNotifications = async (onForegroundMessage) => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return () => {};
    const messaging = await getMessagingInstance();
    if (!messaging) return () => {};

    await getWorkerRegistration();
    if (Notification.permission === 'granted') await syncFcmToken();

    foregroundUnsubscribe?.();
    foregroundUnsubscribe = onMessage(messaging, (payload) => {
        log('Foreground message received', payload);
        playNotificationSound();
        onForegroundMessage?.(payload);

        const title = payload.notification?.title || payload.data?.title || 'ClubHub Notification';
        const body = payload.notification?.body || payload.data?.body || 'A new update is available.';
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body,
                icon: 'https://ik.imagekit.io/p4nbkerbz/ClubHub/applogo.png',
                tag: payload.data?.referenceId || 'clubhub-foreground',
                data: payload.data,
                silent: false
            });
            notification.onclick = () => {
                window.focus();
                if (payload.data?.url) window.location.assign(payload.data.url);
                notification.close();
            };
        }
    });

    if (!lifecycleHandlersAttached) {
        const refresh = () => {
            if (Notification.permission === 'granted') syncFcmToken();
        };
        window.addEventListener('focus', refresh);
        window.addEventListener('online', refresh);
        navigator.serviceWorker.addEventListener('controllerchange', refresh);
        refreshTimer = window.setInterval(refresh, 6 * 60 * 60 * 1000);
        lifecycleHandlersAttached = true;
    }

    if (localStorage.getItem('clubhub:notification-sound-enabled') === 'true') {
        document.addEventListener('click', unlockNotificationSound, { once: true });
    }

    return () => {
        foregroundUnsubscribe?.();
        foregroundUnsubscribe = undefined;
    };
};

export const unregisterCurrentFcmToken = async () => {
    if (!currentToken) return;
    try {
        await clearFcmTokenApi(currentToken);
        const messaging = await getMessagingInstance();
        if (messaging) await deleteToken(messaging);
        log('Token cleared during logout', { suffix: currentToken.slice(-12) });
    } catch (error) {
        console.warn('[FCM] Failed to clear token during logout', error);
    } finally {
        currentToken = '';
        localStorage.removeItem('clubhub:fcm-token');
        if (refreshTimer) window.clearInterval(refreshTimer);
    }
};
