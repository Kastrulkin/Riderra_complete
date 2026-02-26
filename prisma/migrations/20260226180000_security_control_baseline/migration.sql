-- Tenant core
CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "TenantMembership" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'staff',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "TenantMembership_userId_isActive_idx" ON "TenantMembership"("userId", "isActive");

-- Add tenant_id columns to critical tables
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "OrderStatusHistory" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "SheetSource" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "OrderSourceSnapshot" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CityPricing" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CounterpartyPriceRule" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PriceConflict" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CityPricing" ADD CONSTRAINT "CityPricing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CounterpartyPriceRule" ADD CONSTRAINT "CounterpartyPriceRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Order_tenantId_status_createdAt_idx" ON "Order"("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "OrderStatusHistory_tenantId_createdAt_idx" ON "OrderStatusHistory"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "OrderSourceSnapshot_tenantId_createdAt_idx" ON "OrderSourceSnapshot"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "CityPricing_tenantId_city_isActive_idx" ON "CityPricing"("tenantId", "city", "isActive");
CREATE INDEX IF NOT EXISTS "CounterpartyPriceRule_tenantId_counterpartyName_isActive_idx" ON "CounterpartyPriceRule"("tenantId", "counterpartyName", "isActive");
CREATE INDEX IF NOT EXISTS "PriceConflict_tenantId_status_severity_updatedAt_idx" ON "PriceConflict"("tenantId", "status", "severity", "updatedAt");

-- Idempotency, approvals, audit
CREATE TABLE IF NOT EXISTS "IdempotencyKey" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "requestHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'processing',
  "responseJson" TEXT,
  "traceId" TEXT,
  CONSTRAINT "IdempotencyKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyKey_tenantId_key_action_key" ON "IdempotencyKey"("tenantId", "key", "action");
CREATE INDEX IF NOT EXISTS "IdempotencyKey_tenantId_createdAt_idx" ON "IdempotencyKey"("tenantId", "createdAt");

CREATE TABLE IF NOT EXISTS "HumanApproval" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending_human',
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" TEXT,
  "payloadJson" TEXT NOT NULL,
  "requesterId" TEXT,
  "reviewerId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "traceId" TEXT,
  CONSTRAINT "HumanApproval_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "HumanApproval_tenantId_status_createdAt_idx" ON "HumanApproval"("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "HumanApproval_status_expiresAt_idx" ON "HumanApproval"("status", "expiresAt");

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId" TEXT NOT NULL,
  "actorId" TEXT,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" TEXT,
  "traceId" TEXT NOT NULL,
  "decision" TEXT,
  "result" TEXT NOT NULL,
  "contextJson" TEXT,
  CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_traceId_idx" ON "AuditLog"("traceId");

-- Seed default tenant + memberships
INSERT INTO "Tenant" ("id", "createdAt", "updatedAt", "code", "name", "isActive")
VALUES ('riderra-default-tenant', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'riderra', 'Riderra', true)
ON CONFLICT ("code") DO NOTHING;

UPDATE "Order" SET "tenantId" = COALESCE("tenantId", (SELECT "id" FROM "Tenant" WHERE "code"='riderra' LIMIT 1));
UPDATE "OrderStatusHistory" SET "tenantId" = COALESCE("tenantId", (SELECT "id" FROM "Tenant" WHERE "code"='riderra' LIMIT 1));
UPDATE "CityPricing" SET "tenantId" = COALESCE("tenantId", (SELECT "id" FROM "Tenant" WHERE "code"='riderra' LIMIT 1));
UPDATE "CounterpartyPriceRule" SET "tenantId" = COALESCE("tenantId", (SELECT "id" FROM "Tenant" WHERE "code"='riderra' LIMIT 1));

INSERT INTO "TenantMembership" ("id", "createdAt", "updatedAt", "tenantId", "userId", "role", "isActive")
SELECT
  'tm-' || substring(md5(u.id || '-riderra') for 24),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  t.id,
  u.id,
  CASE WHEN u.role = 'admin' THEN 'staff_supervisor' WHEN u.role = 'driver' THEN 'executor' ELSE 'staff' END,
  true
FROM "users" u
JOIN "Tenant" t ON t.code = 'riderra'
ON CONFLICT ("tenantId", "userId") DO NOTHING;
