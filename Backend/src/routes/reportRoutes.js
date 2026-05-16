import express from 'express';
import { getReportByEvent, saveDraft, submitReport, getAllReportsAdmin, reviewReportAdmin } from '../controllers/reportController.js';
import { protect, presidentOnly, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/event/:eventId', protect, presidentOnly, getReportByEvent);
router.put('/event/:eventId/draft', protect, presidentOnly, saveDraft);
router.post('/event/:eventId/submit', protect, presidentOnly, submitReport);

router.get('/admin/all', protect, adminOnly, getAllReportsAdmin);
router.patch('/admin/:reportId/review', protect, adminOnly, reviewReportAdmin);

export default router;