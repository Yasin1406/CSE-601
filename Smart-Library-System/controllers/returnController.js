import Loan from '../models/Loan.js';
import Book from '../models/Book.js';
import mongoose from 'mongoose';

export const returnBook = async (req, res) => {
  try {
    const { loan_id } = req.body;

    if (!mongoose.Types.ObjectId.isValid(loan_id)) {
      return res.status(400).json({ error: 'Invalid loan_id format' });
    }

    const loan = await Loan.findById(loan_id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Loan already returned' });
    }

    const book = await Book.findById(loan.book_id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    loan.status = 'RETURNED';
    loan.return_date = new Date();
    loan.updated_at = new Date();
    await loan.save();

    book.available_copies += 1;
    await book.save();

    res.json({
      id: loan._id,
      user_id: loan.user_id,
      book_id: loan.book_id,
      issue_date: loan.issue_date,
      due_date: loan.due_date,
      return_date: loan.return_date,
      status: loan.status,
    });
  } catch (error) {
    console.error('Loan return error:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};