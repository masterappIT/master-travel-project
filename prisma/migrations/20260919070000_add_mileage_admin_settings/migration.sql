ALTER TABLE "AppSetting"
ADD COLUMN "mileageSpendPerKm" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN "mileageValidityMonths" INTEGER NOT NULL DEFAULT 12;

ALTER TABLE "MileageLedger"
ADD COLUMN "administratorId" TEXT;

ALTER TABLE "MileageReward"
ADD COLUMN "promotionId" TEXT;

CREATE INDEX "MileageReward_promotionId_idx" ON "MileageReward"("promotionId");

ALTER TABLE "MileageReward"
ADD CONSTRAINT "MileageReward_promotionId_fkey"
FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
