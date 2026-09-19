ALTER TABLE "DriverVehicle" ALTER COLUMN "driverId" DROP NOT NULL;

ALTER TABLE "DriverVehicle" DROP CONSTRAINT IF EXISTS "DriverVehicle_driverId_fkey";
ALTER TABLE "DriverVehicle" ADD CONSTRAINT "DriverVehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
