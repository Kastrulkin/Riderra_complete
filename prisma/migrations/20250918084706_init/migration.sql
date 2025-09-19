-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fromPoint" TEXT NOT NULL,
    "toPoint" TEXT NOT NULL,
    "date" DATETIME,
    "passengers" INTEGER,
    "luggage" INTEGER,
    "comment" TEXT,
    "lang" TEXT
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "fixedRoutes" TEXT,
    "pricePerKm" TEXT,
    "comment" TEXT,
    "lang" TEXT
);
