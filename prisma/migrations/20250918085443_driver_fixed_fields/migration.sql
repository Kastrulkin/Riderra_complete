/*
  Warnings:

  - You are about to drop the column `fixedRoutes` on the `Driver` table. All the data in the column will be lost.

*/
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
    "lang" TEXT
);
INSERT INTO "new_Driver" ("city", "comment", "createdAt", "email", "id", "lang", "name", "phone", "pricePerKm") SELECT "city", "comment", "createdAt", "email", "id", "lang", "name", "phone", "pricePerKm" FROM "Driver";
DROP TABLE "Driver";
ALTER TABLE "new_Driver" RENAME TO "Driver";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
