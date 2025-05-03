import express from 'express';
import {
  createUser,
  getUser,
  updateUser,
  getAllUsers,
} from '../controllers/userController.js';

const router = express.Router();

router.post('/', createUser);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.get('/', getAllUsers);

export default router;