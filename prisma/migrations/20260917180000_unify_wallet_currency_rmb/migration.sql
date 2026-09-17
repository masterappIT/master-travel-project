ALTER TABLE "AppSetting"
ADD COLUMN "walletCurrency" TEXT NOT NULL DEFAULT 'HKD';

DO $$
DECLARE
  wallet_rate DOUBLE PRECISION;
BEGIN
  SELECT CASE
    WHEN "exchangeRate" >= 10 THEN "exchangeRate" / 100.0
    WHEN "exchangeRate" > 0 THEN "exchangeRate"
    ELSE 1.0
  END
  INTO wallet_rate
  FROM "AppSetting"
  WHERE "id" = 'default';

  wallet_rate := COALESCE(wallet_rate, 1.0);

  UPDATE "User"
  SET "cashBalance" = ROUND(("cashBalance" * wallet_rate)::numeric, 2)::double precision;

  UPDATE "WalletTransaction"
  SET
    "amount" = ROUND(("amount" * wallet_rate)::numeric, 2)::double precision,
    "balanceAfter" = ROUND(("balanceAfter" * wallet_rate)::numeric, 2)::double precision
  WHERE "wallet" = 'CASH';

  UPDATE "Payment"
  SET "cashAmount" = ROUND(("cashAmount" * wallet_rate)::numeric, 2)::double precision;

  UPDATE "Trip"
  SET "cashBalancePaid" = ROUND(("cashBalancePaid" * wallet_rate)::numeric, 2)::double precision;
END $$;

UPDATE "AppSetting" SET "walletCurrency" = 'RMB';
ALTER TABLE "AppSetting" ALTER COLUMN "walletCurrency" SET DEFAULT 'RMB';
