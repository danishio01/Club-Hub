import express from 'express';
import { studentLogin, studentLogout, getMe, changeStudentPassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { rateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.post('/student/login', rateLimit({ max: 8 }), studentLogin);
router.post('/student/logout', studentLogout);
router.get('/student/me', protect, getMe);
router.patch('/student/password', protect, changeStudentPassword);

export default router;
