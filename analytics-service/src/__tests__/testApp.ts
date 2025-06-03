import express from 'express';
import cors from 'cors';
import commentsRouter from '../api/commentsApi';
import leaderboardRouter from '../api/leaderboardApi';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

jest.mock('../services/userService', () => ({
  UserService: {
    verifyToken: jest.fn(),
    getUserById: jest.fn(),
  },
}));

const app = express();

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/comments', commentsRouter);
app.use('/api/leaderboard', leaderboardRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
