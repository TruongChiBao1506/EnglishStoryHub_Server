import { Request, Response } from 'express';
import { IUser } from '../models/User';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthService } from '../services';

const sendTokenResponse = (user: IUser, statusCode: number, res: Response): void => {
  const token = AuthService.generateToken(user._id.toString());
  const userResponse = AuthService.createUserResponse(user);

  res.status(statusCode).json({
    success: true,
    message: statusCode === 201 ? 'User registered successfully' : 'Login successful',
    token,
    user: userResponse,
  });
};

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await AuthService.createUser(req.body);
    sendTokenResponse(user, 201, res);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await AuthService.authenticateUser(email, password);
    sendTokenResponse(user, 200, res);
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
});

export const getMe = asyncHandler(async (req: Request & { user?: IUser }, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
    return;
  }

  try {
    const user = await AuthService.getUserById(req.user._id.toString());
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: AuthService.createUserResponse(user),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export const updateProfile = asyncHandler(async (req: Request & { user?: IUser }, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
    return;
  }

  try {
    const user = await AuthService.updateUserProfile(req.user._id.toString(), req.body);
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: AuthService.createUserResponse(user),
    });
  } catch (error: any) {
    const statusCode = error.message === 'Username already taken' ? 400 : 
                      error.message === 'User not found' ? 404 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});
