-- AlterEnum
ALTER TYPE "InventoryStockMovementType" ADD VALUE 'REP_CAR_LOAD_REVERSAL';

-- AlterEnum
ALTER TYPE "PosAccessRoleCode" ADD VALUE 'MARKET_CASHIER';

-- AlterEnum
ALTER TYPE "RepCarLoadStatus" ADD VALUE 'REVERSED';

-- AlterEnum
ALTER TYPE "RepCarStockMovementType" ADD VALUE 'LOAD_OUT';

-- AlterTable
ALTER TABLE "RepCarLoad" ADD COLUMN     "reversedAt" TIMESTAMP(3),
ADD COLUMN     "reversedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "RepCarLoad" ADD CONSTRAINT "RepCarLoad_reversedByUserId_fkey" FOREIGN KEY ("reversedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "RepCarStockMovement_salesRepId_itemId_transactionDate_created_i" RENAME TO "RepCarStockMovement_salesRepId_itemId_transactionDate_creat_idx";
