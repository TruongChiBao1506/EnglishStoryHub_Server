import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
      })),
    });
    return;
  }
  
  next();
};

// User validation rules
export const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

export const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Story validation rules
export const validateStoryCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
    
  body('content')
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Story content must be between 50 and 5000 characters'),
    
  body('difficulty')
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
    
  body('tags')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 tags allowed')
    .custom((tags: string[]) => {
      if (tags && tags.some((tag: string) => tag.length > 20)) {
        throw new Error('Each tag must be 20 characters or less');
      }
      return true;
    }),
    
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Excerpt cannot exceed 200 characters'),
];

export const validateStoryUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
    
  body('content')
    .optional()
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Story content must be between 50 and 5000 characters'),
    
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
    
  body('tags')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 tags allowed')
    .custom((tags: string[]) => {
      if (tags && tags.some((tag: string) => tag.length > 20)) {
        throw new Error('Each tag must be 20 characters or less');
      }
      return true;
    }),
    
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Excerpt cannot exceed 200 characters'),
];

// Comment validation rules
export const validateCommentCreation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters'),
];

export const validateCommentUpdate = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters'),
];
