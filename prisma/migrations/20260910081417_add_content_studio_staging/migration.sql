-- CreateEnum
CREATE TYPE "ContentWorkflowStatus" AS ENUM ('DRAFT', 'ANALYZING', 'READY_FOR_REVIEW', 'GENERATING', 'VALIDATING', 'NEEDS_REVIEW', 'APPROVED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "ContentSourceStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "SourcePriority" AS ENUM ('OFFICIAL', 'HIGH', 'NORMAL', 'REFERENCE');

-- CreateEnum
CREATE TYPE "CurriculumNodeKind" AS ENUM ('CHAPTER', 'UNIT', 'CONCEPT');

-- CreateEnum
CREATE TYPE "ContentItemType" AS ENUM ('LESSON', 'QUIZ', 'CHECKPOINT');

-- CreateEnum
CREATE TYPE "GenerationJobKind" AS ENUM ('SOURCE_PROCESS', 'CURRICULUM', 'LESSON', 'QUIZ', 'CHECKPOINT', 'VALIDATION');

-- CreateEnum
CREATE TYPE "GenerationJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "ContentProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "bacYear" INTEGER,
    "examType" TEXT,
    "description" TEXT,
    "status" "ContentWorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentSource" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "priority" "SourcePriority" NOT NULL DEFAULT 'NORMAL',
    "status" "ContentSourceStatus" NOT NULL DEFAULT 'UPLOADED',
    "pageCount" INTEGER,
    "charCount" INTEGER,
    "error" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentChunk" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "page" INTEGER,
    "section" TEXT,
    "text" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "embedding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumNode" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "CurriculumNodeKind" NOT NULL,
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "evidence" JSONB,
    "mappedId" TEXT,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nodeId" TEXT,
    "type" "ContentItemType" NOT NULL,
    "status" "ContentWorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "validation" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "versions" JSONB NOT NULL DEFAULT '[]',
    "sourceRefs" JSONB NOT NULL DEFAULT '[]',
    "note" TEXT,
    "targetChapterId" TEXT,
    "targetUnitId" TEXT,
    "targetLessonId" TEXT,
    "targetQuizId" TEXT,
    "targetCheckpointId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectActivity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "itemId" TEXT,
    "userId" TEXT NOT NULL,
    "kind" "GenerationJobKind" NOT NULL,
    "status" "GenerationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "params" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentProject_subjectId_idx" ON "ContentProject"("subjectId");

-- CreateIndex
CREATE INDEX "ContentProject_status_idx" ON "ContentProject"("status");

-- CreateIndex
CREATE INDEX "ContentSource_projectId_idx" ON "ContentSource"("projectId");

-- CreateIndex
CREATE INDEX "ContentSource_status_idx" ON "ContentSource"("status");

-- CreateIndex
CREATE INDEX "ContentChunk_projectId_idx" ON "ContentChunk"("projectId");

-- CreateIndex
CREATE INDEX "ContentChunk_sourceId_idx" ON "ContentChunk"("sourceId");

-- CreateIndex
CREATE INDEX "ContentChunk_page_idx" ON "ContentChunk"("page");

-- CreateIndex
CREATE INDEX "CurriculumNode_projectId_parentId_idx" ON "CurriculumNode"("projectId", "parentId");

-- CreateIndex
CREATE INDEX "CurriculumNode_projectId_kind_idx" ON "CurriculumNode"("projectId", "kind");

-- CreateIndex
CREATE INDEX "ContentItem_projectId_idx" ON "ContentItem"("projectId");

-- CreateIndex
CREATE INDEX "ContentItem_projectId_status_idx" ON "ContentItem"("projectId", "status");

-- CreateIndex
CREATE INDEX "ContentItem_nodeId_idx" ON "ContentItem"("nodeId");

-- CreateIndex
CREATE INDEX "ProjectActivity_projectId_createdAt_idx" ON "ProjectActivity"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_projectId_idx" ON "GenerationJob"("projectId");

-- CreateIndex
CREATE INDEX "GenerationJob_status_idx" ON "GenerationJob"("status");

-- AddForeignKey
ALTER TABLE "ContentProject" ADD CONSTRAINT "ContentProject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSource" ADD CONSTRAINT "ContentSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSource" ADD CONSTRAINT "ContentSource_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentChunk" ADD CONSTRAINT "ContentChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ContentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentChunk" ADD CONSTRAINT "ContentChunk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumNode" ADD CONSTRAINT "CurriculumNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumNode" ADD CONSTRAINT "CurriculumNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CurriculumNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CurriculumNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
