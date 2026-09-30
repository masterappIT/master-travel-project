CREATE TABLE "LoginMethodSettingDraft" (
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
  CONSTRAINT "LoginMethodSettingDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoginMethodSettingDraft_provider_key" UNIQUE ("provider")
);
