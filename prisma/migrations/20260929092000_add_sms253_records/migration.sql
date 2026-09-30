CREATE TABLE "Sms253Message" (
  "id" TEXT NOT NULL,
  "phone" TEXT,
  "mode" TEXT NOT NULL,
  "message" TEXT,
  "params" TEXT,
  "report" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL,
  "providerCode" TEXT,
  "providerError" TEXT,
  "providerData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Sms253Message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Sms253Message_createdAt_idx" ON "Sms253Message"("createdAt");
CREATE INDEX "Sms253Message_phone_createdAt_idx" ON "Sms253Message"("phone", "createdAt");
CREATE INDEX "Sms253Message_status_createdAt_idx" ON "Sms253Message"("status", "createdAt");

CREATE TABLE "Sms253Report" (
  "id" TEXT NOT NULL,
  "messageId" TEXT,
  "phone" TEXT,
  "providerCode" TEXT,
  "status" TEXT,
  "rawPayload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Sms253Report_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Sms253Report_receivedAt_idx" ON "Sms253Report"("receivedAt");
CREATE INDEX "Sms253Report_phone_receivedAt_idx" ON "Sms253Report"("phone", "receivedAt");
CREATE INDEX "Sms253Report_messageId_idx" ON "Sms253Report"("messageId");
