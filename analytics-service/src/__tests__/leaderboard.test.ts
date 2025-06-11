import request from 'supertest';
import app from './testApp';
import { prisma } from './setup';
import { UserService } from '../services/userService';
import { AnalyticsService } from '../db/mongodb';

const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('Leaderboard API', () => {
  let testUser: any;
  let testQuiz: any;

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

    testQuiz = await prisma.quiz.create({
      data: {
        title: 'Test Quiz',
        description: 'Test quiz for leaderboard',
        category: 'Testing',
        difficulty: 'EASY',
        maxPoints: 10, // Add maxPoints to quiz
        createdById: testUser.id,
        questions: {
          create: [
            {
              title: 'Test question?',
              type: 'SINGLE',
              answers: ['Yes', 'No'],
              correctAnswer: ['Yes'],
              points: 10, // Add points to question
            },
          ],
        },
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/leaderboard/:quizId', () => {
    beforeEach(async () => {
      const user2 = await prisma.user.create({
        data: {
          name: 'User Two',
          email: 'user2@example.com',
          password: 'hashedpassword',
          role: 'USER',
        },
      });

      const user3 = await prisma.user.create({
        data: {
          name: 'User Three',
          email: 'user3@example.com',
          password: 'hashedpassword',
          role: 'USER',
        },
      });

      // Update entries to include maxScore and percentage
      await prisma.leaderboardEntry.create({
        data: {
          score: 9,
          maxScore: 10,
          percentage: 90,
          timeSpent: 120,
          userId: testUser.id,
          quizId: testQuiz.id,
        },
      });

      await prisma.leaderboardEntry.create({
        data: {
          score: 10,
          maxScore: 10,
          percentage: 100,
          timeSpent: 100,
          userId: user2.id,
          quizId: testQuiz.id,
        },
      });

      await prisma.leaderboardEntry.create({
        data: {
          score: 8,
          maxScore: 10,
          percentage: 80,
          timeSpent: 150,
          userId: user3.id,
          quizId: testQuiz.id,
        },
      });
    });

    it('should return leaderboard entries sorted by percentage and time', async () => {
      const response = await request(app).get(`/api/leaderboard/${testQuiz.id}`).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);

      // Should be sorted by percentage desc, then time asc
      expect(response.body[0].percentage).toBe(100);
      expect(response.body[1].percentage).toBe(90);
      expect(response.body[2].percentage).toBe(80);

      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('score');
      expect(response.body[0]).toHaveProperty('maxScore');
      expect(response.body[0]).toHaveProperty('percentage');
      expect(response.body[0]).toHaveProperty('timeSpent');
      expect(response.body[0]).toHaveProperty('userName');
      expect(response.body[0]).toHaveProperty('createdAt');
    });

    it('should return empty array for quiz with no entries', async () => {
      const emptyQuiz = await prisma.quiz.create({
        data: {
          title: 'Empty Quiz',
          description: 'No entries',
          category: 'Testing',
          difficulty: 'EASY',
          maxPoints: 5,
          createdById: testUser.id,
          questions: {
            create: [
              {
                title: 'Empty question?',
                type: 'SINGLE',
                answers: ['Yes'],
                correctAnswer: ['Yes'],
                points: 5,
              },
            ],
          },
        },
      });

      const response = await request(app).get(`/api/leaderboard/${emptyQuiz.id}`).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('POST /api/leaderboard/:quizId', () => {
    it('should add leaderboard entry successfully', async () => {
      const entryData = {
        score: 8,
        maxScore: 10,
        timeSpent: 90,
      };

      const response = await request(app)
        .post(`/api/leaderboard/${testQuiz.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send(entryData)
        .expect(201);

      expect(response.body.score).toBe(entryData.score);
      expect(response.body.maxScore).toBe(entryData.maxScore);
      expect(response.body.percentage).toBe(80); // 8/10 * 100 = 80
      expect(response.body.timeSpent).toBe(entryData.timeSpent);
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.quizId).toBe(testQuiz.id);

      const savedEntry = await prisma.leaderboardEntry.findFirst({
        where: {
          score: entryData.score,
          userId: testUser.id,
          quizId: testQuiz.id,
        },
      });
      expect(savedEntry).toBeTruthy();
      expect(savedEntry!.percentage).toBe(80);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/leaderboard/${testQuiz.id}`)
        .send({ score: 8, maxScore: 10, timeSpent: 100 })
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      mockUserService.verifyToken.mockResolvedValueOnce({
        valid: false,
        error: 'Invalid token',
      });

      const response = await request(app)
        .post(`/api/leaderboard/${testQuiz.id}`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ score: 8, maxScore: 10, timeSpent: 100 })
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should validate that score is not greater than maxScore', async () => {
      const response = await request(app)
        .post(`/api/leaderboard/${testQuiz.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ score: 15, maxScore: 10, timeSpent: 100 })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should require maxScore field', async () => {
      const response = await request(app)
        .post(`/api/leaderboard/${testQuiz.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ score: 8, timeSpent: 100 }) // Missing maxScore
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /api/leaderboard/user/:userId/stats', () => {
    beforeEach(async () => {
      const quiz2 = await prisma.quiz.create({
        data: {
          title: 'Second Test Quiz',
          description: 'Second quiz for stats',
          category: 'Testing',
          difficulty: 'MEDIUM',
          maxPoints: 20,
          createdById: testUser.id,
          questions: {
            create: [
              {
                title: 'Second question?',
                type: 'SINGLE',
                answers: ['Yes', 'No'],
                correctAnswer: ['Yes'],
                points: 20,
              },
            ],
          },
        },
      });

      await prisma.leaderboardEntry.create({
        data: {
          score: 9,
          maxScore: 10,
          percentage: 90,
          timeSpent: 120,
          userId: testUser.id,
          quizId: testQuiz.id,
        },
      });

      await prisma.leaderboardEntry.create({
        data: {
          score: 16,
          maxScore: 20,
          percentage: 80,
          timeSpent: 100,
          userId: testUser.id,
          quizId: quiz2.id,
        },
      });
    });

    it('should return user statistics with percentages', async () => {
      const response = await request(app)
        .get(`/api/leaderboard/user/${testUser.id}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('postgresql');
      expect(response.body).toHaveProperty('mongodb');
      expect(response.body).toHaveProperty('summary');

      expect(response.body.summary).toHaveProperty('totalQuizzes');
      expect(response.body.summary).toHaveProperty('averageScore');
      expect(response.body.summary).toHaveProperty('averagePercentage');
      expect(response.body.summary).toHaveProperty('maxPercentage');
      expect(response.body.summary).toHaveProperty('totalTimeSpent');
      expect(response.body.summary).toHaveProperty('activities');

      expect(response.body.summary.totalQuizzes).toBe(2);
      expect(response.body.summary.averagePercentage).toBe(85); // (90 + 80) / 2
      expect(response.body.summary.maxPercentage).toBe(90);
    });

    it('should handle user with no statistics', async () => {
      const newUser = await prisma.user.create({
        data: {
          name: 'New User',
          email: 'new@example.com',
          password: 'hashedpassword',
          role: 'USER',
        },
      });

      const response = await request(app)
        .get(`/api/leaderboard/user/${newUser.id}/stats`)
        .expect(200);

      expect(response.body.summary.totalQuizzes).toBe(0);
      expect(response.body.summary.averageScore).toBe(0);
      expect(response.body.summary.averagePercentage).toBe(0);
      expect(response.body.summary.maxPercentage).toBe(0);
      expect(response.body.summary.totalTimeSpent).toBe(0);
    });
  });

  describe('GET /api/leaderboard/popular/quizzes', () => {
    beforeEach(async () => {
      const quiz2 = await prisma.quiz.create({
        data: {
          title: 'Popular Quiz',
          description: 'Very popular quiz',
          category: 'Popular',
          difficulty: 'MEDIUM',
          maxPoints: 15,
          createdById: testUser.id,
          questions: {
            create: [
              {
                title: 'Popular question?',
                type: 'SINGLE',
                answers: ['Yes', 'No'],
                correctAnswer: ['Yes'],
                points: 15,
              },
            ],
          },
        },
      });

      // Add analytics with new fields
      await AnalyticsService.logActivity(testUser.id, 'quiz_completed', testQuiz.id, {
        score: 9,
        maxScore: 10,
        percentage: 90,
        timeSpent: 100,
      });
      await AnalyticsService.logActivity(testUser.id, 'quiz_completed', quiz2.id, {
        score: 14,
        maxScore: 15,
        percentage: 93,
        timeSpent: 80,
      });
      await AnalyticsService.logActivity(testUser.id, 'quiz_completed', quiz2.id, {
        score: 13,
        maxScore: 15,
        percentage: 87,
        timeSpent: 90,
      });
    });

    it('should return popular quizzes with analytics', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app).get('/api/leaderboard/popular/quizzes').expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('title');
        expect(response.body[0]).toHaveProperty('maxPoints'); // Should include maxPoints
        expect(response.body[0]).toHaveProperty('analytics');
        expect(response.body[0].analytics).toHaveProperty('totalAttempts');
        expect(response.body[0].analytics).toHaveProperty('averageScore');
        expect(response.body[0].analytics).toHaveProperty('averagePercentage'); // Should include percentage
      }
    });

    it('should respect limit parameter', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app)
        .get('/api/leaderboard/popular/quizzes?limit=1')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(1);
    });
  });
});