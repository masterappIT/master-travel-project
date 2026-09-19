ALTER TABLE "DriverVehicle" DROP CONSTRAINT IF EXISTS "DriverVehicle_driverId_fkey";
DROP INDEX IF EXISTS "DriverVehicle_driverId_enabled_idx";
ALTER TABLE "DriverVehicle" ALTER COLUMN "driverId" DROP NOT NULL;
