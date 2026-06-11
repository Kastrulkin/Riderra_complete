# Riderra Product Canon

Status: canonical product context for humans and AI agents.
Last reviewed: 2026-06-11.

## What Riderra Is

Riderra is an operations system for private passenger transfers. It combines a public transfer booking surface, an internal operator console, Google Sheets based monthly order intake, AI Inbox draft processing, driver and counterparty price books, Telegram-assisted operations, and supervised AI workflows.

Riderra is not a fully autonomous booking or dispatch agent. It is a supervised operating layer where AI may prepare, validate, compare, classify, draft, and propose actions, while Riderra keeps human approval, pricing truth, order truth, role-based access, and audit boundaries.

## Primary Users

- Operators and dispatchers: review orders, clarify missing data, prepare customer and driver messages, and move approved data from drafts into operational order flows.
- Financial users: manage pricing, archive months, compare revenue, risks, incidents, and driver/counterparty economics.
- Owners and admins: configure monthly sheet sources, roles, AI agents, integrations, VPN access, pricing sources, and critical workflow policies.
- Drivers and suppliers: receive operational trip details and provide route coverage or service execution.
- Public customers and external AI agents: submit draft transfer requests through the public website or public draft-request API.

## Sources Of Truth

- Orders, MVP-1: Google Sheets remain the operational source of truth. Riderra reads monthly sheets into the app; humans may continue editing the sheet.
- Monthly order model: each month has a dedicated Google Sheet source configured in Riderra.
- Current working table: configured by the month/source UI, not hardcoded.
- Prices: the internal Riderra price book is the final source of truth.
- External price files, EasyTaxi, dispatch sheets, and driver sheets are comparison sources only.
- AI Inbox: staging area for email-derived order drafts, changes, and cancellations before human approval.
- Public information: Riderra-owned public pages, `/llms.txt`, `/api/public/*`, and `/api/public/openapi.json`.

## What Riderra Should Promise

- Collect and normalize transfer requests.
- Keep monthly operational order views aligned with configured Google Sheets.
- Let humans review AI Inbox drafts before creating or changing orders.
- Compare trip prices against the internal Riderra price book.
- Show counterparty and supplier price lists in comparable matrix views.
- Draft customer, driver, and operational messages for human review.
- Keep risky operations under explicit approval.
- Record enough context for audit, support, and incident investigation.

## What Riderra Must Not Promise

- No autonomous confirmed bookings from public AI-agent requests.
- No final public price quote without Riderra review.
- No autonomous outbound customer or supplier communication without approval.
- No destructive order, pricing, CRM, or role changes without a responsible human action.
- No claim that every internal API is public, stable, or safe for external agents.
- No public exposure of the full internal price book.

## AI Execution Model

Riderra uses the pattern:

1. Draft: AI extracts, normalizes, classifies, compares, or composes.
2. Approval: an authorized human reviews the proposed action.
3. Execute: Riderra performs the action through a typed capability or internal workflow.
4. Audit: Riderra records actor, payload, decision, outcome, and trace data.

AI agents should interact with Riderra as a capability system, not as an unrestricted UI automation target.

## Human Approval Boundary

Human approval is required for:

- sending messages to customers, drivers, suppliers, or public channels;
- creating, changing, cancelling, or closing operational orders;
- closing or archiving months;
- changing price book rows or approved pricing rules;
- destructive bulk actions;
- CRM promotion or migration actions;
- payment, billing, or financially material decisions;
- role, VPN, Telegram, or access-control changes.

AI may prepare drafts, checks, recommendations, and structured payloads for these operations.

## Product Screens For Agents And Humans

- `pages/admin-ai-inbox.vue`: email-derived order/change/cancellation drafts.
- `pages/admin-orders.vue`: current monthly orders from configured sheet source.
- `pages/admin-order-archive.vue`: closed month archive.
- `pages/admin-order-analytics.vue`: monthly and operational analytics.
- `pages/admin-pricing.vue`: base price book, client prices, supplier prices, risks, fines.
- `pages/admin-agents.vue`: AI agent configuration and dry-run testing.
- `pages/admin-ai-requests.vue`: public AI-agent draft transfer requests.
- `pages/admin-chats.vue`: supervised customer/driver communication workflows.
- `pages/admin-settings.vue`: monthly sheet sources and operational settings.
- `pages/admin-crm.vue`: CRM migration and company/contact data.

## Public AI Visibility

Public AI agents should use:

- `/llms.txt`
- `/api/public/riderra-profile`
- `/api/public/services`
- `/api/public/pricing-hints`
- `/api/public/source-truth`
- `/api/public/order-request-schema`
- `/api/public/openapi.json`
- `/ai`, `/services`, `/prices`, `/contact`, `/faq`, `/sources`

Public agents may create draft requests only. Draft requests are not confirmed bookings.

## Internal AI Visibility

Internal or neighboring agents should begin from:

- `AGENTS.md`: project agreements, roles, and operational constraints.
- `PRODUCT.md`: product canon.
- `docs/AGENT_REGISTRY_V1.md`: capability and safety model.
- `docs/use-cases.md`: current and planned AI-relevant workflows.
- `docs/integrations.md`: integration map and source-of-truth boundaries.
- `docs/RIDERRA_CHAT_AGENT_RUNTIME_V1.md`: implemented chat-agent runtime notes.
- `docs/RIDERRA_OPENCLAW_CHAT_ORCHESTRATION_V1.md`: chat orchestration contract.
- `docs/contracts/riderra-openclaw/PHASE1.md`: recommended external capability contract.
