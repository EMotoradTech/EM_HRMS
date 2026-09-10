-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('SELECTED', 'OFFER_GENERATED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SENT', 'SIGNED', 'ONBOARDING_READY');

-- CreateTable
CREATE TABLE "OfferCandidate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "ctc" TEXT,
    "joiningDate" TIMESTAMP(3),
    "documentEngineId" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'SELECTED',
    "statusHistory" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferCandidate_pkey" PRIMARY KEY ("id")
);
