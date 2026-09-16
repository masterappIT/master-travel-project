ALTER TABLE "Notification" ADD COLUMN "templateType" TEXT DEFAULT 'system';
ALTER TABLE "Notification" ADD COLUMN "important" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Notification_important_createdAt_idx" ON "Notification"("important", "createdAt");

CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'ALL_USERS',
  "important" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "builtIn" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NotificationTemplate_type_enabled_idx" ON "NotificationTemplate"("type", "enabled");

INSERT INTO "NotificationTemplate" ("id", "name", "type", "title", "content", "audience", "builtIn", "updatedAt") VALUES
('notification-template-order', '訂單確認', 'order', '您的跨境出行訂單已確認', '您的行程：香港 - 深圳機場（訂單編號：282678634）', 'ALL_USERS', true, CURRENT_TIMESTAMP),
('notification-template-payment', '餘額增值', 'payment', '您的餘額增值已到帳', '您的錢包餘額$0.00', 'ALL_USERS', true, CURRENT_TIMESTAMP),
('notification-template-promotion', '餘額提現', 'promotion', '您的餘額提現已到帳', '您的錢包餘額$0.00', 'ALL_USERS', true, CURRENT_TIMESTAMP),
('notification-template-refund', '訂單退款', 'refund', '您的訂單退款已到帳', '行程：香港 - 深圳機場（訂單編號：282678634）', 'ALL_USERS', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
