-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleLinked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleEmail" TEXT;

-- Backfill: conturile create/legate prin Google au avatar de pe CDN-ul Google
UPDATE "User"
SET "googleLinked" = true,
    "googleEmail" = "email"
WHERE "image" LIKE '%googleusercontent.com%'
  AND "googleLinked" = false;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleEmail_key" ON "User"("googleEmail");
