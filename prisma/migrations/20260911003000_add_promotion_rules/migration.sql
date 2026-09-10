CREATE TYPE "PromotionStackingMode" AS ENUM ('NONE', 'PERCENTAGE_AND_VOUCHER', 'ALL');

ALTER TABLE "Promotion"
  ADD COLUMN "stackingMode" "PromotionStackingMode" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "originRegion" TEXT,
  ADD COLUMN "originCity" TEXT,
  ADD COLUMN "destinationRegion" TEXT,
  ADD COLUMN "destinationCity" TEXT,
  ADD COLUMN "weekdays" JSONB,
  ADD COLUMN "timeStart" TEXT,
  ADD COLUMN "timeEnd" TEXT;

CREATE INDEX "Promotion_scope_idx"
  ON "Promotion"("originRegion", "originCity", "destinationRegion", "destinationCity");
