import express from 'express';
import {
  issueLoan,
  getUserLoans,
  getOverdueLoans,
  extendLoan,
  getActiveLoans,
  getPastLoans,
  getAllLoans,
} from '../controllers/loanController.js';

const router = express.Router();

router.post('/', issueLoan);
router.get('/user/:user_id', getUserLoans);
router.get('/overdue', getOverdueLoans);
router.put('/:id/extend', extendLoan);
router.get('/user/:user_id/active', getActiveLoans);
router.get('/user/:user_id/past', getPastLoans);
router.get('/', getAllLoans);

export default router;