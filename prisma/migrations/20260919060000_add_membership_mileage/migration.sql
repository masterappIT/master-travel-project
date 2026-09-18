-- CreateEnum
CREATE TYPE "MileageLedgerType" AS ENUM ('EARN', 'REDEEM', 'EXPIRE', 'ADJUST', 'REFUND');

-- CreateEnum
CREATE TYPE "MileageRedemptionStatus" AS ENUM ('COMPLETED', 'REVERSED');

-- CreateTable
CREATE TABLE "MileageAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeRedeemed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MileageAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MileageReward" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER,
    "couponValue" DOUBLE PRECISION,
    "couponCurrency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MileageReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MileageRedemption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "status" "MileageRedemptionStatus" NOT NULL DEFAULT 'COMPLETED',
    "couponCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MileageRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MileageLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "type" "MileageLedgerType" NOT NULL,
    "reason" TEXT NOT NULL,
    "tripId" TEXT,
    "redemptionId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MileageLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MileageAccount_userId_key" ON "MileageAccount"("userId");
CREATE INDEX "MileageLedger_userId_createdAt_idx" ON "MileageLedger"("userId", "createdAt");
CREATE INDEX "MileageLedger_userId_expiresAt_idx" ON "MileageLedger"("userId", "expiresAt");
CREATE UNIQUE INDEX "MileageLedger_tripId_type_key" ON "MileageLedger"("tripId", "type");
CREATE INDEX "MileageRedemption_userId_createdAt_idx" ON "MileageRedemption"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "MileageAccount" ADD CONSTRAINT "MileageAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MileageRedemption" ADD CONSTRAINT "MileageRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MileageRedemption" ADD CONSTRAINT "MileageRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "MileageReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MileageLedger" ADD CONSTRAINT "MileageLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MileageLedger" ADD CONSTRAINT "MileageLedger_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MileageLedger" ADD CONSTRAINT "MileageLedger_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "MileageRedemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default membership mileage rewards
INSERT INTO "MileageReward" ("id", "name", "description", "cost", "enabled", "stock", "couponValue", "couponCurrency", "updatedAt")
VALUES
  ('mileage_reward_ride_20', '下程車程立減 20', '兌換下一程接送服務折扣', 1000, true, NULL, 20, 'RMB', CURRENT_TIMESTAMP),
  ('mileage_reward_ride_50', '下程車程立減 50', '兌換下一程接送服務折扣', 2500, true, NULL, 50, 'RMB', CURRENT_TIMESTAMP),
  ('mileage_reward_airport_100', '機場接送立減 100', '兌換指定機場接送服務折扣', 5000, true, NULL, 100, 'RMB', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
