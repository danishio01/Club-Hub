import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { registerToken, clearToken, getMyNotifications, markRead, markAllRead, sendTestNotification, sendFirebaseOnlyTest, sendCurrentBrowserTokenTest, getPushStatus } from '../controllers/notificationController.js';

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications);
router.get('/status', getPushStatus);
router.post('/token/register', registerToken);
router.post('/token/clear', clearToken);
router.post('/test', sendTestNotification);
router.post('/test-push', sendFirebaseOnlyTest);
router.post('/test-current-browser-token', sendCurrentBrowserTokenTest);
router.patch('/read-all', markAllRead);
router.patch('/:notificationId/read', markRead);

export default router;
