import express from 'express';
import { getDashboardStats, getPresidentDashboardStats } from '../controllers/dashboardController.js';
import { staffOnly, protect, presidentOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, staffOnly, getDashboardStats);
router.get('/president-stats', protect, presidentOnly, getPresidentDashboardStats);

export default router;
