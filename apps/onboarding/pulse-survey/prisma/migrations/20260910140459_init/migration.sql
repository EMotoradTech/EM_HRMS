-- CreateEnum
CREATE TYPE "Cadence" AS ENUM ('MONTHLY', 'DAILY');

-- CreateTable
CREATE TABLE "SurveyDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cadence" "Cadence" NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveySendLog" (
    "surveyKey" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveySendLog_pkey" PRIMARY KEY ("surveyKey")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyKey" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "dedupeTokenHash" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyDefinition_key_key" ON "SurveyDefinition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyResponse_surveyKey_period_dedupeTokenHash_key" ON "SurveyResponse"("surveyKey", "period", "dedupeTokenHash");
