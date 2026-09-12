CREATE TYPE "TripExecutionPhase" AS ENUM ('WAITING_DRIVER', 'DRIVER_ASSIGNED', 'IN_PROGRESS');

ALTER TABLE "Trip" ADD COLUMN "executionPhase" "TripExecutionPhase";
ALTER TABLE "Trip" ADD COLUMN "driverName" TEXT;
ALTER TABLE "Trip" ADD COLUMN "driverPhone" TEXT;
ALTER TABLE "Trip" ADD COLUMN "vehiclePlate" TEXT;
ALTER TABLE "Trip" ADD COLUMN "assignedAt" TIMESTAMP(3);
ALTER TABLE "Trip" ADD COLUMN "acceptedAt" TIMESTAMP(3);
ALTER TABLE "Trip" ADD COLUMN "arrivedAt" TIMESTAMP(3);
ALTER TABLE "Trip" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "Trip" ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "Trip"
SET "executionPhase" = 'WAITING_DRIVER'
WHERE "status" = 'CONFIRMED' AND "executionPhase" IS NULL;

CREATE INDEX "Trip_status_executionPhase_idx" ON "Trip"("status", "executionPhase");
