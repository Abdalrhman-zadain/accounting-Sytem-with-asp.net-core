-- AlterEnum
ALTER TYPE "InventoryStockMovementType" ADD VALUE 'REP_CAR_UNLOAD';

-- CreateTable
CREATE TABLE "RepCarUnload" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "RepCarLoadStatus" NOT NULL DEFAULT 'DRAFT',
    "unloadDate" TIMESTAMP(3) NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "salesRepId" TEXT NOT NULL,
    "description" TEXT,
    "totalQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3),
    "postedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepCarUnload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepCarUnloadLine" (
    "id" TEXT NOT NULL,
    "repCarUnloadId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL,
    "description" TEXT,
    "lineTotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "RepCarUnloadLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RepCarUnload_reference_key" ON "RepCarUnload"("reference");

-- CreateIndex
CREATE INDEX "RepCarUnload_status_unloadDate_idx" ON "RepCarUnload"("status", "unloadDate");

-- CreateIndex
CREATE INDEX "RepCarUnload_salesRepId_unloadDate_idx" ON "RepCarUnload"("salesRepId", "unloadDate");

-- CreateIndex
CREATE INDEX "RepCarUnload_warehouseId_idx" ON "RepCarUnload"("warehouseId");

-- CreateIndex
CREATE INDEX "RepCarUnloadLine_repCarUnloadId_lineNumber_idx" ON "RepCarUnloadLine"("repCarUnloadId", "lineNumber");

-- CreateIndex
CREATE INDEX "RepCarUnloadLine_itemId_idx" ON "RepCarUnloadLine"("itemId");

-- AddForeignKey
ALTER TABLE "RepCarUnload" ADD CONSTRAINT "RepCarUnload_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepCarUnload" ADD CONSTRAINT "RepCarUnload_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRepresentative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepCarUnload" ADD CONSTRAINT "RepCarUnload_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepCarUnloadLine" ADD CONSTRAINT "RepCarUnloadLine_repCarUnloadId_fkey" FOREIGN KEY ("repCarUnloadId") REFERENCES "RepCarUnload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepCarUnloadLine" ADD CONSTRAINT "RepCarUnloadLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
