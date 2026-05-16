import express from 'express';
import { handleAiChat } from '../controllers/aiController.js';
import { protect, presidentOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/chat', protect, presidentOnly, handleAiChat);

export default router;