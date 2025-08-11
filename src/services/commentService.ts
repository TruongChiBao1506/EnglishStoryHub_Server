import mongoose from 'mongoose';
import Comment from '../models/Comment';
import Story from '../models/Story';
import User from '../models/User';

export class CommentService {
  static async createComment(userId: string, storyId: string, content: string, parentComment?: string) {
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      throw new Error('Invalid story ID');
    }

    // Check if story exists
    const story = await Story.findById(storyId);
    if (!story) {
      throw new Error('Story not found');
    }

    // If replying to a comment, check if parent comment exists
    if (parentComment) {
      if (!mongoose.Types.ObjectId.isValid(parentComment)) {
        throw new Error('Invalid parent comment ID');
      }

      const parentCommentDoc = await Comment.findById(parentComment);
      if (!parentCommentDoc || parentCommentDoc.story.toString() !== storyId) {
        throw new Error('Parent comment not found or does not belong to this story');
      }
    }

    const comment = await Comment.create({
      content,
      author: userId,
      story: storyId,
      parentComment: parentComment || null,
    });

    await comment.populate('author', 'username avatar level');

    // Update story's comment count
    await Story.findByIdAndUpdate(storyId, {
      $inc: { commentsCount: 1 }
    });

    // Award points to user for commenting
    await User.findByIdAndUpdate(userId, {
      $inc: { points: 2 }
    });

    return comment;
  }

  static async getComments(storyId: string, page: number = 1, limit: number = 20) {
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      throw new Error('Invalid story ID');
    }

    const skip = (page - 1) * limit;

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

    return {
      comments: commentsWithReplies,
      pagination: {
        currentPage: page,
        totalPages,
        totalComments,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    };
  }

  static async updateComment(commentId: string, userId: string, content: string) {
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new Error('Invalid comment ID');
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check ownership
    if (comment.author.toString() !== userId) {
      throw new Error('Access denied. You can only edit your own comments.');
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { content },
      { new: true, runValidators: true }
    ).populate('author', 'username avatar level');

    return updatedComment;
  }

  static async deleteComment(commentId: string, userId: string, userRole: string) {
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new Error('Invalid comment ID');
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check ownership or admin role
    if (comment.author.toString() !== userId && userRole !== 'admin') {
      throw new Error('Access denied. You can only delete your own comments.');
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

    return { message: 'Comment deleted successfully' };
  }

  static async toggleCommentLike(commentId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new Error('Invalid comment ID');
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const hasLiked = comment.likes.includes(userObjectId);

    if (hasLiked) {
      // Unlike
      comment.likes = comment.likes.filter(like => !like.equals(userObjectId));
    } else {
      // Like
      comment.likes.push(userObjectId);
      
      // Award points to comment author (but not to self)
      if (comment.author.toString() !== userId) {
        await User.findByIdAndUpdate(comment.author, {
          $inc: { points: 1 }
        });
      }
    }

    await comment.save();

    return {
      message: hasLiked ? 'Comment unliked' : 'Comment liked',
      likesCount: comment.likesCount,
      hasLiked: !hasLiked,
    };
  }
}
