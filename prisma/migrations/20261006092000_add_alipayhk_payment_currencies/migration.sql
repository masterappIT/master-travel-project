ALTER TABLE "PaymentChannelConfig"
ADD COLUMN "paymentCurrencies" TEXT[] NOT NULL DEFAULT ARRAY['HKD']::TEXT[];
