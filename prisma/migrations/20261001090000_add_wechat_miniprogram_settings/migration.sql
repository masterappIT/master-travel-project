ALTER TABLE "AppSetting"
  ADD COLUMN "wechatMiniProgramEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "wechatMiniProgramAppId" TEXT,
  ADD COLUMN "wechatMiniProgramAppSecret" TEXT,
  ADD COLUMN "wechatMiniProgramPhoneCapability" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "wechatMiniProgramLoginMode" TEXT NOT NULL DEFAULT 'wechatOnly';
