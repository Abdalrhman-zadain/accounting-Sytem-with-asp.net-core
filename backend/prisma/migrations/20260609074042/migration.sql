-- CreateEnum
CREATE TYPE "WaiterFoodStatus" AS ENUM ('WAITING', 'RECEIVED', 'DEPARTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_VIEW_WAITER_ORDERS';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_UPDATE_WAITER_ORDER_STATUS';

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "allowFractionalQuantity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minSalesQuantity" DECIMAL(18,4) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "KitchenOrder" ADD COLUMN     "departedAt" TIMESTAMP(3),
ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "waiterStatus" "WaiterFoodStatus" NOT NULL DEFAULT 'WAITING';
