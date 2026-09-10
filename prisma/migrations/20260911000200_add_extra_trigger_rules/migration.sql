ALTER TABLE "AppSetting"
ADD COLUMN "severeWeatherEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "VehicleExtra"
ADD COLUMN "triggerType" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN "triggerEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "nightStartTime" TEXT,
ADD COLUMN "nightEndTime" TEXT;

UPDATE "VehicleExtra"
SET "triggerType" = 'IMMEDIATE'
WHERE "requiredForImmediate" = true;

UPDATE "VehicleExtra"
SET "triggerType" = 'IMMEDIATE',
    "requiredWithinMinutes" = 60
WHERE "id" = 'instant-order'
  AND "requiredWithinMinutes" IS NULL;
