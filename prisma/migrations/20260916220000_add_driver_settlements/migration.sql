CREATE TABLE "DriverSettlement" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverSettlement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DriverSettlement_tripId_key" ON "DriverSettlement"("tripId");
CREATE INDEX "DriverSettlement_driverId_settledAt_idx" ON "DriverSettlement"("driverId", "settledAt");
ALTER TABLE "DriverSettlement" ADD CONSTRAINT "DriverSettlement_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DriverSettlement" ADD CONSTRAINT "DriverSettlement_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
