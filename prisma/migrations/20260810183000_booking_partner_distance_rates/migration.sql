ALTER TABLE "CounterpartyPriceRule"
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceExternalId" TEXT,
  ADD COLUMN IF NOT EXISTS "capturedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "CounterpartyDistancePriceRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerCompanyId" TEXT NOT NULL,
  "counterpartyName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "locationExternalId" TEXT,
  "locationName" TEXT NOT NULL,
  "airportIata" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "vehicleType" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "bandsJson" TEXT NOT NULL,
  "airportPickupFee" DOUBLE PRECISION,
  "sourceType" TEXT,
  "sourceLabel" TEXT,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  CONSTRAINT "CounterpartyDistancePriceRule_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "CounterpartyDistancePriceRule"
    ADD CONSTRAINT "CounterpartyDistancePriceRule_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CounterpartyDistancePriceRule"
    ADD CONSTRAINT "CounterpartyDistancePriceRule_customerCompanyId_fkey"
    FOREIGN KEY ("customerCompanyId") REFERENCES "CustomerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "CounterpartyDistancePriceRule_tenantId_customerCompanyId_isActive_idx"
  ON "CounterpartyDistancePriceRule"("tenantId", "customerCompanyId", "isActive");
CREATE INDEX IF NOT EXISTS "CounterpartyDistancePriceRule_tenantId_counterpartyName_airportIata_vehicleType_isActive_idx"
  ON "CounterpartyDistancePriceRule"("tenantId", "counterpartyName", "airportIata", "vehicleType", "isActive");
