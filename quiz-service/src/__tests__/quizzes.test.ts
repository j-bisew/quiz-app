import request from 'supertest';
import app from './testApp';
import { prisma } from './setup';
import { UserService } from '../services/userService';

const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('Quizzes API', () => {
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

    mockUserService.verifyToken.mockResolvedValue({
      valid: true,
      user: {
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        role: testUser.role,
      },
    });

    mockUserService.getUserById.mockResolvedValue({
      id: testUser.id,
      name: testUser.name,
      email: testUser.email,
      role: testUser.role,
    });

    testQuiz = await prisma.quiz.create({
      data: {
        title: 'Test Quiz',
        description: 'This is a test quiz',
        category: 'Programming',
        difficulty: 'EASY',
        createdById: testUser.id,
        questions: {
          create: [
            {
              title: 'What is JavaScript?',
              type: 'SINGLE',
              answers: ['A programming language', 'A type of coffee', 'A framework'],
              correctAnswer: ['A programming language'],
            },
            {
              title: 'Which are programming languages?',
              type: 'MULTIPLE',
              answers: ['Python', 'Java', 'HTML', 'CSS'],
              correctAnswer: ['Python', 'Java'],
            },
          ],
        },
      },
      include: {
        questions: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/quizzes', () => {
    it('should return all quizzes', async () => {
      const response = await request(app).get('/api/quizzes').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('questions');
      expect(response.body[0]).toHaveProperty('createdBy');
    });

    it('should return empty array when no quizzes exist', async () => {
      await prisma.question.deleteMany();
      await prisma.quiz.deleteMany();

      const response = await request(app).get('/api/quizzes').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/quizzes/:id', () => {
    it('should return quiz by id', async () => {
      const response = await request(app).get(`/api/quizzes/${testQuiz.id}`).expect(200);

      expect(response.body.id).toBe(testQuiz.id);
      expect(response.body.title).toBe('Test Quiz');
      expect(response.body.questions).toHaveLength(2);
      expect(response.body.createdBy.name).toBe('Test User');
    });

    it('should return 404 for non-existent quiz', async () => {
      const response = await request(app).get('/api/quizzes/nonexistent-id').expect(404);

      expect(response.body.error).toBe('Quiz not found');
    });
  });

  describe('POST /api/quizzes', () => {
    const validQuizData = {
      title: 'New Quiz',
      description: 'A new test quiz',
      category: 'Science',
      difficulty: 'MEDIUM',
      timeLimit: 300,
      questions: [
        {
          title: 'What is the capital of France?',
          type: 'SINGLE',
          answers: ['Paris', 'London', 'Berlin'],
          correctAnswer: ['Paris'],
        },
      ],
    };

    it('should create a new quiz successfully', async () => {
      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(validQuizData)
        .expect(201);

      expect(response.body.title).toBe(validQuizData.title);
      expect(response.body.description).toBe(validQuizData.description);
      expect(response.body.questions).toHaveLength(1);
      expect(response.body.createdById).toBe(testUser.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).post('/api/quizzes').send(validQuizData).expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      mockUserService.verifyToken.mockResolvedValueOnce({
        valid: false,
        error: 'Invalid token',
      });

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer invalid-token')
        .send(validQuizData)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should handle empty timeLimit', async () => {
      const quizDataWithEmptyTimeLimit = {
        ...validQuizData,
        timeLimit: '',
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(quizDataWithEmptyTimeLimit)
        .expect(201);

      expect(response.body.timeLimit).toBeNull();
    });
  });

  describe('PATCH /api/quizzes/:id', () => {
    const updateData = {
      title: 'Updated Quiz',
      description: 'Updated description',
      category: 'Updated Category',
      difficulty: 'HARD',
      timeLimit: 600,
      questions: [
        {
          title: 'Updated question?',
          type: 'SINGLE',
          answers: ['Answer 1', 'Answer 2'],
          correctAnswer: ['Answer 1'],
        },
      ],
    };

    it('should update quiz successfully', async () => {
      const response = await request(app)
        .patch(`/api/quizzes/${testQuiz.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.questions).toHaveLength(1);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .patch(`/api/quizzes/${testQuiz.id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    it('should return 404 for non-existent quiz', async () => {
      const response = await request(app)
        .patch('/api/quizzes/nonexistent-id')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Quiz not found');
    });

    it('should return 403 when user tries to update quiz they did not create', async () => {
      mockUserService.verifyToken.mockResolvedValueOnce({
        valid: true,
        user: {
          id: 'different-user-id',
          name: 'Different User',
          email: 'different@example.com',
          role: 'USER',
        },
      });

      const response = await request(app)
        .patch(`/api/quizzes/${testQuiz.id}`)
        .set('Authorization', 'Bearer other-token')
        .send(updateData)
        .expect(403);

      expect(response.body.error).toBe('You do not have permission to update this quiz');
    });
  });

  describe('DELETE /api/quizzes/:id', () => {
    it('should delete quiz successfully', async () => {
      await request(app)
        .delete(`/api/quizzes/${testQuiz.id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(204);

      const deletedQuiz = await prisma.quiz.findUnique({
        where: { id: testQuiz.id },
      });
      expect(deletedQuiz).toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).delete(`/api/quizzes/${testQuiz.id}`).expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    it('should return 404 for non-existent quiz', async () => {
      const response = await request(app)
        .delete('/api/quizzes/nonexistent-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.error).toBe('Quiz not found');
    });
  });

  describe('GET /api/quizzes/search', () => {
    beforeEach(async () => {
      await prisma.quiz.create({
        data: {
          title: 'Python Quiz',
          description: 'Learn Python programming',
          category: 'Programming',
          difficulty: 'MEDIUM',
          createdById: testUser.id,
          questions: {
            create: [
              {
                title: 'What is Python?',
                type: 'SINGLE',
                answers: ['Snake', 'Programming language', 'Food'],
                correctAnswer: ['Programming language'],
              },
            ],
          },
        },
      });
    });

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
  });

  describe('POST /api/quizzes/:id/check-answers', () => {
    it('should check answers and return score', async () => {
      const answers = [['A programming language'], ['Python', 'Java']];

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 120,
        })
        .expect(200);

      expect(response.body.scorePercent).toBe(100);
      expect(response.body.timeSpent).toBe(120);
    });

    it('should calculate partial score for some correct answers', async () => {
      const answers = [['A programming language'], ['Python']];

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 90,
        })
        .expect(200);

      expect(response.body.scorePercent).toBe(50);
    });

    it('should return 404 for non-existent quiz', async () => {
      const response = await request(app)
        .post('/api/quizzes/nonexistent-id/check-answers')
        .send({
          answers: [['answer']],
          timeSpent: 60,
        })
        .expect(404);

      expect(response.body.error).toBe('Quiz not found');
    });
  });
});
