-- Normalize legacy currency representations without deleting transaction history.
UPDATE "Payment" SET "currency" = 'RMB' WHERE "currency" IN ('CNY', 'RMB¥');
UPDATE "AppSetting" SET "currency" = 'RMB' WHERE "currency" IN ('CNY', 'RMB¥');
UPDATE "AppSetting" SET "pricingCurrency" = 'RMB' WHERE "pricingCurrency" IN ('CNY', 'RMB¥');
UPDATE "RouteMinimumFare" SET "currency" = 'RMB' WHERE "currency" IN ('CNY', 'RMB¥');
UPDATE "CategoryDistancePricing" SET "currency" = 'RMB' WHERE "currency" IN ('CNY', 'RMB¥');
UPDATE "VehicleExtra" SET "currency" = 'RMB' WHERE "currency" IN ('CNY', 'RMB¥');
UPDATE "FareQuote" SET "currency" = 'RMB' WHERE "currency" IN ('CNY', 'RMB¥');
UPDATE "FareQuotePricingSnapshot" SET "currency" = 'RMB' WHERE "currency" IN ('CNY', 'RMB¥');
UPDATE "FareQuoteLine" SET "currency" = 'RMB' WHERE "currency" IN ('CNY', 'RMB¥');
UPDATE "Promotion" SET "currency" = 'RMB' WHERE "currency" IN ('CNY', 'RMB¥');
