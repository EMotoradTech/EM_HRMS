-- CreateEnum
CREATE TYPE "CheckType" AS ENUM ('EDUCATION', 'EMPLOYMENT', 'ADDRESS', 'IDENTITY', 'CRIMINAL_RECORD', 'REFERENCE');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'VERIFIED', 'FLAGGED', 'FAILED');

-- CreateEnum
CREATE TYPE "OverallStatus" AS ENUM ('IN_PROGRESS', 'COMPLETE', 'BLOCKED');

-- CreateTable
CREATE TABLE "BgvCandidate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "stakeholderEmail" TEXT,
    "overallStatus" "OverallStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BgvCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BgvCheck" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "type" "CheckType" NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BgvCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BgvDocument" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "checkType" "CheckType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BgvDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BgvCheck_candidateId_idx" ON "BgvCheck"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "BgvCheck_candidateId_type_key" ON "BgvCheck"("candidateId", "type");

-- CreateIndex
CREATE INDEX "BgvDocument_candidateId_idx" ON "BgvDocument"("candidateId");

-- AddForeignKey
ALTER TABLE "BgvCheck" ADD CONSTRAINT "BgvCheck_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "BgvCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BgvDocument" ADD CONSTRAINT "BgvDocument_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "BgvCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
