const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Book = require("../models/Book");
const Loan = require("../models/Loan");

// POST /api/books - Add a new book
router.post("/", async (req, res) => {
  try {
    const { title, author, isbn, genre, copies } = req.body;
    const book = new Book({
      title,
      author,
      isbn,
      genre: genre || "", // Default to empty string if not provided
      copies,
      available_copies: copies,
    });
    await book.save();
    res.status(201).json(book);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/books - Search books by title, author, or genre
router.get("/", async (req, res) => {
  try {
    const { search, genre } = req.query;
    let query = {};

    // If genre is provided, filter by genre (case-insensitive)
    if (genre) {
      query.genre = { $regex: genre, $options: "i" };
    }

    // If search is provided, search title, author, or genre
    if (search) {
      const searchQuery = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { author: { $regex: search, $options: "i" } },
          { genre: { $regex: search, $options: "i" } },
        ],
      };
      query = { ...query, ...searchQuery };
    }

    const books = await Book.find(query);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/books/:id - Get book details
router.get("/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/books/:id - Update book information
router.put("/:id", async (req, res) => {
  try {
    const { title, author, isbn, genre, copies, available_copies } = req.body;
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { title, author, isbn, genre, copies, available_copies, updated_at: Date.now() },
      { new: true }
    );
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json(book);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/books/:id - Remove a book
router.delete("/:id", async (req, res) => {
  try {
    const bookId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ error: "Invalid book_id format" });
    }

    // Check for active loans
    const activeLoans = await Loan.countDocuments({
      book_id: bookId,
      status: "ACTIVE",
    });
    if (activeLoans > 0) {
      return res.status(400).json({
        error: "Cannot delete book with active loans",
        active_loans: activeLoans,
      });
    }

    // Delete the book
    const book = await Book.findByIdAndDelete(bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting book:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

module.exports = router;