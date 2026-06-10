import express from 'express';
import { 
    getEventFeedbackTemplate, 
    submitStudentFeedback, 
    getFeedbackAnalytics, 
    generateFeedbackSummary 
} from '../controllers/feedbackController.js';
import { protect, presidentClubMemberOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/student/template/:eventId', protect, getEventFeedbackTemplate);
router.post('/student/submit/:eventId', protect, submitStudentFeedback);

router.get('/analytics/:eventId', protect, presidentClubMemberOrAdmin, getFeedbackAnalytics);
router.post('/analytics/:eventId/summary', protect, presidentClubMemberOrAdmin, generateFeedbackSummary);

export default router;