# Implementation Sequence (Engineering Order)

1. Database migrations for RBAC, orders sync, pricing, approvals, CRM.
2. RBAC middleware + audit base.
3. Google Sheets source registry + sync worker (idempotent).
4. Orders API/UI.
5. Price book + mismatch engine.
6. Approval domain and enforcement.
7. Telegram bot auth + approval commands.
8. Planfix staging pipeline.
9. Planfix transform/dedup/load + reconciliation report.
10. UAT and cutover checklist.

## Required Inputs Before Coding
- Google Service Account credentials + доступы к monthly sheets.
- Planfix export format/API credentials.
- OpenClaw payload contract version.
- Список пользователей и стартовые роли.
