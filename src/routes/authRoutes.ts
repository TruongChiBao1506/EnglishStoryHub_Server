import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import {
  validateUserRegistration,
  validateUserLogin,
  handleValidationErrors,
} from '../middleware/validation';

const router = express.Router();

// Public routes
router.post(
  '/register',
  validateUserRegistration,
  handleValidationErrors,
  register
);

router.post(
  '/login',
  validateUserLogin,
  handleValidationErrors,
  login
);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

export default router;
