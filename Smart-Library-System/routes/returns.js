import express from 'express';
import { returnBook } from '../controllers/returnController.js';

const router = express.Router();

router.post('/', returnBook);

export default router;