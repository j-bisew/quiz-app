import express from 'express';
import cors from 'cors';
import quizRouter from './api/quizApi';
import userRouter from './api/userApi';
import authRouter from './api/authApi';

const PORT = 5000;
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/quizzes', quizRouter);
app.use('/api/users', userRouter);
app.use('/api/auth', authRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});