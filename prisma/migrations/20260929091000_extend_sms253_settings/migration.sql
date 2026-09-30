ALTER TABLE "AppSetting"
  ADD COLUMN "sms253SendUrl" TEXT,
  ADD COLUMN "sms253VariableUrl" TEXT,
  ADD COLUMN "sms253BalanceUrl" TEXT,
  ADD COLUMN "sms253ReportUrl" TEXT,
  ADD COLUMN "sms253VariableParams" TEXT,
  ADD COLUMN "sms253VariableReport" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sms253TestPhone" TEXT;
