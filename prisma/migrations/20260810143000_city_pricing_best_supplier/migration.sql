ALTER TABLE "CityPricing" ADD COLUMN "bestSupplierCompanyId" TEXT;

CREATE INDEX "CityPricing_bestSupplierCompanyId_idx" ON "CityPricing"("bestSupplierCompanyId");

ALTER TABLE "CityPricing"
ADD CONSTRAINT "CityPricing_bestSupplierCompanyId_fkey"
FOREIGN KEY ("bestSupplierCompanyId") REFERENCES "CustomerCompany"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "CityPricing" AS pricing
SET "bestSupplierCompanyId" = supplier."id"
FROM "CustomerCompany" AS supplier
WHERE pricing."tenantId" = supplier."tenantId"
  AND pricing."notes" LIKE '%supplier=Pilotandcar Dubai%'
  AND supplier."name" = 'Pilotandcar Dubai';

UPDATE "CityPricing" AS pricing
SET "bestSupplierCompanyId" = supplier."id"
FROM "CustomerCompany" AS supplier
WHERE pricing."tenantId" = supplier."tenantId"
  AND pricing."notes" LIKE '%supplier=Tour Dubai (Nadir)%'
  AND supplier."name" = 'Tour Dubai (Nadir)';
