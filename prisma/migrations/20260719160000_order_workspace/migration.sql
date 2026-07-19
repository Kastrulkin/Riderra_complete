ALTER TABLE "OpsEventDraft"
  ADD COLUMN IF NOT EXISTS "externalMessageId" TEXT,
  ADD COLUMN IF NOT EXISTS "externalThreadId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceSender" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceClassification" TEXT,
  ADD COLUMN IF NOT EXISTS "queueState" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "matchedOrderId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_ops_draft_external_message"
  ON "OpsEventDraft" ("tenantId", "externalMessageId");
CREATE INDEX IF NOT EXISTS "OpsEventDraft_tenantId_queueState_createdAt_idx"
  ON "OpsEventDraft" ("tenantId", "queueState", "createdAt");

ALTER TABLE "OpsTask"
  ADD COLUMN IF NOT EXISTS "dedupKey" TEXT,
  ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "linkUrl" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_ops_task_dedup"
  ON "OpsTask" ("tenantId", "dedupKey");
