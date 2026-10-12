ALTER TABLE "PaymentChannelConfig" ADD COLUMN "lastUnavailableAt" TIMESTAMP(3);

CREATE TABLE "FinanceChannel" (
    "id" TEXT NOT NULL,
    "channelConfigId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "confirmedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceChannel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceChannel_channelConfigId_key" ON "FinanceChannel"("channelConfigId");

ALTER TABLE "FinanceChannel" ADD CONSTRAINT "FinanceChannel_channelConfigId_fkey" FOREIGN KEY ("channelConfigId") REFERENCES "PaymentChannelConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PaymentSheetItem" (
    "id" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSheetItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentSheetItem_scenario_sortOrder_idx" ON "PaymentSheetItem"("scenario", "sortOrder");
