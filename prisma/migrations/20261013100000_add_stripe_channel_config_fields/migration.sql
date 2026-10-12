ALTER TABLE "PaymentChannelConfig"
ADD COLUMN "publishableKey" TEXT,
ADD COLUMN "secretKey" TEXT,
ADD COLUMN "paymentMethods" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "providerAccount" JSONB;
