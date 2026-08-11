# Riderra Architecture

Status: current architecture canon for implementation and operations.
Last reviewed: 2026-08-11.

## System Shape

Riderra is a tenant-aware modular monolith deployed as one Nuxt/Express application plus scheduled operational workers.

```text
Browser / Telegram / Email / external systems
                    |
             Nginx / HTTPS
                    |
       Nuxt 2 SPA + Express API (PM2)
          | routes -> services -> Prisma
          |                |
          |             PostgreSQL
          |
     controlled adapters and runtimes
 Google Sheets, Maps, SMTP, OpenClaw,
 Telegram, public pricing sites, GigaChat
```

The architecture deliberately prefers one deployable application while extracting new domain logic from the legacy composition root into testable routes and services.

## Runtime Components

| Component | Responsibility |
| --- | --- |
| `riderra` PM2 process | Nuxt SPA, Express API, authentication, operational screens and public surface |
| `booking-price-monitor` PM2 process | wakes every five minutes, executes only inside the configured Moscow-time window, records Booking observations and exits |
| PostgreSQL | application state, pricing evidence, CRM, approvals, audit and cached operational data |
| Nginx | TLS termination/reverse proxy and static delivery in production |
| Google Sheets | monthly order master in the current MVP-1 operating model |

## Application Layers

### Presentation

- `pages/*.vue`: task-oriented Nuxt screens.
- `store/index.js`: shared client state.
- `middleware/`: frontend access routing.
- `assets/`, `components/`, `layouts/`, `plugins/`: design and client runtime infrastructure.

### HTTP and policy boundary

- `server/index.js`: composition root, middleware registration and legacy endpoints.
- `server/routes/`: newer bounded HTTP modules such as authentication, complaints, benchmark points and pricing comparisons.
- Authentication middleware resolves a tenant actor, roles and permissions before protected operations.
- Side-effecting integration calls require secrets, idempotency where applicable, and explicit approval for critical actions.

### Domain services

- Order normalization, identity, contacts, monthly sheet views and operational analytics.
- CRM companies, contacts, company-contact relations and segment membership.
- Pricing policies, external quote collection, catalog imports, route/class matching, exports and margin checks.
- Chat task lifecycle, message drafts and inbound classification.
- Public request validation and draft intake.

New logic should be added to a focused service and route module. Further growth of `server/index.js` is technical debt and should be avoided.

## Core Data Domains

| Domain | Important models |
| --- | --- |
| Tenancy and access | `Tenant`, `TenantMembership`, `User`, `Role`, `Permission`, `UserRole` |
| Orders and operations | `Order`, `OrderChangeLog`, `OrderStatusHistory`, `OrderQualitySignal`, `OpsEventDraft`, `OpsEvent`, `OpsTask` |
| Drivers and fleet | `Driver`, `FleetVehicle`, `DriverRoute`, `DriverCityRoute`, `DriverUnavailability` |
| CRM | `CrmCompany`, `CrmContact`, `CustomerCompany`, `CustomerContact` and relation/segment models |
| Pricing | `CityPricing`, `CounterpartyPriceRule`, `CounterpartyDistancePriceRule`, `SupplierPriceRule`, `PriceConflict` |
| External price evidence | `PriceComparisonSource`, `PriceComparisonRun`, `ExternalTransferPriceSnapshot`, catalog, quote, result and mapping models |
| Canonical places | `CanonicalTransferPlace`, aliases, embeddings and `GeoZoneBenchmarkPoint` |
| AI and communication | `ChatTask`, `ChatMessage`, `ChatAgentConfig`, `AgentRun`, `PromptTemplate`, `AiLearningEvent` |
| Safety and traceability | `HumanApproval`, `AuditLog`, `IdempotencyKey` |

All new operational queries and writes must include tenant boundaries.

## Pricing Architecture

The internal Riderra price book and external evidence are separate domains.

```text
Riderra 005 / client rules / supplier rules
                  |
                  +--> internal matrix and margin checks

external source profile --> adapter/catalog importer
        --> immutable snapshot --> place/class mapping
        --> versioned policy --> comparison result/report
```

Installed comparison adapter keys:

- `smart-ryde`, `civitatis`, `booking`, `jamtransfer`;
- `suntransfers`, `transferz`, `talixo`;
- `city-airport-taxis`, `airports-taxi-transfers`, `airporttaxis-com`;
- `mytravelthru`, `mytransfers`, `dottransfers`, `heycars`.

An installed adapter is not a promise that a third-party website will remain scrapeable. Public markup, anti-bot controls and place identifiers are external dependencies; failures must produce `needs_review`, `no_quote` or `failed`, never fabricated prices.

### Booking

Booking has two related but distinct price domains:

1. partner rates configured in the authenticated supplier portal;
2. public selling-price evidence and the Simon benchmark calculation.

The Simon calculation applies sequential deductions (currently BCOM 25%, then PMF 20%) and derives supplier targets at 5/10/20/40/60 km with the workbook-compatible rounding rules. Monitoring writes Booking snapshots and a variance report. Riderra 005 is reference-only for this process and is never a mutation target.

### Matching

Route comparison requires compatible direction, place, vehicle class and currency. Matching uses:

- exact verified benchmark addresses and coordinates;
- persisted source-specific place aliases;
- explicit vehicle maps;
- deterministic text/IATA rules;
- optional GigaChat embeddings as a suggestion layer.

Semantic similarity may recommend a candidate but does not silently approve an ambiguous mapping.

## Order and AI Flow

```text
external payload/email/public form
        -> normalized draft
        -> validation and pricing checks
        -> authorized human review
        -> controlled execution
        -> audit/status history
```

Google Sheets remains the monthly order master. Riderra stores normalized app state, drafts, snapshots and audit context; it must not silently turn a draft into a confirmed booking.

## Security Model

- JWT authentication for users.
- Tenant actor context plus permission checks for protected APIs.
- Webhook-specific secrets for EasyTaxi, OpenClaw and Telegram.
- `HumanApproval` for critical operations.
- `IdempotencyKey` for retry-safe side effects.
- `AuditLog` with actor, trace, decision and result.
- No credentials, cookies or API tokens in pricing source profiles or Codex skills.

## Testing and Delivery

- Node Test Runner covers pricing policies, adapters, matching, exports and focused regressions.
- Smoke scripts cover public AI visibility, structured data, chats, orders and security invariants.
- `update.sh` performs Git fast-forward, dependency installation, Prisma migrations, build/generate, PM2 restart and health verification.
- Production path: `/opt/riderra`; primary process: `riderra`.

## Architectural Constraints and Debt

- Nuxt 2/Vue 2 and an old webpack/Sass toolchain need a planned upgrade, not an opportunistic rewrite.
- `server/index.js` still owns substantial legacy logic and should shrink behind domain modules.
- External pricing adapters require fixtures and operational monitoring because upstream sites change.
- Internal admin APIs do not yet have one complete stable OpenAPI contract.
- Google Sheets remains a deliberate order-master dependency until a later migration is approved.
- Automated communication and price-book writes remain behind human approval.
