-- CreateEnum
CREATE TYPE "VaultAction" AS ENUM ('READ', 'WRITE', 'SHARE', 'DELETE');

-- CreateTable
CREATE TABLE "VaultDocument" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "associatedPerson" TEXT,
    "storageRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedGrant" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "granteeEmail" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT NOT NULL,

    CONSTRAINT "SharedGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultAuditEntry" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" "VaultAction" NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultAuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedGrant_documentId_granteeEmail_key" ON "SharedGrant"("documentId", "granteeEmail");

-- AddForeignKey
ALTER TABLE "SharedGrant" ADD CONSTRAINT "SharedGrant_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "VaultDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultAuditEntry" ADD CONSTRAINT "VaultAuditEntry_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "VaultDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
