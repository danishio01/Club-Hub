import express from 'express';
import { handleAiChat, generateEventDetails } from '../controllers/aiController.js';
import { protect, presidentOrClubMember } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/chat', protect, presidentOrClubMember, handleAiChat);
router.post('/generate-event', protect, presidentOrClubMember, generateEventDetails);

export default router;
