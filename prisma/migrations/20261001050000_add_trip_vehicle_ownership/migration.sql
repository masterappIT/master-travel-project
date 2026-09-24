ALTER TABLE "Trip" ADD COLUMN "vehicleOwnership" TEXT;

UPDATE "Trip" AS trip
SET "vehicleOwnership" = vehicle."vehicleOwnership"
FROM "DriverVehicle" AS vehicle
WHERE trip."vehicleId" = vehicle."id"
  AND trip."vehicleOwnership" IS NULL;
