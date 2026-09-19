ALTER TABLE "DriverVehicle" DROP CONSTRAINT IF EXISTS "DriverVehicle_driverId_fkey";
DROP INDEX IF EXISTS "DriverVehicle_driverId_enabled_idx";
ALTER TABLE "DriverVehicle" DROP COLUMN IF EXISTS "driverId";

ALTER TABLE "Driver"
  DROP COLUMN IF EXISTS "plateType",
  DROP COLUMN IF EXISTS "hkPlate",
  DROP COLUMN IF EXISTS "mainlandPlate",
  DROP COLUMN IF EXISTS "macauPlate",
  DROP COLUMN IF EXISTS "vehicleOwnership",
  DROP COLUMN IF EXISTS "vehicleCategory",
  DROP COLUMN IF EXISTS "vehicleColor",
  DROP COLUMN IF EXISTS "vehiclePhotos",
  DROP COLUMN IF EXISTS "vehiclePhotoData",
  DROP COLUMN IF EXISTS "vehiclePhotoMime";
