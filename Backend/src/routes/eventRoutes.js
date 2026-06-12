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
    approveEventBanner,
    uploadGalleryImage,
    deleteGalleryImage,
    getPrCompletedEvents,
    approveClubMemberProposal,
    rejectClubMemberProposal,
    reviewGallery
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
import { protect, presidentOnly, prOnly, adminOnly, presidentOrAdmin, grafikOnly, presidentOrClubMember, presidentClubMemberOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/leaderboard/rankings', getLeaderboard);
router.post('/leaderboard/reset', protect, adminOnly, resetLeaderboard);

router.get('/student-events', protect, getStudentEvents);
router.get('/student-events/:id', protect, getStudentEventById);
router.get('/student/certificates', protect, getAttendedEvents);
router.get('/student/attendance-report', protect, getStudentAttendanceReport);
router.get('/admin/attendance-report', protect, adminOnly, getAdminAttendanceReport);

router.get('/president/all', protect, presidentOrClubMember, getPresidentEvents);
router.post('/', protect, presidentClubMemberOrAdmin, createEvent);
router.patch('/:id/complete', protect, presidentOrClubMember, markEventCompleted);
router.put('/:id', protect, presidentOrClubMember, updateEvent);
router.delete('/:id', protect, presidentOrClubMember, deleteEvent);
router.patch('/:id/proposal/approve', protect, presidentOnly, approveClubMemberProposal);
router.patch('/:id/proposal/reject', protect, presidentOnly, rejectClubMemberProposal);

router.post('/:eventId/reviews/summary', protect, presidentClubMemberOrAdmin, summarizeReviews);

router.patch('/:id/approve', protect, adminOnly, approveEvent);
router.patch('/:id/reject', protect, adminOnly, rejectEvent);

router.get('/grafik/all', protect, grafikOnly, getGrafikEvents);
router.get('/grafik/:id', protect, grafikOnly, getGrafikEventById);
router.post('/:id/banner/generate', protect, grafikOnly, generateEventBanner);
router.post('/:id/banner/upload', protect, grafikOnly, uploadCustomEventBanner);
router.patch('/:id/banner/approve', protect, grafikOnly, approveEventBanner);
router.post('/:id/gallery/upload', protect, grafikOnly, uploadGalleryImage);
router.delete('/:id/gallery/:fileId', protect, grafikOnly, deleteGalleryImage);

router.get('/pr/galleries', protect, prOnly, getPrCompletedEvents);
router.patch('/:id/gallery/review', protect, prOnly, reviewGallery);

router.get('/', getEvents);
router.get('/:id', getEventById);

router.get('/:eventId/registrations', protect, getEventRegistrations); 
router.get('/:eventId/qr-token', protect, prOnly, generateAttendanceToken);

router.post('/:eventId/register', protect, registerForEvent);
router.post('/:eventId/attendance', protect, markAttendance);
router.post('/:eventId/review', protect, submitReview);
router.get('/:eventId/reviews', getEventReviews);

export default router;
