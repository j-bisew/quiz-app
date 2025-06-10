import request from 'supertest';
import app from './testApp';
import { prisma } from './setup';
import { UserService } from '../services/userService';

const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('Quiz Validation Tests', () => {
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Question Type Validation', () => {
    it('should validate SINGLE question type - minimum options', async () => {
      const invalidSingleQuestion = {
        title: 'New Quiz',
        description: 'Test validation',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Invalid SINGLE question',
            type: 'SINGLE',
            answers: ['Only one option'],
            correctAnswer: ['Only one option'],
            points: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidSingleQuestion)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details[0].message).toContain('at least 2 answer options');
    });

    it('should validate SINGLE question type - maximum options', async () => {
      const invalidSingleQuestion = {
        title: 'New Quiz',
        description: 'Test validation',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Invalid SINGLE question',
            type: 'SINGLE',
            answers: Array(11).fill(0).map((_, i) => `Option ${i + 1}`),
            correctAnswer: ['Option 1'],
            points: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidSingleQuestion)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details[0].message).toContain('maximum 10 answer options');
    });

    it('should validate SINGLE question type - correct answer not in options', async () => {
      const invalidSingleQuestion = {
        title: 'New Quiz',
        description: 'Test validation',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Invalid SINGLE question',
            type: 'SINGLE',
            answers: ['Option A', 'Option B'],
            correctAnswer: ['Option C'],
            points: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidSingleQuestion)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details[0].message).toContain('must be one of the provided options');
    });

    it('should validate MULTIPLE question type - minimum options', async () => {
      const invalidMultipleQuestion = {
        title: 'New Quiz',
        description: 'Test validation',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Invalid MULTIPLE question',
            type: 'MULTIPLE',
            answers: ['A', 'B'],
            correctAnswer: ['A', 'B'],
            points: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidMultipleQuestion)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details[0].message).toContain('at least 3 answer options');
    });

    it('should validate MULTIPLE question type - all options correct', async () => {
      const invalidMultipleQuestion = {
        title: 'New Quiz',
        description: 'Test validation',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Invalid MULTIPLE question',
            type: 'MULTIPLE',
            answers: ['A', 'B', 'C'],
            correctAnswer: ['A', 'B', 'C'],
            points: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidMultipleQuestion)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details[0].message).toContain('cannot have all options as correct');
    });

    it('should validate OPEN question type - non-empty answers array', async () => {
      const invalidOpenQuestion = {
        title: 'New Quiz',
        description: 'Test validation',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Invalid OPEN question',
            type: 'OPEN',
            answers: ['Should be empty'],
            correctAnswer: ['Example answer'],
            points: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidOpenQuestion)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details[0].message).toContain('empty answers array');
    });

    it('should validate OPEN question type - too many example answers', async () => {
      const invalidOpenQuestion = {
        title: 'New Quiz',
        description: 'Test validation',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Invalid OPEN question',
            type: 'OPEN',
            answers: [],
            correctAnswer: Array(6).fill(0).map((_, i) => `Answer ${i + 1}`),
            points: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidOpenQuestion)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details[0].message).toContain('maximum 5 example correct answers');
    });

    it('should validate question points range', async () => {
      const invalidPointsQuestion = {
        title: 'New Quiz',
        description: 'Test validation',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Invalid points question',
            type: 'SINGLE',
            answers: ['A', 'B'],
            correctAnswer: ['A'],
            points: 101,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidPointsQuestion)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should validate zero points', async () => {
      const invalidPointsQuestion = {
        title: 'New Quiz',
        description: 'Test validation',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Zero points question',
            type: 'SINGLE',
            answers: ['A', 'B'],
            correctAnswer: ['A'],
            points: 0,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidPointsQuestion)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('Quiz Field Validation', () => {
    it('should validate quiz title length - too short', async () => {
      const invalidQuiz = {
        title: 'AB',
        description: 'Valid description that is long enough',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Valid question',
            type: 'SINGLE',
            answers: ['A', 'B'],
            correctAnswer: ['A'],
            points: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidQuiz)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should validate quiz description length - too short', async () => {
      const invalidQuiz = {
        title: 'Valid Title',
        description: 'Too short',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Valid question',
            type: 'SINGLE',
            answers: ['A', 'B'],
            correctAnswer: ['A'],
            points: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidQuiz)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should validate invalid difficulty', async () => {
      const invalidQuiz = {
        title: 'Valid Title',
        description: 'Valid description that is long enough',
        category: 'Test',
        difficulty: 'INVALID',
        questions: [
          {
            title: 'Valid question',
            type: 'SINGLE',
            answers: ['A', 'B'],
            correctAnswer: ['A'],
            points: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidQuiz)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should validate timeLimit range', async () => {
      const invalidQuiz = {
        title: 'Valid Title',
        description: 'Valid description that is long enough',
        category: 'Test',
        difficulty: 'EASY',
        timeLimit: 10,
        questions: [
          {
            title: 'Valid question',
            type: 'SINGLE',
            answers: ['A', 'B'],
            correctAnswer: ['A'],
            points: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidQuiz)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should validate maximum number of questions', async () => {
      const invalidQuiz = {
        title: 'Valid Title',
        description: 'Valid description that is long enough',
        category: 'Test',
        difficulty: 'EASY',
        questions: Array(51).fill(0).map((_, i) => ({
          title: `Question ${i + 1}`,
          type: 'SINGLE',
          answers: ['A', 'B'],
          correctAnswer: ['A'],
          points: 1,
        })),
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidQuiz)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should validate empty questions array', async () => {
      const invalidQuiz = {
        title: 'Valid Title',
        description: 'Valid description that is long enough',
        category: 'Test',
        difficulty: 'EASY',
        questions: [],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidQuiz)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('Valid Cases', () => {
    it('should accept valid SINGLE question', async () => {
      const validQuiz = {
        title: 'Valid Quiz',
        description: 'Valid description that is long enough',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Valid SINGLE question',
            type: 'SINGLE',
            answers: ['Option A', 'Option B', 'Option C'],
            correctAnswer: ['Option A'],
            points: 5,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(validQuiz)
        .expect(201);

      expect(response.body.questions[0].type).toBe('SINGLE');
      expect(response.body.questions[0].points).toBe(5);
    });

    it('should accept valid MULTIPLE question', async () => {
      const validQuiz = {
        title: 'Valid Quiz',
        description: 'Valid description that is long enough',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Valid MULTIPLE question',
            type: 'MULTIPLE',
            answers: ['A', 'B', 'C', 'D'],
            correctAnswer: ['A', 'C'],
            points: 3,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(validQuiz)
        .expect(201);

      expect(response.body.questions[0].type).toBe('MULTIPLE');
      expect(response.body.questions[0].points).toBe(3);
    });

    it('should accept valid OPEN question', async () => {
      const validQuiz = {
        title: 'Valid Quiz',
        description: 'Valid description that is long enough',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Valid OPEN question',
            type: 'OPEN',
            answers: [],
            correctAnswer: ['Example answer', 'Another valid answer'],
            points: 2,
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(validQuiz)
        .expect(201);

      expect(response.body.questions[0].type).toBe('OPEN');
      expect(response.body.questions[0].points).toBe(2);
    });

    it('should accept quiz without explicit points (default to 1)', async () => {
      const validQuiz = {
        title: 'Valid Quiz',
        description: 'Valid description that is long enough',
        category: 'Test',
        difficulty: 'EASY',
        questions: [
          {
            title: 'Question without points',
            type: 'SINGLE',
            answers: ['A', 'B'],
            correctAnswer: ['A'],
          },
        ],
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', 'Bearer valid-token')
        .send(validQuiz)
        .expect(201);

      expect(response.body.questions[0].points).toBe(1);
      expect(response.body.maxPoints).toBe(1);
    });
  });
});