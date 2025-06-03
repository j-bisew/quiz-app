import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
  } else {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      req.user = { id: decoded.userId };
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
}
