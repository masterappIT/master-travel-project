-- AlterTable
ALTER TABLE "AppSetting" ADD COLUMN "wechatWebEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "wechatWebAppId" TEXT,
ADD COLUMN "wechatWebAppSecret" TEXT,
ADD COLUMN "wechatWebRedirectUri" TEXT;
