ALTER TABLE "Notification" ADD COLUMN "tripId" TEXT;

CREATE INDEX "Notification_driverId_templateType_readAt_createdAt_idx"
ON "Notification"("driverId", "templateType", "readAt", "createdAt");

CREATE INDEX "Notification_tripId_idx" ON "Notification"("tripId");

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_tripId_fkey"
FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
