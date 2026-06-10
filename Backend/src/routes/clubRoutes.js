import express from 'express';
import { createClub, getClubs, updateClub, deleteClub, addClubMember, removeClubMember } from '../controllers/clubController.js';
import { protect, adminOnly, presidentOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, adminOnly, createClub);
router.get('/', protect, getClubs);
router.put('/:id', protect, adminOnly, updateClub);
router.delete('/:id', protect, adminOnly, deleteClub);
router.post('/:id/members', protect, presidentOrAdmin, addClubMember);
router.delete('/:id/members/:studentId', protect, presidentOrAdmin, removeClubMember);

export default router;
