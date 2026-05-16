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
import { protect, presidentOnly, prOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/leaderboard/rankings', getLeaderboard);
router.post('/leaderboard/reset', resetLeaderboard);

router.get('/student-events', protect, getStudentEvents);
router.get('/student-events/:id', protect, getStudentEventById);
router.get('/student/certificates', protect, getAttendedEvents);
router.get('/student/attendance-report', protect, getStudentAttendanceReport);
router.get('/admin/attendance-report', getAdminAttendanceReport);

// Event Management (President Only)
router.post('/', protect, presidentOnly, createEvent);
router.patch('/:id/complete', protect, presidentOnly, markEventCompleted);
router.put('/:id', protect, presidentOnly, updateEvent);
router.delete('/:id', protect, presidentOnly, deleteEvent);
router.post('/:eventId/reviews/summary', protect, presidentOnly, summarizeReviews);

router.get('/', getEvents);
router.get('/:id', getEventById);

// Attendance Management (PR Only)
router.get('/:eventId/registrations', protect, prOnly, getEventRegistrations);
router.get('/:eventId/qr-token', protect, prOnly, generateAttendanceToken);

// Student Actions
router.post('/:eventId/register', protect, registerForEvent);
router.post('/:eventId/attendance', protect, markAttendance);
router.post('/:eventId/review', protect, submitReview);
router.get('/:eventId/reviews', getEventReviews);

export default router;