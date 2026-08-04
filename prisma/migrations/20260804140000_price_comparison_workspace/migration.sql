CREATE TABLE "PriceComparisonSource" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerCompanyId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "adapterKey" TEXT NOT NULL,
  "baseUrl" TEXT NOT NULL,
  "supportedCurrenciesJson" TEXT NOT NULL,
  "scheduleJson" TEXT NOT NULL,
  "passengerConfigJson" TEXT NOT NULL,
  "pricingPolicyJson" TEXT NOT NULL,
  "formulaVersion" TEXT NOT NULL,
  "maxConcurrency" INTEGER NOT NULL DEFAULT 1,
  "requestDelayMs" INTEGER NOT NULL DEFAULT 1000,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "PriceComparisonSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceComparisonRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "serviceAt" TIMESTAMP(3) NOT NULL,
  "formulaVersion" TEXT NOT NULL,
  "pricingPolicyJson" TEXT NOT NULL,
  "routeCount" INTEGER NOT NULL DEFAULT 0,
  "processedCount" INTEGER NOT NULL DEFAULT 0,
  "opportunitiesCount" INTEGER NOT NULL DEFAULT 0,
  "needsReviewCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  CONSTRAINT "PriceComparisonRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceComparisonQuote" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "cityPricingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "routeFrom" TEXT NOT NULL,
  "routeTo" TEXT NOT NULL,
  "requestedVehicleType" TEXT NOT NULL,
  "riderraSellPrice" DOUBLE PRECISION NOT NULL,
  "riderraCurrency" TEXT NOT NULL,
  "pickupPlaceId" TEXT,
  "pickupLabel" TEXT,
  "dropoffPlaceId" TEXT,
  "dropoffLabel" TEXT,
  "externalVehicleKey" TEXT NOT NULL,
  "externalVehicleName" TEXT,
  "maxPassengers" INTEGER,
  "clientSellPrice" DOUBLE PRECISION,
  "clientCurrency" TEXT,
  "serviceAt" TIMESTAMP(3) NOT NULL,
  "quotedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'needs_review',
  "error" TEXT,
  "evidenceJson" TEXT,
  CONSTRAINT "PriceComparisonQuote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceComparisonResult" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "formulaVersion" TEXT NOT NULL,
  "targetPrice" DOUBLE PRECISION NOT NULL,
  "opportunityGapAbs" DOUBLE PRECISION NOT NULL,
  "opportunityGapPct" DOUBLE PRECISION,
  "status" TEXT NOT NULL,
  CONSTRAINT "PriceComparisonResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceComparisonPlaceMap" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "inputText" TEXT NOT NULL,
  "normalizedInput" TEXT NOT NULL,
  "externalPlaceId" TEXT,
  "externalLabel" TEXT,
  "status" TEXT NOT NULL DEFAULT 'needs_review',
  "candidatesJson" TEXT,
  "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  CONSTRAINT "PriceComparisonPlaceMap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceComparisonVehicleMap" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "externalVehicleKey" TEXT NOT NULL,
  "externalVehicleName" TEXT NOT NULL,
  "riderraVehicleType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'needs_review',
  "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  CONSTRAINT "PriceComparisonVehicleMap_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PriceComparisonSource_tenantId_adapterKey_key" ON "PriceComparisonSource"("tenantId", "adapterKey");
CREATE INDEX "PriceComparisonSource_tenantId_isActive_name_idx" ON "PriceComparisonSource"("tenantId", "isActive", "name");
CREATE INDEX "PriceComparisonRun_tenantId_status_createdAt_idx" ON "PriceComparisonRun"("tenantId", "status", "createdAt");
CREATE INDEX "PriceComparisonRun_sourceId_createdAt_idx" ON "PriceComparisonRun"("sourceId", "createdAt");
CREATE UNIQUE INDEX "PriceComparisonQuote_runId_cityPricingId_externalVehicleKey_key" ON "PriceComparisonQuote"("runId", "cityPricingId", "externalVehicleKey");
CREATE INDEX "PriceComparisonQuote_tenantId_runId_status_idx" ON "PriceComparisonQuote"("tenantId", "runId", "status");
CREATE INDEX "PriceComparisonQuote_cityPricingId_quotedAt_idx" ON "PriceComparisonQuote"("cityPricingId", "quotedAt");
CREATE UNIQUE INDEX "PriceComparisonResult_quoteId_key" ON "PriceComparisonResult"("quoteId");
CREATE INDEX "PriceComparisonResult_tenantId_runId_status_idx" ON "PriceComparisonResult"("tenantId", "runId", "status");
CREATE UNIQUE INDEX "PriceComparisonPlaceMap_sourceId_normalizedInput_key" ON "PriceComparisonPlaceMap"("sourceId", "normalizedInput");
CREATE INDEX "PriceComparisonPlaceMap_tenantId_sourceId_status_idx" ON "PriceComparisonPlaceMap"("tenantId", "sourceId", "status");
CREATE UNIQUE INDEX "PriceComparisonVehicleMap_sourceId_externalVehicleKey_riderraVehicleType_key" ON "PriceComparisonVehicleMap"("sourceId", "externalVehicleKey", "riderraVehicleType");
CREATE INDEX "PriceComparisonVehicleMap_tenantId_sourceId_status_idx" ON "PriceComparisonVehicleMap"("tenantId", "sourceId", "status");

ALTER TABLE "PriceComparisonSource" ADD CONSTRAINT "PriceComparisonSource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceComparisonSource" ADD CONSTRAINT "PriceComparisonSource_customerCompanyId_fkey" FOREIGN KEY ("customerCompanyId") REFERENCES "CustomerCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PriceComparisonRun" ADD CONSTRAINT "PriceComparisonRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceComparisonRun" ADD CONSTRAINT "PriceComparisonRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PriceComparisonSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceComparisonQuote" ADD CONSTRAINT "PriceComparisonQuote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceComparisonQuote" ADD CONSTRAINT "PriceComparisonQuote_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PriceComparisonRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceComparisonQuote" ADD CONSTRAINT "PriceComparisonQuote_cityPricingId_fkey" FOREIGN KEY ("cityPricingId") REFERENCES "CityPricing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceComparisonResult" ADD CONSTRAINT "PriceComparisonResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceComparisonResult" ADD CONSTRAINT "PriceComparisonResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PriceComparisonRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceComparisonResult" ADD CONSTRAINT "PriceComparisonResult_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "PriceComparisonQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceComparisonPlaceMap" ADD CONSTRAINT "PriceComparisonPlaceMap_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceComparisonPlaceMap" ADD CONSTRAINT "PriceComparisonPlaceMap_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PriceComparisonSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceComparisonVehicleMap" ADD CONSTRAINT "PriceComparisonVehicleMap_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceComparisonVehicleMap" ADD CONSTRAINT "PriceComparisonVehicleMap_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PriceComparisonSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
