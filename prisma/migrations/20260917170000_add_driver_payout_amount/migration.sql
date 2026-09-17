ALTER TABLE "Trip"
ADD COLUMN "driverPayoutPercentage" DOUBLE PRECISION,
ADD COLUMN "driverPayoutCalculatedAmount" DOUBLE PRECISION,
ADD COLUMN "driverPayoutAmount" DOUBLE PRECISION,
ADD COLUMN "driverPayoutCurrency" TEXT;

ALTER TABLE "AppSetting"
ADD COLUMN "driverPayoutPercentage" DOUBLE PRECISION NOT NULL DEFAULT 100;
