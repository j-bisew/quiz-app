import express from 'express';
import cors from 'cors';
import quizRouter from './api/quizApi';

const PORT = 5000;
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/quizzes', quizRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});