import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  try {
    const verification = await UserService.verifyToken(token);

    if (!verification.valid || !verification.user) {
      res.status(401).json({ error: verification.error || 'Invalid token' });
      return;
    }

    req.user = verification.user;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}
