-- The historical dispatch migration already added this relation. Keep this migration
-- idempotent so it also works against that existing database.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Trip' AND column_name = 'driverId') THEN
    ALTER TABLE "Trip" ADD COLUMN "driverId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Trip_driverId_fkey') THEN
    ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Trip_driverId_status_idx" ON "Trip"("driverId", "status");
