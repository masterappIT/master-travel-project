INSERT INTO "MainlandCity" ("id", "name", "enabled", "order", "updatedAt")
SELECT
    'mainland-city-' || md5(source."city"),
    source."city",
    true,
    ROW_NUMBER() OVER (ORDER BY source."city") + COALESCE((SELECT MAX("order") FROM "MainlandCity"), 0),
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "city"
    FROM "RecommendedAddress"
    WHERE "region" = '大陸'
      AND "city" IS NOT NULL
      AND "city" <> ''
) AS source
WHERE NOT EXISTS (
    SELECT 1
    FROM "MainlandCity" existing
    WHERE existing."name" = source."city"
);
