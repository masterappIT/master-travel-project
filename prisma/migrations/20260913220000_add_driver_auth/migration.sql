CREATE TABLE "DriverAuthIdentity" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverAuthIdentity_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DriverAuthIdentity_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DriverAuthIdentity_provider_providerId_key" ON "DriverAuthIdentity"("provider", "providerId");
CREATE UNIQUE INDEX "DriverAuthIdentity_provider_driverId_key" ON "DriverAuthIdentity"("provider", "driverId");
CREATE INDEX "DriverAuthIdentity_driverId_idx" ON "DriverAuthIdentity"("driverId");

CREATE TABLE "DriverOtpChallenge" (
    "id" TEXT NOT NULL,
    "driverId" TEXT,
    "countryCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverOtpChallenge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DriverOtpChallenge_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DriverOtpChallenge_phone_expiresAt_idx" ON "DriverOtpChallenge"("phone", "expiresAt");
CREATE INDEX "DriverOtpChallenge_driverId_expiresAt_idx" ON "DriverOtpChallenge"("driverId", "expiresAt");

CREATE TABLE "DriverSession" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DriverSession_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DriverSession_jti_key" ON "DriverSession"("jti");
CREATE INDEX "DriverSession_driverId_revokedAt_idx" ON "DriverSession"("driverId", "revokedAt");
CREATE INDEX "DriverSession_expiresAt_idx" ON "DriverSession"("expiresAt");
