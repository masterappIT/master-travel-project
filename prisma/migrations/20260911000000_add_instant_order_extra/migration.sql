INSERT INTO "VehicleExtra" ("id", "name", "label", "price", "currency", "enabled", "order", "updatedAt")
VALUES ('instant-order', 'instant-order', '即時訂單', 0, 'RMB¥', true, 0, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE
SET "name" = EXCLUDED."name",
    "label" = EXCLUDED."label",
    "price" = EXCLUDED."price",
    "currency" = EXCLUDED."currency",
    "enabled" = EXCLUDED."enabled",
    "order" = EXCLUDED."order",
    "updatedAt" = CURRENT_TIMESTAMP;
