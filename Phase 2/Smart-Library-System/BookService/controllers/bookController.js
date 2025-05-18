const mongoose = require('mongoose');
const Book = require('../models/Books');

exports.createBook = async (req, res) => {
  try {
    const { title, author, genre, copies, isbn } = req.body;
    const book = new Book({ title, author, genre, copies, isbn });
    await book.save();
    res.status(201).json({
      id: book._id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: book.genre,
      copies: book.copies,
      available_copies: book.available_copies,
      created_at: book.created_at,
    });
  } catch (error) {
    console.error('Book creation error:', error.message);
    res.status(400).json({ error: error.message });
  }
};

exports.getAllBooks = async (req, res) => {
  try {
    const books = await Book.find();
    const formattedBooks = books.map(book => ({
      id: book._id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: book.genre,
      copies: book.copies,
      available_copies: book.available_copies,
      created_at: book.created_at,
      updated_at: book.updated_at,
    }));
    res.status(200).json(formattedBooks);
  } catch (error) {
    console.error('Error fetching books:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

exports.getBook = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid book_id format' });
    }
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.status(200).json({
      id: book._id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: book.genre,
      copies: book.copies,
      available_copies: book.available_copies,
      created_at: book.created_at,
      updated_at: book.updated_at,
    });
  } catch (error) {
    console.error('Error fetching book:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

exports.updateBook = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid book_id format' });
    }
    const { title, author, genre, copies, isbn } = req.body;
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const updateData = {
      title: title || book.title,
      author: author || book.author,
      genre: genre || book.genre,
      copies: copies !== undefined ? copies : book.copies,
      isbn: isbn || book.isbn,
      updated_at: Date.now(),
    };
    // Adjust available_copies if copies changes
    if (copies !== undefined) {
      const difference = copies - book.copies;
      updateData.available_copies = Math.max(0, book.available_copies + difference);
    }
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    res.status(200).json({
      id: updatedBook._id,
      title: updatedBook.title,
      author: updatedBook.author,
      isbn: updatedBook.isbn,
      genre: updatedBook.genre,
      copies: updatedBook.copies,
      available_copies: updatedBook.available_copies,
      created_at: updatedBook.created_at,
      updated_at: updatedBook.updated_at,
    });
  } catch (error) {
    console.error('Error updating book:', error.message);
    res.status(400).json({ error: 'Server error: ' + error.message });
  }
};

exports.deleteBook = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid book_id format' });
    }
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting book:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

exports.searchBooks = async (req, res) => {
  try {
    const query = req.query.query || '';
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 10;
    const skip = (page - 1) * perPage;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchRegex = new RegExp(query, 'i'); // Case-insensitive search
    const books = await Book.find({
      $or: [
        { title: searchRegex },
        { author: searchRegex },
        { genre: searchRegex },
      ],
    })
      .skip(skip)
      .limit(perPage);

    const total = await Book.countDocuments({
      $or: [
        { title: searchRegex },
        { author: searchRegex },
        { genre: searchRegex },
      ],
    });

    const formattedBooks = books.map(book => ({
      id: book._id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      copies: book.copies,
      available_copies: book.available_copies,
    }));

    res.status(200).json({
      books: formattedBooks,
      total,
      page,
      per_page: perPage,
    });
  } catch (error) {
    console.error('Error searching books:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid book_id format' });
    }

    const { operation } = req.body;
    if (!operation) {
      return res.status(400).json({ error: 'operation is required' });
    }
    if (!['increment', 'decrement'].includes(operation)) {
      return res.status(400).json({ error: 'Operation must be "increment" or "decrement"' });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    let newAvailableCopies = book.available_copies;
    if (operation === 'increment') {
      newAvailableCopies = book.available_copies + 1;
    } else {
      newAvailableCopies = book.available_copies - 1;
    }

    if (newAvailableCopies < 0) {
      return res.status(400).json({ error: 'Available copies cannot be less than 0' });
    }
    if (newAvailableCopies > book.copies) {
      return res.status(400).json({ error: 'Available copies cannot exceed total copies' });
    }

    book.available_copies = newAvailableCopies;
    book.updated_at = Date.now();
    await book.save();

    res.status(200).json({
      id: book._id,
      available_copies: book.available_copies,
      updated_at: book.updated_at,
    });
  } catch (error) {
    console.error('Error updating book availability:', error.message);
    res.status(400).json({ error: 'Server error: ' + error.message });
  }
};