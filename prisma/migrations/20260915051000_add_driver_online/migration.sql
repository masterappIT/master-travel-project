ALTER TABLE "Driver" ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Driver_isOnline_idx" ON "Driver"("isOnline");
