-- AlterTable
ALTER TABLE "PosSession" ADD COLUMN     "acceptanceReason" TEXT,
ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "acceptedByUserId" TEXT,
ADD COLUMN     "differenceStatus" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewStatus" TEXT;

-- AddForeignKey
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
