-- AlterEnum
ALTER TYPE "InventoryStockMovementType" ADD VALUE IF NOT EXISTS 'REP_CAR_LOAD';

-- CreateEnum
CREATE TYPE "RepCarLoadStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');
CREATE TYPE "RepCarStocktakeStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');
CREATE TYPE "RepCarStockMovementType" AS ENUM ('LOAD_IN', 'SALE_OUT', 'STOCKTAKE_IN', 'STOCKTAKE_OUT');

-- AlterEnum
ALTER TYPE "PosPermissionCode" ADD VALUE IF NOT EXISTS 'POS_MARKET_MANAGE_REP_LOADS';
ALTER TYPE "PosPermissionCode" ADD VALUE IF NOT EXISTS 'POS_MARKET_REP_STOCKTAKE';

-- AlterTable
ALTER TABLE "PosSession" ADD COLUMN IF NOT EXISTS "salesRepId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PosSession_salesRepId_status_idx" ON "PosSession"("salesRepId", "status");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PosSession_salesRepId_fkey'
  ) THEN
    ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_salesRepId_fkey"
      FOREIGN KEY ("salesRepId") REFERENCES "SalesRepresentative"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "RepCarStockBalance" (
    "id" TEXT NOT NULL,
    "salesRepId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "onHandQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "valuationAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepCarStockBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RepCarLoad" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "RepCarLoadStatus" NOT NULL DEFAULT 'DRAFT',
    "loadDate" TIMESTAMP(3) NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "salesRepId" TEXT NOT NULL,
    "description" TEXT,
    "totalQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3),
    "postedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepCarLoad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RepCarLoadLine" (
    "id" TEXT NOT NULL,
    "repCarLoadId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL,
    "description" TEXT,
    "lineTotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "RepCarLoadLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RepCarStocktake" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "RepCarStocktakeStatus" NOT NULL DEFAULT 'DRAFT',
    "stocktakeDate" TIMESTAMP(3) NOT NULL,
    "salesRepId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "totalVarianceQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3),
    "postedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepCarStocktake_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RepCarStocktakeLine" (
    "id" TEXT NOT NULL,
    "repCarStocktakeId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "systemQuantity" DECIMAL(18,4) NOT NULL,
    "countedQuantity" DECIMAL(18,4) NOT NULL,
    "varianceQuantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unitOfMeasure" TEXT NOT NULL,
    "description" TEXT,
    "lineTotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "RepCarStocktakeLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RepCarStockMovement" (
    "id" TEXT NOT NULL,
    "movementType" "RepCarStockMovementType" NOT NULL,
    "transactionType" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "transactionLineId" TEXT,
    "transactionReference" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "salesRepId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityIn" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "quantityOut" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valueIn" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valueOut" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "runningQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "runningValuation" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepCarStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RepCarStockBalance_salesRepId_itemId_key" ON "RepCarStockBalance"("salesRepId", "itemId");
CREATE INDEX IF NOT EXISTS "RepCarStockBalance_salesRepId_idx" ON "RepCarStockBalance"("salesRepId");
CREATE INDEX IF NOT EXISTS "RepCarStockBalance_itemId_idx" ON "RepCarStockBalance"("itemId");

CREATE UNIQUE INDEX IF NOT EXISTS "RepCarLoad_reference_key" ON "RepCarLoad"("reference");
CREATE INDEX IF NOT EXISTS "RepCarLoad_status_loadDate_idx" ON "RepCarLoad"("status", "loadDate");
CREATE INDEX IF NOT EXISTS "RepCarLoad_salesRepId_loadDate_idx" ON "RepCarLoad"("salesRepId", "loadDate");
CREATE INDEX IF NOT EXISTS "RepCarLoad_warehouseId_idx" ON "RepCarLoad"("warehouseId");

CREATE INDEX IF NOT EXISTS "RepCarLoadLine_repCarLoadId_lineNumber_idx" ON "RepCarLoadLine"("repCarLoadId", "lineNumber");
CREATE INDEX IF NOT EXISTS "RepCarLoadLine_itemId_idx" ON "RepCarLoadLine"("itemId");

CREATE UNIQUE INDEX IF NOT EXISTS "RepCarStocktake_reference_key" ON "RepCarStocktake"("reference");
CREATE INDEX IF NOT EXISTS "RepCarStocktake_status_stocktakeDate_idx" ON "RepCarStocktake"("status", "stocktakeDate");
CREATE INDEX IF NOT EXISTS "RepCarStocktake_salesRepId_stocktakeDate_idx" ON "RepCarStocktake"("salesRepId", "stocktakeDate");

CREATE INDEX IF NOT EXISTS "RepCarStocktakeLine_repCarStocktakeId_lineNumber_idx" ON "RepCarStocktakeLine"("repCarStocktakeId", "lineNumber");
CREATE INDEX IF NOT EXISTS "RepCarStocktakeLine_itemId_idx" ON "RepCarStocktakeLine"("itemId");

CREATE INDEX IF NOT EXISTS "RepCarStockMovement_salesRepId_itemId_transactionDate_created_idx" ON "RepCarStockMovement"("salesRepId", "itemId", "transactionDate", "createdAt");
CREATE INDEX IF NOT EXISTS "RepCarStockMovement_transactionType_transactionId_idx" ON "RepCarStockMovement"("transactionType", "transactionId");

-- AddForeignKey
ALTER TABLE "RepCarStockBalance" ADD CONSTRAINT "RepCarStockBalance_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRepresentative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepCarStockBalance" ADD CONSTRAINT "RepCarStockBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RepCarLoad" ADD CONSTRAINT "RepCarLoad_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepCarLoad" ADD CONSTRAINT "RepCarLoad_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRepresentative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepCarLoad" ADD CONSTRAINT "RepCarLoad_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RepCarLoadLine" ADD CONSTRAINT "RepCarLoadLine_repCarLoadId_fkey" FOREIGN KEY ("repCarLoadId") REFERENCES "RepCarLoad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepCarLoadLine" ADD CONSTRAINT "RepCarLoadLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RepCarStocktake" ADD CONSTRAINT "RepCarStocktake_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRepresentative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepCarStocktake" ADD CONSTRAINT "RepCarStocktake_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RepCarStocktakeLine" ADD CONSTRAINT "RepCarStocktakeLine_repCarStocktakeId_fkey" FOREIGN KEY ("repCarStocktakeId") REFERENCES "RepCarStocktake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepCarStocktakeLine" ADD CONSTRAINT "RepCarStocktakeLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RepCarStockMovement" ADD CONSTRAINT "RepCarStockMovement_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRepresentative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepCarStockMovement" ADD CONSTRAINT "RepCarStockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
