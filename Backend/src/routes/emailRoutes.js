import express from 'express';
import { sendTestEmail } from '../controllers/emailController.js';
import { adminOnly, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/send', protect, adminOnly, sendTestEmail);

export default router;
