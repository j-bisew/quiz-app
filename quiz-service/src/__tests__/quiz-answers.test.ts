import request from 'supertest';
import app from './testApp';
import { prisma } from './setup';
import { UserService } from '../services/userService';

const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('Quiz Answer Checking', () => {
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

    testQuiz = await prisma.quiz.create({
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
            {
              title: 'Which are programming languages?',
              type: 'MULTIPLE',
              answers: ['Python', 'Java', 'HTML', 'CSS'],
              correctAnswer: ['Python', 'Java'],
              points: 3,
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

  describe('POST /api/quizzes/:id/check-answers', () => {
    it('should check answers with new object format and return points', async () => {
      const answers = {
        "0": ["A programming language"],
        "1": ["Python", "Java"]
      };

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 120,
        })
        .expect(200);

      expect(response.body.score).toBe(8);
      expect(response.body.maxScore).toBe(8);
      expect(response.body.percentage).toBe(100);
      expect(response.body.timeSpent).toBe(120);
      expect(response.body.correctCount).toBe(2);
      expect(response.body.answeredQuestions).toBe(2);
      expect(response.body.skippedQuestions).toBe(0);
      
      expect(response.body.detailedResults).toHaveLength(2);
      expect(response.body.detailedResults[0].pointsEarned).toBe(5);
      expect(response.body.detailedResults[1].pointsEarned).toBe(3);
      expect(response.body.detailedResults[0].wasAnswered).toBe(true);
      expect(response.body.detailedResults[0].isCorrect).toBe(true);
    });

    it('should handle partial correct answers with points', async () => {
      const answers = {
        "0": ["A programming language"],
        "1": ["Python"]
      };

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 90,
        })
        .expect(200);

      expect(response.body.score).toBe(5);
      expect(response.body.maxScore).toBe(8);
      expect(response.body.percentage).toBe(63);
      expect(response.body.correctCount).toBe(1);
      expect(response.body.answeredQuestions).toBe(2);
      expect(response.body.skippedQuestions).toBe(0);
    });

    it('should handle skipped questions', async () => {
      const answers = {
        "0": ["A programming language"],
      };

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 60,
        })
        .expect(200);

      expect(response.body.score).toBe(5);
      expect(response.body.maxScore).toBe(8);
      expect(response.body.percentage).toBe(63);
      expect(response.body.correctCount).toBe(1);
      expect(response.body.answeredQuestions).toBe(1);
      expect(response.body.skippedQuestions).toBe(1);
      
      expect(response.body.detailedResults[0].wasAnswered).toBe(true);
      expect(response.body.detailedResults[1].wasAnswered).toBe(false);
      expect(response.body.detailedResults[0].pointsEarned).toBe(5);
      expect(response.body.detailedResults[1].pointsEarned).toBe(0);
    });

    it('should handle case insensitive answers with normalization', async () => {
      const answers = {
        "0": [" A PROGRAMMING LANGUAGE "],
        "1": ["  python  ", "  JAVA  "]
      };

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 120,
        })
        .expect(200);

      expect(response.body.score).toBe(8);
      expect(response.body.percentage).toBe(100);
      expect(response.body.correctCount).toBe(2);
      
      expect(response.body.detailedResults[0].userAnswer).toEqual([" A PROGRAMMING LANGUAGE "]);
      expect(response.body.detailedResults[1].userAnswer).toEqual(["  python  ", "  JAVA  "]);
      
      expect(response.body.detailedResults[0].normalizedUserAnswer).toEqual(["a programming language"]);
      expect(response.body.detailedResults[1].normalizedUserAnswer).toEqual(["java", "python"]);
    });

    it('should handle empty answers object', async () => {
      const answers = {};

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 30,
        })
        .expect(200);

      expect(response.body.score).toBe(0);
      expect(response.body.maxScore).toBe(8);
      expect(response.body.percentage).toBe(0);
      expect(response.body.correctCount).toBe(0);
      expect(response.body.answeredQuestions).toBe(0);
      expect(response.body.skippedQuestions).toBe(2);
    });

    it('should handle mixed correct and incorrect answers', async () => {
      const answers = {
        "0": ["Wrong answer"],
        "1": ["Python", "Java"]
      };

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 100,
        })
        .expect(200);

      expect(response.body.score).toBe(3);
      expect(response.body.maxScore).toBe(8);
      expect(response.body.percentage).toBe(38);
      expect(response.body.correctCount).toBe(1);
      expect(response.body.answeredQuestions).toBe(2);
      expect(response.body.skippedQuestions).toBe(0);

      expect(response.body.detailedResults[0].isCorrect).toBe(false);
      expect(response.body.detailedResults[0].pointsEarned).toBe(0);
      expect(response.body.detailedResults[1].isCorrect).toBe(true);
      expect(response.body.detailedResults[1].pointsEarned).toBe(3);
    });

    it('should handle out of order question numbers', async () => {
      const answers = {
        "1": ["Python", "Java"],
        "0": ["A programming language"]
      };

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 90,
        })
        .expect(200);

      expect(response.body.score).toBe(8);
      expect(response.body.percentage).toBe(100);
      expect(response.body.correctCount).toBe(2);
    });

    it('should return 400 for invalid answers format (array instead of object)', async () => {
      const answers = [["A programming language"], ["Python", "Java"]];

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 60,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details[0].message).toContain('object with question numbers');
    });

    it('should return 400 for invalid question number keys', async () => {
      const answers = {
        "abc": ["A programming language"],
        "1": ["Python", "Java"]
      };

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 60,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should return 400 for answers with only spaces', async () => {
      const answers = {
        "0": ["   ", "valid answer"],
        "1": ["Python", "Java"]
      };

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 60,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details[0].message).toContain('empty after trimming');
    });

    it('should return 400 for non-array answer values', async () => {
      const answers = {
        "0": "A programming language",
        "1": ["Python", "Java"]
      };

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 60,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should return 404 for non-existent quiz', async () => {
      const response = await request(app)
        .post('/api/quizzes/nonexistent-id/check-answers')
        .send({
          answers: { "0": ["answer"] },
          timeSpent: 60,
        })
        .expect(404);

      expect(response.body.error).toBe('Quiz not found');
    });

    it('should handle answers for questions that dont exist', async () => {
      const answers = {
        "0": ["A programming language"],
        "1": ["Python", "Java"],
        "5": ["This question doesnt exist"]
      };

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 120,
        })
        .expect(200);

      expect(response.body.score).toBe(8);
      expect(response.body.correctCount).toBe(2);
      expect(response.body.detailedResults).toHaveLength(2);
    });

    it('should validate timeSpent parameter', async () => {
      const answers = {
        "0": ["A programming language"]
      };

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: -1
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should validate maximum timeSpent', async () => {
      const answers = {
        "0": ["A programming language"]
      };

      const response = await request(app)
        .post(`/api/quizzes/${testQuiz.id}/check-answers`)
        .send({
          answers: answers,
          timeSpent: 8000
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });
});