const mongoose = require('mongoose');

// Book Schema
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  genre: { type: String, required: true },
  copies: { type: Number, required: true, min: 0 },
});
const Book = mongoose.model('Book', bookSchema);

// Add a new book
const addBook = async (req, res) => {
  try {
    const { title, author, genre, copies } = req.body;
    const book = new Book({ title, author, genre, copies });
    await book.save();
    res.status(201).json(book);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get book by ID
const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.status(200).json(book);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Search books by title, author, or genre
const searchBooks = async (req, res) => {
  try {
    const { title, author, genre } = req.query;
    const query = {};
    if (title) query.title = new RegExp(title, 'i');
    if (author) query.author = new RegExp(author, 'i');
    if (genre) query.genre = new RegExp(genre, 'i');
    const books = await Book.find(query);
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update book availability
const updateAvailability = async (req, res) => {
  try {
    const { copies } = req.body;
    if (typeof copies !== 'number' || copies < 0) {
      return res.status(400).json({ error: 'Invalid copies value' });
    }
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { copies },
      { new: true, runValidators: true }
    );
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.status(200).json(book);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a book
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  addBook,
  getBookById,
  searchBooks,
  updateAvailability,
  deleteBook,
};