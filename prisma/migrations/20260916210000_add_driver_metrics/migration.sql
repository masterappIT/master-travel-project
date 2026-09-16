CREATE TABLE "DriverOnlineSession" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "DriverOnlineSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DriverRating" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "tripId" TEXT,
  "score" DOUBLE PRECISION NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverRating_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DriverRating_tripId_key" ON "DriverRating"("tripId");
CREATE INDEX "DriverOnlineSession_driverId_startedAt_idx" ON "DriverOnlineSession"("driverId", "startedAt");
CREATE INDEX "DriverOnlineSession_driverId_endedAt_idx" ON "DriverOnlineSession"("driverId", "endedAt");
CREATE INDEX "DriverRating_driverId_createdAt_idx" ON "DriverRating"("driverId", "createdAt");
ALTER TABLE "DriverOnlineSession" ADD CONSTRAINT "DriverOnlineSession_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverRating" ADD CONSTRAINT "DriverRating_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
