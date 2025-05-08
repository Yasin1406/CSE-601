import express from 'express';
import {
  addBook,
  getBook,
  searchBooks,
  updateBook,
  deleteBook,
  getBookAvailability,
  getAllBooks,
} from '../controllers/bookController.js';

const router = express.Router();

router.post('/', addBook);
router.get('/', getAllBooks); // Returns all books
router.get('/search', searchBooks); // Filters books by title, author, or genre
router.get('/:id', getBook);
router.put('/:id', updateBook);
router.delete('/:id', deleteBook);
router.get('/:id/availability', getBookAvailability);

export default router;