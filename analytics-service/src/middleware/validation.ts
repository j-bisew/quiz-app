import { body, query, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: formattedErrors,
    });
    return;
  }
  next();
}

export const validateComment = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters'),
  handleValidationErrors,
];

export const validateLeaderboardEntry = [
  body('score').isInt({ min: 0, max: 100 }).withMessage('Score must be between 0 and 100'),
  body('timeSpent').isInt({ min: 1 }).withMessage('Time spent must be a positive integer'),
  handleValidationErrors,
];

export const validateQuizId = [
  param('quizId').isLength({ min: 1 }).withMessage('Quiz ID is required'),
  (req: Request, res: Response, next: Function) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid quiz ID',
        details: errors.array(),
      });
      return;
    }
    next();
  },
];

export const validateCommentId = [
  param('commentId').isLength({ min: 1 }).withMessage('Comment ID is required'),
  (req: Request, res: Response, next: Function) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid comment ID',
        details: errors.array(),
      });
      return;
    }
    next();
  },
];

export const validateUserId = [
  param('userId').isLength({ min: 1 }).withMessage('User ID is required'),
  (req: Request, res: Response, next: Function) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid user ID',
        details: errors.array(),
      });
      return;
    }
    next();
  },
];

export const validatePopularQuizzesQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  (req: Request, res: Response, next: Function) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid query parameters',
        details: errors.array(),
      });
      return;
    }
    next();
  },
];

export const validateAnalyticsData = [
  body('action')
    .isIn(['quiz_started', 'quiz_completed', 'comment_added', 'comment_deleted'])
    .withMessage('Invalid action type'),
  
  body('metadata.score')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Score must be between 0 and 100'),
    
  body('metadata.timeSpent')
    .optional()
    .isInt({ min: 1, max: 7200 })
    .withMessage('Time spent must be between 1 second and 2 hours'),
    
  body('metadata.commentText')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment text must be between 1 and 1000 characters'),
    
  handleValidationErrors,
];

export const validateStatsQuery = [
  query('from')
    .optional()
    .isISO8601()
    .withMessage('From date must be in ISO8601 format'),
    
  query('to')
    .optional()
    .isISO8601()
    .withMessage('To date must be in ISO8601 format'),
    
  query('action')
    .optional()
    .isIn(['quiz_started', 'quiz_completed', 'comment_added'])
    .withMessage('Invalid action filter'),
    
  handleValidationErrors,
];

export const validateComplexAnalytics = [
  body('data')
    .isArray({ min: 1, max: 100 })
    .withMessage('Data must be an array with 1-100 items'),
    
  body('data.*.userId')
    .isLength({ min: 1 })
    .withMessage('Each item must have userId'),
    
  body('data.*.timestamp')
    .isISO8601()
    .withMessage('Each item must have valid timestamp'),
    
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
    
  body('filters.dateRange')
    .optional()
    .custom((value) => {
      if (value && (!value.from || !value.to)) {
        throw new Error('Date range must have both from and to dates');
      }
      if (value && new Date(value.from) > new Date(value.to)) {
        throw new Error('From date must be before to date');
      }
      return true;
    }),
    
  handleValidationErrors,
];