CREATE TABLE "GeoZoneBenchmarkPoint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "airportIata" TEXT,
    "pickupAddress" TEXT NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "zoneId" TEXT,
    "zoneName" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceFileName" TEXT,
    "sourceSheetName" TEXT,
    "sourceRowNumber" INTEGER,
    "sourceDistanceKm" DOUBLE PRECISION,
    "smartRydePickupPlaceId" TEXT,
    "smartRydePickupLabel" TEXT,
    "smartRydeDropoffPlaceId" TEXT,
    "smartRydeDropoffLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'candidate',
    "reviewNote" TEXT,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    CONSTRAINT "GeoZoneBenchmarkPoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeoZoneBenchmarkPoint_tenantId_normalizedKey_key" ON "GeoZoneBenchmarkPoint"("tenantId", "normalizedKey");
CREATE INDEX "GeoZoneBenchmarkPoint_tenantId_status_country_city_idx" ON "GeoZoneBenchmarkPoint"("tenantId", "status", "country", "city");
CREATE INDEX "GeoZoneBenchmarkPoint_tenantId_zoneName_idx" ON "GeoZoneBenchmarkPoint"("tenantId", "zoneName");
CREATE INDEX "GeoZoneBenchmarkPoint_tenantId_airportIata_idx" ON "GeoZoneBenchmarkPoint"("tenantId", "airportIata");
ALTER TABLE "GeoZoneBenchmarkPoint" ADD CONSTRAINT "GeoZoneBenchmarkPoint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
