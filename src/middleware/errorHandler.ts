import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(`Error ${err.statusCode || 500}: ${err.message}`);
  console.error('Stack:', err.stack);
  console.error('Request URL:', req.originalUrl);
  console.error('Request Method:', req.method);
  console.error('Request Body:', req.body);

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';

  if (statusCode === 400) {
    res.status(400).json({
      error: 'Bad Request',
      message: message,
      timestamp: new Date().toISOString()
    });
  } else if (statusCode === 401) {
    res.status(401).json({
      error: 'Unauthorized',
      message: message,
      timestamp: new Date().toISOString()
    });
  } else if (statusCode === 403) {
    res.status(403).json({
      error: 'Forbidden',
      message: message,
      timestamp: new Date().toISOString()
    });
  } else if (statusCode === 404) {
    res.status(404).json({
      error: 'Not Found',
      message: message,
      timestamp: new Date().toISOString()
    });
  } else if (statusCode === 409) {
    res.status(409).json({
      error: 'Conflict',
      message: message,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : message,
      timestamp: new Date().toISOString()
    });
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  const error: CustomError = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  error.isOperational = true;
  next(error);
}

export function createError(message: string, statusCode: number = 500): CustomError {
  const error: CustomError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}