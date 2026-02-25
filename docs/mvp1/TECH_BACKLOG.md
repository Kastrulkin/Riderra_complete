# MVP-1 Technical Backlog

## Conventions
- Priority: `P0` critical, `P1` high, `P2` medium.
- Estimate: в story points (`SP`) и ориентировочно по дням.
- Status: `todo` (для старта).
- DoR: есть доступы/API keys/согласованные поля.
- DoD: код + миграции + тесты + логирование + документация.

## EPIC-1: Identity, RBAC, Audit (P0)
Goal: безопасный доступ и полная трассировка действий.

### Story 1.1 User roles and permissions model (P0, 8 SP)
- Task 1.1.1: Спроектировать таблицы `roles`, `permissions`, `role_permissions`, `user_roles`.
- Task 1.1.2: Добавить middleware policy engine (`can(action, resource)`).
- Task 1.1.3: Привязать роли к текущим user accounts и seed default roles.
- Task 1.1.4: Внедрить guards в backend endpoints и Telegram handlers.
Acceptance:
- Любой endpoint возвращает `403` при нарушении матрицы прав.
- Роли из `RBAC_MATRIX.md` покрыты automated tests.

### Story 1.2 Audit log (P0, 5 SP)
- Task 1.2.1: Таблица `audit_logs` (actor, role, action, entity, before/after, channel, ts).
- Task 1.2.2: Унифицированный audit middleware для API.
- Task 1.2.3: Audit events из Telegram и AI approval pipeline.
Acceptance:
- По каждому approve/reject/create/update/delete есть audit запись.

## EPIC-2: Google Sheets Ingestion (P0)
Goal: стабильная и идемпотентная синхронизация заказов.

### Story 2.1 Sheet sources registry (P0, 5 SP)
- Task 2.1.1: Таблица `sheet_sources`.
- Task 2.1.2: UI для добавления monthly sheet (`sheet_id`, month, active).
- Task 2.1.3: Валидация доступа к Google API при сохранении source.
Acceptance:
- Можно активировать/деактивировать источники без деплоя.

### Story 2.2 Sync job and parser (P0, 13 SP)
- Task 2.2.1: Worker job `orders_sheet_sync` (cron/manual trigger).
- Task 2.2.2: Mapping row -> normalized order DTO (date/time/tz validation).
- Task 2.2.3: `external_key + row_hash` для идемпотентности.
- Task 2.2.4: Таблица `order_source_snapshots`.
- Task 2.2.5: Retry strategy + dead-letter queue.
Acceptance:
- Повторный sync не создаёт дублей.
- Некорректные строки попадают в validation errors queue.

### Story 2.3 Order workspace API/UI (P0, 8 SP)
- Task 2.3.1: API list/detail для `orders` + фильтры.
- Task 2.3.2: Страница списка заказов и карточка заказа.
- Task 2.3.3: Timeline (sync events, approvals, messages).
Acceptance:
- Диспетчер видит актуальные заказы и source snapshots.

## EPIC-3: Pricing and Mismatch Control (P0)
Goal: единый internal прайс и контроль расхождений.

### Story 3.1 Price book model and CRUD (P0, 8 SP)
- Task 3.1.1: Таблица `price_book` + versioning fields.
- Task 3.1.2: CRUD API с RBAC (Finance/Owner).
- Task 3.1.3: UI price list (фильтр по городу/маршруту/классу).
Acceptance:
- Создание новой версии прайса не ломает историю.

### Story 3.2 Mismatch engine (P0, 8 SP)
- Task 3.2.1: Сервис compare price (sheet/dispatch vs internal).
- Task 3.2.2: Таблица `price_mismatch_incidents`.
- Task 3.2.3: Правила severity/threshold из config.
- Task 3.2.4: Авто-резолв при выравнивании цен.
Acceptance:
- При расхождении создаётся incident и связывается с заказом.

## EPIC-4: AI Approval Pipeline (P0)
Goal: любой AI action исполняется только после подтверждения.

### Story 4.1 Approval domain (P0, 8 SP)
- Task 4.1.1: Таблица `approval_tasks`.
- Task 4.1.2: Статусы `pending/approved/rejected/failed/executed/expired`.
- Task 4.1.3: API create/list/approve/reject.
- Task 4.1.4: Enforcement hook перед любым outbound action.
Acceptance:
- Невозможно выполнить action без approved task.

