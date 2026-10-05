CREATE TABLE "PendingWechatChallenge" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendingWechatChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingWechatChallenge_tokenHash_key" ON "PendingWechatChallenge"("tokenHash");
CREATE INDEX "PendingWechatChallenge_expiresAt_consumedAt_idx" ON "PendingWechatChallenge"("expiresAt", "consumedAt");

ALTER TABLE "VerificationCode"
  ADD COLUMN "pendingWechatChallengeHash" TEXT,
  ADD COLUMN "pendingWechatProviderId" TEXT;
