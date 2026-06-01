-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY', 'PICKUP');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'WAITING_FOR_PAYMENT', 'CLEANING');

-- CreateEnum
CREATE TYPE "KitchenStatus" AS ENUM ('NEW', 'PREPARING', 'READY', 'SERVED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'PREPARING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_VIEW_TABLE_SCREEN';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_OPEN_TABLE_ORDER';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_TRANSFER_TABLE';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_MERGE_TABLES';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_SPLIT_BILL';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_CREATE_TAKEAWAY_ORDER';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_CREATE_DELIVERY_ORDER';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_ASSIGN_DRIVER';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_SEND_KOT';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_CANCEL_KOT_ITEM';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_REPRINT_KOT';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_VIEW_KITCHEN_SCREEN';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_UPDATE_KITCHEN_STATUS';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_MARK_ITEM_UNAVAILABLE';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_APPLY_SERVICE_CHARGE';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_OVERRIDE_SERVICE_CHARGE';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_PRINT_PRE_BILL';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_COMPLETE_RESTAURANT_PAYMENT';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_CANCEL_RESTAURANT_ORDER';
ALTER TYPE "PosPermissionCode" ADD VALUE 'RST_VIEW_RESTAURANT_REPORTS';
ALTER TYPE "PosPermissionCode" ADD VALUE 'POS_CORRECT_ORDER_TYPE';
ALTER TYPE "PosPermissionCode" ADD VALUE 'POS_APPROVE_CORRECTION';
ALTER TYPE "PosPermissionCode" ADD VALUE 'POS_REOPEN_SESSION';

-- AlterTable
ALTER TABLE "PosPayment" ADD COLUMN     "deliveryCompanyId" TEXT;

-- AlterTable
ALTER TABLE "PosSession" ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "submittedByUserId" TEXT;

-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN     "correctedAt" TIMESTAMP(3),
ADD COLUMN     "correctedByUserId" TEXT,
ADD COLUMN     "correctionReason" TEXT,
ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryCompanyId" TEXT,
ADD COLUMN     "deliveryFeeAmount" DECIMAL(18,2) DEFAULT 0,
ADD COLUMN     "deliveryNotes" TEXT,
ADD COLUMN     "deliveryStatus" "DeliveryStatus",
ADD COLUMN     "driverId" TEXT,
ADD COLUMN     "isCorrected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orderType" "OrderType",
ADD COLUMN     "originalOrderType" "OrderType",
ADD COLUMN     "serviceChargeAmount" DECIMAL(18,2) DEFAULT 0,
ADD COLUMN     "tableId" TEXT,
ADD COLUMN     "waiterId" TEXT;

-- AlterTable
ALTER TABLE "SalesInvoiceLine" ADD COLUMN     "modifiers" JSONB;

-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "nameAr" TEXT,
    "symbol" TEXT,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosTable" (
    "id" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "activeInvoiceId" TEXT,
    "assignedWaiterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "arabicName" TEXT,
    "receivableAccountId" TEXT NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "commissionAccountId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryDriver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryDriver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "salesInvoiceId" TEXT,
    "tableId" TEXT,
    "tableName" TEXT,
    "waiterId" TEXT,
    "waiterName" TEXT,
    "orderType" "OrderType" NOT NULL,
    "status" "KitchenStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenOrderItem" (
    "id" TEXT NOT NULL,
    "kitchenOrderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "modifiers" JSONB,
    "status" "KitchenStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KitchenOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantRecipe" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantRecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientItemId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitOfMeasureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantRecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- CreateIndex
CREATE INDEX "Currency_isActive_idx" ON "Currency"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PosTable_tableNumber_key" ON "PosTable"("tableNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PosTable_activeInvoiceId_key" ON "PosTable"("activeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryCompany_name_key" ON "DeliveryCompany"("name");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenOrder_orderNumber_key" ON "KitchenOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenOrder_salesInvoiceId_key" ON "KitchenOrder"("salesInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantRecipe_itemId_key" ON "RestaurantRecipe"("itemId");

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "PosTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DeliveryDriver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_deliveryCompanyId_fkey" FOREIGN KEY ("deliveryCompanyId") REFERENCES "DeliveryCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_correctedByUserId_fkey" FOREIGN KEY ("correctedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_deliveryCompanyId_fkey" FOREIGN KEY ("deliveryCompanyId") REFERENCES "DeliveryCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosTable" ADD CONSTRAINT "PosTable_activeInvoiceId_fkey" FOREIGN KEY ("activeInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosTable" ADD CONSTRAINT "PosTable_assignedWaiterId_fkey" FOREIGN KEY ("assignedWaiterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryCompany" ADD CONSTRAINT "DeliveryCompany_receivableAccountId_fkey" FOREIGN KEY ("receivableAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryCompany" ADD CONSTRAINT "DeliveryCompany_commissionAccountId_fkey" FOREIGN KEY ("commissionAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenOrder" ADD CONSTRAINT "KitchenOrder_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenOrderItem" ADD CONSTRAINT "KitchenOrderItem_kitchenOrderId_fkey" FOREIGN KEY ("kitchenOrderId") REFERENCES "KitchenOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantRecipe" ADD CONSTRAINT "RestaurantRecipe_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantRecipeIngredient" ADD CONSTRAINT "RestaurantRecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "RestaurantRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantRecipeIngredient" ADD CONSTRAINT "RestaurantRecipeIngredient_ingredientItemId_fkey" FOREIGN KEY ("ingredientItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantRecipeIngredient" ADD CONSTRAINT "RestaurantRecipeIngredient_unitOfMeasureId_fkey" FOREIGN KEY ("unitOfMeasureId") REFERENCES "InventoryUnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
