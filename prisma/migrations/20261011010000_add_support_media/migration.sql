-- 客服圖片只保留壓縮後的 WebP 變體；原始檔不進資料庫，也不作預設長期保存。
CREATE TABLE "SupportMedia" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "displayStorageKey" TEXT NOT NULL,
    "thumbnailStorageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/webp',
    "displaySizeBytes" INTEGER NOT NULL,
    "thumbnailSizeBytes" INTEGER NOT NULL,
    "displayWidth" INTEGER NOT NULL,
    "displayHeight" INTEGER NOT NULL,
    "thumbnailWidth" INTEGER NOT NULL,
    "thumbnailHeight" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "sourceFormat" TEXT NOT NULL,
    "sourceWidth" INTEGER NOT NULL,
    "sourceHeight" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupportMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportMedia_displayStorageKey_key" ON "SupportMedia"("displayStorageKey");
CREATE UNIQUE INDEX "SupportMedia_thumbnailStorageKey_key" ON "SupportMedia"("thumbnailStorageKey");
CREATE INDEX "SupportMedia_conversationId_createdAt_idx" ON "SupportMedia"("conversationId", "createdAt");
CREATE INDEX "SupportMedia_expiresAt_idx" ON "SupportMedia"("expiresAt");
CREATE INDEX "SupportMedia_senderType_senderId_createdAt_idx" ON "SupportMedia"("senderType", "senderId", "createdAt");
