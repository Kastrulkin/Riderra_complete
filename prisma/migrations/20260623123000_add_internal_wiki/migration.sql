CREATE TABLE "WikiPage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "importedAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL DEFAULT '',
    "contentText" TEXT NOT NULL DEFAULT '',
    "sourceProvider" TEXT NOT NULL DEFAULT 'manual',
    "sourcePageId" TEXT,
    "sourceUrl" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WikiPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WikiPage_tenantId_sourceProvider_sourcePageId_key" ON "WikiPage"("tenantId", "sourceProvider", "sourcePageId");
CREATE INDEX "WikiPage_tenantId_isPublished_updatedAt_idx" ON "WikiPage"("tenantId", "isPublished", "updatedAt");
CREATE INDEX "WikiPage_tenantId_parentId_sortOrder_idx" ON "WikiPage"("tenantId", "parentId", "sortOrder");
CREATE INDEX "WikiPage_tenantId_slug_idx" ON "WikiPage"("tenantId", "slug");

ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WikiPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
