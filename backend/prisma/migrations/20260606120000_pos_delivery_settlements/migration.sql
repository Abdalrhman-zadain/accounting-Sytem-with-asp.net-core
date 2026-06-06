-- CreateEnum
CREATE TYPE "DeliveryCollectionMethod" AS ENUM ('RESTAURANT', 'COMPANY');

-- CreateEnum
CREATE TYPE "DeliverySettlementStatus" AS ENUM ('PENDING', 'PARTIALLY_SETTLED', 'SETTLED', 'DIFFERENCE');

-- AlterTable
ALTER TABLE "DeliveryCompany"
ADD COLUMN "serviceFeeAccountId" TEXT;

-- AlterTable
ALTER TABLE "SalesInvoice"
ADD COLUMN "deliveryCollectionMethod" "DeliveryCollectionMethod",
ADD COLUMN "deliverySettlementStatus" "DeliverySettlementStatus",
ADD COLUMN "deliverySettledAmount" DECIMAL(18,2) DEFAULT 0;

-- Backfill delivery collection/settlement state for existing company orders
UPDATE "SalesInvoice" si
SET
  "deliveryCollectionMethod" = CASE
    WHEN EXISTS (
      SELECT 1
      FROM "PosPayment" pp
      WHERE pp."salesInvoiceId" = si."id"
        AND (pp."paymentMethod" = 'DELIVERY' OR pp."deliveryCompanyId" IS NOT NULL)
    ) THEN 'COMPANY'::"DeliveryCollectionMethod"
    ELSE 'RESTAURANT'::"DeliveryCollectionMethod"
  END,
  "deliverySettlementStatus" = CASE
    WHEN EXISTS (
      SELECT 1
      FROM "PosPayment" pp
      WHERE pp."salesInvoiceId" = si."id"
        AND (pp."paymentMethod" = 'DELIVERY' OR pp."deliveryCompanyId" IS NOT NULL)
    ) THEN 'PENDING'::"DeliverySettlementStatus"
    ELSE NULL
  END
WHERE si."deliveryCompanyId" IS NOT NULL;

-- CreateTable
CREATE TABLE "DeliveryCompanySettlement" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "deliveryCompanyId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "settlementDate" TIMESTAMP(3) NOT NULL,
    "statementReference" TEXT,
    "bankCashAccountId" TEXT NOT NULL,
    "statementAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grossOrdersAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "commissionAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "serviceFeeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "refundAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "adjustmentAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "differenceAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "differenceReason" TEXT,
    "differenceAccountId" TEXT,
    "differenceNotes" TEXT,
    "netReceivedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "statementAttachmentUrl" TEXT,
    "bankReceiptAttachmentUrl" TEXT,
    "journalEntryId" TEXT,
    "createdByUserId" TEXT,
    "confirmedByUserId" TEXT,
    "reversedByUserId" TEXT,
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryCompanySettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryCompanySettlementOrder" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "salesInvoiceId" TEXT NOT NULL,
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryCompanySettlementOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryCompanySettlement_reference_key" ON "DeliveryCompanySettlement"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryCompanySettlement_journalEntryId_key" ON "DeliveryCompanySettlement"("journalEntryId");

-- CreateIndex
CREATE INDEX "DeliveryCompanySettlement_deliveryCompanyId_periodFrom_periodTo_idx" ON "DeliveryCompanySettlement"("deliveryCompanyId", "periodFrom", "periodTo");

-- CreateIndex
CREATE INDEX "DeliveryCompanySettlement_bankCashAccountId_idx" ON "DeliveryCompanySettlement"("bankCashAccountId");

-- CreateIndex
CREATE INDEX "DeliveryCompanySettlement_settlementDate_idx" ON "DeliveryCompanySettlement"("settlementDate");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryCompanySettlementOrder_settlementId_salesInvoiceId_key" ON "DeliveryCompanySettlementOrder"("settlementId", "salesInvoiceId");

-- CreateIndex
CREATE INDEX "DeliveryCompanySettlementOrder_salesInvoiceId_idx" ON "DeliveryCompanySettlementOrder"("salesInvoiceId");

-- AddForeignKey
ALTER TABLE "DeliveryCompany" ADD CONSTRAINT "DeliveryCompany_serviceFeeAccountId_fkey" FOREIGN KEY ("serviceFeeAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryCompanySettlement" ADD CONSTRAINT "DeliveryCompanySettlement_deliveryCompanyId_fkey" FOREIGN KEY ("deliveryCompanyId") REFERENCES "DeliveryCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryCompanySettlement" ADD CONSTRAINT "DeliveryCompanySettlement_bankCashAccountId_fkey" FOREIGN KEY ("bankCashAccountId") REFERENCES "BankCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryCompanySettlement" ADD CONSTRAINT "DeliveryCompanySettlement_differenceAccountId_fkey" FOREIGN KEY ("differenceAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryCompanySettlement" ADD CONSTRAINT "DeliveryCompanySettlement_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryCompanySettlement" ADD CONSTRAINT "DeliveryCompanySettlement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryCompanySettlement" ADD CONSTRAINT "DeliveryCompanySettlement_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryCompanySettlement" ADD CONSTRAINT "DeliveryCompanySettlement_reversedByUserId_fkey" FOREIGN KEY ("reversedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryCompanySettlementOrder" ADD CONSTRAINT "DeliveryCompanySettlementOrder_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "DeliveryCompanySettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryCompanySettlementOrder" ADD CONSTRAINT "DeliveryCompanySettlementOrder_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
