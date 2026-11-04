-- CreateEnum
CREATE TYPE "ResultLevel" AS ENUM ('IMPACT', 'OUTCOME', 'OUTPUT', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "IndicatorType" AS ENUM ('QUANTITATIVE', 'QUALITATIVE');

-- CreateEnum
CREATE TYPE "IndicatorDirection" AS ENUM ('INCREASE', 'DECREASE');

-- CreateEnum
CREATE TYPE "IndicatorAggregation" AS ENUM ('LATEST', 'SUM');

-- CreateEnum
CREATE TYPE "ReportingFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "ValueStatus" AS ENUM ('DRAFT', 'VALIDATED', 'REJECTED');

-- CreateTable
CREATE TABLE "LogframeItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "level" "ResultLevel" NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assumptions" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LogframeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Indicator" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "logframeItemId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "type" "IndicatorType" NOT NULL DEFAULT 'QUANTITATIVE',
    "direction" "IndicatorDirection" NOT NULL DEFAULT 'INCREASE',
    "aggregation" "IndicatorAggregation" NOT NULL DEFAULT 'LATEST',
    "baseline" DECIMAL(18,4),
    "baselineDate" TIMESTAMP(3),
    "target" DECIMAL(18,4),
    "targetDate" TIMESTAMP(3),
    "frequency" "ReportingFrequency" NOT NULL DEFAULT 'QUARTERLY',
    "source" TEXT,
    "method" TEXT,
    "responsibleId" TEXT,
    "disaggregations" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Indicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicatorValue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(18,4),
    "textValue" TEXT,
    "disaggregation" JSONB,
    "source" TEXT NOT NULL,
    "comment" TEXT,
    "status" "ValueStatus" NOT NULL DEFAULT 'DRAFT',
    "supersedesId" TEXT,
    "collectedById" TEXT NOT NULL,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndicatorValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogframeItem_projectId_idx" ON "LogframeItem"("projectId");

-- CreateIndex
CREATE INDEX "Indicator_projectId_idx" ON "Indicator"("projectId");

-- CreateIndex
CREATE INDEX "Indicator_organizationId_idx" ON "Indicator"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "IndicatorValue_supersedesId_key" ON "IndicatorValue"("supersedesId");

-- CreateIndex
CREATE INDEX "IndicatorValue_indicatorId_periodEnd_idx" ON "IndicatorValue"("indicatorId", "periodEnd");

-- AddForeignKey
ALTER TABLE "LogframeItem" ADD CONSTRAINT "LogframeItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogframeItem" ADD CONSTRAINT "LogframeItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LogframeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indicator" ADD CONSTRAINT "Indicator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indicator" ADD CONSTRAINT "Indicator_logframeItemId_fkey" FOREIGN KEY ("logframeItemId") REFERENCES "LogframeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicatorValue" ADD CONSTRAINT "IndicatorValue_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicatorValue" ADD CONSTRAINT "IndicatorValue_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "IndicatorValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
