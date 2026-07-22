ALTER TABLE "ChatTask" ADD COLUMN "agentConfigVersionId" TEXT;

CREATE TABLE "ChatAgentVersion" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "agentConfigId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "snapshotJson" TEXT NOT NULL,
  "testSummaryJson" TEXT,
  "testedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatAgentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentSandboxSession" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "agentConfigId" TEXT NOT NULL,
  "agentConfigVersionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "scenarioKey" TEXT,
  "currentState" TEXT NOT NULL,
  "initialContextJson" TEXT,
  "resultSummaryJson" TEXT,
  "passed" BOOLEAN,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AgentSandboxSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "agentConfigId" TEXT,
  "agentConfigVersionId" TEXT,
  "chatTaskId" TEXT,
  "sandboxSessionId" TEXT,
  "capability" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "stateBefore" TEXT,
  "stateAfter" TEXT,
  "provider" TEXT,
  "model" TEXT,
  "summary" TEXT,
  "inputJson" TEXT,
  "outputJson" TEXT,
  "errorText" TEXT,
  "latencyMs" INTEGER,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentSandboxMessage" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "bodyText" TEXT NOT NULL,
  "stateBefore" TEXT,
  "stateAfter" TEXT,
  "extractionJson" TEXT,
  "traceJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentSandboxMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatAgentVersion_agentConfigId_version_key" ON "ChatAgentVersion"("agentConfigId", "version");
CREATE INDEX "ChatAgentVersion_tenantId_status_updatedAt_idx" ON "ChatAgentVersion"("tenantId", "status", "updatedAt");
CREATE INDEX "AgentSandboxSession_tenantId_status_updatedAt_idx" ON "AgentSandboxSession"("tenantId", "status", "updatedAt");
CREATE INDEX "AgentSandboxSession_agentConfigId_updatedAt_idx" ON "AgentSandboxSession"("agentConfigId", "updatedAt");
CREATE INDEX "AgentRun_tenantId_status_startedAt_idx" ON "AgentRun"("tenantId", "status", "startedAt");
CREATE INDEX "AgentRun_agentConfigId_startedAt_idx" ON "AgentRun"("agentConfigId", "startedAt");
CREATE INDEX "AgentRun_chatTaskId_startedAt_idx" ON "AgentRun"("chatTaskId", "startedAt");
CREATE INDEX "AgentSandboxMessage_sessionId_createdAt_idx" ON "AgentSandboxMessage"("sessionId", "createdAt");

ALTER TABLE "ChatTask" ADD CONSTRAINT "ChatTask_agentConfigVersionId_fkey" FOREIGN KEY ("agentConfigVersionId") REFERENCES "ChatAgentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatAgentVersion" ADD CONSTRAINT "ChatAgentVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatAgentVersion" ADD CONSTRAINT "ChatAgentVersion_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "ChatAgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentSandboxSession" ADD CONSTRAINT "AgentSandboxSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentSandboxSession" ADD CONSTRAINT "AgentSandboxSession_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "ChatAgentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentSandboxSession" ADD CONSTRAINT "AgentSandboxSession_agentConfigVersionId_fkey" FOREIGN KEY ("agentConfigVersionId") REFERENCES "ChatAgentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_agentConfigId_fkey" FOREIGN KEY ("agentConfigId") REFERENCES "ChatAgentConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_agentConfigVersionId_fkey" FOREIGN KEY ("agentConfigVersionId") REFERENCES "ChatAgentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_chatTaskId_fkey" FOREIGN KEY ("chatTaskId") REFERENCES "ChatTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_sandboxSessionId_fkey" FOREIGN KEY ("sandboxSessionId") REFERENCES "AgentSandboxSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentSandboxMessage" ADD CONSTRAINT "AgentSandboxMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AgentSandboxSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
