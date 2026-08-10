CREATE TABLE "SupplierPriceRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "supplierCompanyId" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "category" TEXT,
  "routeFrom" TEXT,
  "routeTo" TEXT,
  "vehicleType" TEXT,
  "passengers" INTEGER,
  "supplierPrice" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "priceType" TEXT NOT NULL DEFAULT 'net',
  "parkingSurcharge" DOUBLE PRECISION,
  "vatPercent" DOUBLE PRECISION,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "sourceType" TEXT,
  "sourceLabel" TEXT,
  "sourceQuotedAt" TIMESTAMP(3),
  "sourceStatus" TEXT NOT NULL DEFAULT 'approved',
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "SupplierPriceRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierPriceRule_supplierCompanyId_sourceKey_key" ON "SupplierPriceRule"("supplierCompanyId", "sourceKey");
CREATE INDEX "SupplierPriceRule_tenantId_supplierCompanyId_isActive_idx" ON "SupplierPriceRule"("tenantId", "supplierCompanyId", "isActive");
CREATE INDEX "SupplierPriceRule_tenantId_routeFrom_routeTo_vehicleType_idx" ON "SupplierPriceRule"("tenantId", "routeFrom", "routeTo", "vehicleType");

ALTER TABLE "SupplierPriceRule" ADD CONSTRAINT "SupplierPriceRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierPriceRule" ADD CONSTRAINT "SupplierPriceRule_supplierCompanyId_fkey" FOREIGN KEY ("supplierCompanyId") REFERENCES "CustomerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
