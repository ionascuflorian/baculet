-- CreateTable
CREATE TABLE "StudyActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyActivity_userId_idx" ON "StudyActivity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyActivity_userId_date_key" ON "StudyActivity"("userId", "date");

-- AddForeignKey
ALTER TABLE "StudyActivity" ADD CONSTRAINT "StudyActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
