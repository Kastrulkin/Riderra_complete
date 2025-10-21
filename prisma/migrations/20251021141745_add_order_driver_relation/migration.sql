-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("clientPrice", "comment", "commission", "createdAt", "driverId", "driverPrice", "fromPoint", "id", "lang", "luggage", "passengers", "status", "toPoint", "updatedAt", "vehicleType") SELECT "clientPrice", "comment", "commission", "createdAt", "driverId", "driverPrice", "fromPoint", "id", "lang", "luggage", "passengers", "status", "toPoint", "updatedAt", "vehicleType" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
