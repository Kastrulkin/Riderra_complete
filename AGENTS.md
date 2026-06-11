# AGENTS.md

## Project Agreements

### AI-Readable Canon
- Product canon: `PRODUCT.md`.
- Agent capability registry: `docs/AGENT_REGISTRY_V1.md`.
- AI-relevant use cases and status labels: `docs/use-cases.md`.
- Integration map and source-of-truth boundaries: `docs/integrations.md`.
- Neighbor-agent / OpenClaw contract: `docs/contracts/riderra-openclaw/PHASE1.md`.
- Public AI visibility is exposed through `/llms.txt`, `/api/public/openapi.json`, `/api/public/riderra-profile`, `/api/public/source-truth`, and checked with `npm run smoke:public-ai-visibility`.

### Product and Operations
- Orders source of truth: Google Sheets.
- Monthly model: a new Google Sheet each month; source is configured via a dedicated field/UI.
- Riderra sync direction for orders in MVP-1: read from Sheets into Riderra.
- Human may keep editing the Google Sheet; Sheet remains master.

### Pricing
- Final source of truth for prices: internal Riderra price book.
- External prices (dispatch/EasyTaxi/driver sheets) are comparison sources only.
- Any AI-proposed price change must go through approval.

### AI Execution Policy
- Initial mode: all AI actions are `Draft -> Approval -> Execute`.
- No autonomous outbound communication or critical updates without explicit approval.

### Roles (startup baseline)
- `owner`: demyanov@riderra.com (Александр Демьянов)
- `financial`: shilin@riderra.com (Михаил Шилин)
- `operator`, `dispatcher`: bellavitomatern@gmail.com (Елизавета Матерн)
- `audit`, `pricing_admin`: donaudeka@gmail.com (Екатерина Гафарова)
- `operator`, `dispatcher`: farzalievaas@gmail.com (Алёна Фарзалиева)
- `operator`, `dispatcher`: iproms17@gmail.com (Алёна Малкова)
- `audit`, `operator`, `dispatcher`: maksmaps123332@gmail.com (Максим Шилков)
- `operator`, `dispatcher`: svetlana.iqtour@gmail.com (Светлана Козыревская)
- `operator`, `dispatcher`: samya7098@gmail.com (Яссер Хагаг)

### Channels
- Telegram is used by all roles; command access is restricted by RBAC.

### CRM Migration
- Planfix is being phased out.
- Customer data migration target: Riderra PostgreSQL CRM tables.
- Input format approved for migration: CSV exports from Planfix.
