const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bookRoutes = require('./routes/books');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Book Service: Connected to MongoDB (book_db)'))
  .catch((err) => console.error('Book Service: MongoDB connection error:', err));

// Routes
app.use('/api/books', bookRoutes);

app.listen(PORT, () => {
  console.log(`Book Service running on port ${PORT}`);
});