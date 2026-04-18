import express from 'express';
import { createClub, getClubs, updateClub, deleteClub } from '../controllers/clubController.js';

const router = express.Router();

router.post('/', createClub);
router.get('/', getClubs);
router.put('/:id', updateClub);
router.delete('/:id', deleteClub);

export default router;