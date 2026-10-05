ALTER TABLE "AppSetting"
  ADD COLUMN IF NOT EXISTS "wechatMiniProgramAvatarCapability" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "wechatMiniProgramNicknameCapability" BOOLEAN NOT NULL DEFAULT false;
