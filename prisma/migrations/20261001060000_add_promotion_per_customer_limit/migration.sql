ALTER TABLE "Promotion" ADD COLUMN "perCustomerLimit" INTEGER;
ALTER TABLE "FareQuote" ADD COLUMN "preview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PromotionUsage" ADD COLUMN "userId" TEXT;

UPDATE "PromotionUsage" AS usage
SET "userId" = trip."userId"
FROM "Trip" AS trip
WHERE trip."quoteId" = usage."quoteId";

CREATE INDEX "PromotionUsage_promotionId_userId_status_idx" ON "PromotionUsage"("promotionId", "userId", "status");
