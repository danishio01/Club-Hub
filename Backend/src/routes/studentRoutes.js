import express from 'express';
import { 
    createStudent, 
    createManyStudents, 
    getStudents, 
    updateStudent, 
    bulkUpdateStudents,
    deleteStudent,
    updateStudentInterests
} from '../controllers/studentController.js';
import { adminOnly, protect, selfOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, adminOnly, createStudent);
router.post('/bulk', protect, adminOnly, createManyStudents);
router.get('/', protect, adminOnly, getStudents);

router.put('/bulk-update', protect, adminOnly, bulkUpdateStudents);
router.put('/:id', protect, adminOnly, updateStudent);
router.put('/:id/interests', protect, selfOrAdmin, updateStudentInterests);

router.delete('/:id', protect, adminOnly, deleteStudent);

export default router;
