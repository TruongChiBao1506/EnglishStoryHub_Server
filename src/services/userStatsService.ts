import User from '../models/User';
import Story from '../models/Story';
import Comment from '../models/Comment';
import { getUserLevelInfo } from '../utils/levelSystem';
import { getUserAchievements } from '../utils/achievementSystem';

export class UserStatsService {
  static async getLeaderboard(page: number = 1, limit: number = 10) {
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

    return {
      leaderboard,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    };
  }

  static async getUserStats(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get user rank
    const higherRankedUsers = await User.countDocuments({
      points: { $gt: user.points },
      isActive: true
    });
    const rank = higherRankedUsers + 1;

    // Get level info
    const levelInfo = getUserLevelInfo(user.points);

    // Get user stats
    const [storyCount, totalLikes, totalViews, commentCount] = await Promise.all([
      Story.countDocuments({ author: userId, isPublished: true }),
      Story.aggregate([
        { $match: { author: user._id } },
        { $project: { likesCount: { $size: '$likes' } } },
        { $group: { _id: null, total: { $sum: '$likesCount' } } }
      ]).then(result => result[0]?.total || 0),
      Story.aggregate([
        { $match: { author: user._id } },
        { $group: { _id: null, total: { $sum: '$viewsCount' } } }
      ]).then(result => result[0]?.total || 0),
      Comment.countDocuments({ author: userId })
    ]);

    // Get achievements
    const achievementsData = await getUserAchievements(userId);

    return {
      user: {
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        level: user.level,
        points: user.points
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
    };
  }

  static async getUserAchievements(userId: string) {
    const achievementsData = await getUserAchievements(userId);

    if (!achievementsData) {
      throw new Error('Failed to fetch achievements');
    }

    return achievementsData;
  }

  static async getPublicUserStats(userId: string) {
    const user = await User.findById(userId)
      .select('username avatar bio level points createdAt')
      .lean();

    if (!user) {
      throw new Error('User not found');
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

    return {
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
    };
  }
}
