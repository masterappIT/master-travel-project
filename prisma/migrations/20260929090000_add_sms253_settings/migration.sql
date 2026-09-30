ALTER TABLE "AppSetting"
  ADD COLUMN "sms253Enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sms253Endpoint" TEXT NOT NULL DEFAULT 'https://smssh1.253.com',
  ADD COLUMN "sms253Account" TEXT,
  ADD COLUMN "sms253Password" TEXT,
  ADD COLUMN "sms253Template" TEXT NOT NULL DEFAULT '【253云通讯】您的验证码是{code}。如非本人操作，请忽略。',
  ADD COLUMN "sms253Report" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sms253VariableTemplate" TEXT;
