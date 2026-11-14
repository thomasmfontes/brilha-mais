-- CreateTable
CREATE TABLE IF NOT EXISTS "GitExerciseProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseSlug" TEXT NOT NULL,
    "commandsCount" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitExerciseProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GitExerciseProgress_userId_exerciseSlug_key" ON "GitExerciseProgress"("userId", "exerciseSlug");
CREATE INDEX IF NOT EXISTS "GitExerciseProgress_userId_idx" ON "GitExerciseProgress"("userId");
CREATE INDEX IF NOT EXISTS "GitExerciseProgress_exerciseSlug_idx" ON "GitExerciseProgress"("exerciseSlug");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "GitExerciseProgress" ADD CONSTRAINT "GitExerciseProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
