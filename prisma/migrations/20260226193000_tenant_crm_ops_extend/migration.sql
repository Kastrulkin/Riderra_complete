ALTER TABLE "CrmCompany" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CrmContact" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CustomerCompany" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CustomerContact" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "OpsEventDraft" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "OpsEvent" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "DriverUnavailability" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "OpsTask" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TelegramLink" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

DO $$ BEGIN
  ALTER TABLE "CrmCompany" ADD CONSTRAINT "CrmCompany_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CustomerCompany" ADD CONSTRAINT "CustomerCompany_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OpsEventDraft" ADD CONSTRAINT "OpsEventDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OpsEvent" ADD CONSTRAINT "OpsEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DriverUnavailability" ADD CONSTRAINT "DriverUnavailability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OpsTask" ADD CONSTRAINT "OpsTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TelegramLink" ADD CONSTRAINT "TelegramLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "CrmCompany_tenantId_updatedAt_idx" ON "CrmCompany"("tenantId", "updatedAt");
CREATE INDEX IF NOT EXISTS "CrmContact_tenantId_updatedAt_idx" ON "CrmContact"("tenantId", "updatedAt");
CREATE INDEX IF NOT EXISTS "CustomerCompany_tenantId_updatedAt_idx" ON "CustomerCompany"("tenantId", "updatedAt");
CREATE INDEX IF NOT EXISTS "CustomerContact_tenantId_updatedAt_idx" ON "CustomerContact"("tenantId", "updatedAt");
CREATE INDEX IF NOT EXISTS "OpsEventDraft_tenantId_status_createdAt_idx" ON "OpsEventDraft"("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "OpsEvent_tenantId_createdAt_idx" ON "OpsEvent"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "DriverUnavailability_tenantId_status_startAt_endAt_idx" ON "DriverUnavailability"("tenantId", "status", "startAt", "endAt");
CREATE INDEX IF NOT EXISTS "OpsTask_tenantId_status_dueAt_idx" ON "OpsTask"("tenantId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "TelegramLink_tenantId_userId_idx" ON "TelegramLink"("tenantId", "userId");

UPDATE "CrmCompany" SET "tenantId" = COALESCE("tenantId", (SELECT "id" FROM "Tenant" WHERE "code"='riderra' LIMIT 1));
UPDATE "CrmContact" SET "tenantId" = COALESCE("tenantId", (SELECT "id" FROM "Tenant" WHERE "code"='riderra' LIMIT 1));
UPDATE "CustomerCompany" SET "tenantId" = COALESCE("tenantId", (SELECT "id" FROM "Tenant" WHERE "code"='riderra' LIMIT 1));
UPDATE "CustomerContact" SET "tenantId" = COALESCE("tenantId", (SELECT "id" FROM "Tenant" WHERE "code"='riderra' LIMIT 1));
UPDATE "OpsEventDraft" SET "tenantId" = COALESCE("tenantId", (SELECT "id" FROM "Tenant" WHERE "code"='riderra' LIMIT 1));
UPDATE "OpsEvent" SET "tenantId" = COALESCE("tenantId", (SELECT "id" FROM "Tenant" WHERE "code"='riderra' LIMIT 1));
UPDATE "DriverUnavailability" SET "tenantId" = COALESCE("tenantId", (SELECT "id" FROM "Tenant" WHERE "code"='riderra' LIMIT 1));
UPDATE "OpsTask" SET "tenantId" = COALESCE("tenantId", (SELECT "id" FROM "Tenant" WHERE "code"='riderra' LIMIT 1));
UPDATE "TelegramLink" SET "tenantId" = COALESCE("tenantId", (SELECT "id" FROM "Tenant" WHERE "code"='riderra' LIMIT 1));
