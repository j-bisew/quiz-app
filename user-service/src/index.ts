import express from 'express';
import cors from 'cors';
import http from 'http';

import userRouter from './api/userApi';
import authRouter from './api/authApi';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { 
  basicRateLimit, 
  helmetConfig, 
  securityLogger, 
  validateContentType 
} from './middleware/security';

const PORT = process.env.PORT || 3001;
const app = express();
const server = http.createServer(app);

app.use(helmetConfig);
app.use(securityLogger);
app.use(basicRateLimit);

app.use(cors({
  origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3002',
        'http://localhost:3003',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(validateContentType);

app.get('/health', (_req, res) => {
  res.status(200).json({
    service: 'User Service',
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);

app.use(notFoundHandler);
app.use(errorHandler);

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection:', err.message);
  console.error(err.stack);
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;