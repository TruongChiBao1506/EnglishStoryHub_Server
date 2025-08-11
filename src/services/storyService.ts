import mongoose from 'mongoose';
import Story from '../models/Story';
import Comment from '../models/Comment';
import User from '../models/User';
import { checkAndAwardAchievements } from '../utils/achievementSystem';
import { getUserLevelInfo } from '../utils/levelSystem';

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

interface StoryFilters {
  isPublished: boolean;
  difficulty?: string;
  tags?: { $in: string[] };
  author?: string;
  $text?: { $search: string };
}

export class StoryService {
  static async createStory(userId: string, storyData: any) {
    const completeStoryData = {
      ...storyData,
      author: userId,
    };

    const story = await Story.create(completeStoryData);
    await story.populate('author', 'username avatar level');

    // Award points to user for creating a story
    const updatedUser = await User.findByIdAndUpdate(userId, {
      $inc: { points: 10 }
    }, { new: true });

    if (!updatedUser) {
      throw new Error('User not found');
    }

    // Check for achievements and level up
    const newAchievements = await checkAndAwardAchievements(userId, 'STORY_CREATED');
    
    // Check for level up
    const currentUser = await User.findById(userId);
    const oldLevel = currentUser?.level;
    const newLevelInfo = getUserLevelInfo(updatedUser.points);
    
    let levelUpInfo = null;
    if (oldLevel !== newLevelInfo.level) {
      await User.findByIdAndUpdate(userId, { level: newLevelInfo.level });
      await checkAndAwardAchievements(userId, 'LEVEL_UP', { newLevel: newLevelInfo.level });
      
      levelUpInfo = {
        from: oldLevel,
        to: newLevelInfo.level,
        badge: newLevelInfo.badge,
        name: newLevelInfo.name
      };
    }

    return {
      story,
      pointsEarned: 10,
      newAchievements: newAchievements.map(ach => ({
        title: ach.title,
        badge: ach.badge,
        points: ach.pointsAwarded
      })),
      levelUp: levelUpInfo,
      userStats: {
        totalPoints: updatedUser.points,
        level: newLevelInfo.level,
        levelName: newLevelInfo.name,
        nextLevel: newLevelInfo.nextLevel
      }
    };
  }

  static async getStories(queryParams: QueryParams) {
    const page = parseInt(queryParams.page || '1', 10);
    const limit = Math.min(parseInt(queryParams.limit || '10', 10), 50);
    const skip = (page - 1) * limit;

    // Build filter object
    const filter: StoryFilters = { isPublished: true };

    if (queryParams.difficulty) {
      filter.difficulty = queryParams.difficulty;
    }

    if (queryParams.tags) {
      const tags = queryParams.tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tags };
    }

    if (queryParams.author) {
      filter.author = queryParams.author;
    }

    if (queryParams.search) {
      filter.$text = { $search: queryParams.search };
    }

    // Build sort object
    const sortBy = queryParams.sortBy || 'createdAt';
    const sortOrder = queryParams.sortOrder === 'asc' ? 1 : -1;
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

    return {
      stories,
      pagination: {
        currentPage: page,
        totalPages,
        totalStories,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    };
  }

  static async getStoryById(storyId: string, userId?: string) {
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      throw new Error('Invalid story ID');
    }

    const story = await Story.findById(storyId)
      .populate('author', 'username avatar level bio');

    if (!story) {
      throw new Error('Story not found');
    }

    if (!story.isPublished && (!userId || story.author._id.toString() !== userId)) {
      throw new Error('Access denied to unpublished story');
    }

    // Check if user has liked this story
    const hasLiked = userId ? story.likes.includes(new mongoose.Types.ObjectId(userId)) : false;

    return {
      ...story.toObject(),
      hasLiked,
    };
  }

  static async incrementViewCount(storyId: string, viewKey: string, hasViewedRecently: boolean, recentViews: Map<string, number>) {
    const hasViewedInMemory = recentViews.has(viewKey);
    const now = Date.now();

    // Only increment view count if BOTH conditions are false
    if (!hasViewedRecently && !hasViewedInMemory) {
      await Story.findByIdAndUpdate(storyId, { $inc: { viewsCount: 1 } });
      
      // Add to in-memory cache (prevents immediate duplicates)
      recentViews.set(viewKey, now);
      
      return true; // Indicates view was counted
    }
    
    return false; // View was not counted
  }

  static async updateStory(storyId: string, userId: string, userRole: string, updateData: any) {
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      throw new Error('Invalid story ID');
    }

    const story = await Story.findById(storyId);
    if (!story) {
      throw new Error('Story not found');
    }

    // Check ownership
    if (story.author.toString() !== userId && userRole !== 'admin') {
      throw new Error('Access denied. You can only edit your own stories.');
    }

    const updatedStory = await Story.findByIdAndUpdate(
      storyId,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'username avatar level');

    return updatedStory;
  }

  static async deleteStory(storyId: string, userId: string, userRole: string) {
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      throw new Error('Invalid story ID');
    }

    const story = await Story.findById(storyId);
    if (!story) {
      throw new Error('Story not found');
    }

    // Check ownership
    if (story.author.toString() !== userId && userRole !== 'admin') {
      throw new Error('Access denied. You can only delete your own stories.');
    }

    // Delete associated comments
    await Comment.deleteMany({ story: storyId });

    // Delete story
    await Story.findByIdAndDelete(storyId);

    return { message: 'Story deleted successfully' };
  }

  static async toggleLike(storyId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      throw new Error('Invalid story ID');
    }

    const story = await Story.findById(storyId);
    if (!story) {
      throw new Error('Story not found');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const hasLiked = story.likes.includes(userObjectId);

    if (hasLiked) {
      // Unlike
      story.likes = story.likes.filter(like => !like.equals(userObjectId));
    } else {
      // Like
      story.likes.push(userObjectId);
      
      // Award points to story author (but not to self)
      if (story.author.toString() !== userId) {
        await User.findByIdAndUpdate(story.author, {
          $inc: { points: 1 }
        });
        
        // Check achievements for story author getting likes
        await checkAndAwardAchievements(story.author.toString(), 'STORY_LIKED');
      }
    }

    await story.save();

    return {
      message: hasLiked ? 'Story unliked' : 'Story liked',
      likesCount: story.likesCount,
      hasLiked: !hasLiked,
    };
  }

  static async getUserStories(userId: string, queryParams: QueryParams) {
    const page = parseInt(queryParams.page || '1', 10);
    const limit = Math.min(parseInt(queryParams.limit || '10', 10), 50);
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const filter = { 
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

    return {
      stories,
      pagination: {
        currentPage: page,
        totalPages,
        totalStories,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    };
  }
}
