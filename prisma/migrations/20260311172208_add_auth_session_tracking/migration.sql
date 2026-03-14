-- AlterTable
ALTER TABLE "AuthSession" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "AuthSession" ADD COLUMN "logoutAt" DATETIME;
ALTER TABLE "AuthSession" ADD COLUMN "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "AuthSession_logoutAt_idx" ON "AuthSession"("logoutAt");
