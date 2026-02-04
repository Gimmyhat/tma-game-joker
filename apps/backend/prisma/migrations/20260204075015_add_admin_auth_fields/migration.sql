-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OPERATOR', 'MODERATOR', 'ADMIN', 'SUPERADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "admin_role" "AdminRole",
ADD COLUMN     "block_reason" TEXT,
ADD COLUMN     "blocked_at" TIMESTAMPTZ,
ADD COLUMN     "blocked_by" UUID,
ADD COLUMN     "last_active_at" TIMESTAMPTZ,
ADD COLUMN     "password_hash" VARCHAR(256);

-- CreateIndex
CREATE INDEX "users_admin_role_idx" ON "users"("admin_role");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_blocked_by_fkey" FOREIGN KEY ("blocked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
