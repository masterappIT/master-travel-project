ALTER TABLE "RecommendedAddress" ADD COLUMN "city" TEXT;

UPDATE "RecommendedAddress"
SET "city" = split_part("address", '-', 1)
WHERE "region" = '大陸' AND "city" IS NULL AND position('-' IN "address") > 0;

CREATE INDEX "RecommendedAddress_region_city_idx" ON "RecommendedAddress"("region", "city");
