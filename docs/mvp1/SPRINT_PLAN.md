# MVP-1 Delivery Plan (2 Sprints)

## Sprint 1 (2 weeks) - Foundation
### Scope
- Google Sheet source registry + ingestion job.
- Orders list/card in Riderra.
- Basic RBAC enforcement.
- Audit log foundation.
- Telegram auth + `/tasks`, `/approve`, `/reject`.
- Price book read model + mismatch detector v1.

### Deliverables
- End-to-end: Sheet row -> Riderra order -> price incident -> Telegram alert.
- End-to-end: AI draft task -> approval in Telegram -> executed action audit.

### Exit Criteria
- Stable sync on schedule.
- Zero duplicate orders on rerun.
- Role restrictions pass UAT.

## Sprint 2 (2 weeks) - CRM + Migration + Hardening
### Scope
- CRM customer profile + role-scoped access.
- Planfix migration pipeline (extract/stage/transform/load/reconcile).
- Price governance flow (draft version + approve).
- Telegram command expansion (`/orders`, `/order`, `/incidents`, `/sync-status`).
- Observability: job metrics, error dashboards, dead-letter queue.

### Deliverables
- Migrated customer base from Planfix with reconciliation report.
- Controlled rollout to dispatcher/operator/sales teams.

### Exit Criteria
- Owner sign-off по миграции.
- Команда работает в Riderra для core процессов.
- Planfix usage можно отключать для клиентской базы.
