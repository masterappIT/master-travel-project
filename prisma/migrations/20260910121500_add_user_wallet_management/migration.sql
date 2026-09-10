-- Separate phone identity and wallets, retaining existing user records.
CREATE TYPE "WalletType" AS ENUM ('CASH', 'FARE');
CREATE TYPE "WalletTransactionType" AS ENUM ('ADMIN_INCREASE', 'ADMIN_DECREASE', 'TOP_UP', 'WITHDRAWAL');

ALTER TABLE "User"
  ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT '+852',
  ADD COLUMN "phoneNumber" TEXT,
  ADD COLUMN "cashBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "fareBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "User"
SET
  "countryCode" = CASE
    WHEN "phone" LIKE '+86%' THEN '+86'
    WHEN "phone" LIKE '+853%' THEN '+853'
    ELSE '+852'
  END,
  "phoneNumber" = regexp_replace(
    CASE
      WHEN "phone" LIKE '+86%' THEN regexp_replace("phone", '^\+86\s*', '')
      WHEN "phone" LIKE '+853%' THEN regexp_replace("phone", '^\+853\s*', '')
      WHEN "phone" LIKE '+852%' THEN regexp_replace("phone", '^\+852\s*', '')
      ELSE COALESCE("phone", 'legacy-' || "id")
    END,
    '\D',
    '',
    'g'
  );

ALTER TABLE "User" ALTER COLUMN "phoneNumber" SET NOT NULL;
DROP INDEX IF EXISTS "User_phone_key";
ALTER TABLE "User" DROP COLUMN "phone";
CREATE UNIQUE INDEX "User_countryCode_phoneNumber_key" ON "User"("countryCode", "phoneNumber");

CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "wallet" "WalletType" NOT NULL,
  "type" "WalletTransactionType" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "balanceAfter" DOUBLE PRECISION NOT NULL,
  "reason" TEXT NOT NULL,
  "administratorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");
CREATE INDEX "WalletTransaction_type_createdAt_idx" ON "WalletTransaction"("type", "createdAt");
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
