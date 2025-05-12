const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, required: true },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'returned'], default: 'active' },
});

module.exports = mongoose.model('Loan', loanSchema);