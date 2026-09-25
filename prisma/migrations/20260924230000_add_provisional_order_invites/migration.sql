ALTER TABLE "TripOrderUrl"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN "createdByAdminId" TEXT,
  ADD COLUMN "reservedAt" TIMESTAMP(3),
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "provisionalDriverId" TEXT;

CREATE INDEX "TripOrderUrl_provisionalDriverId_idx" ON "TripOrderUrl"("provisionalDriverId");
CREATE INDEX "TripOrderUrl_createdByAdminId_createdAt_idx" ON "TripOrderUrl"("createdByAdminId", "createdAt");
ALTER TABLE "TripOrderUrl" ADD CONSTRAINT "TripOrderUrl_provisionalDriverId_fkey"
  FOREIGN KEY ("provisionalDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DriverOtpChallenge"
  ADD COLUMN "invitationOrderUrlId" TEXT;
CREATE INDEX "DriverOtpChallenge_invitationOrderUrlId_expiresAt_idx"
  ON "DriverOtpChallenge"("invitationOrderUrlId", "expiresAt");

CREATE TABLE "ProvisionalDriverSession" (
  "id" TEXT NOT NULL,
  "jti" TEXT NOT NULL,
  "orderUrlId" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProvisionalDriverSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProvisionalDriverSession_jti_key" ON "ProvisionalDriverSession"("jti");
CREATE INDEX "ProvisionalDriverSession_orderUrlId_revokedAt_idx" ON "ProvisionalDriverSession"("orderUrlId", "revokedAt");
CREATE INDEX "ProvisionalDriverSession_tripId_driverId_idx" ON "ProvisionalDriverSession"("tripId", "driverId");
CREATE INDEX "ProvisionalDriverSession_expiresAt_idx" ON "ProvisionalDriverSession"("expiresAt");
ALTER TABLE "ProvisionalDriverSession" ADD CONSTRAINT "ProvisionalDriverSession_orderUrlId_fkey"
  FOREIGN KEY ("orderUrlId") REFERENCES "TripOrderUrl"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProvisionalDriverSession" ADD CONSTRAINT "ProvisionalDriverSession_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProvisionalDriverSession" ADD CONSTRAINT "ProvisionalDriverSession_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
