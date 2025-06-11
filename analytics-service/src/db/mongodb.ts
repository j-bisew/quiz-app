import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  quizId: { type: String, required: true, index: true },
  metadata: {
    score: Number,
    maxScore: Number,        // Add maxScore
    percentage: Number,      // Add percentage
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
  averagePercentage: { type: Number, default: 0 }, // Add average percentage
  lastActivity: { type: Date, default: Date.now },
  popularityScore: { type: Number, default: 0, index: true },
  scores: [Number], // Store all scores for average calculation
  percentages: [Number], // Store all percentages for average calculation
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
        const updateData: any = {
          $inc: { totalAttempts: 1 },
          $set: { lastActivity: new Date() },
        };

        // Add score and percentage to arrays if provided
        if (metadata.score !== undefined) {
          updateData.$push = { scores: metadata.score };
        }
        if (metadata.percentage !== undefined) {
          updateData.$push = { ...updateData.$push, percentages: metadata.percentage };
        }

        await QuizPopularity.updateOne(
          { quizId },
          updateData,
          { upsert: true }
        );

        // Recalculate averages
        const popularity = await QuizPopularity.findOne({ quizId });
        if (popularity && popularity.totalAttempts > 0) {
          const avgScore = popularity.scores && popularity.scores.length > 0 
            ? popularity.scores.reduce((a: number, b: number) => a + b, 0) / popularity.scores.length 
            : 0;
          
          const avgPercentage = popularity.percentages && popularity.percentages.length > 0
            ? popularity.percentages.reduce((a: number, b: number) => a + b, 0) / popularity.percentages.length
            : 0;

          const popularityScore = popularity.totalAttempts * 0.7 + avgPercentage * 0.3;
          
          await QuizPopularity.updateOne(
            { quizId }, 
            { 
              $set: { 
                averageScore: avgScore,
                averagePercentage: avgPercentage,
                popularityScore 
              } 
            }
          );
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
            avgPercentage: { $avg: '$metadata.percentage' }, // Add percentage average
            totalTimeSpent: { $sum: '$metadata.timeSpent' },
            maxScore: { $max: '$metadata.score' },
            maxPercentage: { $max: '$metadata.percentage' }, // Add max percentage
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