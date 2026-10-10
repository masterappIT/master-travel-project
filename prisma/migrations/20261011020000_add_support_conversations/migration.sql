CREATE TABLE "SupportConversation" (
    "id" TEXT NOT NULL,
    "participantType" TEXT NOT NULL,
    "participantId" TEXT,
    "principalKey" TEXT NOT NULL,
    "guestTokenHash" TEXT,
    "openedByType" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "clientMessageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportConversation_principalKey_key" ON "SupportConversation"("principalKey");
CREATE UNIQUE INDEX "SupportConversation_guestTokenHash_key" ON "SupportConversation"("guestTokenHash");
CREATE INDEX "SupportConversation_participantType_participantId_idx" ON "SupportConversation"("participantType", "participantId");
CREATE INDEX "SupportConversation_lastMessageAt_idx" ON "SupportConversation"("lastMessageAt");
CREATE UNIQUE INDEX "SupportMessage_conversationId_senderType_senderId_clientMessageId_key" ON "SupportMessage"("conversationId", "senderType", "senderId", "clientMessageId");
CREATE INDEX "SupportMessage_conversationId_createdAt_id_idx" ON "SupportMessage"("conversationId", "createdAt", "id");
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SupportAgent" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "normalizedUsername" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportAgent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupportAgent_normalizedUsername_key" ON "SupportAgent"("normalizedUsername");

CREATE TABLE "SupportAgentSession" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportAgentSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupportAgentSession_jti_key" ON "SupportAgentSession"("jti");
CREATE INDEX "SupportAgentSession_agentId_revokedAt_idx" ON "SupportAgentSession"("agentId", "revokedAt");
CREATE INDEX "SupportAgentSession_expiresAt_idx" ON "SupportAgentSession"("expiresAt");
ALTER TABLE "SupportAgentSession" ADD CONSTRAINT "SupportAgentSession_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "SupportAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SupportAuditLog" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "conversationId" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportAuditLog_conversationId_createdAt_idx" ON "SupportAuditLog"("conversationId", "createdAt");
CREATE INDEX "SupportAuditLog_actorType_actorId_createdAt_idx" ON "SupportAuditLog"("actorType", "actorId", "createdAt");
