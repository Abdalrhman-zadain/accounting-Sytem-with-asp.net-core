-- AlterTable
ALTER TABLE "BankCashTransaction" ADD COLUMN "collectedBySalesRepId" TEXT;

-- CreateIndex
CREATE INDEX "BankCashTransaction_collectedBySalesRepId_idx" ON "BankCashTransaction"("collectedBySalesRepId");

-- AddForeignKey
ALTER TABLE "BankCashTransaction" ADD CONSTRAINT "BankCashTransaction_collectedBySalesRepId_fkey" FOREIGN KEY ("collectedBySalesRepId") REFERENCES "SalesRepresentative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill collectedBySalesRepId from AuditLog (Market POS and other receipt posts by rep-linked users)
UPDATE "BankCashTransaction" bct
SET "collectedBySalesRepId" = u."salesRepId"
FROM "AuditLog" al
JOIN "User" u ON u.id = al."userId"
WHERE bct.id = al."entityId"
  AND al.entity = 'CustomerReceipt'
  AND al.action = 'POST'
  AND bct.kind = 'RECEIPT'
  AND bct.status = 'POSTED'
  AND bct."collectedBySalesRepId" IS NULL
  AND u."salesRepId" IS NOT NULL;
