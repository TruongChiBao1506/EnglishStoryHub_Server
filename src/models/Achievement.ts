import mongoose, { Schema, Document } from 'mongoose';

export interface IAchievement extends Document {
  user: mongoose.Types.ObjectId;
  achievementId: string;
  title: string;
  description: string;
  badge: string;
  pointsAwarded: number;
  category: 'writing' | 'social' | 'milestone' | 'special';
  unlockedAt: Date;
}

const achievementSchema = new Schema<IAchievement>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  achievementId: {
    type: String,
    required: true
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  badge: { 
    type: String, 
    required: true 
  },
  pointsAwarded: { 
    type: Number, 
    default: 0 
  },
  category: { 
    type: String, 
    enum: ['writing', 'social', 'milestone', 'special'],
    default: 'writing'
  },
  unlockedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true,
  versionKey: false
});

// Index để tối ưu query
achievementSchema.index({ user: 1, achievementId: 1 }, { unique: true });
achievementSchema.index({ user: 1, unlockedAt: -1 });

export default mongoose.model<IAchievement>('Achievement', achievementSchema);
