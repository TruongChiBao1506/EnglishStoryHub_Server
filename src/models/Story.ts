import mongoose, { Document, Schema } from 'mongoose';

export interface IStory extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  content: string;
  excerpt: string;
  author: mongoose.Types.ObjectId;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  likes: mongoose.Types.ObjectId[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  isPublished: boolean;
  isFeatured: boolean;
  language: string;
  estimatedReadTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    title: {
      type: String,
      required: [true, 'Story title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    content: {
      type: String,
      required: [true, 'Story content is required'],
      minlength: [50, 'Story must be at least 50 characters'],
      maxlength: [5000, 'Story cannot exceed 5000 characters'],
    },
    excerpt: {
      type: String,
      required: true,
      maxlength: [200, 'Excerpt cannot exceed 200 characters'],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Story author is required'],
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: [true, 'Difficulty level is required'],
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [20, 'Tag cannot exceed 20 characters'],
    }],
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en'],
    },
    estimatedReadTime: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for performance
storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ difficulty: 1, isPublished: 1 });
storySchema.index({ tags: 1 });
storySchema.index({ title: 'text', content: 'text' });
storySchema.index({ likesCount: -1, createdAt: -1 });

// Pre-save middleware to generate excerpt and calculate read time
storySchema.pre('save', function (next) {
  if (this.isModified('content')) {
    // Generate excerpt if not provided
    if (!this.excerpt) {
      this.excerpt = this.content.substring(0, 150).trim() + '...';
    }
    
    // Calculate estimated read time (assuming 200 words per minute)
    const wordCount = this.content.split(' ').length;
    this.estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200));
  }
  
  next();
});

// Update likes count when likes array changes
storySchema.pre('save', function (next) {
  if (this.isModified('likes')) {
    this.likesCount = this.likes.length;
  }
  next();
});

export default mongoose.model<IStory>('Story', storySchema);
