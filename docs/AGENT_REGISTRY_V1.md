# Riderra Agent Registry v1

Status: canonical internal model for AI-agent interoperability.
Last reviewed: 2026-08-11.

## Vocabulary

- Agent: a domain-specific assistant profile that prepares or proposes work.
- Capability: a typed operation Riderra allows an agent to request.
- Orchestrator: the Riderra policy layer that validates tenant, actor, permissions, approval, idempotency, billing mode, and audit requirements.
- Harness: the runtime around a model or external executor such as OpenClaw.
- Draft: an AI-prepared object that is not yet an operational side effect.
- Approval: a human decision by an authorized Riderra user.
- Execute: the controlled Riderra action after validation and approval.
- Audit event: persistent record of what was proposed, approved, rejected, executed, or failed.

## Required Action Envelope

Every capability request should use an envelope compatible with `server/openclaw_contract.js`:

```json
{
  "contract_version": "1.0.0",
  "tenant_id": "string",
  "trace_id": "string",
  "idempotency_key": "string",
  "actor": {
    "id": "string|null",
    "role": "owner|financial|operator|dispatcher|audit|pricing_admin|system"
  },
  "capability": "riderra.namespace.action",
  "approval": {
    "mode": "human_required|not_required",
    "approval_id": "string|null"
  },
  "billing": {
    "mode": "track_only|billable|not_applicable",
    "unit": "message|draft|check|order|row"
  },
  "payload": {}
}
```

Required invariants:

- `tenant_id`, `trace_id`, `actor.role`, `capability`, `approval.mode`, and `billing.mode` are mandatory.
- `idempotency_key` is mandatory for side-effecting requests.
- The model must not perform side effects directly. It can only propose a capability call.
- Riderra must validate permissions and approval before execution.

## Capability Catalog

