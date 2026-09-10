-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('HK', 'MACAU', 'GUANGDONG');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FareQuoteLineType" AS ENUM ('MINIMUM_FARE', 'DISTANCE_TIER', 'VEHICLE', 'EXTRA', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tabLabel" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "colorLabel" TEXT NOT NULL,
    "modelChoiceLabel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryDistancePricing" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "minimumFare" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryDistancePricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistancePricingTier" (
    "id" TEXT NOT NULL,
    "pricingId" TEXT NOT NULL,
    "fromKm" DOUBLE PRECISION NOT NULL,
    "toKm" DOUBLE PRECISION,
    "pricePerKm" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistancePricingTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleExtra" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FareQuote" (
    "id" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FareQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FareQuotePricingSnapshot" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "tabLabel" TEXT NOT NULL,
    "minimumFare" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FareQuotePricingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FareQuoteTierSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "sourceTierId" TEXT NOT NULL,
    "fromKm" DOUBLE PRECISION NOT NULL,
    "toKm" DOUBLE PRECISION,
    "pricePerKm" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "FareQuoteTierSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FareQuoteVehicleSnapshot" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "categoryId" TEXT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "colorLabel" TEXT NOT NULL,
    "modelChoiceLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FareQuoteVehicleSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FareQuoteLine" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "type" "FareQuoteLineType" NOT NULL,
    "sourceId" TEXT,
    "label" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitAmount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FareQuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "Trip_userId_status_idx" ON "Trip"("userId", "status");

-- CreateIndex
CREATE INDEX "Trip_scheduledAt_idx" ON "Trip"("scheduledAt");

-- CreateIndex
CREATE INDEX "VehicleCategory_enabled_order_idx" ON "VehicleCategory"("enabled", "order");

-- CreateIndex
CREATE INDEX "Vehicle_categoryId_idx" ON "Vehicle"("categoryId");

-- CreateIndex
CREATE INDEX "Vehicle_enabled_order_idx" ON "Vehicle"("enabled", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryDistancePricing_categoryId_key" ON "CategoryDistancePricing"("categoryId");

-- CreateIndex
CREATE INDEX "DistancePricingTier_pricingId_order_idx" ON "DistancePricingTier"("pricingId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "DistancePricingTier_pricingId_order_key" ON "DistancePricingTier"("pricingId", "order");

-- CreateIndex
CREATE INDEX "VehicleExtra_enabled_order_idx" ON "VehicleExtra"("enabled", "order");

-- CreateIndex
CREATE UNIQUE INDEX "FareQuotePricingSnapshot_quoteId_key" ON "FareQuotePricingSnapshot"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "FareQuoteTierSnapshot_snapshotId_order_key" ON "FareQuoteTierSnapshot"("snapshotId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "FareQuoteVehicleSnapshot_quoteId_key" ON "FareQuoteVehicleSnapshot"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "FareQuoteLine_quoteId_order_key" ON "FareQuoteLine"("quoteId", "order");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VehicleCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryDistancePricing" ADD CONSTRAINT "CategoryDistancePricing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VehicleCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistancePricingTier" ADD CONSTRAINT "DistancePricingTier_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "CategoryDistancePricing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FareQuotePricingSnapshot" ADD CONSTRAINT "FareQuotePricingSnapshot_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "FareQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FareQuoteTierSnapshot" ADD CONSTRAINT "FareQuoteTierSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "FareQuotePricingSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FareQuoteVehicleSnapshot" ADD CONSTRAINT "FareQuoteVehicleSnapshot_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "FareQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FareQuoteLine" ADD CONSTRAINT "FareQuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "FareQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed current defaults without overwriting persisted administration changes.
INSERT INTO "AppSetting" ("id", "language", "region", "currency", "exchangeRate", "updatedAt")
VALUES ('default', '繁體中文', '香港', 'HKD', 0.92, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "VehicleCategory" ("id", "name", "tabLabel", "order", "enabled", "updatedAt")
VALUES
  ('standard-mpv', '普通跨境商務車', '普通MPV', 1, true, CURRENT_TIMESTAMP),
  ('premium-mpv', '高級跨境商務車', '高級MPV', 2, true, CURRENT_TIMESTAMP),
  ('standard-car', '普通跨境轎車', '普通轎車', 3, true, CURRENT_TIMESTAMP),
  ('premium-car', '頂級跨境轎車', '頂級轎車', 4, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CategoryDistancePricing" ("id", "categoryId", "minimumFare", "currency", "updatedAt")
VALUES
  ('pricing-standard-mpv', 'standard-mpv', 800, 'RMB¥', CURRENT_TIMESTAMP),
  ('pricing-premium-mpv', 'premium-mpv', 800, 'RMB¥', CURRENT_TIMESTAMP),
  ('pricing-standard-car', 'standard-car', 800, 'RMB¥', CURRENT_TIMESTAMP),
  ('pricing-premium-car', 'premium-car', 800, 'RMB¥', CURRENT_TIMESTAMP)
ON CONFLICT ("categoryId") DO NOTHING;

INSERT INTO "DistancePricingTier" ("id", "pricingId", "fromKm", "toKm", "pricePerKm", "order", "updatedAt")
VALUES
  ('standard-mpv-tier-0-20', 'pricing-standard-mpv', 0, 20, 40, 1, CURRENT_TIMESTAMP),
  ('standard-mpv-tier-20-120', 'pricing-standard-mpv', 20, 120, 15, 2, CURRENT_TIMESTAMP),
  ('standard-mpv-tier-120-plus', 'pricing-standard-mpv', 120, NULL, 12, 3, CURRENT_TIMESTAMP),
  ('premium-mpv-tier-0-20', 'pricing-premium-mpv', 0, 20, 40, 1, CURRENT_TIMESTAMP),
  ('premium-mpv-tier-20-120', 'pricing-premium-mpv', 20, 120, 15, 2, CURRENT_TIMESTAMP),
  ('premium-mpv-tier-120-plus', 'pricing-premium-mpv', 120, NULL, 12, 3, CURRENT_TIMESTAMP),
  ('standard-car-tier-0-20', 'pricing-standard-car', 0, 20, 40, 1, CURRENT_TIMESTAMP),
  ('standard-car-tier-20-120', 'pricing-standard-car', 20, 120, 15, 2, CURRENT_TIMESTAMP),
  ('standard-car-tier-120-plus', 'pricing-standard-car', 120, NULL, 12, 3, CURRENT_TIMESTAMP),
  ('premium-car-tier-0-20', 'pricing-premium-car', 0, 20, 40, 1, CURRENT_TIMESTAMP),
  ('premium-car-tier-20-120', 'pricing-premium-car', 20, 120, 15, 2, CURRENT_TIMESTAMP),
  ('premium-car-tier-120-plus', 'pricing-premium-car', 120, NULL, 12, 3, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Vehicle" ("id", "categoryId", "brand", "model", "series", "seats", "image", "colorLabel", "modelChoiceLabel", "enabled", "order", "updatedAt")
VALUES
  ('standard-mpv', 'standard-mpv', '', '跨境商務車', '', 6, '/static/vehicles/alphard.png', '不限顏色', '不限車款', true, 1, CURRENT_TIMESTAMP),
  ('premium-vellfire', 'premium-mpv', 'Toyota', 'Vellfire', '20系', 7, '/static/vehicles/vellfire.png', '不限顏色', '', true, 1, CURRENT_TIMESTAMP),
  ('premium-alphard', 'premium-mpv', 'Toyota', 'Alphard', '30系', 6, '/static/vehicles/alphard.png', '不限顏色', '', true, 2, CURRENT_TIMESTAMP),
  ('tesla-s', 'standard-car', 'Tesla', 'Model', 'S', 5, '/static/vehicles/tesla-s.png', '不限顏色', '', true, 1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "VehicleExtra" ("id", "name", "label", "price", "currency", "enabled", "order", "updatedAt")
VALUES
  ('child-seat', 'child-seat', '兒童安全座椅', 50, 'RMB¥', true, 1, CURRENT_TIMESTAMP),
  ('additional-stop', 'additional-stop', '額外停靠點', 100, 'RMB¥', true, 2, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
