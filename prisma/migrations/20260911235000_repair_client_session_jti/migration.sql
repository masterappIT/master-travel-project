ALTER TABLE "ClientSession" ADD COLUMN "jti" TEXT;

UPDATE "ClientSession"
SET "jti" = 'legacy-' || "id"
WHERE "jti" IS NULL;

ALTER TABLE "ClientSession" ALTER COLUMN "jti" SET NOT NULL;

CREATE UNIQUE INDEX "ClientSession_jti_key" ON "ClientSession"("jti");
