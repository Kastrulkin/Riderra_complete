CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "PriceComparisonPlaceMap"
  ADD COLUMN IF NOT EXISTS "semanticSuggestionsJson" TEXT,
  ADD COLUMN IF NOT EXISTS "semanticSuggestedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "semanticModel" TEXT,
  ADD COLUMN IF NOT EXISTS "semanticStatus" TEXT NOT NULL DEFAULT 'not_indexed';

CREATE TABLE IF NOT EXISTS "CanonicalTransferPlace" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "canonicalKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "searchText" TEXT NOT NULL,
  "placeType" TEXT NOT NULL DEFAULT 'unknown',
  "country" TEXT,
  "city" TEXT,
  "airportIata" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'candidate'
);

CREATE UNIQUE INDEX IF NOT EXISTS "CanonicalTransferPlace_tenantId_canonicalKey_key"
  ON "CanonicalTransferPlace"("tenantId", "canonicalKey");
CREATE INDEX IF NOT EXISTS "CanonicalTransferPlace_tenantId_normalizedName_idx"
  ON "CanonicalTransferPlace"("tenantId", "normalizedName");
CREATE INDEX IF NOT EXISTS "CanonicalTransferPlace_tenantId_country_city_idx"
  ON "CanonicalTransferPlace"("tenantId", "country", "city");
CREATE INDEX IF NOT EXISTS "CanonicalTransferPlace_tenantId_airportIata_idx"
  ON "CanonicalTransferPlace"("tenantId", "airportIata");

CREATE TABLE IF NOT EXISTS "CanonicalTransferPlaceAlias" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "canonicalPlaceId" TEXT NOT NULL REFERENCES "CanonicalTransferPlace"("id") ON DELETE CASCADE,
  "sourceId" TEXT NOT NULL REFERENCES "PriceComparisonSource"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "externalPlaceId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "normalizedLabel" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'verified',
  "confidence" DOUBLE PRECISION,
  "verificationMethod" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "CanonicalTransferPlaceAlias_sourceId_externalPlaceId_key"
  ON "CanonicalTransferPlaceAlias"("sourceId", "externalPlaceId");
CREATE INDEX IF NOT EXISTS "CanonicalTransferPlaceAlias_tenantId_normalizedLabel_idx"
  ON "CanonicalTransferPlaceAlias"("tenantId", "normalizedLabel");
CREATE INDEX IF NOT EXISTS "CanonicalTransferPlaceAlias_canonicalPlaceId_idx"
  ON "CanonicalTransferPlaceAlias"("canonicalPlaceId");

CREATE TABLE IF NOT EXISTS "CanonicalTransferPlaceEmbedding" (
  "canonicalPlaceId" TEXT PRIMARY KEY REFERENCES "CanonicalTransferPlace"("id") ON DELETE CASCADE,
  "contentHash" TEXT NOT NULL,
  "embeddingModel" TEXT NOT NULL,
  "embeddingVersion" TEXT NOT NULL DEFAULT 'transfer_places_v1',
  "dimensions" INTEGER NOT NULL DEFAULT 2560,
  "embedding" HALFVEC(2560),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "providerRequestId" TEXT,
  "errorCode" TEXT,
  "embeddedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "CanonicalTransferPlaceEmbedding_status_idx"
  ON "CanonicalTransferPlaceEmbedding"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "CanonicalTransferPlaceEmbedding_hnsw_idx"
  ON "CanonicalTransferPlaceEmbedding"
  USING hnsw ("embedding" halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 96)
  WHERE "status" = 'ready';
