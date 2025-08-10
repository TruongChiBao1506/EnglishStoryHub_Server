import express from 'express';
import authRoutes from './authRoutes';
import storyRoutes from './storyRoutes';
import commentRoutes from './commentRoutes';
import aiRoutes from './aiRoutes';
import userStatsRoutes from './userStatsRoutes';
import translationRoutes from './translationRoutes';

const router = express.Router();

// Health check route
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'English Story Hub API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/stories', storyRoutes);
router.use('/comments', commentRoutes);
router.use('/ai', aiRoutes);
router.use('/user-stats', userStatsRoutes);
router.use('/translate', translationRoutes);

export default router;
