import Loan from '../models/Loan.js';
import User from '../models/User.js';
import Book from '../models/Book.js';
import mongoose from 'mongoose';

export const issueLoan = async (req, res) => {
  const { user_id, book_id, due_date } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ error: 'Invalid user_id format' });
    }
    if (!mongoose.Types.ObjectId.isValid(book_id)) {
      return res.status(400).json({ error: 'Invalid book_id format' });
    }

    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const book = await Book.findById(book_id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.available_copies <= 0) {
      return res.status(400).json({ error: 'No copies available' });
    }

    const dueDate = new Date(due_date);
    if (isNaN(dueDate) || dueDate <= new Date()) {
      return res.status(400).json({ error: 'Invalid or past due_date' });
    }

    const loan = new Loan({ user_id, book_id, due_date });
    book.available_copies -= 1;
    await book.save();
    await loan.save();

    res.status(201).json({
      id: loan._id,
      user_id: loan.user_id,
      book_id: loan.book_id,
      issue_date: loan.issue_date,
      due_date: loan.due_date,
      status: loan.status,
    });
  } catch (error) {
    console.error('Loan creation error:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

export const getUserLoans = async (req, res) => {
  try {
    const userId = req.params.user_id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user_id format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const loans = await Loan.find({ user_id: userId })
      .populate('book_id', 'title author')
      .lean();

    const formattedLoans = loans
      .filter((loan) => loan.book_id)
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
    console.error('Error fetching user loans:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
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
      { $unwind: '$user' },
      { $unwind: '$book' },
      {
        $project: {
          id: '$_id',
          user: {
            id: '$user._id',
            name: '$user.name',
            email: '$user.email',
          },
          book: {
            id: '$book._id',
            title: '$book.title',
            author: '$book.author',
          },
          issue_date: '$issue_date',
          due_date: '$due_date',
          days_overdue: {
            $floor: { $divide: [{ $subtract: [new Date(), '$due_date'] }, 86400000] },
          },
        },
      },
    ]);

    res.status(200).json(overdueLoans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const extendLoan = async (req, res) => {
  try {
    const { extension_days } = req.body;

    if (!extension_days || extension_days <= 0) {
      return res.status(400).json({ error: 'Invalid extension_days value' });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Loan is not active' });
    }
    if (loan.extensions_count >= 2) {
      return res.status(400).json({ error: 'Maximum extension limit reached' });
    }

    const originalDueDate = loan.due_date;
    loan.due_date = new Date(loan.due_date.getTime() + extension_days * 86400000);
    loan.extensions_count += 1;
    loan.updated_at = new Date();
    await loan.save();

    res.json({
      id: loan._id,
      user_id: loan.user_id,
      book_id: loan.book_id,
      issue_date: loan.issue_date,
      original_due_date: originalDueDate,
      extended_due_date: loan.due_date,
      status: loan.status,
      extensions_count: loan.extensions_count,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getActiveLoans = async (req, res) => {
  try {
    const userId = req.params.user_id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user_id format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const loans = await Loan.find({ user_id: userId, status: 'ACTIVE' })
      .populate('book_id', 'title author')
      .lean();

    const formattedLoans = loans
      .filter((loan) => loan.book_id)
      .map((loan) => ({
        id: loan._id.toString(),
        book: {
          id: loan.book_id._id.toString(),
          title: loan.book_id.title,
          author: loan.book_id.author,
        },
        issue_date: loan.issue_date.toISOString(),
        due_date: loan.due_date.toISOString(),
        status: loan.status,
      }));

    res.status(200).json(formattedLoans);
  } catch (error) {
    console.error('Error fetching active loans:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

export const getPastLoans = async (req, res) => {
  try {
    const userId = req.params.user_id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user_id format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const loans = await Loan.find({ user_id: userId, status: 'RETURNED' })
      .populate('book_id', 'title author')
      .lean();

    const formattedLoans = loans
      .filter((loan) => loan.book_id)
      .map((loan) => ({
        id: loan._id.toString(),
        book: {
          id: loan.book_id._id.toString(),
          title: loan.book_id.title,
          author: loan.book_id.author,
        },
        issue_date: loan.issue_date.toISOString(),
        due_date: loan.due_date.toISOString(),
        return_date: loan.return_date.toISOString(),
        status: loan.status,
      }));

    res.status(200).json(formattedLoans);
  } catch (error) {
    console.error('Error fetching past loans:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

export const getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.find()
      .populate('user_id', 'name email')
      .populate('book_id', 'title author')
      .lean();

    const formattedLoans = loans
      .filter((loan) => loan.user_id && loan.book_id)
      .map((loan) => ({
        id: loan._id.toString(),
        user: {
          id: loan.user_id._id.toString(),
          name: loan.user_id.name,
          email: loan.user_id.email,
        },
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
    console.error('Error fetching all loans:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};