import express from 'express';
import {
  createStory,
  getStories,
  getStoryById,
  updateStory,
  deleteStory,
  toggleLike,
  getUserStories,
} from '../controllers/storyController';
import { authenticate, optionalAuth } from '../middleware/auth';
import {
  validateStoryCreation,
  validateStoryUpdate,
  handleValidationErrors,
} from '../middleware/validation';

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getStories);
router.get('/user/:userId', getUserStories);
router.get('/:id', optionalAuth, getStoryById);

// Protected routes
router.post(
  '/',
  authenticate,
  validateStoryCreation,
  handleValidationErrors,
  createStory
);

router.put(
  '/:id',
  authenticate,
  validateStoryUpdate,
  handleValidationErrors,
  updateStory
);

router.delete('/:id', authenticate, deleteStory);
router.post('/:id/like', authenticate, toggleLike);

export default router;
