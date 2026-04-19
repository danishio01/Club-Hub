import express from 'express';
import { sendTestEmail } from '../controllers/emailController.js';

const router = express.Router();

router.post('/send', sendTestEmail);

export default router;