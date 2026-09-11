CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'REFUNDED');
ALTER TYPE "WalletTransactionType" ADD VALUE 'TRIP_PAYMENT';
ALTER TYPE "WalletTransactionType" ADD VALUE 'REFUND';

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "total" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "fareAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cashAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "externalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "externalPaymentMethod" TEXT,
  "externalReference" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WalletTransaction" ADD COLUMN "paymentId" TEXT;
CREATE UNIQUE INDEX "Payment_tripId_key" ON "Payment"("tripId");
CREATE UNIQUE INDEX "Payment_quoteId_key" ON "Payment"("quoteId");
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
CREATE INDEX "WalletTransaction_paymentId_idx" ON "WalletTransaction"("paymentId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
