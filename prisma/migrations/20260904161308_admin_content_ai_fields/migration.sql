-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "difficulty" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiApiKeyEnc" TEXT,
ADD COLUMN     "aiProvider" TEXT;
