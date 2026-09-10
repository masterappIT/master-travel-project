ALTER TABLE "VehicleExtra"
  ADD COLUMN "requiredForImmediate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requiredWithinMinutes" INTEGER;

UPDATE "VehicleExtra"
SET "requiredForImmediate" = true,
    "requiredWithinMinutes" = 60
WHERE "id" = 'instant-order';
