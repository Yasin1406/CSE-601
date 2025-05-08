import Book from '../models/Book.js';
import mongoose from 'mongoose';

export const addBook = async (req, res) => {
  try {
    const { title, author, isbn, copies, genre } = req.body;
    const book = new Book({
      title,
      author,
      isbn,
      genre: genre || '', // Default to empty string if genre is not provided
      copies,
      available_copies: copies,
    });
    await book.save();
    res.status(201).json(book);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json({
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
    res.status(400).json({ error: error.message });
  }
};

export const searchBooks = async (req, res) => {
  try {
    const { title, author, genre } = req.query;
    let query = {};

    if (title || author || genre) {
      query = {
        $or: [
          title ? { title: { $regex: title, $options: 'i' } } : null,
          author ? { author: { $regex: author, $options: 'i' } } : null,
          genre ? { genre: { $regex: genre, $options: 'i' } } : null,
        ].filter(Boolean), // Remove null entries from the $or array
      };
    }

    const books = await Book.find(query);
    res.status(200).json(books);
  } catch (error) {
    console.error('Error searching books:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

export const updateBook = async (req, res) => {
  try {
    const { title, author, isbn, copies, available_copies, genre } = req.body;
    if (copies !== undefined && available_copies !== undefined && copies < available_copies) {
      return res.status(400).json({ error: 'Total copies cannot be less than available copies.' });
    }
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { title, author, isbn, copies, available_copies, genre, updated_at: Date.now() },
      { new: true }
    );
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json({
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
    res.status(400).json({ error: error.message });
  }
};

export const deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getBookAvailability = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json({
      id: book._id,
      title: book.title,
      copies: book.copies,
      available_copies: book.available_copies,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find();
    res.status(200).json(books);
  } catch (error) {
    console.error('Error fetching all books:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};