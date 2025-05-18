const express = require('express');
const router = express.Router();
const {
  createBook,
  getAllBooks,
  getBook,
  updateBook,
  deleteBook,
  searchBooks,
  updateAvailability,
} = require('../controllers/bookController');

router.post('/', createBook);
router.get('/', getAllBooks);
router.get('/search', searchBooks); // New route for search
router.get('/:id', getBook);
router.put('/:id', updateBook);
router.patch('/:id/availability', updateAvailability); // New route for availability update
router.delete('/:id', deleteBook);

module.exports = router;