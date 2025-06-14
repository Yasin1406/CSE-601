import express from 'express';
import {
    createLoan,
    getAllLoans,
    returnLoan,
    getLoansByUser,
} from '../controllers/loanController.js';

const router = express.Router();


router.post('/', createLoan);
router.get('/', getAllLoans);
router.get('/user/:user_id', getLoansByUser); // New route for user loan history
router.post('/returns', returnLoan); // Changed to POST /api/returns

export default router;

