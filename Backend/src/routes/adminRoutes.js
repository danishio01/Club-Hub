import express from 'express';
import { loginAdmin, checkAdminAuth, logoutAdmin } from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);
router.get('/me', protect, adminOnly, checkAdminAuth);

export default router;