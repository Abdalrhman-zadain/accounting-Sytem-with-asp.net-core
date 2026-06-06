-- CreateEnum
CREATE TYPE "PosAddonSelectionType" AS ENUM ('SINGLE', 'MULTIPLE');

-- CreateTable
CREATE TABLE "PosAddonGroup" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "selectionType" "PosAddonSelectionType" NOT NULL DEFAULT 'SINGLE',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosAddonGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosAddonOption" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "priceAdjustment" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosAddonOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosItemAddonGroup" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PosItemAddonGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosAddonGroup_code_key" ON "PosAddonGroup"("code");

-- CreateIndex
CREATE INDEX "PosAddonGroup_isActive_sortOrder_idx" ON "PosAddonGroup"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "PosAddonOption_groupId_isActive_sortOrder_idx" ON "PosAddonOption"("groupId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PosItemAddonGroup_itemId_groupId_key" ON "PosItemAddonGroup"("itemId", "groupId");

-- CreateIndex
CREATE INDEX "PosItemAddonGroup_itemId_idx" ON "PosItemAddonGroup"("itemId");

-- AddForeignKey
ALTER TABLE "PosAddonOption" ADD CONSTRAINT "PosAddonOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PosAddonGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosItemAddonGroup" ADD CONSTRAINT "PosItemAddonGroup_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosItemAddonGroup" ADD CONSTRAINT "PosItemAddonGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PosAddonGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
