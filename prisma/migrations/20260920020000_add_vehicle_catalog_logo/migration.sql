ALTER TABLE "Vehicle"
ADD COLUMN "logoData" BYTEA,
ADD COLUMN "logoMime" TEXT;

ALTER TABLE "FareQuoteVehicleSnapshot"
ADD COLUMN "logo" TEXT;
