/*
  Warnings:

  - Added the required column `updatedAt` to the `Driver` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "DriverRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "fromPoint" TEXT NOT NULL,
    "toPoint" TEXT NOT NULL,
    "driverPrice" REAL NOT NULL,
    "ourPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriverRoute_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromPoint" TEXT NOT NULL,
    "toPoint" TEXT NOT NULL,
    "clientPrice" REAL NOT NULL,
    "driverPrice" REAL,
    "commission" REAL,
    "driverId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "vehicleType" TEXT NOT NULL,
    "passengers" INTEGER,
    "luggage" INTEGER,
    "comment" TEXT,
    "lang" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "fixedFrom" TEXT,
    "fixedTo" TEXT,
    "fixedPrice" TEXT,
    "fixedCurrency" TEXT,
    "pricePerKm" TEXT,
    "comment" TEXT,
    "lang" TEXT,
    "fixedRoutesJson" TEXT,
    "commissionRate" REAL DEFAULT 15.0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "rating" REAL DEFAULT 5.0,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Driver" ("city", "comment", "createdAt", "email", "fixedCurrency", "fixedFrom", "fixedPrice", "fixedRoutesJson", "fixedTo", "id", "lang", "name", "phone", "pricePerKm") SELECT "city", "comment", "createdAt", "email", "fixedCurrency", "fixedFrom", "fixedPrice", "fixedRoutesJson", "fixedTo", "id", "lang", "name", "phone", "pricePerKm" FROM "Driver";
DROP TABLE "Driver";
ALTER TABLE "new_Driver" RENAME TO "Driver";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
