-- CreateEnum
CREATE TYPE "RepCarTransferStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED', 'REVERSED');

-- AlterEnum
ALTER TYPE "RepCarStockMovementType" ADD VALUE 'TRANSFER_OUT';
ALTER TYPE "RepCarStockMovementType" ADD VALUE 'TRANSFER_IN';

-- CreateTable
CREATE TABLE "RepCarTransfer" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "RepCarTransferStatus" NOT NULL DEFAULT 'DRAFT',
    "transferDate" TIMESTAMP(3) NOT NULL,
    "fromSalesRepId" TEXT NOT NULL,
    "toSalesRepId" TEXT NOT NULL,
    "description" TEXT,
    "totalQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3),
    "postedByUserId" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepCarTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepCarTransferLine" (
    "id" TEXT NOT NULL,
    "repCarTransferId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL,
    "description" TEXT,
    "lineTotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "RepCarTransferLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RepCarTransfer_reference_key" ON "RepCarTransfer"("reference");

-- CreateIndex
CREATE INDEX "RepCarTransfer_status_transferDate_idx" ON "RepCarTransfer"("status", "transferDate");

-- CreateIndex
CREATE INDEX "RepCarTransfer_fromSalesRepId_transferDate_idx" ON "RepCarTransfer"("fromSalesRepId", "transferDate");

-- CreateIndex
CREATE INDEX "RepCarTransfer_toSalesRepId_transferDate_idx" ON "RepCarTransfer"("toSalesRepId", "transferDate");

-- CreateIndex
CREATE INDEX "RepCarTransferLine_repCarTransferId_lineNumber_idx" ON "RepCarTransferLine"("repCarTransferId", "lineNumber");

-- CreateIndex
CREATE INDEX "RepCarTransferLine_itemId_idx" ON "RepCarTransferLine"("itemId");

-- AddForeignKey
ALTER TABLE "RepCarTransfer" ADD CONSTRAINT "RepCarTransfer_fromSalesRepId_fkey" FOREIGN KEY ("fromSalesRepId") REFERENCES "SalesRepresentative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepCarTransfer" ADD CONSTRAINT "RepCarTransfer_toSalesRepId_fkey" FOREIGN KEY ("toSalesRepId") REFERENCES "SalesRepresentative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepCarTransfer" ADD CONSTRAINT "RepCarTransfer_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepCarTransfer" ADD CONSTRAINT "RepCarTransfer_reversedByUserId_fkey" FOREIGN KEY ("reversedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepCarTransferLine" ADD CONSTRAINT "RepCarTransferLine_repCarTransferId_fkey" FOREIGN KEY ("repCarTransferId") REFERENCES "RepCarTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepCarTransferLine" ADD CONSTRAINT "RepCarTransferLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
