CREATE TABLE "RecommendedAddress" (
    "id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendedAddress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecommendedAddress_enabled_order_idx" ON "RecommendedAddress"("enabled", "order");

-- Seed defaults once; administrator edits and removals remain authoritative.
INSERT INTO "RecommendedAddress" ("id", "region", "name", "address", "enabled", "order", "updatedAt")
VALUES
    ('hk-airport', '香港', '香港國際機場', '香港特別行政區-離島區-香港赤臘角天路1號', true, 1, CURRENT_TIMESTAMP),
    ('hk-disney', '香港', '香港迪士尼樂園', '香港特別行政區-荃灣區-大嶼山竹篙灣', true, 2, CURRENT_TIMESTAMP),
    ('sz-airport', '大陸', '深圳寶安國際機場', '深圳市-寶安區-寶安大道', true, 3, CURRENT_TIMESTAMP),
    ('sz-bay', '大陸', '深圳灣口岸', '深圳市-南山區-東濱路', true, 4, CURRENT_TIMESTAMP),
    ('macau-airport', '澳門', '澳門國際機場', '澳門特別行政區-嘉模堂區-偉龍馬路', true, 5, CURRENT_TIMESTAMP),
    ('macau-ruins', '澳門', '澳門大三巴牌坊', '澳門特別行政區-花王堂區-炮台山下', true, 6, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
