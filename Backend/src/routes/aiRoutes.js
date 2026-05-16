import express from 'express';
import { handleAiChat, generateEventDetails } from '../controllers/aiController.js';
import { protect, presidentOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/chat', protect, presidentOnly, handleAiChat);
router.post('/generate-event', protect, presidentOnly, generateEventDetails);

export default router;