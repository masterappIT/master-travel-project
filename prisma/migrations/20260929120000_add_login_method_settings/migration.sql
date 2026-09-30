CREATE TABLE "LoginMethodSetting" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "passengerEnabled" BOOLEAN NOT NULL DEFAULT false,
  "driverEnabled" BOOLEAN NOT NULL DEFAULT false,
  "displayName" TEXT NOT NULL,
  "logoUrl" TEXT,
  "description" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoginMethodSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LoginMethodSetting_provider_key" ON "LoginMethodSetting"("provider");
CREATE INDEX "LoginMethodSetting_enabled_sortOrder_idx" ON "LoginMethodSetting"("enabled", "sortOrder");
CREATE INDEX "LoginMethodSetting_passengerEnabled_sortOrder_idx" ON "LoginMethodSetting"("passengerEnabled", "sortOrder");
CREATE INDEX "LoginMethodSetting_driverEnabled_sortOrder_idx" ON "LoginMethodSetting"("driverEnabled", "sortOrder");
