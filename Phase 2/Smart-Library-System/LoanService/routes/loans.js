const express = require('express');
const router = express.Router();
const {
  createLoan,
  getAllLoans,
  returnLoan,
} = require('../controllers/loanController');

router.post('/', createLoan);
router.get('/', getAllLoans);
router.patch('/:id/return', returnLoan);

module.exports = router;


/*

[
    {
        "_id": "682190dc817baf17125f1e29",
        "name": "Mohammed Yasin",
        "email": "bsse1406@iit.du.ac.bd",
        "role": "student",
        "created_at": "2025-05-12T06:10:36.697Z",
        "updated_at": "2025-05-12T06:10:36.697Z",
        "__v": 0
    },
    {
        "_id": "682191cd817baf17125f1e2c",
        "name": "Md Nowsad Hossen Munna",
        "email": "bsse1407@iit.du.ac.bd",
        "role": "student",
        "created_at": "2025-05-12T06:14:37.103Z",
        "updated_at": "2025-05-12T06:17:45.697Z",
        "__v": 0
    },
    {
        "_id": "68219373817baf17125f1e32",
        "name": "Alice Smith",
        "email": "alice.smith@example.com",
        "role": "student",
        "created_at": "2025-05-12T06:21:39.508Z",
        "updated_at": "2025-05-12T06:21:39.508Z",
        "__v": 0
    },
    {
        "_id": "6821939f817baf17125f1e34",
        "name": "Dr. John Doe",
        "email": "john.doe@university.edu",
        "role": "faculty",
        "created_at": "2025-05-12T06:22:23.139Z",
        "updated_at": "2025-05-12T06:22:23.139Z",
        "__v": 0
    },
    {
        "_id": "682193a7817baf17125f1e36",
        "name": "Bob Johnson",
        "email": "bob.johnson@library.org",
        "role": "student",
        "created_at": "2025-05-12T06:22:31.064Z",
        "updated_at": "2025-05-12T06:22:31.064Z",
        "__v": 0
    }
]



[
    {
        "_id": "682194c7fb6bb085a45de19a",
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "isbn": "9780132350884",
        "genre": "Programming",
        "copies": 4,
        "created_at": "2025-05-12T06:27:19.264Z",
        "updated_at": "2025-05-12T06:31:07.323Z",
        "__v": 0
    },
    {
        "_id": "682194e2fb6bb085a45de19c",
        "title": "The Great Gatsby",
        "author": "F. Scott Fitzgerald",
        "isbn": "9780743273565",
        "genre": "Fiction",
        "copies": 3,
        "created_at": "2025-05-12T06:27:46.234Z",
        "updated_at": "2025-05-12T06:27:46.234Z",
        "__v": 0
    },
    {
        "_id": "68219643fb6bb085a45de1a6",
        "title": "Introduction to Algorithms",
        "author": "Thomas H. Cormen",
        "isbn": "9780262033848",
        "genre": "Computer Science",
        "copies": 2,
        "created_at": "2025-05-12T06:33:39.811Z",
        "updated_at": "2025-05-12T06:33:39.811Z",
        "__v": 0
    }
]



*/