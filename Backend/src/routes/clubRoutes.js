import express from 'express';
import { createClub, getClubs, updateClub, deleteClub, addClubMember, removeClubMember, uploadClubLogo, getAvailableClubStudents } from '../controllers/clubController.js';
import { protect, staffOnly, presidentOrAdmin, presidentOrStaff } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, staffOnly, createClub);
router.get('/', protect, getClubs);
router.get('/available-students', protect, presidentOrStaff, getAvailableClubStudents);
router.put('/:id', protect, staffOnly, updateClub);
router.delete('/:id', protect, staffOnly, deleteClub);
router.post('/:id/logo', protect, staffOnly, uploadClubLogo);
router.post('/:id/members', protect, presidentOrAdmin, addClubMember);
router.delete('/:id/members/:studentId', protect, presidentOrAdmin, removeClubMember);

export default router;
