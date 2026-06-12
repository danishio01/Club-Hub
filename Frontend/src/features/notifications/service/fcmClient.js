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
let runtimeStatus = { stage: 'initializing', message: 'Firebase push is initializing.' };
let currentIdentity = {};
const serviceWorkerVersion = '2026-06-12T20-30-fcm-diagnostics';
const diagnosticKeys = {
    lastTokenSavedTime: 'clubhub:fcm-last-token-saved-at',
    lastForegroundReceivedTime: 'clubhub:fcm-last-foreground-received-at',
    lastBackgroundReceivedTime: 'clubhub:fcm-last-background-received-at',
    lastSystemNotificationDisplayedTime: 'clubhub:fcm-last-system-notification-displayed-at'
};

const emitDiagnosticsChanged = () => {
    window.dispatchEvent(new CustomEvent('clubhub:push-diagnostics-changed'));
};

const recordDiagnosticTime = (key, value = new Date().toISOString()) => {
    localStorage.setItem(diagnosticKeys[key], value);
    emitDiagnosticsChanged();
};

const getOrCreateDeviceId = () => {
    let deviceId = localStorage.getItem('clubhub:fcm-device-id');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('clubhub:fcm-device-id', deviceId);
    }
    return deviceId;
};

const updateRuntimeStatus = (stage, message, details = {}) => {
    runtimeStatus = { stage, message, ...details };
    window.dispatchEvent(new CustomEvent('clubhub:push-status', { detail: runtimeStatus }));
    console.info('[FCM] Runtime status', { stage, message });
};

export const getPushRuntimeStatus = () => runtimeStatus;
export const setFcmClientIdentity = (identity = {}) => {
    currentIdentity = {
        userId: identity.userId ? String(identity.userId) : undefined,
        role: identity.role
    };
    console.info('[FCM FRONTEND] Current logged-in userId', currentIdentity.userId);
    console.info('[FCM FRONTEND] Current role', currentIdentity.role);
    console.info('[FCM FRONTEND] Current deviceId', getOrCreateDeviceId());
    log('Current frontend identity set for token registration', currentIdentity);
    emitDiagnosticsChanged();
};

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
        `/firebase-messaging-sw.js?${configQuery.toString()}&swVersion=${encodeURIComponent(serviceWorkerVersion)}`
    );
    await navigator.serviceWorker.ready;
    await serviceWorkerRegistration.update();
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.info('[FCM FRONTEND] Service workers', registrations.map((entry) => entry.active?.scriptURL));
    console.info('[FCM FRONTEND] Service worker active', {
        active: Boolean(serviceWorkerRegistration.active),
        scriptURL: serviceWorkerRegistration.active?.scriptURL
    });
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

export const syncFcmToken = async (allowStaleTokenRotation = true) => {
    if (Notification.permission !== 'granted') {
        updateRuntimeStatus(
            Notification.permission === 'denied' ? 'permission-blocked' : 'permission-pending',
            Notification.permission === 'denied'
                ? `Notifications are blocked for ${window.location.host}.`
                : 'Allow browser notifications to connect Firebase push.'
        );
        console.warn('[FCM] Token sync skipped because notification permission is not granted.', {
            permission: Notification.permission
        });
        return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return null;
    const configuration = validatePushConfiguration();
    if (!configuration.valid) {
        updateRuntimeStatus('configuration-invalid', configuration.issues[0]);
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
            updateRuntimeStatus('token-generation-failed', 'Firebase returned no registration token.');
            console.warn('[FCM] Firebase returned no registration token.');
            return null;
        }

        log('FCM token generated', {
            present: true,
            prefix: token.slice(0, 6),
            suffix: token.slice(-6),
            length: token.length
        });
        console.info('[FCM FRONTEND] Current token suffix', token.slice(-12));
        updateRuntimeStatus('token-generated', 'FCM token generated. Saving it to ClubHub.');
        await registerFcmTokenApi(token, currentIdentity);
        currentToken = token;
        localStorage.setItem('clubhub:fcm-token', token);
        recordDiagnosticTime('lastTokenSavedTime');
        log('Token registered with ClubHub backend', { suffix: token.slice(-12) });
        updateRuntimeStatus('connected', 'Firebase push is connected.');
        return token;
    } catch (error) {
        if (allowStaleTokenRotation && error?.response?.data?.code === 'INVALID_FCM_TOKEN') {
            console.warn('[FCM] Backend rejected a stale browser token. Rotating it once.');
            await deleteToken(messaging);
            currentToken = '';
            localStorage.removeItem('clubhub:fcm-token');
            return syncFcmToken(false);
        }
        updateRuntimeStatus(
            error?.response ? 'token-save-failed' : 'token-generation-failed',
            error?.response?.data?.message || error?.message || 'Firebase token setup failed.'
        );
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
    console.info(`[FCM FRONTEND] Permission ${permission}`);
    if (permission !== 'granted') {
        updateRuntimeStatus(
            permission === 'denied' ? 'permission-blocked' : 'permission-pending',
            permission === 'denied'
                ? `Notifications are blocked for ${window.location.host}.`
                : 'Notification permission has not been granted.'
        );
    }
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
        console.info('[FCM FOREGROUND] Message received', payload);
        recordDiagnosticTime('lastForegroundReceivedTime');
        onForegroundMessage?.(payload);
    });

    if (!lifecycleHandlersAttached) {
        const refresh = () => {
            if (Notification.permission === 'granted') syncFcmToken();
        };
        window.addEventListener('focus', refresh);
        window.addEventListener('online', refresh);
        navigator.serviceWorker.addEventListener('controllerchange', refresh);
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type !== 'clubhub:fcm-diagnostic') return;
            if (event.data.lastBackgroundReceivedTime) {
                recordDiagnosticTime('lastBackgroundReceivedTime', event.data.lastBackgroundReceivedTime);
            }
            if (event.data.lastSystemNotificationDisplayedTime) {
                recordDiagnosticTime('lastSystemNotificationDisplayedTime', event.data.lastSystemNotificationDisplayedTime);
            }
        });
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

