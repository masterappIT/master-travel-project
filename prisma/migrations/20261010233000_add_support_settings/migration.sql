ALTER TABLE "AppSetting"
  ADD COLUMN "supportEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "supportGuestEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "supportDirectContactEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "supportOrderContextEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "supportImageUploadEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "supportVideoUploadEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "supportVoiceMessageEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "supportVoiceCallEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "supportMaxUploadSizeMb" INTEGER NOT NULL DEFAULT 50;
