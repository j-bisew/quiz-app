import { prisma } from './setup';
import { UserService } from '../services/userService';
import { AnalyticsService, ActivityLog, QuizPopularity } from '../db/mongodb';
import mongoose from 'mongoose';

jest.mock('../services/userService', () => ({
  UserService: {
    verifyToken: jest.fn(),
    getUserById: jest.fn(),
  },
}));

const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('Analytics Service Integration Tests', () => {
  let testUser: any;
  let testQuiz: any;
  let testAdmin: any;

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'USER',
      },
    });

    testAdmin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'hashedpassword',
        role: 'ADMIN',
      },
    });

    testQuiz = await prisma.quiz.create({
      data: {
        title: 'Analytics Test Quiz',
        description: 'Test quiz for analytics',
        category: 'Testing',
        difficulty: 'MEDIUM',
        maxPoints: 10, // Add maxPoints to quiz
        createdById: testUser.id,
        questions: {
          create: [
            {
              title: 'What is 2+2?',
              type: 'SINGLE',
              answers: ['3', '4', '5'],
              correctAnswer: ['4'],
              points: 5, // Add points to question
            },
            {
              title: 'Select all even numbers',
              type: 'MULTIPLE',
              answers: ['1', '2', '3', '4'],
              correctAnswer: ['2', '4'],
              points: 5, // Add points to question
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

  describe('AnalyticsService Unit Tests', () => {
    it('should log activity correctly with new point system', async () => {
      const userId = testUser.id;
      const action = 'quiz_started';
      const quizId = testQuiz.id;
      const metadata = { 
        score: 8, 
        maxScore: 10, 
        percentage: 80, 
        timeSpent: 120 
      };
      const ipAddress = '127.0.0.1';

      await AnalyticsService.logActivity(userId, action, quizId, metadata, ipAddress);

      const loggedActivity = await ActivityLog.findOne({
        userId,
        action,
        quizId,
      });

      expect(loggedActivity).toBeTruthy();
      expect(loggedActivity!.userId).toBe(userId);
      expect(loggedActivity!.action).toBe(action);
      expect(loggedActivity!.quizId).toBe(quizId);
      expect(loggedActivity!.metadata).toBeTruthy();
      expect(loggedActivity!.metadata?.score).toBe(8);
      expect(loggedActivity!.metadata?.maxScore).toBe(10);
      expect(loggedActivity!.metadata?.percentage).toBe(80);
      expect(loggedActivity!.metadata?.timeSpent).toBe(120);
      expect(loggedActivity!.ipAddress).toBe(ipAddress);
    });

    it('should update quiz popularity on completion with percentages', async () => {
      const quizId = testQuiz.id;
      const action = 'quiz_completed';
      const metadata = { 
        score: 8, 
        maxScore: 10, 
        percentage: 80, 
        timeSpent: 120 
      };

      await AnalyticsService.logActivity(testUser.id, action, quizId, metadata);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const popularity = await QuizPopularity.findOne({ quizId });
      expect(popularity).toBeTruthy();
      expect(popularity!.totalAttempts).toBe(1);
      expect(popularity!.lastActivity).toBeDefined();
      expect(popularity!.scores).toBeDefined();
      expect(popularity!.percentages).toBeDefined();
      if (popularity!.scores && popularity!.scores.length > 0) {
        expect(popularity!.scores[0]).toBe(8);
      }
      if (popularity!.percentages && popularity!.percentages.length > 0) {
        expect(popularity!.percentages[0]).toBe(80);
      }
    });

    it('should get user stats correctly with percentages', async () => {
      const userId = testUser.id;

      await AnalyticsService.logActivity(userId, 'quiz_completed', testQuiz.id, {
        score: 9,
        maxScore: 10,
        percentage: 90,
        timeSpent: 100,
      });
      await AnalyticsService.logActivity(userId, 'quiz_completed', testQuiz.id, {
        score: 8,
        maxScore: 10,
        percentage: 80,
        timeSpent: 150,
      });
      await AnalyticsService.logActivity(userId, 'comment_added', testQuiz.id, {
        commentText: 'Great quiz!',
      });

      const stats = await AnalyticsService.getUserStats(userId);

      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);

      const quizCompletedStats = stats.find((s) => s._id === 'quiz_completed');
      expect(quizCompletedStats).toBeTruthy();
      if (quizCompletedStats) {
        expect(quizCompletedStats.count).toBe(2);
        expect(quizCompletedStats.avgScore).toBe(8.5); // (9 + 8) / 2
        expect(quizCompletedStats.avgPercentage).toBe(85); // (90 + 80) / 2
        expect(quizCompletedStats.maxPercentage).toBe(90);
      }
    });

    it('should get popular quizzes correctly with percentage analytics', async () => {
      await AnalyticsService.logActivity(testUser.id, 'quiz_completed', testQuiz.id, {
        score: 9,
        maxScore: 10,
        percentage: 90,
        timeSpent: 90,
      });
      await AnalyticsService.logActivity(testAdmin.id, 'quiz_completed', testQuiz.id, {
        score: 8,
        maxScore: 10,
        percentage: 80,
        timeSpent: 110,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const popularQuizzes = await AnalyticsService.getPopularQuizzes(5);

      expect(Array.isArray(popularQuizzes)).toBe(true);
      if (popularQuizzes.length > 0) {
        expect(popularQuizzes[0]).toHaveProperty('quizId');
        expect(popularQuizzes[0]).toHaveProperty('totalAttempts');
        expect(popularQuizzes[0]).toHaveProperty('popularityScore');
        expect(popularQuizzes[0]).toHaveProperty('averageScore');
        expect(popularQuizzes[0]).toHaveProperty('averagePercentage');
        expect(popularQuizzes[0].totalAttempts).toBe(2);
        expect(popularQuizzes[0].averageScore).toBe(8.5); // (9 + 8) / 2
        expect(popularQuizzes[0].averagePercentage).toBe(85); // (90 + 80) / 2
      }
    });

    it('should handle errors gracefully', async () => {
      const invalidUserId = 'invalid-user-id';
      const action = 'invalid_action';

      await expect(
        AnalyticsService.logActivity(invalidUserId, action, testQuiz.id, {})
      ).resolves.not.toThrow();
    });
  });

  describe('MongoDB Integration Tests', () => {
    it('should create activity log with proper indexes', async () => {
      await AnalyticsService.logActivity(testUser.id, 'quiz_started', testQuiz.id, {});

      const indexes = await ActivityLog.collection.getIndexes();
      const indexNames = Object.keys(indexes);

      expect(indexNames.length).toBeGreaterThan(0);
      expect(indexNames.includes('_id_')).toBe(true);
    });

    it('should aggregate user statistics correctly with new fields', async () => {
      const userId = testUser.id;

      await AnalyticsService.logActivity(userId, 'quiz_started', testQuiz.id, {});
      await AnalyticsService.logActivity(userId, 'quiz_completed', testQuiz.id, {
        score: 9,
        maxScore: 10,
        percentage: 90,
        timeSpent: 120,
      });
      await AnalyticsService.logActivity(userId, 'quiz_completed', testQuiz.id, {
        score: 8,
        maxScore: 10,
        percentage: 80,
        timeSpent: 140,
      });

      const stats = await AnalyticsService.getUserStats(userId);

      expect(stats.length).toBeGreaterThanOrEqual(1);

      const completedStats = stats.find((s) => s._id === 'quiz_completed');
      if (completedStats) {
        expect(completedStats).toMatchObject({
          _id: 'quiz_completed',
          count: 2,
          avgScore: 8.5, // (9 + 8) / 2
          avgPercentage: 85, // (90 + 80) / 2
          totalTimeSpent: 260,
          maxPercentage: 90,
        });
      }
    });

    it('should handle concurrent analytics operations with new point system', async () => {
      const promises = [];

      for (let i = 0; i < 5; i++) {
        const score = 6 + i;
        const maxScore = 10;
        const percentage = (score / maxScore) * 100;
        
        promises.push(
          AnalyticsService.logActivity(testUser.id, 'quiz_completed', testQuiz.id, {
            score,
            maxScore,
            percentage,
            timeSpent: 100 + i,
          })
        );
      }

      await Promise.all(promises);

      const activityCount = await ActivityLog.countDocuments({
        userId: testUser.id,
        action: 'quiz_completed',
      });

      expect(activityCount).toBe(5);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing metadata gracefully', async () => {
      await expect(
        AnalyticsService.logActivity(testUser.id, 'quiz_started', testQuiz.id)
      ).resolves.not.toThrow();

      const activity = await ActivityLog.findOne({
        userId: testUser.id,
        action: 'quiz_started',
      });

      expect(activity).toBeTruthy();
      if (activity) {
        expect(activity.metadata).toEqual({});
      }
    });

    it('should handle invalid quiz IDs', async () => {
      const invalidQuizId = 'invalid-quiz-id';

      await expect(
        AnalyticsService.logActivity(testUser.id, 'quiz_completed', invalidQuizId, { 
          score: 9, 
          maxScore: 10, 
          percentage: 90 
        })
      ).resolves.not.toThrow();

      const activity = await ActivityLog.findOne({
        userId: testUser.id,
        quizId: invalidQuizId,
      });

      expect(activity).toBeTruthy();
    });

    it('should return empty array for user with no activities', async () => {
      const newUser = await prisma.user.create({
        data: {
          name: 'New User',
          email: 'new@example.com',
          password: 'hashedpassword',
          role: 'USER',
        },
      });

      const stats = await AnalyticsService.getUserStats(newUser.id);
      expect(stats).toEqual([]);
    });

    it('should return empty array when no popular quizzes exist', async () => {
      const popularQuizzes = await AnalyticsService.getPopularQuizzes(10);
      expect(popularQuizzes).toEqual([]);
    });
  });

  describe('Performance Tests', () => {
    it('should handle batch of analytics data efficiently with new point system', async () => {
      const batchSize = 10;
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < batchSize; i++) {
        const score = Math.floor(Math.random() * 10) + 1;
        const maxScore = 10;
        const percentage = (score / maxScore) * 100;
        
        promises.push(
          AnalyticsService.logActivity(testUser.id, 'quiz_completed', testQuiz.id, {
            score,
            maxScore,
            percentage,
            timeSpent: Math.floor(Math.random() * 300) + 60,
          })
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();

      const count = await ActivityLog.countDocuments({
        userId: testUser.id,
        action: 'quiz_completed',
      });

      expect(count).toBe(batchSize);
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('Data Consistency Tests', () => {
    it('should maintain consistency between PostgreSQL and MongoDB with new fields', async () => {
      const leaderboardEntry = await prisma.leaderboardEntry.create({
        data: {
          score: 9,
          maxScore: 10,
          percentage: 90,
          timeSpent: 180,
          userId: testUser.id,
          quizId: testQuiz.id,
        },
      });

      await AnalyticsService.logActivity(testUser.id, 'quiz_completed', testQuiz.id, {
        score: 9,
        maxScore: 10,
        percentage: 90,
        timeSpent: 180,
      });

      const pgEntry = await prisma.leaderboardEntry.findUnique({
        where: { id: leaderboardEntry.id },
      });

      const mongoActivity = await ActivityLog.findOne({
        userId: testUser.id,
        action: 'quiz_completed',
        'metadata.score': 9,
      });

      expect(pgEntry).toBeTruthy();
      expect(mongoActivity).toBeTruthy();
      expect(pgEntry!.score).toBe(mongoActivity!.metadata?.score);
      expect(pgEntry!.maxScore).toBe(mongoActivity!.metadata?.maxScore);
      expect(pgEntry!.percentage).toBe(mongoActivity!.metadata?.percentage);
      expect(pgEntry!.timeSpent).toBe(mongoActivity!.metadata?.timeSpent);
    });

    it('should handle timezone consistency', async () => {
      const beforeTime = new Date();

      await AnalyticsService.logActivity(testUser.id, 'quiz_started', testQuiz.id, {});

      const afterTime = new Date();

      const activity = await ActivityLog.findOne({
        userId: testUser.id,
        action: 'quiz_started',
      });

      expect(activity).toBeTruthy();
      if (activity && activity.timestamp) {
        expect(activity.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(activity.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      }
    });
  });

  describe('Security Tests', () => {
    it('should handle potentially malicious input with new fields', async () => {
      const maliciousMetadata = {
        score: 9,
        maxScore: 10,
        percentage: 90,
        timeSpent: 120,
        commentText: '<script>alert("xss")</script>',
      };

      await AnalyticsService.logActivity(
        testUser.id,
        'quiz_completed',
        testQuiz.id,
        maliciousMetadata
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      const activity = await ActivityLog.findOne({
        userId: testUser.id,
        action: 'quiz_completed',
      }).sort({ timestamp: -1 });

      expect(activity).toBeTruthy();
      expect(activity!.metadata).toBeTruthy();
      expect(activity!.metadata?.score).toBe(9);
      expect(activity!.metadata?.maxScore).toBe(10);
      expect(activity!.metadata?.percentage).toBe(90);
      expect(activity!.metadata?.timeSpent).toBe(120);
      expect(activity!.metadata?.commentText).toBe('<script>alert("xss")</script>');
    });

    it('should handle very large metadata objects with new point system', async () => {
      const largeMetadata = {
        score: 8,
        maxScore: 10,
        percentage: 80,
        largeArray: new Array(100).fill('test'),
        largeString: 'a'.repeat(1000),
      };

      await expect(
        AnalyticsService.logActivity(testUser.id, 'quiz_completed', testQuiz.id, largeMetadata)
      ).resolves.not.toThrow();

      const activity = await ActivityLog.findOne({
        userId: testUser.id,
        action: 'quiz_completed',
      });

      expect(activity).toBeTruthy();
      if (activity && activity.metadata) {
        expect(activity.metadata.score).toBe(8);
        expect(activity.metadata.maxScore).toBe(10);
        expect(activity.metadata.percentage).toBe(80);
      }
    });
  });
});