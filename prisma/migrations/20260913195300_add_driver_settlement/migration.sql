-- Add driver settlement tracking to completed trips
ALTER TABLE "Trip" ADD COLUMN "driverSettlementAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Trip" ADD COLUMN "settlementStatus" TEXT NOT NULL DEFAULT '未結算';
ALTER TABLE "Trip" ADD COLUMN "settledAt" TIMESTAMP(3);
ALTER TABLE "Trip" ADD COLUMN "settlementReference" TEXT;
CREATE INDEX "Trip_driverId_settlementStatus_idx" ON "Trip"("driverId", "settlementStatus");
