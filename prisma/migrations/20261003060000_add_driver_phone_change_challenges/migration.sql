CREATE TABLE "DriverPhoneChangeChallenge" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverPhoneChangeChallenge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DriverPhoneChangeChallenge_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DriverPhoneChangeChallenge_driverId_expiresAt_idx" ON "DriverPhoneChangeChallenge"("driverId", "expiresAt");
