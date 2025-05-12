const mongoose = require('mongoose');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;

axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  shouldResetTimeout: true,
});
const axiosInstance = axios.create({
  timeout: 5000, // 5-second timeout for inter-service calls
});

const Loan = require('../models/Loans');

exports.createLoan = async (req, res) => {
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
      await axiosInstance.put(`http://localhost:3002/api/books/${bookId}`, {
        ...book,
        copies: book.copies - 1,
      });
    } catch (err) {
      return res.status(503).json({ error: 'Failed to update book availability' });
    }

    // Create Loan
    const loan = new Loan({ userId, bookId, dueDate });
    await loan.save();
    res.status(201).json({
      _id: loan._id,
      userId: loan.userId,
      bookId: loan.bookId,
      issueDate: loan.issueDate,
      dueDate: loan.dueDate,
      status: loan.status,
    });
  } catch (error) {
    console.error('Loan creation error:', error.message);
    res.status(400).json({ error: error.message });
  }
};

exports.getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.find();
    res.status(200).json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

exports.returnLoan = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid loan_id format' });
    }
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }
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
      await axiosInstance.put(`http://localhost:3002/api/books/${loan.bookId}`, {
        ...book,
        copies: book.copies + 1,
      });
    } catch (err) {
      return res.status(503).json({ error: 'Failed to update book availability' });
    }

    // Mark Loan as Returned
    loan.status = 'returned';
    await loan.save();
    res.status(200).json({
      _id: loan._id,
      userId: loan.userId,
      bookId: loan.bookId,
      issueDate: loan.issueDate,
      dueDate: loan.dueDate,
      status: loan.status,
    });
  } catch (error) {
    console.error('Error returning loan:', error.message);
    res.status(400).json({ error: error.message });
  }
};