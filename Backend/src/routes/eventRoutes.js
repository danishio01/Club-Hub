import express from 'express';
import { 
    createEvent, 
    getEvents, 
    getEventById, 
    updateEvent, 
    deleteEvent, 
    getStudentEvents, 
    getStudentEventById, 
    markEventCompleted 
} from '../controllers/eventController.js';
import { 
    registerForEvent, 
    getEventRegistrations, 
    generateAttendanceToken, 
    markAttendance,
    getAttendedEvents,
    getStudentAttendanceReport,
    getAdminAttendanceReport,
    submitReview, 
    getEventReviews, 
    summarizeReviews
} from '../controllers/registrationController.js';
import { getLeaderboard, resetLeaderboard } from '../controllers/leaderboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/leaderboard/rankings', getLeaderboard);
router.post('/leaderboard/reset', resetLeaderboard);

router.get('/student-events', protect, getStudentEvents);
router.get('/student-events/:id', protect, getStudentEventById);
router.get('/student/certificates', protect, getAttendedEvents);
router.get('/student/attendance-report', protect, getStudentAttendanceReport);
router.get('/admin/attendance-report', getAdminAttendanceReport);

router.post('/', createEvent);
router.get('/', getEvents);

router.get('/:eventId/registrations', getEventRegistrations);
router.get('/:eventId/qr-token', generateAttendanceToken);
router.post('/:eventId/register', protect, registerForEvent);
router.post('/:eventId/attendance', protect, markAttendance);
router.post('/:eventId/review', protect, submitReview);
router.get('/:eventId/reviews', getEventReviews);
router.post('/:eventId/reviews/summary', summarizeReviews);

router.patch('/:id/complete', markEventCompleted);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;