-- AlterTable
ALTER TABLE "AppSetting" ADD COLUMN "passengerDefaultCurrency" TEXT NOT NULL DEFAULT 'RMB';
ALTER TABLE "AppSetting" ADD COLUMN "driverDefaultCurrency" TEXT NOT NULL DEFAULT 'RMB';
