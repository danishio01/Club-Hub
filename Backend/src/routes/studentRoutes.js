import express from 'express';
import { 
    createStudent, 
    createManyStudents, 
    getStudents, 
    updateStudent, 
    deleteStudent 
} from '../controllers/studentController.js';

const router = express.Router();

router.post('/', createStudent);
router.post('/bulk', createManyStudents);
router.get('/', getStudents);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

export default router;