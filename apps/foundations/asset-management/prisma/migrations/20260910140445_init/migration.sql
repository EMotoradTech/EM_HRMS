-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('IN_STOCK', 'ISSUED', 'RETURNED', 'LOST');

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'IN_STOCK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuanceRecord" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "employeeEmail" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),

    CONSTRAINT "IssuanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_identifier_key" ON "Asset"("identifier");

-- AddForeignKey
ALTER TABLE "IssuanceRecord" ADD CONSTRAINT "IssuanceRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
