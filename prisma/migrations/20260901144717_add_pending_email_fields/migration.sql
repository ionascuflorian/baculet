-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pendingEmail" TEXT,
ADD COLUMN     "pendingEmailCode" TIMESTAMP(3),
ADD COLUMN     "pendingEmailExpires" TIMESTAMP(3);
