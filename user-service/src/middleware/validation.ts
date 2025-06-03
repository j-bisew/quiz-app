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

export function handleLoginValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Email and password are required',
    });
    return;
  }
  next();
}

export function handleRegisterValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Name, email, and password are required',
    });
    return;
  }
  next();
}

export const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  handleLoginValidationErrors,
];

export const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  handleRegisterValidationErrors,
];

export const validateIdParam = [
  param('id').isLength({ min: 1 }).withMessage('ID parameter is required'),
  handleValidationErrors,
];

export const validateEmailParam = [
  param('email').isEmail().normalizeEmail().withMessage('Valid email parameter is required'),
  handleValidationErrors,
];

export const validateUpdateRole = [
  body('role')
    .isIn(['USER', 'MODERATOR', 'ADMIN'])
    .withMessage('Role must be USER, MODERATOR, or ADMIN'),
  handleValidationErrors,
];
