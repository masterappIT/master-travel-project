-- CreateTable
CREATE TABLE "TripOrderUrl" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TripOrderUrl_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TripOrderUrl_tokenHash_key" ON "TripOrderUrl"("tokenHash");
CREATE INDEX "TripOrderUrl_tripId_idx" ON "TripOrderUrl"("tripId");
CREATE INDEX "TripOrderUrl_driverId_validFrom_validUntil_idx" ON "TripOrderUrl"("driverId", "validFrom", "validUntil");
ALTER TABLE "TripOrderUrl" ADD CONSTRAINT "TripOrderUrl_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripOrderUrl" ADD CONSTRAINT "TripOrderUrl_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
