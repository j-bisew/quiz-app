import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import quizRouter from './api/quizApi';
import userRouter from './api/userApi';
import authRouter from './api/authApi';
import { initializeMQTT } from './liveQuizServer';

const PORT = 5000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io/'
});
const roomUsers = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinQuiz', ({ quizId }) => {
    const room = `quiz_${quizId}`;
    socket.join(room);
    
    if (!roomUsers.has(room)) {
      roomUsers.set(room, new Set());
    }
    roomUsers.get(room)?.add(socket.id);
    
    const userCount = roomUsers.get(room)?.size || 0;
    io.to(room).emit('userCount', { count: userCount });
    
    console.log(`User ${socket.id} joined quiz room:`, room, 'Users in room:', userCount);
  });

  socket.on('leaveQuiz', ({ quizId }) => {
    const room = `quiz_${quizId}`;
    socket.leave(room);
    
    if (roomUsers.has(room)) {
      roomUsers.get(room)?.delete(socket.id);
      const userCount = roomUsers.get(room)?.size || 0;
      io.to(room).emit('userCount', { count: userCount });
      console.log(`User ${socket.id} left quiz room:`, room, 'Users in room:', userCount);
    }
  });

  socket.on('newComment', ({ quizId, comment }) => {
    const room = `quiz_${quizId}`;
    io.to(room).emit('commentUpdate', {
      type: 'comment_added',
      comment: comment
    });
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id && roomUsers.has(room)) {
        const users = roomUsers.get(room);
        if (users) {
          users.delete(socket.id);
          const userCount = users.size;
          io.to(room).emit('userCount', { count: userCount });
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
})); 
app.use(express.json());

app.use('/api/quizzes', quizRouter);
app.use('/api/users', userRouter);
app.use('/api/auth', authRouter);

initializeMQTT(io);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});