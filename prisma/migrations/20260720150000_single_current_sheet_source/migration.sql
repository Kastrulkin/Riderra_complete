-- SheetSource.isActive is the administrator-controlled current orders sheet.
-- Preserve the most recently configured active source for each tenant and
-- retire legacy sources that were left active by the former multi-active UI.
WITH ranked_active_sources AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS source_rank
  FROM "SheetSource"
  WHERE "isActive" = TRUE
)
UPDATE "SheetSource" AS source
SET
  "isActive" = FALSE,
  "syncEnabled" = FALSE
FROM ranked_active_sources AS ranked
WHERE source."id" = ranked."id"
  AND ranked.source_rank > 1;
