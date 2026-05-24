/*
  Warnings:

  - Added the required column `creditNoteTypeId` to the `CreditNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplierDebitNoteTypeId` to the `DebitNote` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CreditNoteTypeEffect" AS ENUM ('FINANCIAL_ONLY', 'FINANCIAL_INVENTORY', 'TAX_ONLY');

-- CreateEnum
CREATE TYPE "CreditNoteLinkedInvoiceRequirement" AS ENUM ('REQUIRED', 'OPTIONAL');

-- AlterEnum
ALTER TYPE "InventoryStockMovementType" ADD VALUE 'PURCHASE_RETURN';

-- AlterTable
ALTER TABLE "CreditNote" ADD COLUMN     "creditNoteTypeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CreditNoteLine" ADD COLUMN     "cogsAccountId" TEXT,
ADD COLUMN     "correctedTaxAmount" DECIMAL(18,2),
ADD COLUMN     "correctedUnitPrice" DECIMAL(18,2),
ADD COLUMN     "inventoryAccountId" TEXT,
ADD COLUMN     "itemCondition" TEXT,
ADD COLUMN     "itemId" TEXT,
ADD COLUMN     "originalTaxAmount" DECIMAL(18,2),
ADD COLUMN     "originalUnitPrice" DECIMAL(18,2),
ADD COLUMN     "returnToStock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "salesInvoiceLineId" TEXT,
ADD COLUMN     "totalCost" DECIMAL(18,2),
ADD COLUMN     "unitCost" DECIMAL(18,4),
ADD COLUMN     "warehouseId" TEXT;

-- AlterTable
ALTER TABLE "DebitNote" ADD COLUMN     "supplierDebitNoteTypeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DebitNoteLine" ADD COLUMN     "correctedTaxAmount" DECIMAL(18,2),
ADD COLUMN     "correctedUnitPrice" DECIMAL(18,2),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "inventoryAccountId" TEXT,
ADD COLUMN     "itemCondition" TEXT,
ADD COLUMN     "itemId" TEXT,
ADD COLUMN     "itemName" TEXT,
ADD COLUMN     "lineSubtotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "originalTaxAmount" DECIMAL(18,2),
ADD COLUMN     "originalUnitPrice" DECIMAL(18,2),
ADD COLUMN     "purchaseInvoiceLineId" TEXT,
ADD COLUMN     "returnReason" TEXT,
ADD COLUMN     "returnToStock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalCost" DECIMAL(18,2),
ADD COLUMN     "unitCost" DECIMAL(18,4),
ADD COLUMN     "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "warehouseId" TEXT;

-- CreateTable
CREATE TABLE "CreditNoteType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effect" "CreditNoteTypeEffect" NOT NULL,
    "linkedInvoiceRequirement" "CreditNoteLinkedInvoiceRequirement" NOT NULL,
    "affectsInventory" BOOLEAN NOT NULL DEFAULT false,
    "allowsTaxAdjustment" BOOLEAN NOT NULL DEFAULT false,
    "defaultAccountId" TEXT NOT NULL,
    "helperText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditNoteType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierDebitNoteType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effect" "CreditNoteTypeEffect" NOT NULL,
    "linkedInvoiceRequirement" "CreditNoteLinkedInvoiceRequirement" NOT NULL,
    "affectsInventory" BOOLEAN NOT NULL DEFAULT false,
    "allowsTaxAdjustment" BOOLEAN NOT NULL DEFAULT false,
    "defaultAccountId" TEXT NOT NULL,
    "helperText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierDebitNoteType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditNoteType_code_key" ON "CreditNoteType"("code");

-- CreateIndex
CREATE INDEX "CreditNoteType_isActive_code_idx" ON "CreditNoteType"("isActive", "code");

-- CreateIndex
CREATE INDEX "CreditNoteType_defaultAccountId_idx" ON "CreditNoteType"("defaultAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierDebitNoteType_code_key" ON "SupplierDebitNoteType"("code");

-- CreateIndex
CREATE INDEX "SupplierDebitNoteType_isActive_code_idx" ON "SupplierDebitNoteType"("isActive", "code");

-- CreateIndex
CREATE INDEX "SupplierDebitNoteType_defaultAccountId_idx" ON "SupplierDebitNoteType"("defaultAccountId");

-- CreateIndex
CREATE INDEX "CreditNote_creditNoteTypeId_idx" ON "CreditNote"("creditNoteTypeId");

-- CreateIndex
CREATE INDEX "CreditNoteLine_salesInvoiceLineId_idx" ON "CreditNoteLine"("salesInvoiceLineId");

-- CreateIndex
CREATE INDEX "CreditNoteLine_itemId_idx" ON "CreditNoteLine"("itemId");

-- CreateIndex
CREATE INDEX "CreditNoteLine_warehouseId_idx" ON "CreditNoteLine"("warehouseId");

-- CreateIndex
CREATE INDEX "DebitNote_supplierDebitNoteTypeId_idx" ON "DebitNote"("supplierDebitNoteTypeId");

-- CreateIndex
CREATE INDEX "DebitNoteLine_purchaseInvoiceLineId_idx" ON "DebitNoteLine"("purchaseInvoiceLineId");

-- CreateIndex
CREATE INDEX "DebitNoteLine_itemId_idx" ON "DebitNoteLine"("itemId");

-- CreateIndex
CREATE INDEX "DebitNoteLine_warehouseId_idx" ON "DebitNoteLine"("warehouseId");

-- CreateIndex
CREATE INDEX "DebitNoteLine_inventoryAccountId_idx" ON "DebitNoteLine"("inventoryAccountId");

-- AddForeignKey
ALTER TABLE "CreditNoteType" ADD CONSTRAINT "CreditNoteType_defaultAccountId_fkey" FOREIGN KEY ("defaultAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDebitNoteType" ADD CONSTRAINT "SupplierDebitNoteType_defaultAccountId_fkey" FOREIGN KEY ("defaultAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_supplierDebitNoteTypeId_fkey" FOREIGN KEY ("supplierDebitNoteTypeId") REFERENCES "SupplierDebitNoteType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNoteLine" ADD CONSTRAINT "DebitNoteLine_purchaseInvoiceLineId_fkey" FOREIGN KEY ("purchaseInvoiceLineId") REFERENCES "PurchaseInvoiceLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNoteLine" ADD CONSTRAINT "DebitNoteLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNoteLine" ADD CONSTRAINT "DebitNoteLine_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNoteLine" ADD CONSTRAINT "DebitNoteLine_inventoryAccountId_fkey" FOREIGN KEY ("inventoryAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_creditNoteTypeId_fkey" FOREIGN KEY ("creditNoteTypeId") REFERENCES "CreditNoteType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_salesInvoiceLineId_fkey" FOREIGN KEY ("salesInvoiceLineId") REFERENCES "SalesInvoiceLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_inventoryAccountId_fkey" FOREIGN KEY ("inventoryAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_cogsAccountId_fkey" FOREIGN KEY ("cogsAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
