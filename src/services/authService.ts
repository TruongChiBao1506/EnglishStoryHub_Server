import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

export class AuthService {
  static generateToken(userId: string): string {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const payload = { userId };
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    return jwt.sign(payload, secret, { expiresIn } as any);
  }

  static async createUser(userData: {
    username: string;
    email: string;
    password: string;
    bio?: string;
    level?: string;
  }): Promise<IUser> {
    const { username, email, password, bio, level } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const errorMessage = existingUser.email === email 
        ? 'Email already registered' 
        : 'Username already taken';
      throw new Error(errorMessage);
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      bio: bio || '',
      level: level || 'beginner',
    });

    return user;
  }

  static async authenticateUser(email: string, password: string): Promise<IUser> {
    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated. Please contact support.');
    }

    return user;
  }

  static async getUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId);
  }

  static async updateUserProfile(
    userId: string, 
    updateData: {
      username?: string;
      bio?: string;
      level?: "beginner" | "intermediate" | "advanced";
      avatar?: string;
    }
  ): Promise<IUser> {
    const { username, bio, level, avatar } = updateData;

    // Check if username is taken by another user
    if (username) {
      const currentUser = await User.findById(userId);
      if (currentUser && username !== currentUser.username) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          throw new Error('Username already taken');
        }
      }
    }

    const updateFields: Partial<IUser> = {};
    if (username) updateFields.username = username;
    if (bio !== undefined) updateFields.bio = bio;
    if (level) updateFields.level = level;
    if (avatar !== undefined) updateFields.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  static createUserResponse(user: IUser) {
    return {
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
    };
  }
}
