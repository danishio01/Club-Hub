import express from 'express';
import { createEvent, getEvents, updateEvent, deleteEvent } from '../controllers/eventController.js';
import { registerForEvent } from '../controllers/registrationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', createEvent);
router.get('/', getEvents);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

router.post('/:eventId/register', protect, registerForEvent);

export default router;