import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  quizId: { type: String, required: true, index: true },
  metadata: {
    score: Number,
    timeSpent: Number,
    commentText: String,
    rank: Number,
  },
  timestamp: { type: Date, default: Date.now, index: true },
  ipAddress: String,
});

const quizPopularitySchema = new mongoose.Schema({
  quizId: { type: String, required: true, index: true },
  title: String,
  category: String,
  totalAttempts: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now },
  popularityScore: { type: Number, default: 0, index: true },
});

ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ quizId: 1, action: 1 });
quizPopularitySchema.index({ popularityScore: -1, lastActivity: -1 });

export const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
export const QuizPopularity = mongoose.model('QuizPopularity', quizPopularitySchema);

export class AnalyticsService {
  static async logActivity(
    userId: string,
    action: string,
    quizId: string,
    metadata: any = {},
    ipAddress?: string
  ) {
    try {
      await ActivityLog.create({
        userId,
        action,
        quizId,
        metadata,
        ipAddress,
      });

      await this.updateQuizPopularity(quizId, action, metadata);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  static async updateQuizPopularity(quizId: string, action: string, metadata: any) {
    try {
      if (action === 'quiz_completed') {
        await QuizPopularity.updateOne(
          { quizId },
          {
            $inc: { totalAttempts: 1 },
            $set: { lastActivity: new Date() },
            $push: { scores: metadata.score },
          },
          { upsert: true }
        );

        const popularity = await QuizPopularity.findOne({ quizId });
        if (popularity && popularity.totalAttempts > 0) {
          const popularityScore =
            popularity.totalAttempts * 0.7 + (popularity.averageScore || 0) * 0.3;
          await QuizPopularity.updateOne({ quizId }, { $set: { popularityScore } });
        }
      }
    } catch (error) {
      console.error('Error updating quiz popularity:', error);
    }
  }

  static async getUserStats(userId: string) {
    try {
      const stats = await ActivityLog.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            avgScore: { $avg: '$metadata.score' },
            totalTimeSpent: { $sum: '$metadata.timeSpent' },
          },
        },
      ]);

      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return [];
    }
  }

  static async getPopularQuizzes(limit: number = 10) {
    try {
      return await QuizPopularity.find()
        .sort({ popularityScore: -1, lastActivity: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error getting popular quizzes:', error);
      return [];
    }
  }
}

export const connectMongoDB = async () => {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/quiz_analytics';
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};
