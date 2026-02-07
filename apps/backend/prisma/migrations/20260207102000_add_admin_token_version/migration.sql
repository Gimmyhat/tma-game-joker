-- AlterTable
ALTER TABLE "users"
ADD COLUMN "admin_token_version" INTEGER NOT NULL DEFAULT 0;
