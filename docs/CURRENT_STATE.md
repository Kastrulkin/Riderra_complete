# Riderra Current State

Status: production snapshot; update when a material release changes architecture or operating boundaries.
Repository review date: 2026-08-25.
Repository revision at review: `8698d23` (includes the reviewed application and operational changes below).
Production revision was not re-verified during this documentation pass.

## Production

- Main application: online under PM2 as `riderra`.
- Booking monitor: registered under PM2 with `*/5 * * * *`; it normally remains stopped between one-shot executions.
- Application directory: `/opt/riderra`.
- Database: PostgreSQL, one active tenant.
- Deployment: `update.sh`, Nginx and PM2.

## Data Snapshot

These numbers were last verified on 2026-08-11. They are diagnostic context, not product limits:

| Entity | Count |
| --- | ---: |
| Users | 10 |
| Orders | 121,052 |
| Drivers | 17 |
| CRM companies | 5,180 |
| CRM contacts | 1,008 |
| Customer companies | 5,200 |
| Base city-pricing rows | 4,543 |
| Supplier price rules | 213 |
| External comparison sources | 14 |
| Comparison runs | 28 |
| Immutable external price snapshots | 58,048 |
| Benchmark points | 2,022 |
| Audit log records | 10,845 |

Counts change during normal operations. Query production rather than relying on this table for an operational decision.

## Capability State

### Stable enough for daily use

- staff authentication, tenant RBAC and operational admin screens;
- monthly order reads from configured Google Sheets;
- driver, fleet, route and order operations;
- CRM companies, contacts and company-contact relations;
- base, client and supplier pricing views;
- Booking partner-rate storage and separate Simon calculation workspace;
- audit logging and human-approval records;
- public website and public draft-request API.

### Beta / operationally supervised

- external public-price crawling and catalog imports across 23 adapter contracts in the current codebase;
- automatic place and vehicle-class matching;
- GigaChat embedding suggestions for canonical places;
- AI Inbox extraction and validation;
- OpenClaw/WhatsApp communication runtime;
- automated variance notifications and pricing recommendations.

### Deliberately not autonomous

- confirmed public bookings;
- outbound customer/supplier messages without approval;
- internal price-book mutations from external comparisons;
- CRM promotion, destructive bulk operations and role changes;
- paid external verification without explicit authorization.

## Pricing State

- The codebase supports 23 adapter keys: `smart-ryde`, `civitatis`, `booking`, `jamtransfer`, `suntransfers`, `transferz`, `talixo`, `city-airport-taxis`, `mytravelthru`, `mytransfers`, `airports-taxi-transfers`, `airporttaxis-com`, `dottransfers`, `heycars`, `waug`, `iway`, `intui`, `kiwitaxi`, `jayride`, `worldtransfer`, `airport-transfer-portal`, `global-airport-taxi` and `transferise`.
- Fourteen active source profiles were last verified in production on 2026-08-11. Adapter support in code and configured production profiles are intentionally reported separately.
- Historical snapshots are retained; runs do not overwrite prior evidence.
- Exact addresses, coordinates, canonical aliases and benchmark points are used to expand route coverage.
- Missing external coverage is a commercial signal and is represented as `no_quote`/coverage opportunity, not as a zero price.
- Ambiguous routes, currencies and vehicle classes remain `needs_review`.
- Booking calculations and monitoring are separate from Riderra 005. The monitor may compare against 005 for context, but its payload is a Booking observation report and cannot target 005 rows for mutation.

## Changes Since The 2026-08-11 Snapshot

- Added adapter contracts for Waug, iWay, Intui, Kiwitaxi, Jayride, WorldTransfer, Airport Transfer Portal, Global Airport Taxi and Transferise.
- Added public-price visibility in the internal price book, route-mapping progress and direct pricing guide links.
- Improved Booking calculation UX, full-airport loading, priority-location monitoring, price-movement history, morning report readability and stale-date/recent-order handling.
- Added staff access selection by work area and fixed preservation of unsaved access choices.
- Completed private Telegram linking and added routing for operational bot notifications.
- Improved pricing-screen performance, sticky admin navigation, general UI interactions and automatic Yandex Metrika pageviews.
- Recorded reviewed operational price imports and supplier updates for Rovaniemi, Copenhagen, Krakow and Saint Petersburg as auditable scripts. A committed script is evidence of the operation, not proof that every script was applied to production; verify the target database before relying on it.
- Added stricter idempotency-key payload matching, approval-payload binding, approval expiry handling and centralized driver-commission validation. The focused tests, pricing suite, isolated PostgreSQL security smokes and static build passed on 2026-08-25; production deployment was not performed during this cleanup.

## Immediate Engineering Priorities

1. Reconcile configured production source profiles with the 23 adapter contracts supported by code.
2. Continue reducing unresolved external place/class mappings without auto-approving ambiguous matches.
3. Add freshness and coverage dashboards per external source.
4. Review and deploy the committed idempotency/approval/commission hardening through the normal release process, then verify production behavior.
5. Expand contract tests and fixtures when provider sites change.
6. Extract more legacy API logic from `server/index.js`.
7. Plan the Nuxt 2/Vue 2 and dependency-security upgrade as a controlled migration.
