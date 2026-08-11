# Riderra Current State

Status: production snapshot; update when a material release changes architecture or operating boundaries.
Snapshot date: 2026-08-11.
Production revision at review: `f749542`.

## Production

- Main application: online under PM2 as `riderra`.
- Booking monitor: registered under PM2 with `*/5 * * * *`; it normally remains stopped between one-shot executions.
- Application directory: `/opt/riderra`.
- Database: PostgreSQL, one active tenant.
- Deployment: `update.sh`, Nginx and PM2.

## Data Snapshot

These numbers are diagnostic context, not product limits:

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

- external public-price crawling and catalog imports;
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

- 14 external comparison source profiles are installed.
- Historical snapshots are retained; runs do not overwrite prior evidence.
- Exact addresses, coordinates, canonical aliases and benchmark points are used to expand route coverage.
- Missing external coverage is a commercial signal and is represented as `no_quote`/coverage opportunity, not as a zero price.
- Ambiguous routes, currencies and vehicle classes remain `needs_review`.
- Booking calculations and monitoring are separate from Riderra 005. The monitor may compare against 005 for context, but its payload is a Booking observation report and cannot target 005 rows for mutation.

## Immediate Engineering Priorities

1. Continue reducing unresolved external place/class mappings without auto-approving ambiguous matches.
2. Add freshness and coverage dashboards per external source.
3. Expand contract tests and fixtures when provider sites change.
4. Extract more legacy API logic from `server/index.js`.
5. Plan the Nuxt 2/Vue 2 and dependency-security upgrade as a controlled migration.
6. Keep architecture, integration and production-state documents synchronized with material releases.
