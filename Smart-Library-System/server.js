import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.status(200).json({
      status: 'OK',
      database: 'Connected',
      dbName: mongoose.connection.name,
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      database: 'Disconnected',
      error: error.message,
    });
  }
});

// Routes
import usersRoutes from './routes/users.js';
import booksRoutes from './routes/books.js';
import loansRoutes from './routes/loans.js';
import statsRoutes from './routes/stats.js';
import returnsRoutes from './routes/returns.js';

app.use('/api/users', usersRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/returns', returnsRoutes);

// MongoDB Atlas connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    console.log(
      'MongoDB URI:',
      process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@')
    );
    console.log('Database name:', mongoose.connection.name);
  })
  .catch((err) => {
    console.error('MongoDB Atlas connection error:', err.message);
    console.error('Stack:', err.stack);
  });

// Log connection events
mongoose.connection.on('connected', () =>
  console.log('Mongoose connected to Atlas')
);
mongoose.connection.on('disconnected', () =>
  console.warn('Mongoose disconnected from Atlas')
);
mongoose.connection.on('error', (err) =>
  console.error('Mongoose error:', err.message)
);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));