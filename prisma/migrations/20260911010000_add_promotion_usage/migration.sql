CREATE TYPE "PromotionUsageStatus" AS ENUM ('RESERVED', 'USED', 'RELEASED');

CREATE TABLE "PromotionUsage" (
  "id" TEXT NOT NULL,
  "promotionId" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "status" "PromotionUsageStatus" NOT NULL DEFAULT 'RESERVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  CONSTRAINT "PromotionUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromotionUsage_promotionId_quoteId_key"
  ON "PromotionUsage"("promotionId", "quoteId");
CREATE INDEX "PromotionUsage_promotionId_status_idx"
  ON "PromotionUsage"("promotionId", "status");
ALTER TABLE "PromotionUsage"
  ADD CONSTRAINT "PromotionUsage_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionUsage"
  ADD CONSTRAINT "PromotionUsage_quoteId_fkey"
  FOREIGN KEY ("quoteId") REFERENCES "FareQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
