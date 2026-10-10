-- 客服只保留文字與圖片訊息；移除影片、語音訊息及即時語音通話設定。
ALTER TABLE "AppSetting"
  DROP COLUMN "supportVideoUploadEnabled",
  DROP COLUMN "supportVoiceMessageEnabled",
  DROP COLUMN "supportVoiceCallEnabled";
