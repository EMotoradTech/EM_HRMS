-- CreateEnum
CREATE TYPE "SectionStatus" AS ENUM ('NOT_STARTED', 'STARTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Joiner" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Joiner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionProgress" (
    "id" TEXT NOT NULL,
    "joinerId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "status" "SectionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SectionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Joiner_email_key" ON "Joiner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SectionProgress_joinerId_sectionKey_key" ON "SectionProgress"("joinerId", "sectionKey");

-- AddForeignKey
ALTER TABLE "SectionProgress" ADD CONSTRAINT "SectionProgress_joinerId_fkey" FOREIGN KEY ("joinerId") REFERENCES "Joiner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
