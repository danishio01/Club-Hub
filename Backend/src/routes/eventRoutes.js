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
    getPrEvents,
    approveClubMemberProposal,
    rejectClubMemberProposal,
    reviewGallery,
    approveEventByHod,
    rejectEventByHod
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
import { protect, presidentOnly, prClubOnly, facultyOnly, staffOnly, hodOnly, grafikClubOnly, specialTaskWorkerOnly, presidentOrClubMember, presidentClubMemberOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/leaderboard/rankings', getLeaderboard);
router.post('/leaderboard/reset', protect, staffOnly, resetLeaderboard);

router.get('/student-events', protect, getStudentEvents);
router.get('/student-events/:id', protect, getStudentEventById);
router.get('/student/certificates', protect, getAttendedEvents);
router.get('/student/attendance-report', protect, getStudentAttendanceReport);
router.get('/admin/attendance-report', protect, staffOnly, getAdminAttendanceReport);

router.get('/president/all', protect, presidentOrClubMember, getPresidentEvents);
router.post('/', protect, presidentClubMemberOrAdmin, createEvent);
router.patch('/:id/complete', protect, presidentOrClubMember, markEventCompleted);
router.put('/:id', protect, presidentOrClubMember, updateEvent);
router.delete('/:id', protect, presidentOrClubMember, deleteEvent);
router.patch('/:id/proposal/approve', protect, presidentOnly, approveClubMemberProposal);
router.patch('/:id/proposal/reject', protect, presidentOnly, rejectClubMemberProposal);

router.post('/:eventId/reviews/summary', protect, presidentClubMemberOrAdmin, summarizeReviews);

router.patch('/:id/approve', protect, facultyOnly, approveEvent);
router.patch('/:id/reject', protect, facultyOnly, rejectEvent);
router.patch('/:id/hod/approve', protect, hodOnly, approveEventByHod);
router.patch('/:id/hod/reject', protect, hodOnly, rejectEventByHod);

router.get('/grafik/all', protect, grafikClubOnly, getGrafikEvents);
router.get('/grafik/:id', protect, specialTaskWorkerOnly(['poster', 'gallery_upload'], 'grafik'), getGrafikEventById);
router.post('/:id/banner/generate', protect, specialTaskWorkerOnly('poster', 'grafik'), generateEventBanner);
router.post('/:id/banner/upload', protect, specialTaskWorkerOnly('poster', 'grafik'), uploadCustomEventBanner);
router.patch('/:id/banner/approve', protect, specialTaskWorkerOnly('poster', 'grafik'), approveEventBanner);
router.post('/:id/gallery/upload', protect, specialTaskWorkerOnly('gallery_upload', 'grafik'), uploadGalleryImage);
router.delete('/:id/gallery/:fileId', protect, specialTaskWorkerOnly('gallery_upload', 'grafik'), deleteGalleryImage);

router.get('/pr/all', protect, prClubOnly, getPrEvents);
router.get('/pr/galleries', protect, prClubOnly, getPrCompletedEvents);
router.patch('/:id/gallery/review', protect, prClubOnly, reviewGallery);

router.get('/', protect, staffOnly, getEvents);
router.get('/:id', protect, getEventById);

router.get('/:eventId/registrations', protect, getEventRegistrations); 
router.get('/:eventId/qr-token', protect, specialTaskWorkerOnly('attendance', 'pr'), generateAttendanceToken);

router.post('/:eventId/register', protect, registerForEvent);
router.post('/:eventId/attendance', protect, markAttendance);
router.post('/:eventId/review', protect, submitReview);
router.get('/:eventId/reviews', getEventReviews);

export default router;
