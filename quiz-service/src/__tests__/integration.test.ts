import request from 'supertest';
import app from './testApp';
import { prisma } from './setup';
import { UserService } from '../services/userService';

const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('Quiz Integration Tests', () => {
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
        name: 'Integration User',
        email: 'integration@example.com',
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should complete full quiz workflow', async () => {
    const quizData = {
      title: 'Integration Test Quiz',
      description: 'A quiz for integration testing',
      category: 'Testing',
      difficulty: 'EASY',
      questions: [
        {
          title: 'What is integration testing?',
          type: 'SINGLE',
          answers: ['Testing components together', 'Testing in isolation', 'Manual testing'],
          correctAnswer: ['Testing components together'],
          points: 5,
        },
      ],
    };

    const createResponse = await request(app)
      .post('/api/quizzes')
      .set('Authorization', 'Bearer valid-token')
      .send(quizData)
      .expect(201);

    const quizId = createResponse.body.id;

    const getResponse = await request(app).get(`/api/quizzes/${quizId}`).expect(200);

    expect(getResponse.body.title).toBe(quizData.title);

    const searchResponse = await request(app)
      .get('/api/quizzes/search?pattern=Integration')
      .expect(200);

    expect(searchResponse.body).toHaveLength(1);
    expect(searchResponse.body[0].id).toBe(quizId);

    const answersResponse = await request(app)
      .post(`/api/quizzes/${quizId}/check-answers`)
      .send({
        answers: {
          "0": ["Testing components together"]
        },
        timeSpent: 45,
      })
      .expect(200);

    expect(answersResponse.body.percentage).toBe(100);
    expect(answersResponse.body.score).toBe(5);
    expect(answersResponse.body.correctCount).toBe(1);

    await request(app)
      .delete(`/api/quizzes/${quizId}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(204);

    await request(app).get(`/api/quizzes/${quizId}`).expect(404);
  });
});