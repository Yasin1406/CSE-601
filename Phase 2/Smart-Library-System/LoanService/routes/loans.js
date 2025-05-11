const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');

// Routes
router.post('/', loanController.createLoan);
router.get('/', loanController.listLoans);
router.patch('/:id/return', loanController.returnLoan);
router.get('/overdue', loanController.listOverdueLoans);

module.exports = router;