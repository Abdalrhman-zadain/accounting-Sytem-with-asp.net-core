-- AlterEnum
ALTER TYPE "PosAccessRoleCode" ADD VALUE 'WAITER';

-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN "waiterConfirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SalesInvoiceLine" ADD COLUMN "kitchenSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "KitchenOrderItem" ADD COLUMN "salesInvoiceLineId" TEXT;

-- CreateIndex
CREATE INDEX "KitchenOrderItem_salesInvoiceLineId_idx" ON "KitchenOrderItem"("salesInvoiceLineId");

-- AddForeignKey
ALTER TABLE "KitchenOrderItem" ADD CONSTRAINT "KitchenOrderItem_salesInvoiceLineId_fkey" FOREIGN KEY ("salesInvoiceLineId") REFERENCES "SalesInvoiceLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
