-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('MONTHLY');

-- CreateTable
CREATE TABLE "ComplianceItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'MONTHLY',
    "dayOfMonth" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "lastNotifiedForDueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceItem_pkey" PRIMARY KEY ("id")
);
