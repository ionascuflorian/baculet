-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotifs" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "followNotifs" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminderHour" INTEGER,
ADD COLUMN     "reminderSentOn" TIMESTAMP(3),
ADD COLUMN     "streakNotifs" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "streakWarnedFor" TIMESTAMP(3);
