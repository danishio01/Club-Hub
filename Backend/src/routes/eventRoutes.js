import express from 'express';
import { 
    createEvent, 
    getEvents, 
    getEventById, 
    updateEvent, 
    deleteEvent, 
    getStudentEvents, 
    getStudentEventById, 
    markEventCompleted,
    getPresidentEvents,
    approveEvent,
    rejectEvent,
    getGrafikEvents,
    getGrafikEventById,
    generateEventBanner,
    uploadCustomEventBanner,
    approveEventBanner
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
import { protect, presidentOnly, prOnly, adminOnly, presidentOrAdmin, grafikOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/leaderboard/rankings', getLeaderboard);
router.post('/leaderboard/reset', resetLeaderboard);

router.get('/student-events', protect, getStudentEvents);
router.get('/student-events/:id', protect, getStudentEventById);
router.get('/student/certificates', protect, getAttendedEvents);
router.get('/student/attendance-report', protect, getStudentAttendanceReport);
router.get('/admin/attendance-report', getAdminAttendanceReport);

router.get('/president/all', protect, presidentOnly, getPresidentEvents);
router.post('/', protect, presidentOnly, createEvent);
router.patch('/:id/complete', protect, presidentOnly, markEventCompleted);
router.put('/:id', protect, presidentOnly, updateEvent);
router.delete('/:id', protect, presidentOnly, deleteEvent);

router.post('/:eventId/reviews/summary', protect, presidentOrAdmin, summarizeReviews);

router.patch('/:id/approve', protect, adminOnly, approveEvent);
router.patch('/:id/reject', protect, adminOnly, rejectEvent);

router.get('/grafik/all', protect, grafikOnly, getGrafikEvents);
router.get('/grafik/:id', protect, grafikOnly, getGrafikEventById);
router.post('/:id/banner/generate', protect, grafikOnly, generateEventBanner);
router.post('/:id/banner/upload', protect, grafikOnly, uploadCustomEventBanner);
router.patch('/:id/banner/approve', protect, grafikOnly, approveEventBanner);

router.get('/', getEvents);
router.get('/:id', getEventById);

router.get('/:eventId/registrations', protect, getEventRegistrations); 
router.get('/:eventId/qr-token', protect, prOnly, generateAttendanceToken);

router.post('/:eventId/register', protect, registerForEvent);
router.post('/:eventId/attendance', protect, markAttendance);
router.post('/:eventId/review', protect, submitReview);
router.get('/:eventId/reviews', getEventReviews);

export default router;