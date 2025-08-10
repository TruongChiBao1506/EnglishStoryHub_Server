import express from 'express';
import {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  toggleCommentLike,
} from '../controllers/commentController';
import { authenticate } from '../middleware/auth';
import {
  validateCommentCreation,
  validateCommentUpdate,
  handleValidationErrors,
} from '../middleware/validation';

const router = express.Router();

// Public routes
router.get('/story/:storyId', getComments);

// Protected routes
router.post(
  '/story/:storyId',
  authenticate,
  validateCommentCreation,
  handleValidationErrors,
  createComment
);

router.put(
  '/:commentId',
  authenticate,
  validateCommentUpdate,
  handleValidationErrors,
  updateComment
);

router.delete('/:commentId', authenticate, deleteComment);
router.post('/:commentId/like', authenticate, toggleCommentLike);

export default router;
