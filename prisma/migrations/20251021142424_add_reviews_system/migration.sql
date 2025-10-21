-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "clientName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "avgRating" REAL DEFAULT 5.0,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Driver" ("city", "comment", "commissionRate", "createdAt", "email", "fixedCurrency", "fixedFrom", "fixedPrice", "fixedRoutesJson", "fixedTo", "id", "isActive", "lang", "name", "phone", "pricePerKm", "rating", "totalTrips", "updatedAt", "verificationStatus") SELECT "city", "comment", "commissionRate", "createdAt", "email", "fixedCurrency", "fixedFrom", "fixedPrice", "fixedRoutesJson", "fixedTo", "id", "isActive", "lang", "name", "phone", "pricePerKm", "rating", "totalTrips", "updatedAt", "verificationStatus" FROM "Driver";
DROP TABLE "Driver";
ALTER TABLE "new_Driver" RENAME TO "Driver";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_key" ON "Review"("orderId");
