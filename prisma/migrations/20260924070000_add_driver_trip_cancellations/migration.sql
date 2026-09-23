ALTER TABLE "Trip" ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancellationSource" TEXT;

CREATE TABLE "DriverTripCancellation" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverTripCancellation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DriverTripCancellation_driverId_cancelledAt_idx" ON "DriverTripCancellation"("driverId", "cancelledAt");
CREATE INDEX "DriverTripCancellation_tripId_idx" ON "DriverTripCancellation"("tripId");

ALTER TABLE "DriverTripCancellation" ADD CONSTRAINT "DriverTripCancellation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverTripCancellation" ADD CONSTRAINT "DriverTripCancellation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
