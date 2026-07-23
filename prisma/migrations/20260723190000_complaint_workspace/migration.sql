CREATE TABLE "ComplaintCase" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT,
  "sourceDraftId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'email',
  "externalThreadId" TEXT,
  "complainantName" TEXT,
  "complainantEmail" TEXT,
  "subject" TEXT,
  "summary" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'other',
  "severity" TEXT NOT NULL DEFAULT 'normal',
  "status" TEXT NOT NULL DEFAULT 'new',
  "isEscalated" BOOLEAN NOT NULL DEFAULT false,
  "assignedToUserId" TEXT,
  "createdByUserId" TEXT,
  "firstResponseDueAt" TIMESTAMP(3) NOT NULL,
  "firstRespondedAt" TIMESTAMP(3),
  "resolution" TEXT,
  "matchConfidence" DOUBLE PRECISION,
  "matchReason" TEXT,
  "missingInfoJson" TEXT,
  "aiAnalysisJson" TEXT,
  "investigationJson" TEXT,
  "contractRuleId" TEXT,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComplaintCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CounterpartyComplaintRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "counterpartyName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "waitingMinutes" INTEGER,
  "arrivalToleranceMin" INTEGER,
  "requiredActionsJson" TEXT,
  "approvedStatementsJson" TEXT,
  "prohibitedStatementsJson" TEXT,
  "sourceDocumentName" TEXT,
  "sourceObjectKey" TEXT,
  "notes" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CounterpartyComplaintRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplaintMessage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "complaintId" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'inbound',
  "externalMessageId" TEXT,
  "externalThreadId" TEXT,
  "sender" TEXT,
  "recipientsJson" TEXT,
  "subject" TEXT,
  "bodyText" TEXT NOT NULL,
  "attachmentsJson" TEXT,
  "providerMessageId" TEXT,
  "deliveryStatus" TEXT,
  "deliveryError" TEXT,
  "approvalStatus" TEXT,
  "idempotencyKey" TEXT,
  "createdByUserId" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplaintMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplaintActivity" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "complaintId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "details" TEXT,
  "actorUserId" TEXT,
  "actorEmail" TEXT,
  "metadataJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplaintActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplaintEvidence" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "complaintId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "contentText" TEXT,
  "objectKey" TEXT,
  "mimeType" TEXT,
  "filename" TEXT,
  "size" INTEGER,
  "source" TEXT,
  "metadataJson" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplaintEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderTripEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'easytaxi',
  "externalEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "driverName" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "source" TEXT NOT NULL DEFAULT 'api',
  "payloadJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderTripEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_complaint_thread" ON "ComplaintCase"("tenantId", "externalThreadId");
CREATE INDEX "ComplaintCase_tenantId_status_firstResponseDueAt_idx" ON "ComplaintCase"("tenantId", "status", "firstResponseDueAt");
CREATE INDEX "ComplaintCase_tenantId_assignedToUserId_status_idx" ON "ComplaintCase"("tenantId", "assignedToUserId", "status");
CREATE INDEX "ComplaintCase_tenantId_orderId_updatedAt_idx" ON "ComplaintCase"("tenantId", "orderId", "updatedAt");
CREATE UNIQUE INDEX "uq_counterparty_complaint_rule_version" ON "CounterpartyComplaintRule"("tenantId", "counterpartyName", "version");
CREATE INDEX "CounterpartyComplaintRule_tenantId_counterpartyName_isActive_idx" ON "CounterpartyComplaintRule"("tenantId", "counterpartyName", "isActive");
CREATE UNIQUE INDEX "uq_complaint_message_external" ON "ComplaintMessage"("tenantId", "externalMessageId");
CREATE UNIQUE INDEX "uq_complaint_message_idempotency" ON "ComplaintMessage"("tenantId", "idempotencyKey");
CREATE INDEX "ComplaintMessage_complaintId_createdAt_idx" ON "ComplaintMessage"("complaintId", "createdAt");
CREATE INDEX "ComplaintActivity_tenantId_complaintId_createdAt_idx" ON "ComplaintActivity"("tenantId", "complaintId", "createdAt");
CREATE INDEX "ComplaintEvidence_tenantId_complaintId_createdAt_idx" ON "ComplaintEvidence"("tenantId", "complaintId", "createdAt");
CREATE UNIQUE INDEX "uq_provider_trip_event" ON "ProviderTripEvent"("tenantId", "provider", "externalEventId");
CREATE INDEX "ProviderTripEvent_tenantId_orderId_occurredAt_idx" ON "ProviderTripEvent"("tenantId", "orderId", "occurredAt");

ALTER TABLE "ComplaintCase" ADD CONSTRAINT "ComplaintCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplaintCase" ADD CONSTRAINT "ComplaintCase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplaintCase" ADD CONSTRAINT "ComplaintCase_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplaintCase" ADD CONSTRAINT "ComplaintCase_contractRuleId_fkey" FOREIGN KEY ("contractRuleId") REFERENCES "CounterpartyComplaintRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CounterpartyComplaintRule" ADD CONSTRAINT "CounterpartyComplaintRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplaintMessage" ADD CONSTRAINT "ComplaintMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplaintMessage" ADD CONSTRAINT "ComplaintMessage_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "ComplaintCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplaintActivity" ADD CONSTRAINT "ComplaintActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplaintActivity" ADD CONSTRAINT "ComplaintActivity_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "ComplaintCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplaintEvidence" ADD CONSTRAINT "ComplaintEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplaintEvidence" ADD CONSTRAINT "ComplaintEvidence_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "ComplaintCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderTripEvent" ADD CONSTRAINT "ProviderTripEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderTripEvent" ADD CONSTRAINT "ProviderTripEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
