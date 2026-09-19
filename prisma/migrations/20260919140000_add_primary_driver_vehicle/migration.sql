ALTER TABLE "DriverVehicleAssignment"
ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

WITH ranked_assignments AS (
  SELECT
    assignment."id",
    ROW_NUMBER() OVER (
      PARTITION BY assignment."driverId"
      ORDER BY assignment."createdAt" ASC, assignment."id" ASC
    ) AS position
  FROM "DriverVehicleAssignment" AS assignment
  INNER JOIN "DriverVehicle" AS vehicle ON vehicle."id" = assignment."vehicleId"
  WHERE assignment."enabled" = true
    AND vehicle."enabled" = true
)
UPDATE "DriverVehicleAssignment" AS assignment
SET "isPrimary" = true
FROM ranked_assignments
WHERE assignment."id" = ranked_assignments."id"
  AND ranked_assignments.position = 1;

CREATE INDEX "DriverVehicleAssignment_driverId_enabled_isPrimary_idx"
ON "DriverVehicleAssignment"("driverId", "enabled", "isPrimary");

CREATE UNIQUE INDEX "DriverVehicleAssignment_one_primary_per_driver"
ON "DriverVehicleAssignment"("driverId")
WHERE "isPrimary" = true AND "enabled" = true;
