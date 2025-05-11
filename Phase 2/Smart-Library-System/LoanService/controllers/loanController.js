const mongoose = require('mongoose');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;

// Configure axios with retries and timeouts
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  shouldResetTimeout: true,
});
const axiosInstance = axios.create({
  timeout: 5000, // 5-second timeout for inter-service calls
});

// Loan Schema
const loanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, required: true },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'returned'], default: 'active' },
});
const Loan = mongoose.model('Loan', loanSchema);

// Create a new loan
const createLoan = async (req, res) => {
  try {
    const { userId, bookId, dueDate } = req.body;

    // Validate User
    try {
      await axiosInstance.get(`http://localhost:3001/api/users/${userId}`);
    } catch (err) {
      if (err.response?.status === 404) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(503).json({ error: 'User Service unavailable' });
    }

    // Validate Book and Availability
    let bookResponse;
    try {
      bookResponse = await axiosInstance.get(`http://localhost:3002/api/books/${bookId}`);
    } catch (err) {
      if (err.response?.status === 404) {
        return res.status(404).json({ error: 'Book not found' });
      }
      return res.status(503).json({ error: 'Book Service unavailable' });
    }
    const book = bookResponse.data;
    if (book.copies <= 0) {
      return res.status(400).json({ error: 'No copies available' });
    }

    // Update Book Availability
    try {
      await axiosInstance.patch(`http://localhost:3002/api/books/${bookId}/availability`, {
        copies: book.copies - 1,
      });
    } catch (err) {
      return res.status(503).json({ error: 'Failed to update book availability' });
    }

    // Create Loan
    const loan = new Loan({ userId, bookId, dueDate });
    await loan.save();
    res.status(201).json(loan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// List loans with optional status filter
const listLoans = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const loans = await Loan.find(query);
    res.status(200).json(loans);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Return a loan
const returnLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.status === 'returned') {
      return res.status(400).json({ error: 'Loan already returned' });
    }

    // Get Book to Update Availability
    let bookResponse;
    try {
      bookResponse = await axiosInstance.get(`http://localhost:3002/api/books/${loan.bookId}`);
    } catch (err) {
      return res.status(503).json({ error: 'Book Service unavailable' });
    }
    const book = bookResponse.data;

    // Update Book Availability
    try {
      await axiosInstance.patch(`http://localhost:3002/api/books/${loan.bookId}/availability`, {
        copies: book.copies + 1,
      });
    } catch (err) {
      return res.status(503).json({ error: 'Failed to update book availability' });
    }

    // Mark Loan as Returned
    loan.status = 'returned';
    await loan.save();
    res.status(200).json(loan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// List overdue loans
const listOverdueLoans = async (req, res) => {
  try {
    const currentDate = new Date();
    const overdueLoans = await Loan.find({
      status: 'active',
      dueDate: { $lt: currentDate },
    });
    res.status(200).json(overdueLoans);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createLoan,
  listLoans,
  returnLoan,
  listOverdueLoans,
};