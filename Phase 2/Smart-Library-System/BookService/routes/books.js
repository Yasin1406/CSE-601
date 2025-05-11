const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

// Routes
router.post('/', bookController.addBook);
router.get('/:id', bookController.getBookById);
router.get('/', bookController.searchBooks);
router.patch('/:id/availability', bookController.updateAvailability);
router.delete('/:id', bookController.deleteBook);

module.exports = router;