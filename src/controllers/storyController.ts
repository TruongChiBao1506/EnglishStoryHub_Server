import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Story from '../models/Story';
import Comment from '../models/Comment';
import User, { IUser } from '../models/User';
import { asyncHandler } from '../middleware/errorHandler';
import { checkAndAwardAchievements } from '../utils/achievementSystem';
import { getUserLevelInfo } from '../utils/levelSystem';

// In-memory cache để prevent duplicate views trong thời gian ngắn
const recentViews = new Map<string, number>();

// Cleanup expired views mỗi 5 phút
setInterval(() => {
  const now = Date.now();
  const expireTime = 10000; // 10 seconds
  
  for (const [key, timestamp] of recentViews.entries()) {
    if (now - timestamp > expireTime) {
      recentViews.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface AuthRequest extends Request {
  user?: IUser;
}

interface QueryParams {
  page?: string;
  limit?: string;
  difficulty?: string;
  tags?: string;
  author?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export const createStory = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
  }

  const storyData = {
    ...req.body,
    author: req.user._id,
  };

  const story = await Story.create(storyData);
  await story.populate('author', 'username avatar level');

  // Award points to user for creating a story
  const updatedUser = await User.findByIdAndUpdate(req.user._id, {
    $inc: { points: 10 }
  }, { new: true });

  // Check for achievements và level up
  const newAchievements = await checkAndAwardAchievements(req.user._id.toString(), 'STORY_CREATED');
  
  // Check for level up
  const oldLevel = req.user.level;
  const newLevelInfo = getUserLevelInfo(updatedUser!.points);
  
  let levelUpInfo = null;
  if (oldLevel !== newLevelInfo.level) {
    await User.findByIdAndUpdate(req.user._id, { level: newLevelInfo.level });
    await checkAndAwardAchievements(req.user._id.toString(), 'LEVEL_UP', { newLevel: newLevelInfo.level });
    
    levelUpInfo = {
      from: oldLevel,
      to: newLevelInfo.level,
      badge: newLevelInfo.badge,
      name: newLevelInfo.name
    };
  }

  res.status(201).json({
    success: true,
    message: 'Story created successfully! 🎉',
    data: {
      story,
      pointsEarned: 10,
      newAchievements: newAchievements.map(ach => ({
        title: ach.title,
        badge: ach.badge,
        points: ach.pointsAwarded
      })),
      levelUp: levelUpInfo,
      userStats: {
        totalPoints: updatedUser!.points,
        level: newLevelInfo.level,
        levelName: newLevelInfo.name,
        nextLevel: newLevelInfo.nextLevel
      }
    }
  });
});

export const getStories = asyncHandler(async (req: Request<{}, {}, {}, QueryParams>, res: Response) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
  const skip = (page - 1) * limit;

  // Build filter object
  const filter: any = { isPublished: true };

  if (req.query.difficulty) {
    filter.difficulty = req.query.difficulty;
  }

  if (req.query.tags) {
    const tags = req.query.tags.split(',').map(tag => tag.trim());
    filter.tags = { $in: tags };
  }

  if (req.query.author) {
    filter.author = req.query.author;
  }

  if (req.query.search) {
    filter.$text = { $search: req.query.search };
  }

  // Build sort object
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const sort: any = { [sortBy]: sortOrder };

  // Add featured stories to the top
  if (sortBy === 'createdAt') {
    sort.isFeatured = -1;
  }

  const stories = await Story.find(filter)
    .populate('author', 'username avatar level')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const totalStories = await Story.countDocuments(filter);
  const totalPages = Math.ceil(totalStories / limit);

  res.status(200).json({
    success: true,
    stories,
    pagination: {
      currentPage: page,
      totalPages,
      totalStories,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

export const getStoryById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Debug log để theo dõi API calls
  console.log(`📖 getStoryById called for story: ${id} at ${new Date().toISOString()}`);
  console.log(`🍪 Current cookies:`, Object.keys(req.cookies).filter(key => key.startsWith('story_viewed_')));

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid story ID',
    });
  }

  const story = await Story.findById(id)
    .populate('author', 'username avatar level bio');

  if (!story) {
    return res.status(404).json({
      success: false,
      message: 'Story not found',
    });
  }

  if (!story.isPublished && (!req.user || story.author._id.toString() !== req.user._id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to unpublished story',
    });
  }

  // Hybrid view tracking: In-memory cache + Cookie-based
  const viewKey = `${req.ip || 'unknown'}_${id}`; // Combine IP + story ID
  const viewedCookieName = `story_viewed_${id}`;
  const hasViewedRecently = req.cookies[viewedCookieName];
  const hasViewedInMemory = recentViews.has(viewKey);
  const now = Date.now();

  console.log(`🔍 View tracking - IP: ${req.ip}, Cookie: ${!!hasViewedRecently}, Memory: ${hasViewedInMemory}`);

  // Only increment view count if BOTH conditions are false
  if (!hasViewedRecently && !hasViewedInMemory) {
    console.log(`⬆️ Incrementing view count for story: ${id}`);
    await Story.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } });
    
    // Add to in-memory cache (prevents immediate duplicates)
    recentViews.set(viewKey, now);
    
    // Set cookie that expires in 24 hours (prevents long-term duplicates)
    res.cookie(viewedCookieName, 'true', {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    console.log(`🍪 Set cookie: ${viewedCookieName} + memory cache: ${viewKey}`);
  } else {
    console.log(`🚫 Skipping view count - already viewed (Cookie: ${!!hasViewedRecently}, Memory: ${hasViewedInMemory})`);
  }

  // Check if user has liked this story
  const hasLiked = req.user ? story.likes.includes(req.user._id) : false;

  res.status(200).json({
    success: true,
    story: {
      ...story.toObject(),
      hasLiked,
    },
  });
});

