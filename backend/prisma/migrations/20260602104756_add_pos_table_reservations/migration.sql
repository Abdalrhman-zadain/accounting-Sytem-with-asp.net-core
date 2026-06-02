-- CreateEnum
CREATE TYPE "PosTableReservationStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "PosTableReservation" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "reservedFrom" TIMESTAMP(3) NOT NULL,
    "reservedTo" TIMESTAMP(3) NOT NULL,
    "status" "PosTableReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosTableReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosTableReservation_tableId_reservedFrom_reservedTo_idx" ON "PosTableReservation"("tableId", "reservedFrom", "reservedTo");

-- CreateIndex
CREATE INDEX "PosTableReservation_status_idx" ON "PosTableReservation"("status");

-- AddForeignKey
ALTER TABLE "PosTableReservation" ADD CONSTRAINT "PosTableReservation_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "PosTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
