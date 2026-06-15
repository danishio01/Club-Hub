import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getTasks, assignTask, takeOverTask, updateTaskSchedule, updateTaskStatus, completeTask, submitTask, reviewTask } from '../controllers/taskController.js';

const router = express.Router();
router.get('/', protect, getTasks);
router.patch('/:id/assign', protect, assignTask);
router.patch('/:id/take-over', protect, takeOverTask);
router.patch('/:id/schedule', protect, updateTaskSchedule);
router.patch('/:id/status', protect, updateTaskStatus);
router.patch('/:id/complete', protect, completeTask);
router.patch('/:id/submit', protect, submitTask);
router.patch('/:id/review', protect, reviewTask);
export default router;
