import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Comment from '../models/Comment';
import Story from '../models/Story';
import User, { IUser } from '../models/User';
import { asyncHandler } from '../middleware/errorHandler';

interface AuthRequest extends Request {
  user?: IUser;
}

export const createComment = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
    return;
  }

  const { storyId } = req.params;
  const { content, parentComment } = req.body;

  if (!storyId || !mongoose.Types.ObjectId.isValid(storyId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid story ID',
    });
    return;
  }

  // Check if story exists
  const story = await Story.findById(storyId);
  if (!story) {
    res.status(404).json({
      success: false,
      message: 'Story not found',
    });
    return;
  }

  // If replying to a comment, check if parent comment exists
  if (parentComment) {
    if (!mongoose.Types.ObjectId.isValid(parentComment)) {
      res.status(400).json({
        success: false,
        message: 'Invalid parent comment ID',
      });
      return;
    }

    const parentCommentDoc = await Comment.findById(parentComment);
    if (!parentCommentDoc || parentCommentDoc.story.toString() !== storyId) {
      res.status(404).json({
        success: false,
        message: 'Parent comment not found or does not belong to this story',
      });
      return;
    }
  }

  const comment = await Comment.create({
    content,
    author: req.user._id,
    story: storyId,
    parentComment: parentComment || null,
  });

  await comment.populate('author', 'username avatar level');

  // Update story's comment count
  await Story.findByIdAndUpdate(storyId, {
    $inc: { commentsCount: 1 }
  });

  // Award points to user for commenting
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { points: 2 }
  });

  res.status(201).json({
    success: true,
    message: 'Comment created successfully',
    comment,
  });
});

export const getComments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { storyId } = req.params;
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);
  const skip = (page - 1) * limit;

  if (!storyId || !mongoose.Types.ObjectId.isValid(storyId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid story ID',
    });
    return;
  }

  // Get top-level comments (no parent)
  const comments = await Comment.find({
    story: storyId,
    parentComment: null,
  })
    .populate('author', 'username avatar level')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Get replies for each comment
  const commentIds = comments.map(comment => comment._id);
  const replies = await Comment.find({
    parentComment: { $in: commentIds }
  })
    .populate('author', 'username avatar level')
    .sort({ createdAt: 1 })
    .lean();

  // Group replies by parent comment
  const repliesMap = replies.reduce((acc: any, reply: any) => {
    const parentId = reply.parentComment.toString();
    if (!acc[parentId]) {
      acc[parentId] = [];
    }
    acc[parentId].push(reply);
    return acc;
  }, {});

  // Add replies to comments
  const commentsWithReplies = comments.map((comment: any) => ({
    ...comment,
    replies: repliesMap[comment._id.toString()] || [],
  }));

  const totalComments = await Comment.countDocuments({
    story: storyId,
    parentComment: null,
  });

  const totalPages = Math.ceil(totalComments / limit);

  res.status(200).json({
    success: true,
    comments: commentsWithReplies,
    pagination: {
      currentPage: page,
      totalPages,
      totalComments,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

export const updateComment = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
    return;
  }

  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid comment ID',
    });
    return;
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    res.status(404).json({
      success: false,
      message: 'Comment not found',
    });
    return;
  }

  // Check ownership
  if (comment.author.toString() !== req.user._id.toString()) {
    res.status(403).json({
      success: false,
      message: 'Access denied. You can only edit your own comments.',
    });
    return;
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    { content },
    { new: true, runValidators: true }
  ).populate('author', 'username avatar level');

  res.status(200).json({
    success: true,
    message: 'Comment updated successfully',
    comment: updatedComment,
  });
});

export const deleteComment = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
    return;
  }

  const { commentId } = req.params;

  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid comment ID',
    });
    return;
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    res.status(404).json({
      success: false,
      message: 'Comment not found',
    });
    return;
  }

  // Check ownership or admin role
  if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Access denied. You can only delete your own comments.',
    });
    return;
  }

  // Delete all replies to this comment
  await Comment.deleteMany({ parentComment: commentId });

  // Count total deleted comments (including replies)
  const deletedRepliesCount = await Comment.countDocuments({ parentComment: commentId });
  const totalDeleted = deletedRepliesCount + 1;

  // Delete the comment
  await Comment.findByIdAndDelete(commentId);

  // Update story's comment count
  await Story.findByIdAndUpdate(comment.story, {
    $inc: { commentsCount: -totalDeleted }
  });

  res.status(200).json({
    success: true,
    message: 'Comment deleted successfully',
  });
});

export const toggleCommentLike = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
    return;
  }

  const { commentId } = req.params;

  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid comment ID',
    });
    return;
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    res.status(404).json({
      success: false,
      message: 'Comment not found',
    });
    return;
  }

  const userId = req.user._id;
  const hasLiked = comment.likes.includes(userId);

  if (hasLiked) {
    // Unlike
    comment.likes = comment.likes.filter(like => !like.equals(userId));
  } else {
    // Like
    comment.likes.push(userId);
    
    // Award points to comment author (but not to self)
    if (comment.author.toString() !== userId.toString()) {
      await User.findByIdAndUpdate(comment.author, {
        $inc: { points: 1 }
      });
    }
  }

  await comment.save();

  res.status(200).json({
    success: true,
    message: hasLiked ? 'Comment unliked' : 'Comment liked',
    likesCount: comment.likesCount,
    hasLiked: !hasLiked,
  });
});
