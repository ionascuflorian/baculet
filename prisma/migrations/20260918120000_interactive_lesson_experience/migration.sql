-- Interactive lesson experience: extended QuestionType + exercise answer schema + lesson objective/duration.

-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'SINGLE_CHOICE';
ALTER TYPE "QuestionType" ADD VALUE 'TRUE_FALSE';
ALTER TYPE "QuestionType" ADD VALUE 'MULTIPLE_CHOICE';
ALTER TYPE "QuestionType" ADD VALUE 'FILL_BLANK';
ALTER TYPE "QuestionType" ADD VALUE 'MATCHING';
ALTER TYPE "QuestionType" ADD VALUE 'ORDERING';
ALTER TYPE "QuestionType" ADD VALUE 'IMAGE_CHOICE';
ALTER TYPE "QuestionType" ADD VALUE 'CLASSIFICATION';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "answer" JSONB,
ADD COLUMN     "difficulty" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "objective" TEXT,
ADD COLUMN     "estimatedMinutes" INTEGER;