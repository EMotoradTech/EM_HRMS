-- CreateEnum
CREATE TYPE "ExitStatus" AS ENUM ('INITIATED', 'DOCUMENTS_GENERATED', 'APPROVALS_CLEARED', 'SENT', 'SIGNED', 'ASSETS_CLEARED', 'COMPLETE');

-- CreateTable
CREATE TABLE "ExitCase" (
    "id" TEXT NOT NULL,
    "employeeEmail" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "lastWorkingDay" TIMESTAMP(3) NOT NULL,
    "status" "ExitStatus" NOT NULL DEFAULT 'INITIATED',
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExitCase_pkey" PRIMARY KEY ("id")
);
