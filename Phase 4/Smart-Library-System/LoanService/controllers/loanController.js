import mongoose from 'mongoose';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import Loan from '../models/Loans.js';

axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  shouldResetTimeout: true,
});
const axiosInstance = axios.create({
  timeout: 5000,
});

export const createLoan = async (req, res) => {
  try {
    const { userId, bookId, dueDate } = req.body;

    // Validate request body
    if (!userId || !bookId || !dueDate) {
      return res.status(400).json({ error: 'userId, bookId, and dueDate are required' });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid userId format' });
    }
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ error: 'Invalid bookId format' });
    }

    // Log GATEWAY_URL and userId for debugging
    console.log('GATEWAY_URL:', process.env.GATEWAY_URL);
    console.log('userId:', userId);

    // Validate User
    try {
      const userResponse = await axiosInstance.get(`${process.env.GATEWAY_URL}/api/users/${userId}`);
      console.log('User validation response:', userResponse.status, userResponse.data);
    } catch (err) {
      console.error('User validation error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        url: `${process.env.GATEWAY_URL}/api/users/${userId}`,
      });
      if (err.response?.status === 404) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(503).json({ error: 'User Service unavailable', details: err.message });
    }

    // Validate Book and Availability
    let bookResponse;
    try {
      bookResponse = await axiosInstance.get(`${process.env.GATEWAY_URL}/api/books/${bookId}`);
      console.log('Book validation response:', bookResponse.status, bookResponse.data);
    } catch (err) {
      console.error('Book validation error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        url: `${process.env.GATEWAY_URL}/api/books/${bookId}`,
      });
      if (err.response?.status === 404) {
        return res.status(404).json({ error: 'Book not found' });
      }
      return res.status(503).json({ error: 'Book Service unavailable', details: err.message });
    }
    const book = bookResponse.data;
    if (book.available_copies <= 0) {
      return res.status(400).json({ error: 'No copies available' });
    }

    // Update Book Availability
    try {
      await axiosInstance.patch(`${process.env.GATEWAY_URL}/api/books/${bookId}/availability`, {
        operation: 'decrement',
      });
    } catch (err) {
      console.error('Book availability update error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      return res.status(503).json({ error: 'Failed to update book availability', details: err.message });
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

export const getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.find();
    const formattedLoans = await Promise.all(loans.map(async (loan) => {
      let bookData = {};
      try {
        const bookResponse = await axiosInstance.get(`${process.env.GATEWAY_URL}/api/books/${loan.bookId}`);
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
        userId: loan.userId,
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

export const returnLoan = async (req, res) => {
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
      await axiosInstance.patch(`${process.env.GATEWAY_URL}/api/books/${loan.bookId}/availability`, {
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
    loan.returnDate = new Date();
    await loan.save();

    // Fetch Book Details for Response
    let bookData = {};
    try {
      const bookResponse = await axiosInstance.get(`${process.env.GATEWAY_URL}/api/books/${loan.bookId}`);
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

export const getLoansByUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ error: 'Invalid user_id format' });
    }

    // Validate User
    try {
      await axiosInstance.get(`${process.env.GATEWAY_URL}/api/users/${user_id}`);
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
        const bookResponse = await axiosInstance.get(`${process.env.GATEWAY_URL}/api/books/${loan.bookId}`);
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