export const recordSystemNotificationDisplayed = () => {
    recordDiagnosticTime('lastSystemNotificationDisplayedTime');
};

export const getCurrentBrowserPushDiagnostics = async () => {
    const registrations = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistrations() : [];
    const firebaseWorkers = registrations.filter((entry) =>
        entry.active?.scriptURL?.includes('/firebase-messaging-sw.js')
    );
    let serviceWorkerDiagnostics = {};
    if ('caches' in window) {
        const cache = await caches.open('clubhub-fcm-diagnostics');
        const response = await cache.match('/__clubhub-fcm-diagnostics__');
        if (response) serviceWorkerDiagnostics = await response.json();
    }
    return {
        notificationSupported: 'Notification' in window,
        notificationPermission: 'Notification' in window ? Notification.permission : 'unsupported',
        secureContext: window.isSecureContext,
        serviceWorkerSupported: 'serviceWorker' in navigator,
        serviceWorkerActive: firebaseWorkers.length > 0,
        serviceWorkerScript: firebaseWorkers[0]?.active?.scriptURL || '',
        serviceWorkerCount: firebaseWorkers.length,
        tokenGenerated: Boolean(currentToken),
        tokenSuffix: currentToken?.slice(-12) || '',
        deviceId: getOrCreateDeviceId(),
        userId: currentIdentity.userId || '',
        role: currentIdentity.role || '',
        lastTokenSavedTime: localStorage.getItem(diagnosticKeys.lastTokenSavedTime) || '',
        lastForegroundReceivedTime: localStorage.getItem(diagnosticKeys.lastForegroundReceivedTime) || '',
        lastBackgroundReceivedTime: serviceWorkerDiagnostics.lastBackgroundReceivedTime
            || localStorage.getItem(diagnosticKeys.lastBackgroundReceivedTime)
            || '',
        lastSystemNotificationDisplayedTime: serviceWorkerDiagnostics.lastSystemNotificationDisplayedTime
            || localStorage.getItem(diagnosticKeys.lastSystemNotificationDisplayedTime)
            || ''
    };
};

export const getCurrentBrowserTokenIdentity = () => ({
    token: currentToken,
    tokenSuffix: currentToken?.slice(-12) || '',
    userId: currentIdentity.userId,
    role: currentIdentity.role,
    deviceId: getOrCreateDeviceId()
});

export const showSystemNotification = ({
    title,
    body,
    data = {},
    tag = `clubhub-notification-${Date.now()}`,
    targetUrl = data.url || '/'
}) => {
    if (!('Notification' in window)) throw new Error('This browser does not support system notifications.');
    if (Notification.permission !== 'granted') throw new Error(`Notification permission is ${Notification.permission}.`);
    const notification = new Notification(title || 'ClubHub Notification', {
        body: body || 'A new ClubHub update is available.',
        icon: 'https://ik.imagekit.io/p4nbkerbz/ClubHub/applogo.png',
        data,
        tag,
        silent: false
    });
    notification.onclick = () => {
        window.focus();
        window.location.assign(targetUrl);
        notification.close();
    };
    recordSystemNotificationDisplayed();
    console.info('[SYSTEM NOTIFICATION] Displayed', {
        title,
        type: data.type,
        referenceId: data.referenceId,
        tag
    });
    return notification;
};

export const showLocalSystemNotificationTest = () => showSystemNotification({
    title: 'ClubHub local notification test',
    body: 'If you see this, Chrome and Windows notification visibility is working.',
    tag: `clubhub-local-test-${Date.now()}`
});

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
