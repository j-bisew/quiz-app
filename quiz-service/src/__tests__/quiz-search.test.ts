import request from 'supertest';
import app from './testApp';
import { prisma } from './setup';
import { UserService } from '../services/userService';

const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('Quiz Search Operations', () => {
  let testUser: any;

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

    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'USER',
      },
    });

    mockUserService.verifyToken.mockResolvedValue({
      valid: true,
      user: {
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        role: testUser.role,
      },
    });

    await prisma.quiz.create({
      data: {
        title: 'Test Quiz',
        description: 'This is a test quiz',
        category: 'Programming',
        difficulty: 'EASY',
        maxPoints: 8,
        createdById: testUser.id,
        questions: {
          create: [
            {
              title: 'What is JavaScript?',
              type: 'SINGLE',
              answers: ['A programming language', 'A type of coffee', 'A framework'],
              correctAnswer: ['A programming language'],
              points: 5,
            },
          ],
        },
      },
    });

    await prisma.quiz.create({
      data: {
        title: 'Python Quiz',
        description: 'Learn Python programming',
        category: 'Programming',
        difficulty: 'MEDIUM',
        maxPoints: 1,
        createdById: testUser.id,
        questions: {
          create: [
            {
              title: 'What is Python?',
              type: 'SINGLE',
              answers: ['Snake', 'Programming language', 'Food'],
              correctAnswer: ['Programming language'],
              points: 1,
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/quizzes/search', () => {
    it('should search quizzes by title', async () => {
      const response = await request(app).get('/api/quizzes/search?pattern=Python').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Python Quiz');
    });

    it('should search quizzes by category', async () => {
      const response = await request(app)
        .get('/api/quizzes/search?pattern=Programming')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should search quizzes by description', async () => {
      const response = await request(app)
        .get('/api/quizzes/search?pattern=Learn')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Python Quiz');
    });

    it('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/quizzes/search?pattern=NonExistent')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should return 400 for missing search pattern', async () => {
      const response = await request(app).get('/api/quizzes/search').expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should handle case insensitive search', async () => {
      const response = await request(app)
        .get('/api/quizzes/search?pattern=PYTHON')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Python Quiz');
    });

    it('should filter by category parameter', async () => {
      const response = await request(app)
        .get('/api/quizzes/search?pattern=Quiz&category=Programming')
        .expect(200);

      expect(response.body).toHaveLength(2);
      response.body.forEach((quiz: any) => {
        expect(quiz.category).toBe('Programming');
      });
    });

    it('should filter by difficulty parameter', async () => {
      const response = await request(app)
        .get('/api/quizzes/search?pattern=Quiz&difficulty=EASY')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].difficulty).toBe('EASY');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/quizzes/search?pattern=Quiz&page=1&limit=1')
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('should return quiz with points in search results', async () => {
      const response = await request(app)
        .get('/api/quizzes/search?pattern=Python')
        .expect(200);

      expect(response.body[0].questions[0]).toHaveProperty('points');
      expect(response.body[0].questions[0].points).toBe(1);
    });
  });
});