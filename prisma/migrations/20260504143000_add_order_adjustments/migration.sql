CREATE TABLE IF NOT EXISTS "OrderAdjustment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "orderId" TEXT,
  "driverId" TEXT,
  "customerCompanyId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'penalty',
  "amount" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "reason" TEXT,
  "counterpartyName" TEXT,
  "driverNameRaw" TEXT,
  "source" TEXT NOT NULL DEFAULT 'google_sheet',
  "sourceKey" TEXT,
  "sourceSheetId" TEXT,
  "sourceTabName" TEXT,
  "sourceRow" INTEGER,
  "rawText" TEXT,
  "rawPayload" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "OrderAdjustment_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "OrderAdjustment" ADD CONSTRAINT "OrderAdjustment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "OrderAdjustment" ADD CONSTRAINT "OrderAdjustment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "OrderAdjustment" ADD CONSTRAINT "OrderAdjustment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "OrderAdjustment" ADD CONSTRAINT "OrderAdjustment_customerCompanyId_fkey" FOREIGN KEY ("customerCompanyId") REFERENCES "CustomerCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "OrderAdjustment_sourceKey_key" ON "OrderAdjustment"("sourceKey");
CREATE INDEX IF NOT EXISTS "OrderAdjustment_tenantId_type_isActive_createdAt_idx" ON "OrderAdjustment"("tenantId", "type", "isActive", "createdAt");
CREATE INDEX IF NOT EXISTS "OrderAdjustment_tenantId_driverId_isActive_idx" ON "OrderAdjustment"("tenantId", "driverId", "isActive");
CREATE INDEX IF NOT EXISTS "OrderAdjustment_tenantId_customerCompanyId_isActive_idx" ON "OrderAdjustment"("tenantId", "customerCompanyId", "isActive");
CREATE INDEX IF NOT EXISTS "OrderAdjustment_tenantId_counterpartyName_isActive_idx" ON "OrderAdjustment"("tenantId", "counterpartyName", "isActive");
CREATE INDEX IF NOT EXISTS "OrderAdjustment_orderId_isActive_idx" ON "OrderAdjustment"("orderId", "isActive");
