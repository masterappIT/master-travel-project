-- Upgrade the existing Driver table created by the historical dispatch migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Driver' AND column_name = 'countryCode') THEN
    ALTER TABLE "Driver" RENAME COLUMN "countryCode" TO "phoneCountryCode";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Driver' AND column_name = 'phoneNumber') THEN
    ALTER TABLE "Driver" RENAME COLUMN "phoneNumber" TO "phone";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Driver_reviewStatus_idx" ON "Driver"("reviewStatus");
CREATE INDEX IF NOT EXISTS "Driver_phone_idx" ON "Driver"("phone");
CREATE INDEX IF NOT EXISTS "Driver_vehicleCategory_idx" ON "Driver"("vehicleCategory");