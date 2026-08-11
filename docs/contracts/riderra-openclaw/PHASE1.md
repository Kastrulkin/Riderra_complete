# Riderra x OpenClaw / Neighbor Agent Contract Phase 1

Status: recommended contract for supervised agent interoperability.
Last reviewed: 2026-08-11.

## Goal

Make Riderra understandable and callable by a neighboring AI agent without letting that agent bypass Riderra's business rules, human approvals, price truth, or audit controls.

The neighboring agent should not drive the browser or mutate data directly. It should propose a typed capability call. Riderra validates the envelope, permissions, idempotency, approval state, and payload before execution.

## Execution Pattern

```text
intent
-> capability proposal
-> envelope validation
-> tenant / actor / RBAC / approval / idempotency check
-> execute, reject, or pending_human
-> structured result
-> audit / status history / support context
```

## Envelope

Use the v1 envelope implemented in `server/openclaw_contract.js`.

```json
{
  "contract_version": "1.0.0",
  "tenant_id": "string",
  "trace_id": "string",
  "idempotency_key": "string",
  "actor": {
    "id": "string|null",
    "role": "operator|dispatcher|financial|pricing_admin|owner|system"
  },
  "capability": "riderra.customer.message.compose",
  "approval": {
    "mode": "human_required",
    "approval_id": "string|null"
  },
  "billing": {
    "mode": "track_only",
    "unit": "message"
  },
  "payload": {}
}
```

## Phase 1 Capability Families

### Public draft request

- Validate request: `riderra.public.order_request.validate`
- Create request draft: `riderra.public.order_request.create_draft`
- Check draft status: `riderra.public.order_request.status`

Public draft requests are not bookings.

### AI Inbox

- Ingest email draft: `riderra.ai_inbox.email_draft.ingest`
- Refresh draft checks: `riderra.ai_inbox.draft.refresh_checks`
- Approve draft to order: `riderra.ai_inbox.draft.approve_to_order`
- Reject draft: `riderra.ai_inbox.draft.reject`
- Bulk-delete drafts: `riderra.ai_inbox.draft.bulk_delete`

Creating/changing operational orders from AI Inbox requires human approval.

### Orders and monthly sheets

- Sync month from sheet: `riderra.orders.sheet.sync_month`
- Archive month: `riderra.orders.month.archive`
- Change status: `riderra.orders.status.change`
- Check address: `riderra.orders.address_check`
- Check flight: `riderra.orders.flight_check`

Sheets remain the order source of truth in MVP-1. Month archive is owner/financial only.

### Pricing

- Read base price book: `riderra.pricing.base_price.read`
- Write base price book: `riderra.pricing.base_price.write`
- Read client/supplier price matrices: `riderra.pricing.price_matrix.read`
- Suggest price correction: `riderra.pricing.correction.suggest`
- Read external comparison evidence: `riderra.pricing.comparison.read`
- Run a supervised external comparison: `riderra.pricing.comparison.run`
- Read Booking calculation: `riderra.pricing.booking_calculation.read`
- Configure Booking monitor: `riderra.pricing.booking_monitor.configure`

Price writes require pricing admin approval. Internal Riderra price book is final truth.
Booking observations are maintained separately; Riderra 005 is reference-only and cannot be changed by the Booking monitor.

### Communication

- Compose customer message: `riderra.customer.message.compose`
- Approve customer/driver message: `riderra.customer.message.approve`
- Send customer/driver message: `riderra.customer.message.send`
- Classify inbound reply: `riderra.customer.reply.classify`
- Extract and validate inbound fields: `riderra.order.field.extract_validate`

Outbound send requires human approval.

## Result Shape

Every capability should return:

```json
{
  "contract_version": "1.0.0",
  "trace_id": "string",
  "idempotency_key": "string",
  "capability": "string",
  "status": "completed|pending_human|rejected|failed",
  "result": {},
  "audit": {
    "recorded": true,
    "resource": "order|draft|message|price|crm|setting",
    "resource_id": "string|null"
  },
  "errors": []
}
```

## Required Human Approval

Return `pending_human` instead of executing when the operation:

- sends an external message;
- creates, changes, cancels, or archives orders;
- writes prices or pricing rules;
- deletes drafts or performs bulk destructive actions;
- promotes CRM staging records;
- changes Telegram, VPN, staff, or RBAC configuration;
- triggers paid external checks;
- exposes non-public price book data outside authenticated Riderra users.

## Diagnostics And Observability

Phase 1 should preserve these fields for each agent action:

- `trace_id`
- `idempotency_key`
- actor id and role
- capability name
- source UI/API/webhook
- approval status and approver
- payload hash or payload snapshot where safe
- normalized result
- error details safe for operators

Existing anchors:

- chat/task state and message records;
- admin approvals API;
- order status/history APIs;
- AI Inbox draft source metadata;
- public visibility smoke test.

## Non-Goals

- No autonomous booking confirmation.
- No public full-price-book API.
- No public admin OpenAPI contract.
- No browser-driving contract as a substitute for typed capabilities.
- No provider write support unless the specific provider integration is implemented and approved.
