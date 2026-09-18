ALTER TABLE "AppSetting"
ADD COLUMN "invitationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "invitationInviterMileage" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN "invitationInviteeFare" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN "invitationQualificationDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "invitationMileageValidityMonths" INTEGER NOT NULL DEFAULT 12;

ALTER TABLE "Invitation"
ADD COLUMN "rewardCurrency" TEXT NOT NULL DEFAULT 'RMB',
ADD COLUMN "qualificationDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "mileageValidityMonths" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "Invitation"
SET "expiresAt" = "createdAt" + INTERVAL '30 days';

ALTER TABLE "Invitation"
ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE INDEX "Invitation_status_expiresAt_idx" ON "Invitation"("status", "expiresAt");
