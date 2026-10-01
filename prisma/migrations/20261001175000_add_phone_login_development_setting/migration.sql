CREATE TABLE "PhoneLoginDevelopmentSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "passengerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "driverEnabled" BOOLEAN NOT NULL DEFAULT false,
    "verificationCodeHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "PhoneLoginDevelopmentSetting_pkey" PRIMARY KEY ("id")
);
