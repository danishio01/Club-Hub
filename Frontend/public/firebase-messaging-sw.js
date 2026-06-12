/* global importScripts, firebase, clients */
const serviceWorkerVersion = '2026-06-12T20-30-fcm-diagnostics';
const diagnosticCacheName = 'clubhub-fcm-diagnostics';
const diagnosticCacheKey = '/__clubhub-fcm-diagnostics__';
console.info('[FCM SW] Loaded version', serviceWorkerVersion);

const broadcastDiagnostic = async (detail) => {
    const cache = await caches.open(diagnosticCacheName);
    const previousResponse = await cache.match(diagnosticCacheKey);
    const previous = previousResponse ? await previousResponse.json() : {};
    await cache.put(diagnosticCacheKey, new Response(JSON.stringify({
        ...previous,
        ...detail,
        serviceWorkerVersion
    }), { headers: { 'Content-Type': 'application/json' } }));
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    windowClients.forEach((client) => client.postMessage({
        type: 'clubhub:fcm-diagnostic',
        serviceWorkerVersion,
        ...detail
    }));
};

// Extract runtime environment credentials passed dynamically from the frontend layer registration URL
const urlParams = new URL(self.location.href).searchParams;
const apiKey = urlParams.get('apiKey');
const authDomain = urlParams.get('authDomain');
const projectId = urlParams.get('projectId');
const storageBucket = urlParams.get('storageBucket');
const messagingSenderId = urlParams.get('messagingSenderId');
const appId = urlParams.get('appId');

console.info('[FCM SW] Configuration loaded', {
    projectId: projectId || 'missing',
    messagingSenderIdPresent: Boolean(messagingSenderId),
    appIdPresent: Boolean(appId)
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

if (apiKey && messagingSenderId) {
    importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

    firebase.initializeApp({
        apiKey: apiKey,
        authDomain: authDomain,
        projectId: projectId,
        storageBucket: storageBucket,
        messagingSenderId: messagingSenderId,
        appId: appId
    });

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(async (payload) => {
        console.info('[FCM SW] Background message received', payload);
        const receivedAt = new Date().toISOString();
        await broadcastDiagnostic({ lastBackgroundReceivedTime: receivedAt });
        if (payload.notification) {
            console.info('[FCM SW] Background notification display handled by Firebase notification payload', {
                title: payload.notification.title,
                type: payload.data?.type,
                referenceId: payload.data?.referenceId
            });
            return broadcastDiagnostic({
                lastBackgroundReceivedTime: receivedAt,
                lastSystemNotificationDisplayedTime: new Date().toISOString()
            });
        }
        
        const notificationTitle = payload.notification?.title || payload.data?.title || "ClubHub Notification";
        const notificationOptions = {
            body: payload.notification?.body || payload.data?.body || "New real-time campus activity update available.",
            icon: 'https://ik.imagekit.io/p4nbkerbz/ClubHub/applogo.png',
            badge: 'https://ik.imagekit.io/p4nbkerbz/ClubHub/applogo.png',
            data: payload.data,
            tag: payload.data?.referenceId || 'clubhub-background',
            renotify: true,
            silent: false,
            vibrate: [180, 80, 180],
            timestamp: Date.now()
        };

        return self.registration.showNotification(notificationTitle, notificationOptions).then(() => {
            console.info('[FCM SW] Background notification displayed', {
                title: notificationTitle,
                type: payload.data?.type,
                referenceId: payload.data?.referenceId
            });
            return broadcastDiagnostic({
                lastBackgroundReceivedTime: receivedAt,
                lastSystemNotificationDisplayedTime: new Date().toISOString()
            });
        });
    });
} else {
    console.warn('[FCM SW] Firebase initialization skipped because configuration is incomplete.');
}

self.addEventListener('notificationclick', (event) => {
    console.info('[FCM SW] Notification clicked', event.notification.data);
    event.notification.close();
    const notificationData = event.notification.data?.FCM_MSG?.data || event.notification.data || {};
    const targetUrl = new URL(notificationData.url || '/', self.location.origin).href;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            const existingClient = windowClients.find((client) => client.url.startsWith(self.location.origin));
            if (existingClient) {
                existingClient.focus();
                const resolvedUrl = existingClient.url.includes('/admin/')
                    ? new URL('/admin/dashboard', self.location.origin).href
                    : targetUrl;
                return existingClient.navigate(resolvedUrl);
            }
            return clients.openWindow(targetUrl);
        })
    );
});
