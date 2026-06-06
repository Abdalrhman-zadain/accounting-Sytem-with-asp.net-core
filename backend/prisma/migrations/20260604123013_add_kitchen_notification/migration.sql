/*
  Warnings:

  - You are about to drop the `PosPaymentAccountMapping` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PosPaymentAccountMapping" DROP CONSTRAINT "PosPaymentAccountMapping_bankCashAccountId_fkey";

-- DropForeignKey
ALTER TABLE "PosPaymentAccountMapping" DROP CONSTRAINT "PosPaymentAccountMapping_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "PosPaymentAccountMapping" DROP CONSTRAINT "PosPaymentAccountMapping_updatedByUserId_fkey";

-- AlterTable
ALTER TABLE "KitchenOrder" ADD COLUMN     "hasUpdateNotification" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "PosPaymentAccountMapping";
