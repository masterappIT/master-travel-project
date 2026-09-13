-- Convert user identifiers to six-digit numeric strings while preserving all relations.
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE "ClientSession" DROP CONSTRAINT IF EXISTS "ClientSession_userId_fkey";
ALTER TABLE "AuthIdentity" DROP CONSTRAINT IF EXISTS "AuthIdentity_userId_fkey";
ALTER TABLE "WalletTransaction" DROP CONSTRAINT IF EXISTS "WalletTransaction_userId_fkey";
ALTER TABLE "Trip" DROP CONSTRAINT IF EXISTS "Trip_userId_fkey";
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_userId_fkey";

CREATE TEMP TABLE "UserIdMap" (old_id TEXT PRIMARY KEY, new_id TEXT UNIQUE NOT NULL);
INSERT INTO "UserIdMap" (old_id, new_id)
SELECT id, LPAD((100000 + ROW_NUMBER() OVER (ORDER BY id))::TEXT, 6, '0')
FROM "User";

UPDATE "Notification" n SET "userId" = m.new_id FROM "UserIdMap" m WHERE n."userId" = m.old_id;
UPDATE "ClientSession" s SET "userId" = m.new_id FROM "UserIdMap" m WHERE s."userId" = m.old_id;
UPDATE "AuthIdentity" a SET "userId" = m.new_id FROM "UserIdMap" m WHERE a."userId" = m.old_id;
UPDATE "WalletTransaction" w SET "userId" = m.new_id FROM "UserIdMap" m WHERE w."userId" = m.old_id;
UPDATE "Trip" t SET "userId" = m.new_id FROM "UserIdMap" m WHERE t."userId" = m.old_id;
UPDATE "Payment" p SET "userId" = m.new_id FROM "UserIdMap" m WHERE p."userId" = m.old_id;

UPDATE "User" u SET id = m.new_id FROM "UserIdMap" m WHERE u.id = m.old_id;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientSession" ADD CONSTRAINT "ClientSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "UserIdMap";
