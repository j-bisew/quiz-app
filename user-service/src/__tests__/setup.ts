import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL || 'postgresql://quiz_user:quiz_password@localhost:5432/quiz_db',
    },
  },
});

beforeAll(async () => {
  await prisma.leaderboardEntry.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.user.deleteMany();
});

beforeEach(async () => {
  await prisma.leaderboardEntry.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
