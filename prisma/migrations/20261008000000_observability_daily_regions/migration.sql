CREATE TABLE "ObservabilityRegionStat" (
  "day" DATE NOT NULL,
  "region" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT '',
  "eventCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ObservabilityRegionStat_pkey" PRIMARY KEY ("day", "region", "source", "platform")
);