### Story 4.2 AI draft adapters (P1, 5 SP)
- Task 4.2.1: Контракт с OpenClaw payload schema.
- Task 4.2.2: Validation confidence + required fields.
- Task 4.2.3: Store AI draft + risk metadata.
Acceptance:
- Draft создаётся в Riderra в нормализованном формате.

## EPIC-5: Telegram Control Plane (P0)
Goal: операционное управление и approvals в Telegram.

### Story 5.1 Telegram auth linking (P0, 5 SP)
- Task 5.1.1: Таблица `telegram_links`.
- Task 5.1.2: Handshake flow `/start` + one-time token.
- Task 5.1.3: Rate limit and replay protection.
Acceptance:
- Только связанный пользователь может выполнять команды.

### Story 5.2 Command handlers (P0, 8 SP)
- Task 5.2.1: `/me`, `/tasks`, `/task <id>`.
- Task 5.2.2: `/approve`, `/reject`.
- Task 5.2.3: `/orders`, `/incidents`, `/order <id>`.
- Task 5.2.4: Inline buttons + role-based visibility.
Acceptance:
- Команды работают в соответствии с RBAC.

## EPIC-6: CRM Lite + Planfix Migration (P0)
Goal: перенести клиентскую базу и начать работу без Planfix.

### Story 6.1 CRM data model (P0, 8 SP)
- Task 6.1.1: Таблицы `customers`, `customer_contacts`, `customer_tags`, `customer_notes`, `customer_consents`, `customer_external_links`.
- Task 6.1.2: API карточки клиента + история заказов.
- Task 6.1.3: Role-scoped access для CRM и outreach.
Acceptance:
- Карточка клиента доступна согласно ролям.

### Story 6.2 Planfix extract and staging (P0, 8 SP)
- Task 6.2.1: Connector/API client или CSV loader для Planfix.
- Task 6.2.2: Stage tables (`planfix_raw_*`).
- Task 6.2.3: Импорт батчами с retry.
Acceptance:
- Данные Planfix загружены в stage без потерь строк.

### Story 6.3 Transform, deduplicate, load (P0, 13 SP)
- Task 6.3.1: Нормализация телефонов/email.
- Task 6.3.2: Dedup rules (phone > email > fallback).
- Task 6.3.3: Manual review queue для конфликтов.
- Task 6.3.4: Load в `customers*` + link на external_id.
Acceptance:
- >=99% валидных контактов мигрировано.
- Source->target reconciliation report сформирован.

### Story 6.4 Cutover and decommission checklist (P1, 5 SP)
- Task 6.4.1: Dry-run + final delta import.
- Task 6.4.2: UAT сценарии для dispatcher/sales.
- Task 6.4.3: Sign-off owner + rollback plan.
Acceptance:
- Команда может работать в Riderra без Planfix для клиентской базы.

## EPIC-7: Observability and Ops (P1)
Goal: устойчивость и поддерживаемость.

### Story 7.1 Metrics and alerts (P1, 5 SP)
- Task 7.1.1: Метрики sync jobs (duration, rows, errors).
- Task 7.1.2: Метрики approval pipeline.
- Task 7.1.3: Alerts в Telegram/monitoring channel.
Acceptance:
- Есть дашборд и алертинг по ключевым сбоям.

### Story 7.2 Runbooks (P1, 3 SP)
- Task 7.2.1: Runbook: sync failure.
- Task 7.2.2: Runbook: migration rollback.
- Task 7.2.3: Runbook: Telegram bot outage.
Acceptance:
- On-call может восстановить сервисы по инструкциям.

## Cross-Epic Technical Tasks
- CT-1: Вынести конфиги в env + secret manager (P0, 3 SP).
- CT-2: Contract tests между Riderra и OpenClaw payload schemas (P1, 3 SP).
- CT-3: E2E smoke tests для critical flows (P0, 5 SP).

## Sprint Allocation
### Sprint 1
- EPIC-1 (1.1, 1.2)
- EPIC-2 (2.1, 2.2, 2.3)
- EPIC-3 (3.1, 3.2)
- EPIC-4 (4.1)
- EPIC-5 (5.1, 5.2 core approvals)
- CT-1, CT-3

### Sprint 2
- EPIC-4 (4.2)
- EPIC-6 (6.1, 6.2, 6.3, 6.4)
- EPIC-5 (extended commands)
- EPIC-7
- CT-2

## Milestones
- M1 (end Sprint 1): Order + Price + Approval + Telegram core live.
- M2 (end Sprint 2): CRM + Planfix migration + cutover readiness.
