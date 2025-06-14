import express from 'express';
import {
  createBook,
  getAllBooks,
  getBook,
  updateBook,
  deleteBook,
  searchBooks,
  updateAvailability,
} from '../controllers/bookController.js';

const router = express.Router();

router.post('/', createBook);
router.get('/', getAllBooks);
router.get('/search', searchBooks); // New route for search
router.get('/:id', getBook);
router.put('/:id', updateBook);
router.patch('/:id/availability', updateAvailability); // New route for availability update
router.delete('/:id', deleteBook);

export default router;