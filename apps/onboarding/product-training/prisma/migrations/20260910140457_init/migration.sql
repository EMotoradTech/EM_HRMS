-- CreateTable
CREATE TABLE "ModuleProgress" (
    "id" TEXT NOT NULL,
    "joinerId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "quizScore" INTEGER,
    "quizTotal" INTEGER,
    "quizPassed" BOOLEAN,
    "quizAttemptedAt" TIMESTAMP(3),

    CONSTRAINT "ModuleProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuleProgress_joinerId_moduleKey_key" ON "ModuleProgress"("joinerId", "moduleKey");
