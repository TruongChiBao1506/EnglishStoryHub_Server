import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import Story from '../models/Story';
import Comment from '../models/Comment';
import { asyncHandler } from '../middleware/errorHandler';
import { getUserLevelInfo } from '../utils/levelSystem';
import { getUserAchievements } from '../utils/achievementSystem';

interface AuthRequest extends Request {
  user?: IUser;
}

// Get leaderboard
export const getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = Math.min(parseInt(req.query.limit as string || '10', 10), 50);
  const skip = (page - 1) * limit;

  const users = await User.find({ isActive: true })
    .select('username avatar points level createdAt')
    .sort({ points: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalUsers = await User.countDocuments({ isActive: true });
  const totalPages = Math.ceil(totalUsers / limit);

  // Add rank and level info
  const leaderboard = users.map((user, index) => ({
    ...user,
    rank: skip + index + 1,
    levelInfo: getUserLevelInfo(user.points)
  }));

  res.status(200).json({
    success: true,
    data: {
      leaderboard,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    }
  });
});

// Get user rank and stats
export const getUserStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
  }

  // Get user rank
  const higherRankedUsers = await User.countDocuments({
    points: { $gt: req.user.points },
    isActive: true
  });
  const rank = higherRankedUsers + 1;

  // Get level info
  const levelInfo = getUserLevelInfo(req.user.points);

  // Get user stats
  const [storyCount, totalLikes, totalViews, commentCount] = await Promise.all([
    Story.countDocuments({ author: req.user._id, isPublished: true }),
    Story.aggregate([
      { $match: { author: req.user._id } },
      { $project: { likesCount: { $size: '$likes' } } },
      { $group: { _id: null, total: { $sum: '$likesCount' } } }
    ]).then(result => result[0]?.total || 0),
    Story.aggregate([
      { $match: { author: req.user._id } },
      { $group: { _id: null, total: { $sum: '$viewsCount' } } }
    ]).then(result => result[0]?.total || 0),
    Comment.countDocuments({ author: req.user._id })
  ]);

  // Get achievements
  const achievementsData = await getUserAchievements(req.user._id.toString());

  res.status(200).json({
    success: true,
    data: {
      user: {
        username: req.user.username,
        avatar: req.user.avatar,
        bio: req.user.bio,
        level: req.user.level,
        points: req.user.points
      },
      rank,
      levelInfo,
      stats: {
        storiesPublished: storyCount,
        totalLikes,
        totalViews,
        commentsPosted: commentCount
      },
      achievements: achievementsData
    }
  });
});

// Get user's achievements
export const getUserAchievementsController = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
  }

  const achievementsData = await getUserAchievements(req.user._id.toString());

  if (!achievementsData) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch achievements'
    });
  }

  res.status(200).json({
    success: true,
    data: achievementsData
  });
});

// Get public user profile stats (for viewing other users)
export const getPublicUserStats = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const user = await User.findById(userId)
    .select('username avatar bio level points createdAt')
    .lean();

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get user rank
  const higherRankedUsers = await User.countDocuments({
    points: { $gt: user.points },
    isActive: true
  });
  const rank = higherRankedUsers + 1;

  // Get level info
  const levelInfo = getUserLevelInfo(user.points);

  // Get public stats
  const [storyCount, totalLikes, totalViews] = await Promise.all([
    Story.countDocuments({ author: userId, isPublished: true }),
    Story.aggregate([
      { $match: { author: userId } },
      { $project: { likesCount: { $size: '$likes' } } },
      { $group: { _id: null, total: { $sum: '$likesCount' } } }
    ]).then(result => result[0]?.total || 0),
    Story.aggregate([
      { $match: { author: userId } },
      { $group: { _id: null, total: { $sum: '$viewsCount' } } }
    ]).then(result => result[0]?.total || 0)
  ]);

  // Get public achievements (recent ones)
  const achievementsData = await getUserAchievements(userId);

  res.status(200).json({
    success: true,
    data: {
      user,
      rank,
      levelInfo,
      stats: {
        storiesPublished: storyCount,
        totalLikes,
        totalViews,
        memberSince: user.createdAt
      },
      recentAchievements: achievementsData?.achievements.slice(0, 5) || []
    }
  });
});
