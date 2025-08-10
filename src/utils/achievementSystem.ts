import User from '../models/User';
import Achievement from '../models/Achievement';
import Story from '../models/Story';
import Comment from '../models/Comment';
import { getUserLevelInfo } from './levelSystem';

interface AchievementTemplate {
  title: string;
  description: string;
  badge: string;
  points: number;
  category: 'writing' | 'social' | 'milestone' | 'special';
}

const ACHIEVEMENT_TEMPLATES: Record<string, AchievementTemplate> = {
  FIRST_STORY: {
    title: 'First Steps 🎯',
    description: 'Published your first story',
    badge: '🎯',
    points: 15,
    category: 'writing'
  },
  STORY_MILESTONE_5: {
    title: 'Storyteller 📚',
    description: 'Published 5 stories',
    badge: '📚',
    points: 25,
    category: 'milestone'
  },
  STORY_MILESTONE_10: {
    title: 'Prolific Writer ✍️',
    description: 'Published 10 stories',
    badge: '✍️',
    points: 50,
    category: 'milestone'
  },
  POPULAR_WRITER: {
    title: 'Popular Writer ⭐',
    description: 'Received 25 total likes across all stories',
    badge: '⭐',
    points: 30,
    category: 'social'
  },
  SOCIAL_BUTTERFLY: {
    title: 'Social Butterfly 💬',
    description: 'Made 20 comments on other stories',
    badge: '💬',
    points: 20,
    category: 'social'
  },
  LEVEL_UP_INTERMEDIATE: {
    title: 'Rising Author 🌿',
    description: 'Reached Intermediate level (100+ points)',
    badge: '🌿',
    points: 20,
    category: 'milestone'
  },
  LEVEL_UP_ADVANCED: {
    title: 'Master Storyteller 🌳',
    description: 'Reached Advanced level (500+ points)',
    badge: '🌳',
    points: 50,
    category: 'milestone'
  },
  ENGAGEMENT_KING: {
    title: 'Engagement King 👑',
    description: 'One of your stories got 50+ views',
    badge: '👑',
    points: 40,
    category: 'special'
  }
};

export const checkAndAwardAchievements = async (userId: string, action: string, data?: any) => {
  try {
    const user = await User.findById(userId);
    if (!user) return [];

    const achievementsToCheck: string[] = [];
    
    switch (action) {
      case 'STORY_CREATED':
        const storyCount = await Story.countDocuments({ author: userId, isPublished: true });
        
        if (storyCount === 1) achievementsToCheck.push('FIRST_STORY');
        if (storyCount === 5) achievementsToCheck.push('STORY_MILESTONE_5');
        if (storyCount === 10) achievementsToCheck.push('STORY_MILESTONE_10');
        break;

      case 'LEVEL_UP':
        if (data?.newLevel === 'intermediate') {
          achievementsToCheck.push('LEVEL_UP_INTERMEDIATE');
        }
        if (data?.newLevel === 'advanced') {
          achievementsToCheck.push('LEVEL_UP_ADVANCED');
        }
        break;

      case 'STORY_LIKED':
        // Check total likes across all user's stories
        const userStories = await Story.find({ author: userId }, 'likes');
        const totalLikes = userStories.reduce((sum, story) => sum + story.likes.length, 0);
        
        if (totalLikes >= 25) achievementsToCheck.push('POPULAR_WRITER');
        break;

      case 'COMMENT_MADE':
        const commentCount = await Comment.countDocuments({ author: userId });
        if (commentCount >= 20) achievementsToCheck.push('SOCIAL_BUTTERFLY');
        break;

      case 'STORY_VIEWS':
        if (data?.views >= 50) {
          achievementsToCheck.push('ENGAGEMENT_KING');
        }
        break;
    }

    const newAchievements = [];

    // Check and award each achievement
    for (const achievementId of achievementsToCheck) {
      const template = ACHIEVEMENT_TEMPLATES[achievementId];
      if (!template) continue;

      // Check if user already has this achievement
      const existingAchievement = await Achievement.findOne({
        user: userId,
        achievementId
      });

      if (!existingAchievement) {
        // Create achievement
        const achievement = await Achievement.create({
          user: userId,
          achievementId,
          title: template.title,
          description: template.description,
          badge: template.badge,
          pointsAwarded: template.points,
          category: template.category
        });

        // Award bonus points
        await User.findByIdAndUpdate(userId, {
          $inc: { points: template.points }
        });

        newAchievements.push(achievement);
        
        console.log(`🏆 Achievement unlocked for user ${userId}: ${template.title} (+${template.points} points)`);
      }
    }

    return newAchievements;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
};

export const getUserAchievements = async (userId: string) => {
  try {
    const achievements = await Achievement.find({ user: userId })
      .sort({ unlockedAt: -1 })
      .lean();

    const totalPointsFromAchievements = achievements.reduce((sum, ach) => sum + ach.pointsAwarded, 0);

    return {
      achievements,
      totalAchievements: achievements.length,
      totalPointsFromAchievements,
      categories: {
        writing: achievements.filter(a => a.category === 'writing').length,
        social: achievements.filter(a => a.category === 'social').length,
        milestone: achievements.filter(a => a.category === 'milestone').length,
        special: achievements.filter(a => a.category === 'special').length
      }
    };
  } catch (error) {
    console.error('Error getting user achievements:', error);
    return null;
  }
};

export { ACHIEVEMENT_TEMPLATES };
