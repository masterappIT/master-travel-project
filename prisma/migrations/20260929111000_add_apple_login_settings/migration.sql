ALTER TABLE "AppSetting"
  ADD COLUMN "appleIosEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "appleIosTeamId" TEXT,
  ADD COLUMN "appleIosKeyId" TEXT,
  ADD COLUMN "appleIosClientId" TEXT,
  ADD COLUMN "appleIosPrivateKey" TEXT,
  ADD COLUMN "appleIosBundleId" TEXT,
  ADD COLUMN "appleWebEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "appleWebTeamId" TEXT,
  ADD COLUMN "appleWebKeyId" TEXT,
  ADD COLUMN "appleWebClientId" TEXT,
  ADD COLUMN "appleWebRedirectUri" TEXT,
  ADD COLUMN "appleWebPrivateKey" TEXT;
