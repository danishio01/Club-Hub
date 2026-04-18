import express from 'express';
import { createEvent, getEvents, updateEvent, deleteEvent, getStudentEvents } from '../controllers/eventController.js';
import { registerForEvent, getEventRegistrations } from '../controllers/registrationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', createEvent);
router.get('/', getEvents);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.get('/:eventId/registrations', getEventRegistrations);

router.get('/student-events', protect, getStudentEvents);
router.post('/:eventId/register', protect, registerForEvent);

export default router;