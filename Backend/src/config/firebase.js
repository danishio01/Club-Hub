import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import dotenv from 'dotenv';

dotenv.config();

let firebaseApp = null;
let messagingInstance = null;

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
        firebaseApp = initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
        messagingInstance = getMessaging(firebaseApp);
        console.log('Firebase Admin SDK initialized successfully using modular architecture.');
    } catch (error) {
        console.error('Firebase Admin initialization error:', error);
    }
} else {
    console.warn('Firebase environment variables missing. Push notification deliveries will fall back to db-only modes.');
}

export const messaging = messagingInstance;
export default firebaseApp;