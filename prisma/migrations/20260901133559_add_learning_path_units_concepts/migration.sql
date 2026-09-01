-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('LESSON', 'RECAP', 'CHECKPOINT', 'DIAGNOSTIC');

-- CreateEnum
CREATE TYPE "UnitStatusEnum" AS ENUM ('LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'MASTERED', 'NEEDS_REVIEW');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "conceptId" TEXT;

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" "UnitType" NOT NULL DEFAULT 'LESSON',

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT,
    "unitId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'SINGLE',
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "answer" JSONB NOT NULL,
    "explanation" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConceptProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "mastery" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correctAttempts" INTEGER NOT NULL DEFAULT 0,
    "wrongAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastPracticed" TIMESTAMP(3),
    "nextReview" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConceptProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserUnitProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOCKED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserUnitProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT,
    "unitId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckpointAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckpointAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Unit_chapterId_idx" ON "Unit"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_chapterId_slug_key" ON "Unit"("chapterId", "slug");

-- CreateIndex
CREATE INDEX "Concept_lessonId_idx" ON "Concept"("lessonId");

-- CreateIndex
CREATE INDEX "Concept_unitId_idx" ON "Concept"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Concept_lessonId_slug_key" ON "Concept"("lessonId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Concept_unitId_slug_key" ON "Concept"("unitId", "slug");

-- CreateIndex
CREATE INDEX "Exercise_conceptId_idx" ON "Exercise"("conceptId");

-- CreateIndex
CREATE INDEX "UserConceptProgress_userId_mastery_idx" ON "UserConceptProgress"("userId", "mastery");

-- CreateIndex
CREATE INDEX "UserConceptProgress_userId_nextReview_idx" ON "UserConceptProgress"("userId", "nextReview");

-- CreateIndex
CREATE UNIQUE INDEX "UserConceptProgress_userId_conceptId_key" ON "UserConceptProgress"("userId", "conceptId");

-- CreateIndex
CREATE INDEX "UserUnitProgress_userId_idx" ON "UserUnitProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserUnitProgress_userId_unitId_key" ON "UserUnitProgress"("userId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Checkpoint_chapterId_key" ON "Checkpoint"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "Checkpoint_unitId_key" ON "Checkpoint"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Checkpoint_slug_key" ON "Checkpoint"("slug");

-- CreateIndex
CREATE INDEX "CheckpointAttempt_userId_createdAt_idx" ON "CheckpointAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CheckpointAttempt_checkpointId_idx" ON "CheckpointAttempt"("checkpointId");

-- CreateIndex
CREATE INDEX "Lesson_unitId_idx" ON "Lesson"("unitId");

-- CreateIndex
CREATE INDEX "Question_conceptId_idx" ON "Question"("conceptId");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConceptProgress" ADD CONSTRAINT "UserConceptProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConceptProgress" ADD CONSTRAINT "UserConceptProgress_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUnitProgress" ADD CONSTRAINT "UserUnitProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUnitProgress" ADD CONSTRAINT "UserUnitProgress_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckpointAttempt" ADD CONSTRAINT "CheckpointAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckpointAttempt" ADD CONSTRAINT "CheckpointAttempt_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "Checkpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE SET NULL ON UPDATE CASCADE;
