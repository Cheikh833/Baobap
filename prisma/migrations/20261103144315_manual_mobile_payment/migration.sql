-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "senderPhone" TEXT;

-- CreateIndex
CREATE INDEX "Payment_provider_status_idx" ON "Payment"("provider", "status");
