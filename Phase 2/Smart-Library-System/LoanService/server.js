const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const loanRoutes = require('./routes/loans');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Loan Service: Connected to MongoDB (loan_db)'))
  .catch((err) => console.error('Loan Service: MongoDB connection error:', err));

// Routes
app.use('/api/loans', loanRoutes);

app.listen(PORT, () => {
  console.log(`Loan Service running on port ${PORT}`);
});