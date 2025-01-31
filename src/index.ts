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
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinQuiz', ({ quizId }) => {
    const room = `quiz_${quizId}`;
    socket.join(room);
    console.log(`User ${socket.id} joined quiz room:`, room);
  });

  socket.on('newComment', ({ quizId, comment }) => {
    const room = `quiz_${quizId}`;
    console.log(`Broadcasting new comment to room ${room}:`, comment);
    io.to(room).emit('commentUpdate', {
      type: 'comment_added',
      comment: comment
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
}));  
app.use(express.json());

app.use('/api/quizzes', quizRouter);
app.use('/api/users', userRouter);
app.use('/api/auth', authRouter);

// Initialize MQTT with Socket.IO
initializeMQTT(io);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});