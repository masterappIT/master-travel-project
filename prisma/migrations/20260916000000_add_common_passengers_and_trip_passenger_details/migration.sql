-- CreateTable
CREATE TABLE "CommonPassenger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneRegion" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "passportCountry" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommonPassenger_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "passengerName" TEXT,
ADD COLUMN "passengerPhone" TEXT,
ADD COLUMN "passengerPhoneRegion" TEXT,
ADD COLUMN "passengerGender" TEXT,
ADD COLUMN "passengerDocumentType" TEXT,
ADD COLUMN "passengerPassportCountry" TEXT;

-- CreateIndex
CREATE INDEX "CommonPassenger_userId_sortOrder_idx" ON "CommonPassenger"("userId", "sortOrder");
CREATE INDEX "CommonPassenger_userId_isDefault_idx" ON "CommonPassenger"("userId", "isDefault");

-- AddForeignKey
ALTER TABLE "CommonPassenger" ADD CONSTRAINT "CommonPassenger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
