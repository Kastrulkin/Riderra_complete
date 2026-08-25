# Riderra AI-Relevant Use Cases

Status labels:

- available: implemented enough to use in the product.
- beta: implemented but still operationally fragile or incomplete.
- internal: usable by admins/operators only.
- planned: desired capability, not production-ready.

## Public Discovery And Draft Requests

| Use case | Status | Agent boundary |
| --- | --- | --- |
| Understand what Riderra does | available | Use `/llms.txt`, `/api/public/riderra-profile`, `/services`, `/faq`. |
| Submit a public transfer request draft | available | `POST /api/public/order-requests`; draft only, not confirmed booking. |
| Validate a public request before submit | available | `POST /api/public/order-requests/validate`; no side effect. |
| Check public draft status | available | `GET /api/public/order-requests/{requestId}/status`; contact verification required. |
| Quote final price publicly | planned | Not allowed. Final price requires Riderra review. |

## AI Inbox And Email Intake

| Use case | Status | Agent boundary |
| --- | --- | --- |
| Ingest email-derived order draft | available | System-authenticated ingest creates draft only. |
| Show source email timestamp/sender | available | Display source as email metadata, not raw parser type. |
| Normalize order fields for table view | available | Draft data should match operational table columns. |
| Validate addresses with Google Maps | beta | Show clear match/mismatch signal; do not overwrite without approval. |
| Validate price against Riderra price book | beta | Distinguish missing price rule from price mismatch. |
| Promote draft into order flow | available | Human approval required. |
| Reject/remove stale drafts | available | Human approval required, supports selected bulk removal. |

## Monthly Orders

| Use case | Status | Agent boundary |
| --- | --- | --- |
| Configure active monthly Google Sheet | available | Settings/admin action; sheet remains source of truth. |
| Read monthly orders into Riderra | available | Sync from configured sheet. |
| Sort/filter operational order table | available | UI behavior only. |
| Close month into archive | available | Owner/financial approval only. |
| Change or cancel order | available | Human approval and responsible notification required. |
| Paid flight verification | planned | Do not run paid checks unless explicitly approved. |

## Pricing And Economics

| Use case | Status | Agent boundary |
| --- | --- | --- |
| Read base Riderra price book | available | Internal authenticated read. |
| Compare client prices in matrix view | available | Read/comparison only unless pricing admin approves edits. |
| Compare supplier prices in matrix view | available | Read/comparison only unless pricing admin approves edits. |
| Run external client price comparison | beta | Twenty-three adapter contracts are supported in code; configured production profiles may be fewer. A pricing manager starts collection and approves ambiguous place/class mappings. Results and Excel exports never update the Riderra price book automatically. |
| Reuse external public transfer quotes | beta | Search immutable historical snapshots by source, route, class, currency and freshness. Public sell prices are market evidence, not confirmed supplier net rates or availability. |
| Review public prices inside the price book | available | Internal pricing users may inspect captured client prices and open source-specific operating guides; this remains read/comparison context. |
| Review route-mapping progress | available | Show completed, unresolved and review-needed mappings without auto-approving ambiguous routes. |
| Treat missing external coverage as an opportunity | available | `no_quote` is a coverage signal; it must remain distinct from a zero price and from a technical failure. |
| Maintain canonical benchmark places | beta | Exact addresses, coordinates, zones, aliases and IATA are stored; uncertain matches remain reviewable. |
| Suggest place mappings with embeddings | beta | GigaChat similarity may rank candidates but cannot approve an ambiguous mapping on its own. |
| Review Booking partner rates | available | Fixed and distance-based Booking working rates are separate from Riderra 005. |
| Calculate Simon Booking targets | available | Public Booking points at 5/10/20/40/60 km apply versioned BCOM/PMF rules with workbook-compatible rounding. |
| Schedule Booking selling-price monitoring | available | Monitoring creates Booking observations/variance reports. Riderra 005 is reference-only and is not a mutation target. |
| Review Booking price movements | available | Priority-location monitoring keeps comparable history and produces a concise morning report; stale dates and missing recent-order context are guarded by regression tests. |
| Edit base price book | available | Pricing admin approval required. |
| Suggest Riderra price corrections | beta | Draft suggestion only; no autonomous write. Booking monitoring does not create 005 mutations. |
| Import external price files | internal | Treat as comparison/import source, not final truth. |
| Explain price mismatch | beta | Distinguish no rule, matched, mismatch, currency/class/route ambiguity. |

## Communication And Chat Agents

| Use case | Status | Agent boundary |
| --- | --- | --- |
| Detect missing fields | available | AI may classify and prepare task state. |
| Compose clarification message | available | Draft only until approved. |
| Send customer or driver message | available | Human approval required. |
| Classify inbound reply | available | Internal workflow; should store confidence and trace. |
| Apply inbound update to order | beta | Human approval required. |
| Fully autonomous communication | planned | Not allowed in current operating policy. |

## CRM And Operations

| Use case | Status | Agent boundary |
| --- | --- | --- |
| Read CRM companies/contacts | available | Authenticated internal read. |
| Promote Planfix CSV staging data | internal | Human approval required. |
| Manage driver/fleet records | available | RBAC-protected. |
| Manage Telegram links | available | Admin approval required. |
| Route operational Telegram notifications | available | Notifications use the approved private link and operational routing policy. |
| Assign staff access by work area | available | Admin action; unsaved selections remain local until explicitly saved. |
| Manage VPN access | available | Admin approval required. |

## Observability

| Use case | Status | Agent boundary |
| --- | --- | --- |
| Audit human approvals | available | `HumanApproval`/admin approvals API. |
| Read action/status history | beta | Order status and chat task history available in focused screens. |
| Export support bundle | planned | Desired for neighboring agents; not a public promise yet. |
| Public AI visibility smoke test | available | `npm run smoke:public-ai-visibility`. |
