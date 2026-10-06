CREATE TABLE "PaymentChannelConfig" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "interface" TEXT NOT NULL,
  "gatewayUrl" TEXT NOT NULL,
  "partner" TEXT NOT NULL,
  "appId" TEXT,
  "privateKey" TEXT,
  "publicKey" TEXT,
  "notifyUrl" TEXT,
  "returnUrl" TEXT,
  "paymentCurrency" TEXT NOT NULL,
  "settlementCurrency" TEXT NOT NULL,
  "configuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastTestedAt" TIMESTAMP(3),
  "lastTestStatus" TEXT,
  "lastTestMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentChannelConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentChannelConfig_provider_environment_key" ON "PaymentChannelConfig"("provider", "environment");
CREATE INDEX "PaymentChannelConfig_provider_region_paymentCurrency_idx" ON "PaymentChannelConfig"("provider", "region", "paymentCurrency");
