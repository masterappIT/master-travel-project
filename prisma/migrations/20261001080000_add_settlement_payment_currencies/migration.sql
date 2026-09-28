ALTER TABLE "AppSetting" ADD COLUMN "settlementCurrency" TEXT NOT NULL DEFAULT 'RMB',
ADD COLUMN "paymentCurrencies" JSONB NOT NULL DEFAULT '["RMB", "HKD"]'::jsonb;
