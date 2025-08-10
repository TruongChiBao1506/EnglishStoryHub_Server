export interface LevelInfo {
  level: 'beginner' | 'intermediate' | 'advanced';
  name: string;
  badge: string;
  min: number;
  max: number;
  points: number;
  nextLevel?: {
    level: string;
    name: string;
    pointsNeeded: number;
  };
}

export const LEVEL_SYSTEM = {
  beginner: { 
    min: 0, 
    max: 99, 
    badge: '🌱', 
    name: 'Newbie Writer',
    color: '#22c55e'
  },
  intermediate: { 
    min: 100, 
    max: 499, 
    badge: '🌿', 
    name: 'Rising Author',
    color: '#3b82f6'
  },
  advanced: { 
    min: 500, 
    max: Infinity, 
    badge: '🌳', 
    name: 'Master Storyteller',
    color: '#8b5cf6'
  }
};

export const getUserLevelInfo = (points: number): LevelInfo => {
  for (const [level, info] of Object.entries(LEVEL_SYSTEM)) {
    if (points >= info.min && points <= info.max) {
      let nextLevel = null;
      
      if (level === 'beginner') {
        nextLevel = {
          level: 'intermediate',
          name: LEVEL_SYSTEM.intermediate.name,
          pointsNeeded: 100 - points
        };
      } else if (level === 'intermediate') {
        nextLevel = {
          level: 'advanced',
          name: LEVEL_SYSTEM.advanced.name,
          pointsNeeded: 500 - points
        };
      }

      return { 
        level: level as 'beginner' | 'intermediate' | 'advanced',
        points,
        ...(nextLevel && { nextLevel }),
        ...info
      };
    }
  }
  return {
    level: 'beginner',
    points: 0,
    ...LEVEL_SYSTEM.beginner
  };
};

export const getPointsForActivity = (activity: string): number => {
  const POINT_REWARDS = {
    CREATE_STORY: 10,
    RECEIVE_LIKE: 1,
    GIVE_COMMENT: 1,
    RECEIVE_COMMENT: 2,
    DAILY_LOGIN: 5,
    COMPLETE_PROFILE: 10,
    FIRST_STORY: 15,
    STORY_FEATURED: 25
  };

  return POINT_REWARDS[activity as keyof typeof POINT_REWARDS] || 0;
};
