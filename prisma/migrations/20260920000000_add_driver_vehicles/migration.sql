CREATE TABLE "DriverVehicle" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "plateType" TEXT NOT NULL,
  "hkPlate" TEXT,
  "mainlandPlate" TEXT,
  "macauPlate" TEXT,
  "vehicleOwnership" TEXT NOT NULL DEFAULT '香港',
  "vehicleCategory" TEXT NOT NULL,
  "vehicleColor" TEXT NOT NULL,
  "vehiclePhotos" JSONB NOT NULL,
  "vehiclePhotoData" BYTEA,
  "vehiclePhotoMime" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverVehicle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DriverVehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "DriverVehicleAssignment" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverVehicleAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DriverVehicleAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DriverVehicleAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "DriverVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "DriverVehicleAssignment" ("id", "driverId", "vehicleId", "createdAt", "updatedAt")
SELECT 'assignment-' || "id", "driverId", "id", "createdAt", "updatedAt" FROM "DriverVehicle";
CREATE INDEX "DriverVehicle_driverId_enabled_idx" ON "DriverVehicle"("driverId", "enabled");
CREATE INDEX "DriverVehicle_hkPlate_idx" ON "DriverVehicle"("hkPlate");
CREATE UNIQUE INDEX "DriverVehicleAssignment_driverId_vehicleId_key" ON "DriverVehicleAssignment"("driverId", "vehicleId");
CREATE INDEX "DriverVehicleAssignment_vehicleId_enabled_idx" ON "DriverVehicleAssignment"("vehicleId", "enabled");
CREATE INDEX "DriverVehicle_mainlandPlate_idx" ON "DriverVehicle"("mainlandPlate");
CREATE INDEX "DriverVehicle_macauPlate_idx" ON "DriverVehicle"("macauPlate");
