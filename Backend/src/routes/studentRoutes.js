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

const router = express.Router();

router.post('/', createStudent);
router.post('/bulk', createManyStudents);
router.get('/', getStudents);

router.put('/bulk-update', bulkUpdateStudents);
router.put('/:id', updateStudent);
router.put('/:id/interests', updateStudentInterests);

router.delete('/:id', deleteStudent);

export default router;