-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'BET_HOLD', 'BET_RELEASE', 'WIN_PAYOUT', 'REFERRAL_BONUS', 'REFUND', 'TASK_REWARD', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TableType" AS ENUM ('TRAINING', 'FREE', 'PAID');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('WAITING', 'PLAYING', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'ANNOUNCED', 'REGISTRATION', 'STARTED', 'FINISHED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskCompletionStatus" AS ENUM ('PENDING', 'REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'MARKETING', 'TOURNAMENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('USER_REGISTERED', 'USER_UPDATED', 'USER_BANNED', 'USER_UNBANNED', 'TABLE_CREATED', 'TABLE_STARTED', 'TABLE_FINISHED', 'TABLE_CANCELLED', 'PLAYER_JOINED', 'PLAYER_LEFT', 'PLAYER_REPLACED_BY_BOT', 'PLAYER_RECONNECTED', 'TOURNAMENT_CREATED', 'TOURNAMENT_PUBLISHED', 'TOURNAMENT_STARTED', 'TOURNAMENT_STAGE_STARTED', 'TOURNAMENT_FINISHED', 'TOURNAMENT_CANCELLED', 'TRANSACTION_CREATED', 'WITHDRAWAL_APPROVED', 'WITHDRAWAL_REJECTED', 'BALANCE_ADJUSTED', 'GOD_MODE_CARD_SWAP', 'GOD_MODE_DECK_SHUFFLE', 'GOD_MODE_KILLER_ENABLED', 'SETTINGS_UPDATED', 'ADMIN_ACTION');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tg_id" BIGINT NOT NULL,
    "username" VARCHAR(64),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "balance_cj" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "avatar_id" SMALLINT NOT NULL DEFAULT 1,
    "country_code" CHAR(2),
    "referrer_id" UUID,
    "referral_code" VARCHAR(16),
    "wallet_address" VARCHAR(128),
    "settings" JSONB DEFAULT '{"sound": {"music_volume": 0.8, "effects_volume": 1.0}, "language": "ru", "chat_enabled": true}',
    "stats" JSONB DEFAULT '{"rating": 0, "wins": {"paid_tables": 0, "free_tables": 0, "paid_tournaments": 0, "free_tournaments": 0}, "places": {"1st": 0, "2nd": 0, "3rd": 0, "4th": 0}, "total_games": 0, "total_tournaments": 0}',
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CJ',
    "balance_after" DECIMAL(14,2),
    "type" "TxType" NOT NULL,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" VARCHAR(64),
    "reference_id" UUID,
    "reference_type" VARCHAR(20),
    "initiated_by" UUID,
    "comment" TEXT,
    "rejection_reason" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" UUID NOT NULL,
    "type" "TableType" NOT NULL,
    "config" JSONB NOT NULL,
    "status" "TableStatus" NOT NULL DEFAULT 'WAITING',
    "tournament_id" UUID,
    "tournament_stage" INTEGER,
    "players" JSONB,
    "current_round" INTEGER NOT NULL DEFAULT 0,
    "result_snapshot" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" UUID NOT NULL,
    "title" VARCHAR(128),
    "config" JSONB NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "registration_start" TIMESTAMPTZ,
    "start_time" TIMESTAMPTZ,
    "bot_fill_config" JSONB,
    "current_stage" INTEGER NOT NULL DEFAULT 0,
    "bracket_state" JSONB,
    "prize_pool_actual" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_participants" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'REGISTERED',
    "final_place" INTEGER,
    "prize_amount" DECIMAL(14,2),
    "registered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminated_at" TIMESTAMPTZ,

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "short_description" TEXT,
    "long_description" TEXT,
    "reward_amount" DECIMAL(14,2) NOT NULL,
    "reward_currency" VARCHAR(3) DEFAULT 'CJ',
    "status" "TaskStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMPTZ,
    "end_date" TIMESTAMPTZ,
    "auto_verify" BOOLEAN NOT NULL DEFAULT false,
    "verification_type" VARCHAR(20),
    "verification_config" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_completions" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "TaskCompletionStatus" NOT NULL DEFAULT 'PENDING',
    "proof_data" JSONB,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ,
    "reviewed_by" UUID,
    "rejection_reason" TEXT,
    "transaction_id" UUID,

    CONSTRAINT "task_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(256),
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'DRAFT',
    "target_filter" JSONB DEFAULT '{"all": true}',
    "scheduled_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "delivery_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "delivered_at" TIMESTAMPTZ,
    "read_at" TIMESTAMPTZ,
    "error_message" TEXT,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_log" (
    "id" UUID NOT NULL,
    "event_type" "EventType" NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'INFO',
    "actor_id" UUID,
    "actor_type" VARCHAR(20),
    "target_id" UUID,
    "target_type" VARCHAR(20),
    "context_table_id" UUID,
    "context_tournament_id" UUID,
    "details" JSONB NOT NULL DEFAULT '{}',
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_settings" (
    "key" VARCHAR(64) NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_tg_id_key" ON "users"("tg_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_tg_id_idx" ON "users"("tg_id");

-- CreateIndex
CREATE INDEX "users_referrer_id_idx" ON "users"("referrer_id");

-- CreateIndex
CREATE INDEX "users_referral_code_idx" ON "users"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_idempotency_key_key" ON "transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "tables_status_idx" ON "tables"("status");

-- CreateIndex
CREATE INDEX "tables_tournament_id_idx" ON "tables"("tournament_id");

-- CreateIndex
CREATE INDEX "tournaments_status_idx" ON "tournaments"("status");

-- CreateIndex
CREATE INDEX "tournament_participants_tournament_id_idx" ON "tournament_participants"("tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_participants_tournament_id_user_id_key" ON "tournament_participants"("tournament_id", "user_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "task_completions_status_idx" ON "task_completions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "task_completions_task_id_user_id_key" ON "task_completions"("task_id", "user_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_scheduled_at_idx" ON "notifications"("scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_notification_id_user_id_key" ON "notification_deliveries"("notification_id", "user_id");

-- CreateIndex
CREATE INDEX "event_log_event_type_idx" ON "event_log"("event_type");

-- CreateIndex
CREATE INDEX "event_log_actor_id_idx" ON "event_log"("actor_id");

-- CreateIndex
CREATE INDEX "event_log_target_id_target_type_idx" ON "event_log"("target_id", "target_type");

-- CreateIndex
CREATE INDEX "event_log_created_at_idx" ON "event_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "event_log_severity_idx" ON "event_log"("severity");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
