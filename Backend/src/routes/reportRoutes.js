import express from 'express';
import { getReportByEvent, saveDraft, submitReport, getAllReportsAdmin, reviewReportAdmin, rejectReportAdmin } from '../controllers/reportController.js';
import { protect, presidentOrClubMember, staffOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/event/:eventId', protect, presidentOrClubMember, getReportByEvent);
router.put('/event/:eventId/draft', protect, presidentOrClubMember, saveDraft);
router.post('/event/:eventId/submit', protect, presidentOrClubMember, submitReport);

router.get('/admin/all', protect, staffOnly, getAllReportsAdmin);
router.patch('/admin/:reportId/review', protect, staffOnly, reviewReportAdmin);
router.patch('/admin/:reportId/reject', protect, staffOnly, rejectReportAdmin);

export default router;
