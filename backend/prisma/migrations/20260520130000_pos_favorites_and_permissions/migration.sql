-- AlterEnum (PostgreSQL): add POS permission codes
ALTER TYPE "PosPermissionCode" ADD VALUE 'POS_CREDIT_SALE';
ALTER TYPE "PosPermissionCode" ADD VALUE 'POS_SELL_NEGATIVE_STOCK';
ALTER TYPE "PosPermissionCode" ADD VALUE 'POS_CHANGE_UNIT_PRICE';

-- CreateTable
CREATE TABLE "PosUserFavoriteItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosUserFavoriteItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PosUserFavoriteItem_userId_itemId_key" ON "PosUserFavoriteItem"("userId", "itemId");

CREATE INDEX "PosUserFavoriteItem_userId_idx" ON "PosUserFavoriteItem"("userId");

CREATE INDEX "PosUserFavoriteItem_itemId_idx" ON "PosUserFavoriteItem"("itemId");

ALTER TABLE "PosUserFavoriteItem" ADD CONSTRAINT "PosUserFavoriteItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PosUserFavoriteItem" ADD CONSTRAINT "PosUserFavoriteItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
