/*
  Warnings:

  - Added the required column `maxScore` to the `LeaderboardEntry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LeaderboardEntry" ADD COLUMN     "maxScore" INTEGER NOT NULL,
ADD COLUMN     "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "maxPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "LeaderboardEntry_quizId_percentage_idx" ON "LeaderboardEntry"("quizId", "percentage");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_percentage_idx" ON "LeaderboardEntry"("percentage");

-- CreateIndex
CREATE INDEX "Question_points_idx" ON "Question"("points");

-- CreateIndex
CREATE INDEX "Quiz_maxPoints_idx" ON "Quiz"("maxPoints");
