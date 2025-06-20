import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userRoutes from './routes/users.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    console.log('Database name:', mongoose.connection.name);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

mongoose.connection.on('connected', () => console.log('Mongoose connected to MongoDB'));
mongoose.connection.on('disconnected', () => console.warn('Mongoose disconnected from MongoDB'));
mongoose.connection.on('error', (err) => console.error('Mongoose error:', err.message));

// Routes
app.use('/api/users', userRoutes);

app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));