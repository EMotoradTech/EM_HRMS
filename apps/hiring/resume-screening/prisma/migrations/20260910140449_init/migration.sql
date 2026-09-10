-- CreateTable
CREATE TABLE "JobDescription" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rawText" TEXT,
    "requiredSkills" TEXT[],
    "preferredSkills" TEXT[],
    "minExperienceYears" DOUBLE PRECISION,
    "maxExperienceYears" DOUBLE PRECISION,
    "requiredQualifications" TEXT[],
    "keywords" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "jdId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "sourceFileName" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "extractedSkills" TEXT[],
    "totalExperienceYears" DOUBLE PRECISION,
    "qualifications" TEXT[],
    "score" DOUBLE PRECISION,
    "scoreBreakdown" JSONB,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortlistSend" (
    "id" TEXT NOT NULL,
    "jdId" TEXT NOT NULL,
    "sentTo" TEXT[],
    "payload" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortlistSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CandidateProfile_jdId_idx" ON "CandidateProfile"("jdId");

-- CreateIndex
CREATE INDEX "CandidateProfile_jdId_rank_idx" ON "CandidateProfile"("jdId", "rank");

-- CreateIndex
CREATE INDEX "ShortlistSend_jdId_idx" ON "ShortlistSend"("jdId");

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_jdId_fkey" FOREIGN KEY ("jdId") REFERENCES "JobDescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistSend" ADD CONSTRAINT "ShortlistSend_jdId_fkey" FOREIGN KEY ("jdId") REFERENCES "JobDescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
