CREATE TABLE "MainlandCity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MainlandCity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MainlandCity_name_key" ON "MainlandCity"("name");
CREATE INDEX "MainlandCity_enabled_order_idx" ON "MainlandCity"("enabled", "order");

INSERT INTO "MainlandCity" ("id", "name", "enabled", "order", "updatedAt")
SELECT 'mainland-city-shenzhen', '深圳市', true, 1, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "RecommendedAddress" WHERE "region" = '大陸' AND "city" = '深圳市');
