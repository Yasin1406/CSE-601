
const express = require("express");
const router = express.Router();
const Loan = require("../models/Loan");
const Book = require("../models/Book");
const User = require("../models/User");
const moment = require("moment");

// GET /api/stats/books/popular - Get most borrowed books
router.get("/books/popular", async (req, res) => {
  try {
    const popularBooks = await Loan.aggregate([
      { $group: { _id: "$book_id", borrow_count: { $sum: 1 } } },
      { $sort: { borrow_count: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "books",
          localField: "_id",
          foreignField: "_id",
          as: "book",
        },
      },
      { $unwind: "$book" },
      {
        $project: {
          book_id: "$_id",
          title: "$book.title",
          author: "$book.author",
          borrow_count: 1,
        },
      },
    ]);
    res.json(popularBooks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/users/active - Get most active users
router.get("/users/active", async (req, res) => {
  try {
    const activeUsers = await Loan.aggregate([
      {
        $group: {
          _id: "$user_id",
          books_borrowed: { $sum: 1 },
          current_borrows: {
            $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] },
          },
        },
      },
      { $sort: { books_borrowed: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          user_id: "$_id",
          name: "$user.name",
          books_borrowed: 1,
          current_borrows: 1,
        },
      },
    ]);
    res.json(activeUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/overview - Get system overview statistics
router.get("/overview", async (req, res) => {
  try {
    const today = moment().startOf("day").toDate();
    const totalBooks = await Book.countDocuments();
    const totalUsers = await User.countDocuments();
    const booksAvailable = await Book.aggregate([
      { $group: { _id: null, total: { $sum: "$available_copies" } } },
    ]);
    const booksBorrowed = await Loan.countDocuments({ status: "ACTIVE" });
    const overdueLoans = await Loan.countDocuments({
      status: "ACTIVE",
      due_date: { $lt: Date.now() },
    });
    const loansToday = await Loan.countDocuments({
      issue_date: { $gte: today },
    });
    const returnsToday = await Loan.countDocuments({
      return_date: { $gte: today },
    });

    res.json({
      total_books: totalBooks,
      total_users: totalUsers,
      books_available: booksAvailable[0]?.total || 0,
      books_borrowed: booksBorrowed,
      overdue_loans: overdueLoans,
      loans_today: loansToday,
      returns_today: returnsToday,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
