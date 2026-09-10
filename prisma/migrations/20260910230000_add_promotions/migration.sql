ALTER TABLE "User" ADD COLUMN "membershipLevel" TEXT;

CREATE TYPE "PromotionKind" AS ENUM ('CAMPAIGN', 'COUPON', 'MEMBER');
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
ALTER TYPE "FareQuoteLineType" ADD VALUE 'DISCOUNT';

CREATE TABLE "Promotion" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "PromotionKind" NOT NULL,
  "discountType" "DiscountType" NOT NULL,
  "discountValue" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'RMB¥',
  "minimumSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maximumDiscount" DOUBLE PRECISION,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "couponCode" TEXT,
  "usageLimit" INTEGER,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "membershipLevel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Promotion_couponCode_key" ON "Promotion"("couponCode");
CREATE INDEX "Promotion_kind_enabled_startsAt_endsAt_idx" ON "Promotion"("kind", "enabled", "startsAt", "endsAt");
