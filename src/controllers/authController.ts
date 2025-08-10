import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { asyncHandler } from '../middleware/errorHandler';

const generateToken = (userId: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  const payload = { userId };
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn } as any);
};

const sendTokenResponse = (user: IUser, statusCode: number, res: Response): void => {
  const token = generateToken(user._id.toString());
  
  const userResponse = {
    id: user._id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    level: user.level,
    points: user.points,
    role: user.role,
    createdAt: user.createdAt,
  };

  res.status(statusCode).json({
    success: true,
    message: statusCode === 201 ? 'User registered successfully' : 'Login successful',
    token,
    user: userResponse,
  });
};

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { username, email, password, bio, level } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    res.status(400).json({
      success: false,
      message: existingUser.email === email 
        ? 'Email already registered' 
        : 'Username already taken',
    });
    return;
  }

  // Create new user
  const user = await User.create({
    username,
    email,
    password,
    bio: bio || '',
    level: level || 'beginner',
  });

  sendTokenResponse(user, 201, res);
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
    return;
  }

  if (!user.isActive) {
    res.status(401).json({
      success: false,
      message: 'Account is deactivated. Please contact support.',
    });
    return;
  }

  sendTokenResponse(user, 200, res);
});

export const getMe = asyncHandler(async (req: Request & { user?: IUser }, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
    return;
  }

  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      level: user.level,
      points: user.points,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

export const updateProfile = asyncHandler(async (req: Request & { user?: IUser }, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
    return;
  }

  const { username, bio, level, avatar } = req.body;
  
  // Check if username is taken by another user
  if (username && username !== req.user.username) {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Username already taken',
      });
      return;
    }
  }

  const updateData: Partial<IUser> = {};
  if (username) updateData.username = username;
  if (bio !== undefined) updateData.bio = bio;
  if (level) updateData.level = level;
  if (avatar !== undefined) updateData.avatar = avatar;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      level: user.level,
      points: user.points,
      role: user.role,
      updatedAt: user.updatedAt,
    },
  });
});
