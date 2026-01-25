-- CreateTable
CREATE TABLE "finished_games" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "winnerId" TEXT,
    "players" JSONB NOT NULL,
    "gameLog" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finished_games_pkey" PRIMARY KEY ("id")
);
