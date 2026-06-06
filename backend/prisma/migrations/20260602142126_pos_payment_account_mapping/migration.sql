-- CreateTable
CREATE TABLE "PosPaymentAccountMapping" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "paymentMethod" "PosPaymentMethod" NOT NULL,
    "bankCashAccountId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosPaymentAccountMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosPaymentAccountMapping_companyId_idx" ON "PosPaymentAccountMapping"("companyId");

-- CreateIndex
CREATE INDEX "PosPaymentAccountMapping_paymentMethod_idx" ON "PosPaymentAccountMapping"("paymentMethod");

-- CreateIndex
CREATE UNIQUE INDEX "PosPaymentAccountMapping_companyId_paymentMethod_key" ON "PosPaymentAccountMapping"("companyId", "paymentMethod");

-- AddForeignKey
ALTER TABLE "PosPaymentAccountMapping" ADD CONSTRAINT "PosPaymentAccountMapping_bankCashAccountId_fkey" FOREIGN KEY ("bankCashAccountId") REFERENCES "BankCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosPaymentAccountMapping" ADD CONSTRAINT "PosPaymentAccountMapping_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosPaymentAccountMapping" ADD CONSTRAINT "PosPaymentAccountMapping_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
