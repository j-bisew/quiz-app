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
