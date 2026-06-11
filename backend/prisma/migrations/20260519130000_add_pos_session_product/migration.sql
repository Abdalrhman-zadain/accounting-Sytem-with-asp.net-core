-- CreateEnum
CREATE TYPE "PosProduct" AS ENUM ('RESTAURANT', 'MARKET');

-- AlterTable
ALTER TABLE "PosSession" ADD COLUMN "posProduct" "PosProduct" NOT NULL DEFAULT 'RESTAURANT';

-- CreateIndex
CREATE INDEX "PosSession_posProduct_status_openedAt_idx" ON "PosSession"("posProduct", "status", "openedAt");

-- CreateIndex
CREATE INDEX "PosSession_cashierUserId_posProduct_status_idx" ON "PosSession"("cashierUserId", "posProduct", "status");
