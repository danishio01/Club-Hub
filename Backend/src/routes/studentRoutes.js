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
import { facultyOnly, protect, selfOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, facultyOnly, createStudent);
router.post('/bulk', protect, facultyOnly, createManyStudents);
router.get('/', protect, facultyOnly, getStudents);

router.put('/bulk-update', protect, facultyOnly, bulkUpdateStudents);
router.put('/:id', protect, facultyOnly, updateStudent);
router.put('/:id/interests', protect, selfOrAdmin, updateStudentInterests);

router.delete('/:id', protect, facultyOnly, deleteStudent);

export default router;
