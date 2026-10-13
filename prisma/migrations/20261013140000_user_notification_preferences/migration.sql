CREATE TABLE "UserNotificationPreference" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "notificationsOn" BOOLEAN NOT NULL DEFAULT true,
    "orderOn" BOOLEAN NOT NULL DEFAULT true,
    "paymentOn" BOOLEAN NOT NULL DEFAULT true,
    "promotionOn" BOOLEAN NOT NULL DEFAULT true,
    "systemOn" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
