ALTER TABLE "PaymentChannelConfig"
ADD COLUMN "webhookSecret" TEXT,
ADD COLUMN "lastWebhookAt" TIMESTAMP(3),
ADD COLUMN "lastWebhookEvent" TEXT;
