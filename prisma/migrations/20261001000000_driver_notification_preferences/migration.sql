CREATE TABLE "DriverNotificationPreference" (
    "driverId" TEXT NOT NULL PRIMARY KEY,
    "notificationsOn" BOOLEAN NOT NULL DEFAULT true,
    "orderOn" BOOLEAN NOT NULL DEFAULT true,
    "settlementOn" BOOLEAN NOT NULL DEFAULT true,
    "systemOn" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DriverNotificationPreference_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
