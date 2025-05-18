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
    if (book.available_copies <= 0) {
      return res.status(400).json({ error: 'No copies available' });
    }

    // Update Book Availability
    try {
      await axiosInstance.patch(`http://localhost:3002/api/books/${bookId}/availability`, {
        operation: 'decrement',
      });
    } catch (err) {
      return res.status(503).json({ error: 'Failed to update book availability' });
    }

    // Create Loan
    const loan = new Loan({ userId, bookId, dueDate });
    await loan.save();
    res.status(201).json({
      id: loan._id,
      userId: loan.userId,
      bookId: loan.bookId,
      issue_date: loan.issueDate,
      due_date: loan.dueDate,
      status: loan.status.toUpperCase(),
    });
  } catch (error) {
    console.error('Loan creation error:', error.message);
    res.status(400).json({ error: error.message });
  }
};

exports.getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.find();
    const formattedLoans = await Promise.all(loans.map(async (loan) => {
      let bookData = {};
      try {
        const bookResponse = await axiosInstance.get(`http://localhost:3002/api/books/${loan.bookId}`);
        const book = bookResponse.data;
        bookData = {
          id: book.id,
          title: book.title,
          author: book.author,
        };
      } catch (err) {
        bookData = { id: loan.bookId, title: 'Unknown', author: 'Unknown' };
      }

      return {
        id: loan._id,
        book: bookData,
        issue_date: loan.issueDate,
        due_date: loan.dueDate,
        return_date: loan.returnDate,
        status: loan.status.toUpperCase(),
      };
    }));
    res.status(200).json(formattedLoans);
  } catch (error) {
    console.error('Error fetching loans:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

exports.returnLoan = async (req, res) => {
  try {
    const { loan_id } = req.body;
    if (!loan_id) {
      return res.status(400).json({ error: 'loan_id is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(loan_id)) {
      return res.status(400).json({ error: 'Invalid loan_id format' });
    }

    const loan = await Loan.findById(loan_id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    if (loan.status === 'returned') {
      return res.status(400).json({ error: 'Loan already returned' });
    }

    // Update Book Availability
    try {
      await axiosInstance.patch(`http://localhost:3002/api/books/${loan.bookId}/availability`, {
        operation: 'increment',
      });
    } catch (err) {
      console.error('Book Service error:', err.response?.data || err.message);
      return res.status(503).json({ 
        error: 'Failed to update book availability', 
        details: err.response?.data?.error || err.message 
      });
    }

    // Mark Loan as Returned
    loan.status = 'returned';
    loan.returnDate = new Date(); // Set return date to current time
    await loan.save();

    // Fetch Book Details for Response
    let bookData = {};
    try {
      const bookResponse = await axiosInstance.get(`http://localhost:3002/api/books/${loan.bookId}`);
      const book = bookResponse.data;
      bookData = {
        id: book.id,
        title: book.title,
        author: book.author,
      };
    } catch (err) {
      bookData = { id: loan.bookId, title: 'Unknown', author: 'Unknown' };
    }

    res.status(200).json({
      id: loan._id,
      book: bookData,
      issue_date: loan.issueDate,
      due_date: loan.dueDate,
      return_date: loan.returnDate,
      status: loan.status.toUpperCase(),
    });
  } catch (error) {
    console.error('Error returning loan:', error.message);
    res.status(400).json({ error: error.message });
  }
};

exports.getLoansByUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ error: 'Invalid user_id format' });
    }

    // Validate User
    try {
      await axiosInstance.get(`http://localhost:3001/api/users/${user_id}`);
    } catch (err) {
      if (err.response?.status === 404) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(503).json({ error: 'User Service unavailable' });
    }

    const loans = await Loan.find({ userId: user_id });
    const total = loans.length;

    const formattedLoans = await Promise.all(loans.map(async (loan) => {
      let bookData = {};
      try {
        const bookResponse = await axiosInstance.get(`http://localhost:3002/api/books/${loan.bookId}`);
        const book = bookResponse.data;
        bookData = {
          id: book.id,
          title: book.title,
          author: book.author,
        };
      } catch (err) {
        bookData = { id: loan.bookId, title: 'Unknown', author: 'Unknown' };
      }

      return {
        id: loan._id,
        book: bookData,
        issue_date: loan.issueDate,
        due_date: loan.dueDate,
        return_date: loan.returnDate,
        status: loan.status.toUpperCase(),
      };
    }));

    res.status(200).json({
      loans: formattedLoans,
      total,
    });
  } catch (error) {
    console.error('Error fetching user loans:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};