import request from 'supertest';
import app from './testApp';
import { prisma } from './setup';
import { UserService } from '../services/userService';

const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('Comments API', () => {
  let testUser: any;
  let testQuiz: any;

  beforeEach(async () => {
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
        description: 'Test quiz for comments',
        category: 'Testing',
        difficulty: 'EASY',
        createdById: testUser.id,
        questions: {
          create: [
            {
              title: 'Test question?',
              type: 'SINGLE',
              answers: ['Yes', 'No'],
              correctAnswer: ['Yes'],
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

    mockUserService.getUserById.mockResolvedValue({
      id: testUser.id,
      name: testUser.name,
      email: testUser.email,
      role: testUser.role,
    });
  });

  describe('GET /api/comments/:quizId', () => {
    beforeEach(async () => {
      await prisma.comment.createMany({
        data: [
          {
            text: 'Great quiz!',
            userId: testUser.id,
            quizId: testQuiz.id,
          },
          {
            text: 'Very challenging',
            userId: testUser.id,
            quizId: testQuiz.id,
          },
        ],
      });
    });

    it('should return comments for a quiz', async () => {
      const response = await request(app).get(`/api/comments/${testQuiz.id}`).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('text');
      expect(response.body[0]).toHaveProperty('userName');
      expect(response.body[0]).toHaveProperty('createdAt');
    });

    it('should return empty array for quiz with no comments', async () => {
      const emptyQuiz = await prisma.quiz.create({
        data: {
          title: 'Empty Quiz',
          description: 'No comments',
          category: 'Testing',
          difficulty: 'EASY',
          createdById: testUser.id,
          questions: {
            create: [
              {
                title: 'Empty question?',
                type: 'SINGLE',
                answers: ['Yes'],
                correctAnswer: ['Yes'],
              },
            ],
          },
        },
      });

      const response = await request(app).get(`/api/comments/${emptyQuiz.id}`).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('POST /api/comments/:quizId', () => {
    it('should add a comment successfully', async () => {
      const commentText = 'This is a test comment';

      const response = await request(app)
        .post(`/api/comments/${testQuiz.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ text: commentText })
        .expect(201);

      expect(response.body.text).toBe(commentText);
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.userName).toBe(testUser.name);
      expect(response.body.quizId).toBe(testQuiz.id);

      const savedComment = await prisma.comment.findFirst({
        where: { text: commentText },
      });
      expect(savedComment).toBeTruthy();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/comments/${testQuiz.id}`)
        .send({ text: 'Test comment' })
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      mockUserService.verifyToken.mockResolvedValueOnce({
        valid: false,
        error: 'Invalid token',
      });

      const response = await request(app)
        .post(`/api/comments/${testQuiz.id}`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ text: 'Test comment' })
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('DELETE /api/comments/:quizId/:commentId', () => {
    let testComment: any;

    beforeEach(async () => {
      testComment = await prisma.comment.create({
        data: {
          text: 'Comment to delete',
          userId: testUser.id,
          quizId: testQuiz.id,
        },
      });
    });

    it('should delete own comment successfully', async () => {
      await request(app)
        .delete(`/api/comments/${testQuiz.id}/${testComment.id}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(204);

      const deletedComment = await prisma.comment.findUnique({
        where: { id: testComment.id },
      });
      expect(deletedComment).toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete(`/api/comments/${testQuiz.id}/${testComment.id}`)
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    it('should return 404 for non-existent comment', async () => {
      const response = await request(app)
        .delete(`/api/comments/${testQuiz.id}/nonexistent-id`)
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.error).toBe('Comment not found');
    });

    it('should return 403 when trying to delete another users comment', async () => {
      const otherUser = await prisma.user.create({
        data: {
          name: 'Other User',
          email: 'other@example.com',
          password: 'hashedpassword',
          role: 'USER',
        },
      });

      mockUserService.verifyToken.mockResolvedValueOnce({
        valid: true,
        user: {
          id: otherUser.id,
          name: otherUser.name,
          email: otherUser.email,
          role: otherUser.role,
        },
      });

      const response = await request(app)
        .delete(`/api/comments/${testQuiz.id}/${testComment.id}`)
        .set('Authorization', 'Bearer other-token')
        .expect(403);

      expect(response.body.error).toBe('You do not have permission to delete this comment');
    });

    it('should allow admin to delete any comment', async () => {
      const adminUser = await prisma.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'hashedpassword',
          role: 'ADMIN',
        },
      });

      mockUserService.verifyToken.mockResolvedValueOnce({
        valid: true,
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
      });

      await request(app)
        .delete(`/api/comments/${testQuiz.id}/${testComment.id}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(204);

      const deletedComment = await prisma.comment.findUnique({
        where: { id: testComment.id },
      });
      expect(deletedComment).toBeNull();
    });
  });
});
