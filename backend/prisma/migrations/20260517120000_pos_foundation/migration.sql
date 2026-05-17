CREATE TYPE "SalesInvoiceType" AS ENUM ('STANDARD', 'POS');
CREATE TYPE "PosOperationalStatus" AS ENUM ('DRAFT', 'HELD', 'COMPLETED', 'VOIDED', 'REFUNDED');
CREATE TYPE "PosAccountingStatus" AS ENUM ('UNPOSTED', 'PENDING_REVIEW', 'POSTED', 'REJECTED', 'REVERSED');
CREATE TYPE "PosSessionStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "PosPaymentMethod" AS ENUM ('CASH', 'CARD', 'CLIQ', 'BANK_TRANSFER', 'WALLET');

ALTER TABLE "SalesInvoice"
ADD COLUMN "invoiceType" "SalesInvoiceType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "posOperationalStatus" "PosOperationalStatus",
ADD COLUMN "posAccountingStatus" "PosAccountingStatus",
ADD COLUMN "posSessionId" TEXT,
ADD COLUMN "posReceiptNumber" TEXT,
ADD COLUMN "posCompletedAt" TIMESTAMP(3),
ADD COLUMN "posVoidedAt" TIMESTAMP(3),
ADD COLUMN "posVoidReason" TEXT,
ADD COLUMN "posReviewedAt" TIMESTAMP(3),
ADD COLUMN "posReviewedByUserId" TEXT,
ADD COLUMN "posReviewNotes" TEXT,
ADD COLUMN "posChangeAmount" DECIMAL(18,2);

CREATE TABLE "PosSession" (
  "id" TEXT NOT NULL,
  "sessionNumber" TEXT NOT NULL,
  "terminalName" TEXT NOT NULL,
  "branchName" TEXT,
  "warehouseId" TEXT NOT NULL,
  "cashierUserId" TEXT,
  "cashAccountId" TEXT NOT NULL,
  "openingCash" DECIMAL(18,2) NOT NULL,
  "expectedCash" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "actualCash" DECIMAL(18,2),
  "difference" DECIMAL(18,2),
  "status" "PosSessionStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PosSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosPayment" (
  "id" TEXT NOT NULL,
  "salesInvoiceId" TEXT NOT NULL,
  "bankCashAccountId" TEXT NOT NULL,
  "paymentMethod" "PosPaymentMethod" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "tenderedAmount" DECIMAL(18,2),
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PosPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesInvoice_posReceiptNumber_key" ON "SalesInvoice"("posReceiptNumber");
CREATE INDEX "SalesInvoice_invoiceType_posOperationalStatus_invoiceDate_idx" ON "SalesInvoice"("invoiceType", "posOperationalStatus", "invoiceDate");
CREATE INDEX "SalesInvoice_invoiceType_posAccountingStatus_invoiceDate_idx" ON "SalesInvoice"("invoiceType", "posAccountingStatus", "invoiceDate");
CREATE INDEX "SalesInvoice_posSessionId_idx" ON "SalesInvoice"("posSessionId");

CREATE UNIQUE INDEX "PosSession_sessionNumber_key" ON "PosSession"("sessionNumber");
CREATE INDEX "PosSession_cashierUserId_status_openedAt_idx" ON "PosSession"("cashierUserId", "status", "openedAt");
CREATE INDEX "PosSession_warehouseId_status_idx" ON "PosSession"("warehouseId", "status");

CREATE INDEX "PosPayment_salesInvoiceId_idx" ON "PosPayment"("salesInvoiceId");
CREATE INDEX "PosPayment_bankCashAccountId_idx" ON "PosPayment"("bankCashAccountId");
CREATE INDEX "PosPayment_paymentMethod_idx" ON "PosPayment"("paymentMethod");

ALTER TABLE "SalesInvoice"
ADD CONSTRAINT "SalesInvoice_posSessionId_fkey"
FOREIGN KEY ("posSessionId") REFERENCES "PosSession"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesInvoice"
ADD CONSTRAINT "SalesInvoice_posReviewedByUserId_fkey"
FOREIGN KEY ("posReviewedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PosSession"
ADD CONSTRAINT "PosSession_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosSession"
ADD CONSTRAINT "PosSession_cashierUserId_fkey"
FOREIGN KEY ("cashierUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PosSession"
ADD CONSTRAINT "PosSession_cashAccountId_fkey"
FOREIGN KEY ("cashAccountId") REFERENCES "BankCashAccount"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PosPayment"
ADD CONSTRAINT "PosPayment_salesInvoiceId_fkey"
FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PosPayment"
ADD CONSTRAINT "PosPayment_bankCashAccountId_fkey"
FOREIGN KEY ("bankCashAccountId") REFERENCES "BankCashAccount"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
