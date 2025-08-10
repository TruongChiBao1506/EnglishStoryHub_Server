import express from 'express';
import { 
  getLeaderboard, 
  getUserStats, 
  getUserAchievementsController,
  getPublicUserStats 
} from '../controllers/userStatsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/leaderboard', getLeaderboard);
router.get('/profile/:userId/stats', getPublicUserStats);

// Protected routes
router.get('/my-stats', authenticate, getUserStats);
router.get('/my-achievements', authenticate, getUserAchievementsController);

export default router;
