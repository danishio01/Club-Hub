import express from 'express';
import { getDashboardStats, getPresidentDashboardStats } from '../controllers/dashboardController.js';
import { adminOnly, protect, presidentOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, adminOnly, getDashboardStats);
router.get('/president-stats', protect, presidentOnly, getPresidentDashboardStats);

export default router;
