CREATE INDEX "ClientSession_revokedAt_expiresAt_userId_idx"
ON "ClientSession"("revokedAt", "expiresAt", "userId");

CREATE INDEX "Driver_isOnline_enabled_idx"
ON "Driver"("isOnline", "enabled");
