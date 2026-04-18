import express from 'express';
import { studentLogin, studentLogout, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/student/login', studentLogin);
router.post('/student/logout', studentLogout);
router.get('/student/me', protect, getMe);

export default router;