| Capability | Status | Side effect | Approval | Source/API |
| --- | --- | --- | --- | --- |
| `riderra.public.order_request.validate` | available | no | not required | `POST /api/public/order-requests/validate` |
| `riderra.public.order_request.create_draft` | available | creates public request draft | not required for public intake, operator approval before booking | `POST /api/public/order-requests` |
| `riderra.ai_inbox.email_draft.ingest` | available | creates AI Inbox draft | system-authenticated ingest | `POST /api/internal/ops/email-draft`, `POST /api/webhooks/openclaw/order-draft` |
| `riderra.ai_inbox.draft.review` | available | no | not required | `GET /api/admin/ops/drafts/:draftId` |
| `riderra.ai_inbox.draft.refresh_checks` | available | updates draft validation checks | operator approval through authenticated UI/API | `POST /api/admin/ops/drafts/:draftId/refresh-checks` |
| `riderra.ai_inbox.draft.approve_to_order` | available | creates/updates order draft | human required | `POST /api/admin/ops/drafts/:draftId/approve` |
| `riderra.ai_inbox.draft.reject` | available | closes draft | human required | `POST /api/admin/ops/drafts/:draftId/reject` |
| `riderra.ai_inbox.draft.bulk_delete` | available | deletes selected drafts | human required | `POST /api/admin/ops/drafts/bulk-delete` |
| `riderra.orders.sheet.sync_month` | available | reads sheet into Riderra | authenticated staff with order access | `POST /api/admin/orders/months/:monthLabel/sync` |
| `riderra.orders.month.archive` | available | closes month into archive | owner/financial human required | `POST /api/admin/orders/months/:monthLabel/archive` |
| `riderra.orders.status.change` | available | changes order status | human required | `POST /api/admin/orders/:orderId/status` |
| `riderra.orders.address_check` | available | records/checks validation result | operator-authenticated | `GET/POST /api/admin/orders/:orderId/address-check` |
| `riderra.orders.flight_check` | available later | check only for now | not active for paid checks unless approved | `GET/POST /api/admin/orders/:orderId/flight-check` |
| `riderra.pricing.base_price.read` | available | no | pricing read permission | `GET /api/admin/pricing/cities` |
| `riderra.pricing.base_price.write` | available | changes internal price book | pricing admin human required | `POST/PUT/DELETE /api/admin/pricing/cities` |
| `riderra.pricing.counterparty_rules.read` | available | no | pricing read permission | `GET /api/admin/pricing/counterparty-rules` |
| `riderra.pricing.counterparty_rules.write` | available | changes price rules | pricing admin human required | `POST/PUT /api/admin/pricing/counterparty-rules` |
| `riderra.pricing.comparison.read` | available | no | pricing read permission | `GET /api/admin/pricing/comparison-sources`, `GET /api/admin/pricing/comparison-runs/:id/results` |
| `riderra.pricing.comparison.run` | beta | creates immutable external quote snapshots and comparison results; does not change the price book | pricing manager human starts the run and approves ambiguous mappings | `POST /api/admin/pricing/comparison-runs`, `POST /api/admin/pricing/comparison-runs/:id/execute`, `PUT /api/admin/pricing/comparison-mappings/*` |
| `riderra.pricing.external_quotes.read` | beta | no | pricing read permission; public sell quotes are evidence, not guaranteed supplier net rates | `GET /api/admin/pricing/external-quotes`, `GET /api/admin/pricing/external-quotes/coverage` |
| `riderra.pricing.booking_calculation.read` | available | no | pricing read permission; Riderra 005 is reference-only | `GET /api/admin/pricing/booking-calculation` |
| `riderra.pricing.booking_monitor.configure` | available | changes Booking monitor schedule, not prices | pricing manage permission | `PUT /api/admin/pricing/comparison-sources/:id/schedule` |
| `riderra.pricing.booking_monitor.review` | available | creates an observation report; cannot target 005 rows for mutation | human review | scheduled worker / `HumanApproval` |
| `riderra.chat.message.compose` | available | creates draft message | human required before send | `POST /api/admin/chats/tasks/:id/build` |
| `riderra.chat.message.approve` | available | approves message draft | human required | `POST /api/admin/chats/messages/:id/approve` |
| `riderra.chat.message.send` | available | sends outbound message | human required | `POST /api/admin/chats/messages/:id/send` |
| `riderra.chat.reply.classify` | available | records classification/extraction | authenticated inbound workflow | `POST /api/admin/chats/tasks/:id/inbound`, `POST /api/internal/chats/inbound` |
| `riderra.crm.promote_from_staging` | available | promotes CRM records | CRM human required | `POST /api/admin/crm/promote-from-staging` |
| `riderra.telegram.link.manage` | available | changes Telegram links | admin human required | `POST /api/admin/telegram-links` |

## Agent Types In Riderra

- Public request agent: helps a user submit a draft transfer request through public endpoints.
- AI Inbox parser: converts email payloads into normalized order, change, or cancellation drafts.
- Order completion agent: detects missing fields and drafts clarification messages.
- Dispatch notification agent: drafts driver/customer operational notices.
- Pricing checker: compares order price with the internal Riderra price book.
- Address checker: validates pickup/dropoff address signals against Google Maps when configured.
- Analytics assistant: summarizes archived months, risks, driver/counterparty performance, and exceptions.

## Safety Invariants

- Public request creation is never a confirmed booking.
- AI Inbox drafts never bypass human review.
- Price truth is the internal Riderra price book.
- External price files are imports or comparison evidence, not final authority.
- Booking partner/public prices are a separate working domain; Booking monitoring cannot mutate Riderra 005.
- Google Maps address checks are validation signals, not autonomous correction authority.
- Telegram, WhatsApp, email, and customer-facing outbound messages require human approval.
- Pricing writes, month archive, order cancellation/change, CRM migration, role/VPN/Telegram access changes, and bulk deletes require human approval.

## Current Implementation Anchors

- Envelope validation: `server/openclaw_contract.js`.
- Chat runtime: `docs/RIDERRA_CHAT_AGENT_RUNTIME_V1.md`.
- Chat orchestration: `docs/RIDERRA_OPENCLAW_CHAT_ORCHESTRATION_V1.md`.
- AI Inbox UI/API: `pages/admin-ai-inbox.vue`, `/api/admin/ops/drafts*`.
- Public AI visibility: `/llms.txt`, `/api/public/openapi.json`, `scripts/public_ai_visibility_smoke.js`.
