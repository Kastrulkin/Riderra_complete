# Riderra Integrations

Status: current integration map for humans and neighboring AI agents.
Last reviewed: 2026-08-11.

## Source-Of-Truth Rules

- Google Sheets are the source of truth for MVP-1 monthly orders.
- Riderra PostgreSQL is the app state store for drafts, AI Inbox, users, roles, CRM, pricing, approvals, and audit-related records.
- Internal Riderra price book is the final source of truth for Riderra selling prices.
- Booking partner rates, Booking public prices, customer agreements and supplier rules remain separate price domains.
- Public Riderra pages and `/api/public/*` are the public source of truth for external AI agents.
- External integrations may provide evidence, payloads, or comparison data, but they do not override Riderra policy without approval.

## Integrations

| Integration | Status | Direction | Purpose | Agent boundary |
| --- | --- | --- | --- | --- |
| Google Sheets monthly order source | available | read into Riderra | current and monthly order operations | Human-configured source; sheet remains master. |
| Google Sheets public/reference price files | internal | import/compare | price list input and checks | Comparison/import source only. |
| Google Maps API | beta | Riderra -> Google | address validation | Validation signal only; show match/mismatch clearly. |
| GigaChat Embeddings | beta, optional | Riderra -> GigaChat | semantic suggestions for canonical transfer places | Suggestion layer only; confidence/margin gates and human review remain authoritative. |
| Gmail forwarding / email ingest | receiver available; bridge ready to install | email -> Riderra | AI Inbox order/change/cancellation drafts | Creates drafts only. Gmail delivery requires the Apps Script bridge in `docs/integrations/gmail-ai-inbox-bridge.md`. |
| EasyTaxi webhook | available | EasyTaxi -> Riderra | operational order payloads | Authenticated webhook; no public write access. |
| OpenClaw runtime | available | Riderra <-> OpenClaw | draft building, classification, extraction, message send runtime | Must use validated envelope and approval policy. |
| Telegram bot | available | Riderra <-> Telegram | operator/driver notifications and commands | RBAC-restricted. |
| WhatsApp runtime | beta | Riderra -> runtime/provider | customer messaging | Human approval before outbound send. |
| Planfix CSV export | internal | CSV -> Riderra CRM staging | CRM migration | Promote only after approval. |
| Public AI API | available | external agent -> Riderra | create draft transfer requests | Draft only, not a confirmed booking. |
| Public SEO/AI pages | available | Riderra -> web/search/agents | public product understanding | Public source; no internal price book exposure. |
| External transfer pricing sites | beta | sites -> Riderra | public quote evidence and coverage research | Immutable snapshots; no bookings and no automatic price-book writes. |
| Booking supplier portal | internal | Booking <-> Riderra operator | agreed/fixed/distance partner rates | Stored as Booking working rates; separate from Riderra 005. |

## External Pricing Sources

The comparison engine has installed profiles/adapters for SmartRyde, Civitatis, Booking, JamTransfer, Suntransfers, Transferz, Talixo, City Airport Taxis/Airport Taxi Transfers, AirportTaxis.com, MyTravelThru, MyTransfers, DotTransfers and HeyCars.

Installed means the Riderra contract and parser/catalog path exist. Live collection remains beta because third-party markup, identifiers, authentication and anti-bot behavior can change. Failed or ambiguous evidence must remain `failed`, `no_quote` or `needs_review`.

## Public AI Endpoints

- `GET /llms.txt`
- `GET /api/public/riderra-profile`
- `GET /api/public/services`
- `GET /api/public/pricing-hints`
- `GET /api/public/source-truth`
- `GET /api/public/order-request-schema`
- `GET /api/public/openapi.json`
- `POST /api/public/order-requests/validate`
- `POST /api/public/order-requests`
- `GET /api/public/order-requests/{requestId}/status`

## Internal Agent-Relevant APIs

These APIs are authenticated and RBAC-protected. They are not public integration promises.

- AI Inbox: `/api/admin/ops/drafts*`, `/api/internal/ops/email-draft`, `/api/webhooks/openclaw/order-draft`.
- Orders: `/api/admin/orders*`, `/api/admin/orders-sheet-view`, `/api/admin/orders/months/*`.
- Archives and analytics: `/api/admin/economics/*`, `/api/admin/order-stats`.
- Pricing: `/api/admin/pricing/*`, including comparison sources/runs, immutable quotes, benchmark points, Booking calculation and monitoring schedule.
- Chat agents and tasks: `/api/admin/chats*`, `/api/admin/ai-agents*`, `/api/business/:businessId/ai-agents*`.
- Approvals: `/api/admin/approvals*`.
- CRM: `/api/admin/crm/*`.
- Telegram/VPN/staff: `/api/admin/telegram-links`, `/api/admin/vpn/*`, `/api/admin/staff-users*`.

## Known Gaps

- No general public MCP server contract is confirmed.
- No complete public OpenAPI exists for all internal admin APIs.
- Paid flight verification is intentionally not part of the current autonomous flow.
- Support export / incident bundle for AI actions is not yet a stable external contract.
- Multi-tenant external-agent contract should be treated as planned unless explicitly implemented.
- External pricing freshness and completeness vary by source; the database records evidence, not a guarantee of current availability.
