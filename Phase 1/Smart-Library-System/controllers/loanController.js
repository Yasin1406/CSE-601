import Loan from '../models/Loans.js';
import User from '../models/Users.js';
import Book from '../models/Books.js';
import mongoose from 'mongoose';

export const createLoan = async (req, res) => {
  const { user_id, book_id, due_date } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ error: "Invalid user_id format" });
    }
    if (!mongoose.Types.ObjectId.isValid(book_id)) {
      return res.status(400).json({ error: "Invalid book_id format" });
    }

    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const book = await Book.findById(book_id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    if (book.available_copies <= 0) {
      return res.status(400).json({ error: "No copies available" });
    }

    const dueDate = new Date(due_date);
    if (isNaN(dueDate) || dueDate <= new Date()) {
      return res.status(400).json({ error: "Invalid or past due_date" });
    }

    const loan = new Loan({
      user_id,
      book_id,
      due_date: dueDate,
    });

    book.available_copies -= 1;
    await book.save();

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
};

export const getAllLoans = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) {
      if (["ACTIVE", "RETURNED"].indexOf(status.toUpperCase()) === -1) {
        return res.status(400).json({ error: "Invalid status value. Use 'ACTIVE' or 'RETURNED'" });
      }
      query = { status: status.toUpperCase() };
    }

    const loans = await Loan.find(query).lean();

    const currentDate = new Date();
    const loansWithOverdue = loans.map(loan => ({
      ...loan,
      overdue: loan.status === "ACTIVE" && new Date(loan.due_date) < currentDate,
    }));

    res.status(200).json(loansWithOverdue);
  } catch (error) {
    console.error("Error fetching loans:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  }
};

export const getLoan = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid loan_id format" });
    }
    const loan = await Loan.findById(req.params.id).lean();
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    const currentDate = new Date();
    const overdue = loan.status === "ACTIVE" && new Date(loan.due_date) < currentDate;

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
      overdue: overdue,
    });
  } catch (error) {
    console.error("Error fetching loan:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  }
};

export const returnLoan = async (req, res) => {
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

    loan.status = "RETURNED";
    loan.return_date = new Date();
    loan.updated_at = new Date();
    await loan.save();

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
};

export const getUserLoans = async (req, res) => {
  try {
    const userId = req.params.user_id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user_id format" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const loans = await Loan.find({ user_id: userId })
      .populate("book_id", "title author")
      .lean();

    const currentDate = new Date();
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
        overdue: loan.status === "ACTIVE" && new Date(loan.due_date) < currentDate,
      }));

    res.status(200).json(formattedLoans);
  } catch (error) {
    console.error("Error fetching user loans:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  }
};

export const extendLoan = async (req, res) => {
  try {
    const { extension_days } = req.body;

    // Validate extension_days
    if (!extension_days || typeof extension_days !== 'number' || !Number.isInteger(extension_days) || extension_days <= 0) {
      return res.status(400).json({ error: "extension_days must be a positive integer" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid loan_id format" });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    if (loan.status !== "ACTIVE") {
      return res.status(400).json({ error: "Only active loans can be extended" });
    }

    const currentDate = new Date();
    if (new Date(loan.due_date) < currentDate) {
      return res.status(400).json({ error: "Cannot extend an overdue loan" });
    }

    if (loan.extensions_count >= 2) {
      return res.status(400).json({ error: "Maximum extension limit (2) reached" });
    }

    // Calculate new due date based on extension_days
    const newDueDate = new Date(loan.due_date);
    newDueDate.setDate(newDueDate.getDate() + extension_days);

    // Ensure the new due date is in the future
    if (newDueDate <= currentDate) {
      return res.status(400).json({ error: "New due date must be in the future" });
    }

    loan.due_date = newDueDate;
    loan.extensions_count += 1;
    loan.updated_at = new Date();
    await loan.save();

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
    console.error("Loan extension error:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  }
};

export const getOverdueLoans = async (req, res) => {
  try {
    const overdueLoans = await Loan.aggregate([
      {
        $match: {
          status: 'ACTIVE',
          due_date: { $lt: new Date() },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $lookup: {
          from: 'books',
          localField: 'book_id',
          foreignField: '_id',
          as: 'book',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
      { $unwind: { path: '$book', preserveNullAndEmptyArrays: false } },
      {
        $project: {
          id: '$_id',
          user: {
            id: { $toString: '$user._id' },
            name: '$user.name',
            email: '$user.email',
          },
          book: {
            id: { $toString: '$book._id' },
            title: '$book.title',
            author: '$book.author',
          },
          issue_date: { $toString: '$issue_date' },
          due_date: { $toString: '$due_date' },
          days_overdue: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), '$due_date'] },
                1000 * 60 * 60 * 24, // Convert milliseconds to days
              ],
            },
          },
        },
      },
      {
        $match: {
          'days_overdue': { $gte: 0 },
        },
      },
    ]);

    res.status(200).json(overdueLoans);
  } catch (error) {
    console.error("Error fetching overdue loans:", error.message, error.stack);
    res.status(500).json({ error: "Server error: " + error.message });
  }
};