CREATE TABLE "ExternalTransferPriceSnapshot" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "routeKey" TEXT NOT NULL,
  "routeFrom" TEXT NOT NULL,
  "routeTo" TEXT NOT NULL,
  "pickupPlaceId" TEXT NOT NULL,
  "pickupLabel" TEXT NOT NULL,
  "dropoffPlaceId" TEXT NOT NULL,
  "dropoffLabel" TEXT NOT NULL,
  "serviceAt" TIMESTAMP(3) NOT NULL,
  "passengers" INTEGER NOT NULL DEFAULT 1,
  "currency" TEXT NOT NULL,
  "externalVehicleKey" TEXT NOT NULL,
  "externalVehicleName" TEXT NOT NULL,
  "maxPassengers" INTEGER,
  "publicSellPrice" DOUBLE PRECISION NOT NULL,
  "quoteKind" TEXT NOT NULL DEFAULT 'public_sell',
  "quotedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceUrl" TEXT,
  "evidenceJson" TEXT,
  CONSTRAINT "ExternalTransferPriceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalTransferPriceSnapshot_runId_routeKey_externalVehicleKey_key"
  ON "ExternalTransferPriceSnapshot"("runId", "routeKey", "externalVehicleKey");
CREATE INDEX "ExternalTransferPriceSnapshot_tenantId_sourceId_routeKey_quotedAt_idx"
  ON "ExternalTransferPriceSnapshot"("tenantId", "sourceId", "routeKey", "quotedAt");
CREATE INDEX "ExternalTransferPriceSnapshot_tenantId_routeFrom_routeTo_currency_quotedAt_idx"
  ON "ExternalTransferPriceSnapshot"("tenantId", "routeFrom", "routeTo", "currency", "quotedAt");
CREATE INDEX "ExternalTransferPriceSnapshot_tenantId_externalVehicleKey_currency_quotedAt_idx"
  ON "ExternalTransferPriceSnapshot"("tenantId", "externalVehicleKey", "currency", "quotedAt");

ALTER TABLE "ExternalTransferPriceSnapshot"
  ADD CONSTRAINT "ExternalTransferPriceSnapshot_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalTransferPriceSnapshot"
  ADD CONSTRAINT "ExternalTransferPriceSnapshot_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "PriceComparisonSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalTransferPriceSnapshot"
  ADD CONSTRAINT "ExternalTransferPriceSnapshot_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "PriceComparisonRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
