ALTER TABLE "AppSetting"
ADD COLUMN "wechatMiniProgramAvatarCapability" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "wechatMiniProgramNicknameCapability" BOOLEAN NOT NULL DEFAULT false;
