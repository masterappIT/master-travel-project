CREATE TABLE "RouteMinimumFare" (
    "id" TEXT NOT NULL,
    "originRegion" TEXT NOT NULL,
    "originCity" TEXT,
    "destinationRegion" TEXT NOT NULL,
    "destinationCity" TEXT,
    "categoryId" TEXT,
    "minimumFare" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RouteMinimumFare_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RouteMinimumFare"
ADD CONSTRAINT "RouteMinimumFare_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "VehicleCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "RouteMinimumFare_originRegion_originCity_destinationRegion_destinationCity_enabled_idx"
ON "RouteMinimumFare"("originRegion", "originCity", "destinationRegion", "destinationCity", "enabled");
CREATE INDEX "RouteMinimumFare_categoryId_enabled_idx" ON "RouteMinimumFare"("categoryId", "enabled");

ALTER TABLE "FareQuotePricingSnapshot"
ADD COLUMN "routeMinimumFare" DOUBLE PRECISION,
ADD COLUMN "routeOriginRegion" TEXT,
ADD COLUMN "routeOriginCity" TEXT,
ADD COLUMN "routeDestinationRegion" TEXT,
ADD COLUMN "routeDestinationCity" TEXT;