export const updateStory = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid story ID',
    });
  }

  const story = await Story.findById(id);

  if (!story) {
    return res.status(404).json({
      success: false,
      message: 'Story not found',
    });
  }

  // Check ownership
  if (story.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only edit your own stories.',
    });
  }

  const updatedStory = await Story.findByIdAndUpdate(
    id,
    req.body,
    { new: true, runValidators: true }
  ).populate('author', 'username avatar level');

  res.status(200).json({
    success: true,
    message: 'Story updated successfully',
    story: updatedStory,
  });
});

export const deleteStory = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid story ID',
    });
  }

  const story = await Story.findById(id);

  if (!story) {
    return res.status(404).json({
      success: false,
      message: 'Story not found',
    });
  }

  // Check ownership
  if (story.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only delete your own stories.',
    });
  }

  // Delete associated comments
  await Comment.deleteMany({ story: id });

  // Delete story
  await Story.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Story deleted successfully',
  });
});

export const toggleLike = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid story ID',
    });
  }

  const story = await Story.findById(id);

  if (!story) {
    return res.status(404).json({
      success: false,
      message: 'Story not found',
    });
  }

  const userId = req.user._id;
  const hasLiked = story.likes.includes(userId);

  if (hasLiked) {
    // Unlike
    story.likes = story.likes.filter(like => !like.equals(userId));
  } else {
    // Like
    story.likes.push(userId);
    
    // Award points to story author (but not to self)
    if (story.author.toString() !== userId.toString()) {
      await User.findByIdAndUpdate(story.author, {
        $inc: { points: 1 }
      });
      
      // Check achievements for story author getting likes
      await checkAndAwardAchievements(story.author.toString(), 'STORY_LIKED');
    }
  }

  await story.save();

  res.status(200).json({
    success: true,
    message: hasLiked ? 'Story unliked' : 'Story liked',
    likesCount: story.likesCount,
    hasLiked: !hasLiked,
  });
});

export const getUserStories = asyncHandler(async (req: Request<{}, {}, {}, QueryParams>, res: Response) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page || '1', 10);
  const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
  const skip = (page - 1) * limit;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID',
    });
  }

  const filter: any = { 
    author: userId,
    isPublished: true 
  };

  const stories = await Story.find(filter)
    .populate('author', 'username avatar level')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalStories = await Story.countDocuments(filter);
  const totalPages = Math.ceil(totalStories / limit);

  res.status(200).json({
    success: true,
    stories,
    pagination: {
      currentPage: page,
      totalPages,
      totalStories,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});
