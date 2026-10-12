ALTER TABLE "PaymentChannelConfig"
ADD COLUMN "merchantMode" TEXT,
ADD COLUMN "subMerchantId" TEXT,
ADD COLUMN "subAppId" TEXT,
ADD COLUMN "certificateSerialNo" TEXT;
