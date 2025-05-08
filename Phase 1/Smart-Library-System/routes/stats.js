import express from 'express';
import {
  getPopularBooks,
  getActiveUsers,
  getOverview,
} from '../controllers/statsController.js';

const router = express.Router();

router.get('/books/popular', getPopularBooks);
router.get('/users/active', getActiveUsers);
router.get('/overview', getOverview);

export default router;