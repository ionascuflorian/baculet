-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE', 'CLOZE', 'FLASHCARD', 'DRAG_DROP');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "concept" TEXT,
ADD COLUMN     "type" "QuestionType" NOT NULL DEFAULT 'SINGLE';

-- CreateTable
CREATE TABLE "LessonStep" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "quizId" TEXT,

    CONSTRAINT "LessonStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonStepProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonStepProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "failCount" INTEGER NOT NULL DEFAULT 1,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "lastFailedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonStep_quizId_key" ON "LessonStep"("quizId");

-- CreateIndex
CREATE INDEX "LessonStep_lessonId_idx" ON "LessonStep"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonStep_lessonId_order_key" ON "LessonStep"("lessonId", "order");

-- CreateIndex
CREATE INDEX "LessonStepProgress_userId_lessonId_idx" ON "LessonStepProgress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "LessonStepProgress_completedAt_idx" ON "LessonStepProgress"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LessonStepProgress_userId_stepId_key" ON "LessonStepProgress"("userId", "stepId");

-- CreateIndex
CREATE INDEX "ReviewItem_userId_nextReviewAt_idx" ON "ReviewItem"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewItem_userId_questionId_key" ON "ReviewItem"("userId", "questionId");

-- CreateIndex
CREATE INDEX "Question_concept_idx" ON "Question"("concept");

-- AddForeignKey
ALTER TABLE "LessonStep" ADD CONSTRAINT "LessonStep_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonStep" ADD CONSTRAINT "LessonStep_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonStepProgress" ADD CONSTRAINT "LessonStepProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonStepProgress" ADD CONSTRAINT "LessonStepProgress_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "LessonStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
