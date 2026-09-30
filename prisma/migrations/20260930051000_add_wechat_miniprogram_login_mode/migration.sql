ALTER TABLE "AppSetting"
  ADD COLUMN IF NOT EXISTS "wechatMiniProgramLoginMode" TEXT NOT NULL DEFAULT 'wechatOnly';
