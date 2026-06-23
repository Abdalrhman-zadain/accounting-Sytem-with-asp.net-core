ALTER TYPE "InventoryStockMovementType" ADD VALUE IF NOT EXISTS 'REP_CAR_UNLOAD';

CREATE TABLE IF NOT EXISTS "RepCarUnload" (
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

CREATE TABLE IF NOT EXISTS "RepCarUnloadLine" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "RepCarUnload_reference_key" ON "RepCarUnload"("reference");
CREATE INDEX IF NOT EXISTS "RepCarUnload_status_unloadDate_idx" ON "RepCarUnload"("status", "unloadDate");
CREATE INDEX IF NOT EXISTS "RepCarUnload_salesRepId_unloadDate_idx" ON "RepCarUnload"("salesRepId", "unloadDate");
CREATE INDEX IF NOT EXISTS "RepCarUnload_warehouseId_idx" ON "RepCarUnload"("warehouseId");
CREATE INDEX IF NOT EXISTS "RepCarUnloadLine_repCarUnloadId_lineNumber_idx" ON "RepCarUnloadLine"("repCarUnloadId", "lineNumber");
CREATE INDEX IF NOT EXISTS "RepCarUnloadLine_itemId_idx" ON "RepCarUnloadLine"("itemId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RepCarUnload_warehouseId_fkey'
  ) THEN
    ALTER TABLE "RepCarUnload" ADD CONSTRAINT "RepCarUnload_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RepCarUnload_salesRepId_fkey'
  ) THEN
    ALTER TABLE "RepCarUnload" ADD CONSTRAINT "RepCarUnload_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRepresentative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RepCarUnload_postedByUserId_fkey'
  ) THEN
    ALTER TABLE "RepCarUnload" ADD CONSTRAINT "RepCarUnload_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RepCarUnloadLine_repCarUnloadId_fkey'
  ) THEN
    ALTER TABLE "RepCarUnloadLine" ADD CONSTRAINT "RepCarUnloadLine_repCarUnloadId_fkey" FOREIGN KEY ("repCarUnloadId") REFERENCES "RepCarUnload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RepCarUnloadLine_itemId_fkey'
  ) THEN
    ALTER TABLE "RepCarUnloadLine" ADD CONSTRAINT "RepCarUnloadLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
