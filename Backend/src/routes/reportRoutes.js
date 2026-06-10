import express from 'express';
import { getReportByEvent, saveDraft, submitReport, getAllReportsAdmin, reviewReportAdmin } from '../controllers/reportController.js';
import { protect, presidentOrClubMember, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/event/:eventId', protect, presidentOrClubMember, getReportByEvent);
router.put('/event/:eventId/draft', protect, presidentOrClubMember, saveDraft);
router.post('/event/:eventId/submit', protect, presidentOrClubMember, submitReport);

router.get('/admin/all', protect, adminOnly, getAllReportsAdmin);
router.patch('/admin/:reportId/review', protect, adminOnly, reviewReportAdmin);

export default router;