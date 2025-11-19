-- CreateTable
CREATE TABLE "city_routes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "fromPoint" TEXT NOT NULL,
    "toPoint" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "passengers" INTEGER NOT NULL,
    "distance" REAL NOT NULL,
    "targetFare" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "driver_city_routes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "cityRouteId" TEXT NOT NULL,
    "bestPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "driver_city_routes_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "driver_city_routes_cityRouteId_fkey" FOREIGN KEY ("cityRouteId") REFERENCES "city_routes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_city_routes_driverId_cityRouteId_key" ON "driver_city_routes"("driverId", "cityRouteId");
