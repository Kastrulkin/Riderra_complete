ALTER TABLE "Order"
  ADD COLUMN "customerName" TEXT,
  ADD COLUMN "customerEmail" TEXT,
  ADD COLUMN "customerPhone" TEXT,
  ADD COLUMN "manualOverridesJson" TEXT;

CREATE TABLE "OrderChangeLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorEmail" TEXT,
  "actorRole" TEXT,
  "reason" TEXT,
  "changesJson" TEXT NOT NULL,
  "beforeJson" TEXT NOT NULL,
  "afterJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderChangeLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderChangeLog_tenantId_orderId_createdAt_idx"
  ON "OrderChangeLog"("tenantId", "orderId", "createdAt");

CREATE INDEX "OrderChangeLog_tenantId_actorUserId_createdAt_idx"
  ON "OrderChangeLog"("tenantId", "actorUserId", "createdAt");

ALTER TABLE "OrderChangeLog"
  ADD CONSTRAINT "OrderChangeLog_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderChangeLog"
  ADD CONSTRAINT "OrderChangeLog_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
