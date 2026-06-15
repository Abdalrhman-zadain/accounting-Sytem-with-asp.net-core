-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "posAmendedFromInvoiceId" TEXT,
ADD COLUMN IF NOT EXISTS "posAmendedToInvoiceId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SalesInvoice_posAmendedFromInvoiceId_idx" ON "SalesInvoice"("posAmendedFromInvoiceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SalesInvoice_posAmendedToInvoiceId_idx" ON "SalesInvoice"("posAmendedToInvoiceId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_posAmendedFromInvoiceId_fkey" FOREIGN KEY ("posAmendedFromInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_posAmendedToInvoiceId_fkey" FOREIGN KEY ("posAmendedToInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
