ALTER TABLE "BankCashTransaction" ADD COLUMN IF NOT EXISTS "collectedBySalesRepId" TEXT;

CREATE INDEX IF NOT EXISTS "BankCashTransaction_collectedBySalesRepId_idx" ON "BankCashTransaction"("collectedBySalesRepId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BankCashTransaction_collectedBySalesRepId_fkey'
  ) THEN
    ALTER TABLE "BankCashTransaction" ADD CONSTRAINT "BankCashTransaction_collectedBySalesRepId_fkey" FOREIGN KEY ("collectedBySalesRepId") REFERENCES "SalesRepresentative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

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
