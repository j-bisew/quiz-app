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

export const validateCreateQuiz = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Quiz title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Quiz description must be between 10 and 1000 characters'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('difficulty')
    .isIn(['EASY', 'MEDIUM', 'HARD'])
    .withMessage('Difficulty must be EASY, MEDIUM, or HARD'),
  body('timeLimit')
    .optional({ values: 'falsy' })
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true;
      }
      const num = Number(value);
      if (isNaN(num) || num < 30 || num > 7200) {
        throw new Error('Time limit must be between 30 seconds and 2 hours when provided');
      }
      return true;
    }),
  body('questions')
    .isArray({ min: 1, max: 50 })
    .withMessage('Quiz must have between 1 and 50 questions'),
  body('questions.*.title')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Question title must be between 5 and 500 characters'),
  body('questions.*.type')
    .isIn(['SINGLE', 'MULTIPLE', 'OPEN'])
    .withMessage('Question type must be SINGLE, MULTIPLE, or OPEN'),
  body('questions.*.answers').isArray().withMessage('Question answers must be an array'),
  body('questions.*.correctAnswer')
    .isArray({ min: 1 })
    .withMessage('Question must have at least one correct answer'),
  handleValidationErrors,
];

export const validateUpdateQuiz = [
  param('id').isLength({ min: 1 }).withMessage('Quiz ID is required'),
  ...validateCreateQuiz,
];

export const validateSearch = [
  query('pattern')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search pattern must be between 1 and 100 characters'),
  handleValidationErrors,
];

export const validateCheckAnswers = [
  body('answers').isArray().withMessage('Answers must be an array'),
  body('timeSpent').isInt({ min: 1 }).withMessage('Time spent must be a positive integer'),
  handleValidationErrors,
];
