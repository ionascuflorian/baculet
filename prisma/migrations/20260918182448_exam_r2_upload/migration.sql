-- AlterTable
ALTER TABLE "OfficialExam" ADD COLUMN     "pdfMime" TEXT,
ADD COLUMN     "pdfSize" INTEGER,
ADD COLUMN     "pdfStorageKey" TEXT,
ADD COLUMN     "solutionMime" TEXT,
ADD COLUMN     "solutionSize" INTEGER,
ADD COLUMN     "solutionStorageKey" TEXT;
