CREATE TABLE "ExternalPriceCatalogCrawl" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'configured',
  "serviceAt" TIMESTAMP(3) NOT NULL,
  "currenciesJson" TEXT NOT NULL,
  "totalRoutes" INTEGER NOT NULL DEFAULT 0,
  "cursor" INTEGER NOT NULL DEFAULT 0,
  "processedRoutes" INTEGER NOT NULL DEFAULT 0,
  "quotedRoutes" INTEGER NOT NULL DEFAULT 0,
  "noQuoteRoutes" INTEGER NOT NULL DEFAULT 0,
  "failedRoutes" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  CONSTRAINT "ExternalPriceCatalogCrawl_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalPriceCatalogRoute" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "latestCrawlId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "routeKey" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "routeFrom" TEXT NOT NULL,
  "routeTo" TEXT NOT NULL,
  "pickupPlaceId" TEXT NOT NULL,
  "dropoffPlaceId" TEXT NOT NULL,
  "serviceAt" TIMESTAMP(3) NOT NULL,
  "passengers" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'quoted',
  "currenciesJson" TEXT NOT NULL,
  "priceMatrixJson" TEXT NOT NULL,
  "quoteCount" INTEGER NOT NULL DEFAULT 0,
  "contentHash" TEXT,
  "quotedAt" TIMESTAMP(3),
  "error" TEXT,
  CONSTRAINT "ExternalPriceCatalogRoute_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExternalPriceCatalogCrawl_tenantId_sourceId_createdAt_idx" ON "ExternalPriceCatalogCrawl"("tenantId", "sourceId", "createdAt");
CREATE INDEX "ExternalPriceCatalogCrawl_sourceId_status_updatedAt_idx" ON "ExternalPriceCatalogCrawl"("sourceId", "status", "updatedAt");
CREATE UNIQUE INDEX "ExternalPriceCatalogRoute_sourceId_sourceUrl_key" ON "ExternalPriceCatalogRoute"("sourceId", "sourceUrl");
CREATE INDEX "ExternalPriceCatalogRoute_tenantId_sourceId_status_updatedAt_idx" ON "ExternalPriceCatalogRoute"("tenantId", "sourceId", "status", "updatedAt");
CREATE INDEX "ExternalPriceCatalogRoute_tenantId_sourceId_routeFrom_routeTo_idx" ON "ExternalPriceCatalogRoute"("tenantId", "sourceId", "routeFrom", "routeTo");
CREATE INDEX "ExternalPriceCatalogRoute_latestCrawlId_idx" ON "ExternalPriceCatalogRoute"("latestCrawlId");

ALTER TABLE "ExternalPriceCatalogCrawl" ADD CONSTRAINT "ExternalPriceCatalogCrawl_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalPriceCatalogCrawl" ADD CONSTRAINT "ExternalPriceCatalogCrawl_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PriceComparisonSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalPriceCatalogRoute" ADD CONSTRAINT "ExternalPriceCatalogRoute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalPriceCatalogRoute" ADD CONSTRAINT "ExternalPriceCatalogRoute_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PriceComparisonSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalPriceCatalogRoute" ADD CONSTRAINT "ExternalPriceCatalogRoute_latestCrawlId_fkey" FOREIGN KEY ("latestCrawlId") REFERENCES "ExternalPriceCatalogCrawl"("id") ON DELETE SET NULL ON UPDATE CASCADE;
