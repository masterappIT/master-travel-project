ALTER TABLE "User" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "ClientSession" (
  "id" TEXT NOT NULL,
  "jti" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientSession_jti_key" UNIQUE ("jti"),
  CONSTRAINT "ClientSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ClientSession_userId_revokedAt_idx" ON "ClientSession"("userId", "revokedAt");
CREATE INDEX "ClientSession_expiresAt_idx" ON "ClientSession"("expiresAt");