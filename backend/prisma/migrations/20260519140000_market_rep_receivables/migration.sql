-- AlterEnum
ALTER TYPE "PosAccessRoleCode" ADD VALUE IF NOT EXISTS 'MARKET_REP';

-- AlterEnum
ALTER TYPE "PosPermissionCode" ADD VALUE IF NOT EXISTS 'POS_MARKET_VIEW_RECEIVABLES';
ALTER TYPE "PosPermissionCode" ADD VALUE IF NOT EXISTS 'POS_MARKET_COLLECT_RECEIVABLE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "salesRepId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_salesRepId_idx" ON "User"("salesRepId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_salesRepId_fkey'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_salesRepId_fkey"
      FOREIGN KEY ("salesRepId") REFERENCES "SalesRepresentative"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
