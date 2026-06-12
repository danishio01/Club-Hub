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
const firebaseEnvFields = {
    VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
    VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
    VITE_FIREBASE_APP_ID: firebaseConfig.appId,
    VITE_FIREBASE_VAPID_KEY: vapidKey
};
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

const validatePushConfiguration = () => {
    const issues = [];
    Object.entries(firebaseEnvFields).forEach(([key, value]) => {
        if (!value) issues.push(`${key} is missing.`);
    });

    if (firebaseConfig.apiKey && !/^AIza[A-Za-z0-9_-]{30,}$/.test(firebaseConfig.apiKey)) {
        issues.push('VITE_FIREBASE_API_KEY has an invalid Firebase API key format.');
    }
    if (firebaseConfig.authDomain && !firebaseConfig.authDomain.includes('.')) {
        issues.push('VITE_FIREBASE_AUTH_DOMAIN has an invalid domain format.');
    }
    if (firebaseConfig.messagingSenderId && !/^\d{10,15}$/.test(firebaseConfig.messagingSenderId)) {
        issues.push('VITE_FIREBASE_MESSAGING_SENDER_ID must be a 10-15 digit sender ID.');
    }
    if (firebaseConfig.appId && !/^1:\d+:web:[A-Za-z0-9]+$/.test(firebaseConfig.appId)) {
        issues.push('VITE_FIREBASE_APP_ID is invalid. Expected a value like 1:123456789:web:abc123.');
    }
    if (firebaseConfig.appId && firebaseConfig.appId === firebaseConfig.messagingSenderId) {
        issues.push('VITE_FIREBASE_APP_ID incorrectly contains the messaging sender ID.');
    }
    if (vapidKey && /^1:\d+:web:/.test(vapidKey)) {
        issues.push('VITE_FIREBASE_VAPID_KEY incorrectly contains a Firebase app ID.');
    } else if (vapidKey && (vapidKey.length < 80 || !/^[A-Za-z0-9_-]+$/.test(vapidKey))) {
        issues.push(`VITE_FIREBASE_VAPID_KEY is invalid. Expected an 80-90 character URL-safe Web Push public key; received length ${vapidKey.length}.`);
    }

    return {
        valid: issues.length === 0,
        firebaseConfigured: Boolean(
            firebaseConfig.apiKey
            && firebaseConfig.authDomain
            && firebaseConfig.projectId
            && firebaseConfig.storageBucket
            && firebaseConfig.messagingSenderId
            && firebaseConfig.appId
        ),
        vapidKeyValid: Boolean(vapidKey && vapidKey.length >= 80 && /^[A-Za-z0-9_-]+$/.test(vapidKey)),
        issues,
        fields: Object.fromEntries(
            Object.entries(firebaseEnvFields).map(([key, value]) => [key, {
                present: Boolean(value),
                length: value?.length || 0
            }])
        )
    };
};

export const getPushConfigurationStatus = validatePushConfiguration;

const logConfiguration = () => {
    const status = validatePushConfiguration();
    console.info('[FCM] Firebase env validation', status.fields);
    status.issues.forEach((issue) => console.error(`[FCM] Configuration issue: ${issue}`));
    return status;
};

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
    const configuration = logConfiguration();
    if (!configuration.firebaseConfigured) {
        console.error('[FCM] Firebase initialization failed because required VITE_FIREBASE_* configuration is missing or invalid.');
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
    if (Notification.permission !== 'granted') {
        console.warn('[FCM] Token sync skipped because notification permission is not granted.', {
            permission: Notification.permission
        });
        return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return null;
    const configuration = validatePushConfiguration();
    if (!configuration.valid) {
        console.error('[FCM] Token generation skipped because Firebase configuration is invalid.', {
            issues: configuration.issues
        });
        return null;
    }

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

        log('FCM token generated', {
            present: true,
            prefix: token.slice(0, 6),
            suffix: token.slice(-6),
            length: token.length
        });
        await registerFcmTokenApi(token);
        currentToken = token;
        localStorage.setItem('clubhub:fcm-token', token);
        log('Token registered with ClubHub backend', { suffix: token.slice(-12) });
        return token;
    } catch (error) {
        console.error('[FCM] Token generation or registration failed', {
            code: error?.code || 'unknown',
            message: error?.message || String(error)
        });
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
        onForegroundMessage?.(payload);
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
