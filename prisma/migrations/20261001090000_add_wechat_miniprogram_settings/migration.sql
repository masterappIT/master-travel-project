ALTER TABLE "AppSetting"
  ADD COLUMN IF NOT EXISTS "wechatMiniProgramEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "wechatMiniProgramAppId" TEXT,
  ADD COLUMN IF NOT EXISTS "wechatMiniProgramAppSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "wechatMiniProgramPhoneCapability" BOOLEAN NOT NULL DEFAULT false;
