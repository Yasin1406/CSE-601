import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  genre: { type: String, required: true },
  copies: { type: Number, required: true, min: 0 },
  available_copies: { type: Number, required: true, min: 0, default: function() { return this.copies; } },
  isbn: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export default mongoose.model('Book', bookSchema);