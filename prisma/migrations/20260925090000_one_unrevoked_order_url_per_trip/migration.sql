WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (PARTITION BY "tripId" ORDER BY "createdAt" DESC, "id" DESC) AS position
  FROM "TripOrderUrl"
  WHERE "revokedAt" IS NULL
)
UPDATE "TripOrderUrl"
SET "revokedAt" = CURRENT_TIMESTAMP,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "id" FROM ranked WHERE position > 1);

CREATE UNIQUE INDEX "TripOrderUrl_one_unrevoked_per_trip_key"
ON "TripOrderUrl"("tripId")
WHERE "revokedAt" IS NULL;
