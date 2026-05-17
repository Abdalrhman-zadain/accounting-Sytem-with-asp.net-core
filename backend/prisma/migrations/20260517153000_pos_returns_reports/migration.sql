CREATE TYPE "PosReturnStatus" AS ENUM ('COMPLETED', 'APPROVED', 'REJECTED', 'REVERSED');
CREATE TYPE "PosRefundMethod" AS ENUM ('CASH', 'CARD', 'CLIQ', 'BANK_TRANSFER', 'WALLET', 'STORE_CREDIT');

ALTER TYPE "InventoryStockMovementType" ADD VALUE IF NOT EXISTS 'SALES_RETURN';

CREATE TABLE "PosReturn" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "status" "PosReturnStatus" NOT NULL DEFAULT 'COMPLETED',
  "returnDate" TIMESTAMP(3) NOT NULL,
  "salesInvoiceId" TEXT NOT NULL,
  "posSessionId" TEXT,
  "customerId" TEXT NOT NULL,
  "currencyCode" TEXT NOT NULL DEFAULT 'JOD',
  "reason" TEXT,
  "subtotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "refundAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "accountingStatus" "PosAccountingStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "journalEntryId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "reviewNotes" TEXT,
  "postedAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PosReturn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosReturnLine" (
  "id" TEXT NOT NULL,
  "posReturnId" TEXT NOT NULL,
  "lineNumber" INTEGER NOT NULL,
  "salesInvoiceLineId" TEXT,
  "itemId" TEXT,
  "warehouseId" TEXT,
  "itemName" TEXT,
  "description" TEXT,
  "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(18,2) NOT NULL,
  "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "taxId" TEXT,
  "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "lineSubtotalAmount" DECIMAL(18,2) NOT NULL,
  "lineAmount" DECIMAL(18,2) NOT NULL,
  "revenueAccountId" TEXT NOT NULL,
  "inventoryAccountId" TEXT,
  "cogsAccountId" TEXT,
  "unitCost" DECIMAL(18,4),
  "totalCost" DECIMAL(18,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PosReturnLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosReturnPayment" (
  "id" TEXT NOT NULL,
  "posReturnId" TEXT NOT NULL,
  "refundMethod" "PosRefundMethod" NOT NULL,
  "bankCashAccountId" TEXT,
  "amount" DECIMAL(18,2) NOT NULL,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PosReturnPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PosReturn_reference_key" ON "PosReturn"("reference");
CREATE UNIQUE INDEX "PosReturn_journalEntryId_key" ON "PosReturn"("journalEntryId");
CREATE INDEX "PosReturn_salesInvoiceId_returnDate_idx" ON "PosReturn"("salesInvoiceId", "returnDate");
CREATE INDEX "PosReturn_posSessionId_idx" ON "PosReturn"("posSessionId");
CREATE INDEX "PosReturn_customerId_idx" ON "PosReturn"("customerId");
CREATE INDEX "PosReturn_accountingStatus_returnDate_idx" ON "PosReturn"("accountingStatus", "returnDate");

CREATE UNIQUE INDEX "PosReturnLine_posReturnId_lineNumber_key" ON "PosReturnLine"("posReturnId", "lineNumber");
CREATE INDEX "PosReturnLine_salesInvoiceLineId_idx" ON "PosReturnLine"("salesInvoiceLineId");
CREATE INDEX "PosReturnLine_itemId_idx" ON "PosReturnLine"("itemId");
CREATE INDEX "PosReturnLine_warehouseId_idx" ON "PosReturnLine"("warehouseId");
CREATE INDEX "PosReturnLine_taxId_idx" ON "PosReturnLine"("taxId");

CREATE INDEX "PosReturnPayment_posReturnId_idx" ON "PosReturnPayment"("posReturnId");
CREATE INDEX "PosReturnPayment_bankCashAccountId_idx" ON "PosReturnPayment"("bankCashAccountId");
CREATE INDEX "PosReturnPayment_refundMethod_idx" ON "PosReturnPayment"("refundMethod");

ALTER TABLE "PosReturn"
ADD CONSTRAINT "PosReturn_salesInvoiceId_fkey"
FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosReturn"
ADD CONSTRAINT "PosReturn_posSessionId_fkey"
FOREIGN KEY ("posSessionId") REFERENCES "PosSession"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PosReturn"
ADD CONSTRAINT "PosReturn_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosReturn"
ADD CONSTRAINT "PosReturn_journalEntryId_fkey"
FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosReturn"
ADD CONSTRAINT "PosReturn_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PosReturn"
ADD CONSTRAINT "PosReturn_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PosReturnLine"
ADD CONSTRAINT "PosReturnLine_posReturnId_fkey"
FOREIGN KEY ("posReturnId") REFERENCES "PosReturn"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PosReturnLine"
ADD CONSTRAINT "PosReturnLine_salesInvoiceLineId_fkey"
FOREIGN KEY ("salesInvoiceLineId") REFERENCES "SalesInvoiceLine"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PosReturnLine"
ADD CONSTRAINT "PosReturnLine_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosReturnLine"
ADD CONSTRAINT "PosReturnLine_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosReturnLine"
ADD CONSTRAINT "PosReturnLine_taxId_fkey"
FOREIGN KEY ("taxId") REFERENCES "Tax"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosReturnLine"
ADD CONSTRAINT "PosReturnLine_revenueAccountId_fkey"
FOREIGN KEY ("revenueAccountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosReturnLine"
ADD CONSTRAINT "PosReturnLine_inventoryAccountId_fkey"
FOREIGN KEY ("inventoryAccountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosReturnLine"
ADD CONSTRAINT "PosReturnLine_cogsAccountId_fkey"
FOREIGN KEY ("cogsAccountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosReturnPayment"
ADD CONSTRAINT "PosReturnPayment_posReturnId_fkey"
FOREIGN KEY ("posReturnId") REFERENCES "PosReturn"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PosReturnPayment"
ADD CONSTRAINT "PosReturnPayment_bankCashAccountId_fkey"
FOREIGN KEY ("bankCashAccountId") REFERENCES "BankCashAccount"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
