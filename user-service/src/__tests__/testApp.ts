import express from 'express';
import cors from 'cors';
import userRouter from '../api/userApi';
import authRouter from '../api/authApi';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;