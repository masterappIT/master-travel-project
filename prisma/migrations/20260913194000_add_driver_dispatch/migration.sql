CREATE TABLE "Driver" (
  "id" TEXT NOT NULL,
  "driverType" TEXT NOT NULL DEFAULT '內部司機',
  "countryCode" TEXT NOT NULL DEFAULT '+852',
  "phoneNumber" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "affiliation" TEXT,
  "plateType" TEXT,
  "hkPlate" TEXT,
  "mainlandPlate" TEXT,
  "vehicleCategory" TEXT,
  "vehicleColor" TEXT,
  "vehiclePhotos" JSONB NOT NULL DEFAULT '[]',
  "settlementMethod" TEXT,
  "settlementAccount" TEXT,
  "reviewStatus" TEXT NOT NULL DEFAULT '待審核',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Driver_countryCode_phoneNumber_key" ON "Driver"("countryCode", "phoneNumber");
CREATE INDEX "Driver_enabled_reviewStatus_idx" ON "Driver"("enabled", "reviewStatus");
ALTER TABLE "Trip" ADD COLUMN "driverId" TEXT;
CREATE INDEX "Trip_driverId_idx" ON "Trip"("driverId");
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
