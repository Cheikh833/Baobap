-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('ESSENTIEL', 'PROFESSIONNEL', 'INSTITUTION', 'ENTREPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "plan" "PlanCode" NOT NULL DEFAULT 'PROFESSIONNEL',
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- Organisations existantes : essai de 30 jours à compter de leur création.
UPDATE "Organization" SET "trialEndsAt" = "createdAt" + INTERVAL '30 days' WHERE "trialEndsAt" IS NULL;
