CREATE TYPE "InvitationStatus" AS ENUM ('REGISTERED', 'REWARDED', 'EXPIRED');
ALTER TYPE "WalletTransactionType" ADD VALUE 'INVITATION_REWARD';

CREATE TABLE "InvitationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvitationCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'REGISTERED',
    "qualifiedTripId" TEXT,
    "inviterMileageReward" INTEGER NOT NULL DEFAULT 300,
    "inviteeFareReward" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "rewardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvitationCode_userId_key" ON "InvitationCode"("userId");
CREATE UNIQUE INDEX "InvitationCode_code_key" ON "InvitationCode"("code");
CREATE UNIQUE INDEX "Invitation_inviteeId_key" ON "Invitation"("inviteeId");
CREATE UNIQUE INDEX "Invitation_qualifiedTripId_key" ON "Invitation"("qualifiedTripId");
CREATE INDEX "Invitation_inviterId_createdAt_idx" ON "Invitation"("inviterId", "createdAt");
CREATE INDEX "Invitation_inviterId_status_idx" ON "Invitation"("inviterId", "status");
CREATE INDEX "Invitation_code_idx" ON "Invitation"("code");

ALTER TABLE "InvitationCode" ADD CONSTRAINT "InvitationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
