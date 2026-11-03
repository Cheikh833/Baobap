-- CreateEnum
CREATE TYPE "PlanRequestStatus" AS ENUM ('PENDING', 'DONE', 'CANCELED');

-- CreateTable
CREATE TABLE "PlanRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" "PlanCode" NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "solidarity" BOOLEAN NOT NULL DEFAULT false,
    "contactPhone" TEXT,
    "message" TEXT,
    "status" "PlanRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PlanRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanRequest_status_createdAt_idx" ON "PlanRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "PlanRequest" ADD CONSTRAINT "PlanRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
