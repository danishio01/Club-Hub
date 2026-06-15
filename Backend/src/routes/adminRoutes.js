import express from 'express';
import {
    loginAdmin, checkAdminAuth, logoutAdmin, listFacultyCoordinators,
    createFacultyCoordinator, updateFacultyCoordinator, resetFacultyPassword, changeStaffPassword, deleteFacultyCoordinator
} from '../controllers/adminController.js';
import { protect, staffOnly, hodOnly } from '../middleware/authMiddleware.js';
import { rateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.post('/login', rateLimit({ max: 8 }), loginAdmin);
router.post('/logout', logoutAdmin);
router.get('/me', protect, staffOnly, checkAdminAuth);
router.patch('/password', protect, staffOnly, changeStaffPassword);
router.get('/faculty-coordinators', protect, hodOnly, listFacultyCoordinators);
router.post('/faculty-coordinators', protect, hodOnly, createFacultyCoordinator);
router.patch('/faculty-coordinators/:id', protect, hodOnly, updateFacultyCoordinator);
router.patch('/faculty-coordinators/:id/password', protect, hodOnly, resetFacultyPassword);
router.delete('/faculty-coordinators/:id', protect, hodOnly, deleteFacultyCoordinator);

export default router;
