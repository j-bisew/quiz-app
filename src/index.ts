import express from 'express';
import cors from 'cors';
// import { PrismaClient } from '@prisma/client';

const PORT = 5000;
// const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
    res.json({ message: 'Quiz API is running' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});