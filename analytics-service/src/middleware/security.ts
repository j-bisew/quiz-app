import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

export const basicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, 
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login attempts, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const createQuizRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: 'Quiz creation limit exceeded',
    message: 'You can create maximum 10 quizzes per hour.',
    retryAfter: 60 * 60
  },
});

export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

export function securityLogger(req: Request, _res: Response, next: NextFunction): void {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  console.log(`[SECURITY] ${timestamp} - ${req.method} ${req.originalUrl} - IP: ${ip} - User-Agent: ${userAgent}`);
  
  if (req.originalUrl.includes('..') || 
      req.originalUrl.includes('<script>') ||
      req.originalUrl.includes('DROP TABLE') ||
      req.originalUrl.includes('SELECT * FROM')) {
    console.warn(`[SECURITY WARNING] Suspicious request detected: ${req.originalUrl} from IP: ${ip}`);
  }
  
  next();
}

export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      res.status(400).json({
        error: 'Invalid Content-Type',
        message: 'Content-Type must be application/json'
      });
      return;
    }
  }
  next();
}