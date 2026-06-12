/* global importScripts, firebase, clients */

// Extract runtime environment credentials passed dynamically from the frontend layer registration URL
const urlParams = new URL(self.location.href).searchParams;
const apiKey = urlParams.get('apiKey');
const authDomain = urlParams.get('authDomain');
const projectId = urlParams.get('projectId');
const storageBucket = urlParams.get('storageBucket');
const messagingSenderId = urlParams.get('messagingSenderId');
const appId = urlParams.get('appId');

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

    messaging.onBackgroundMessage((payload) => {
        console.log('[FCM SW] Background message received.', payload);
        
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

        return self.registration.showNotification(notificationTitle, notificationOptions);
    });
} else {
    console.warn('[FCM SW] Firebase initialization skipped because configuration is incomplete.');
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            const existingClient = windowClients.find((client) => client.url.startsWith(self.location.origin));
            if (existingClient) {
                existingClient.focus();
                return existingClient.navigate(targetUrl);
            }
            return clients.openWindow(targetUrl);
        })
    );
});
