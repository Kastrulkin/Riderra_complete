-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'driver',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "avgRating" REAL DEFAULT 5.0,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Driver" ("avgRating", "city", "comment", "commissionRate", "createdAt", "email", "fixedCurrency", "fixedFrom", "fixedPrice", "fixedRoutesJson", "fixedTo", "id", "isActive", "lang", "name", "phone", "pricePerKm", "rating", "totalReviews", "totalTrips", "updatedAt", "verificationStatus") SELECT "avgRating", "city", "comment", "commissionRate", "createdAt", "email", "fixedCurrency", "fixedFrom", "fixedPrice", "fixedRoutesJson", "fixedTo", "id", "isActive", "lang", "name", "phone", "pricePerKm", "rating", "totalReviews", "totalTrips", "updatedAt", "verificationStatus" FROM "Driver";
DROP TABLE "Driver";
ALTER TABLE "new_Driver" RENAME TO "Driver";
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
