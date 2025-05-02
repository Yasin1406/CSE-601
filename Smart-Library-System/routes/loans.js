const express = require("express");
const router = express.Router();
const Loan = require("../models/Loan");
const User = require("../models/User");
const Book = require("../models/Book");
const mongoose = require("mongoose");

// POST /api/loans
router.post("/", async (req, res) => {
  const { user_id, book_id, due_date } = req.body;

  try {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ error: "Invalid user_id format" });
    }
    if (!mongoose.Types.ObjectId.isValid(book_id)) {
      return res.status(400).json({ error: "Invalid book_id format" });
    }

    // Check if user exists
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if book exists and is available
    const book = await Book.findById(book_id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    if (book.available_copies <= 0) {
      return res.status(400).json({ error: "No copies available" });
    }

    // Validate due_date
    const dueDate = new Date(due_date);
    if (isNaN(dueDate) || dueDate <= new Date()) {
      return res.status(400).json({ error: "Invalid or past due_date" });
    }

    // Create loan
    const loan = new Loan({
      user_id,
      book_id,
      due_date: dueDate,
    });

    // Update book availability
    book.available_copies -= 1;
    await book.save();

    // Save loan
    await loan.save();

    res.status(201).json({
      _id: loan._id,
      user_id: loan.user_id,
      book_id: loan.book_id,
      issue_date: loan.issue_date,
      due_date: loan.due_date,
      return_date: loan.return_date,
      status: loan.status,
      extensions_count: loan.extensions_count,
      created_at: loan.created_at,
      updated_at: loan.updated_at,
    });
  } catch (error) {
    console.error("Loan creation error:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

// GET /api/loans (List all loans with optional status filter)
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    // Filter by status if provided
    if (status) {
      if (["ACTIVE", "RETURNED"].indexOf(status.toUpperCase()) === -1) {
        return res.status(400).json({ error: "Invalid status value. Use 'ACTIVE' or 'RETURNED'" });
      }
      query = { status: status.toUpperCase() };
    }

    const loans = await Loan.find(query);
    res.status(200).json(loans);
  } catch (error) {
    console.error("Error fetching loans:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

// GET /api/loans/:id (Get specific loan)
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid loan_id format" });
    }
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }
    res.status(200).json({
      _id: loan._id,
      user_id: loan.user_id,
      book_id: loan.book_id,
      issue_date: loan.issue_date,
      due_date: loan.due_date,
      return_date: loan.return_date,
      status: loan.status,
      extensions_count: loan.extensions_count,
      created_at: loan.created_at,
      updated_at: loan.updated_at,
    });
  } catch (error) {
    console.error("Error fetching loan:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

// PUT /api/loans/:id/return - Return a loaned book
router.put("/:id/return", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid loan_id format" });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    if (loan.status !== "ACTIVE") {
      return res.status(400).json({ error: "Loan already returned" });
    }

    const book = await Book.findById(loan.book_id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Update loan status and return date
    loan.status = "RETURNED";
    loan.return_date = new Date();
    loan.updated_at = new Date();
    await loan.save();

    // Increment book's available copies
    book.available_copies += 1;
    await book.save();

    res.status(200).json({
      _id: loan._id,
      user_id: loan.user_id,
      book_id: loan.book_id,
      issue_date: loan.issue_date,
      due_date: loan.due_date,
      return_date: loan.return_date,
      status: loan.status,
      extensions_count: loan.extensions_count,
      created_at: loan.created_at,
      updated_at: loan.updated_at,
    });
  } catch (error) {
    console.error("Loan return error:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

// GET /api/loans/user/:user_id - Get loan history for a specific user
router.get("/user/:user_id", async (req, res) => {
  try {
    const userId = req.params.user_id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user_id format" });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch loans for the user and populate book details
    const loans = await Loan.find({ user_id: userId })
      .populate("book_id", "title author")
      .lean();

    // Map loans to the desired response format, skipping loans with missing books
    const formattedLoans = loans
      .filter((loan) => {
        if (!loan.book_id) {
          console.warn(`Loan ${loan._id} references a missing book_id: ${loan.book_id}`);
          return false;
        }
        return true;
      })
      .map((loan) => ({
        id: loan._id.toString(),
        book: {
          id: loan.book_id._id.toString(),
          title: loan.book_id.title,
          author: loan.book_id.author,
        },
        issue_date: loan.issue_date.toISOString(),
        due_date: loan.due_date.toISOString(),
        return_date: loan.return_date ? loan.return_date.toISOString() : null,
        status: loan.status,
      }));

    res.status(200).json(formattedLoans);
  } catch (error) {
    console.error("Error fetching user loans:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

module.exports = router;