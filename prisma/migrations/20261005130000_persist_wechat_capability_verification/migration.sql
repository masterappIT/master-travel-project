ALTER TABLE "AppSetting"
  ADD COLUMN IF NOT EXISTS "wechatMiniProgramCapabilityVerification" JSONB;
