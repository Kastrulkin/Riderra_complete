# PRD: Riderra AI-First Operations MVP-1

## 1. Goal
Создать операционное ядро Riderra для диспетчеров/операторов/менеджмента, где:
- заказы синхронизируются из Google Sheets (master source),
- цены унифицируются по внутреннему прайсу Riderra,
- все AI-действия выполняются только через подтверждение,
- управление возможно из Telegram,
- заложена миграция клиентов из Planfix в Riderra CRM.

## 2. Fixed Decisions
- Master source заказов: Google Sheets (каждый месяц новый файл, настраиваемый через UI).
- Final truth по цене: internal Riderra price book.
- Telegram доступен всем ролям (RBAC-ограничения по командам/действиям).
- Режим AI на старте: `Draft -> Approval -> Execute`.
- OpenClaw: внешний компонент (интеграционный контракт обязателен).

## 3. Scope (MVP-1)
### In Scope
- Импорт/синхронизация заказов из Google Sheets в Riderra.
- Витрина заказов в личном кабинете сотрудников.
- Price Book (внутренний прайс) + детектор расхождений с источниками.
- Approval pipeline для AI-действий.
- Telegram бот: задачи на подтверждение, алерты, оперативные команды.
- Базовая CRM клиентов (карточка + история поездок + сегмент + доступы).

### Out of Scope (MVP-1)
- Полная автономия AI без подтверждения.
- Глубокая BI-аналитика и сложные авто-кампании.
- Полный перенос всех Planfix артефактов (задачи/проекты/кастомные процессы).

## 4. Users and Roles
- Owner/Admin
- Dispatcher
- Operator
- Sales/CRM
- Finance/Pricing
- Audit

Детально: `RBAC_MATRIX.md`.

## 5. Functional Requirements
### FR-1. Google Sheets Orders Sync
- Система хранит список monthly sheets (`sheet_id`, `month`, `status`, `is_active`).
- Поддержка множественных файлов (текущий/архив).
- Инкрементальная синхронизация по `row_hash` и `last_seen_at`.
- Идемпотентность: повторный проход не дублирует заказ.
- Source-of-truth правило: поля, помеченные `sheet_owned`, не перезаписываются из Riderra вручную без explicit override.

### FR-2. Orders Workspace
- Список заказов с фильтрами: дата, город, статус, источник, конфликт цены.
- Карточка заказа: timeline, source snapshots, approvals, communication log.
- SLA маркеры: new/pending/needs-info/confirmed/escalated/completed/cancelled.

### FR-3. Internal Price Book
- Сущность тарифа: город, маршрут/класс, валюта, версия, effective_from.
- Источники сравнений: driver sheets, dispatch/EasyTaxi reference, order quoted price.
- Правило расчёта расхождения: abs/percent threshold + severity.

### FR-4. Price Mismatch Monitoring
- Инциденты расхождений в отдельной очереди.
- Статусы: open/in_review/approved_fix/rejected/resolved.
- Уведомления в Telegram и в кабинете.

### FR-5. AI Approval Pipeline
- Любое действие AI создаёт `ApprovalTask`.
- Выполнение только после `approved_by` валидной роли.
- Audit trail: кто создал draft, кто подтвердил, что было отправлено.

### FR-6. CRM Lite
- Карточка клиента: контактные данные, consent, язык, сегмент, примечания.
- Привязка заказов к клиенту.
- Ограниченный доступ к outreach функциям.

### FR-7. Telegram Operations
- Авторизация пользователя Telegram к аккаунту сотрудника Riderra.
- Команды: список задач, подтверждение/отклонение, инциденты, смена статуса заказа.
- Inline-approval для AI-драфтов.

### FR-8. OpenClaw Integration Contract
- Riderra публикует API для:
  - create draft from email,
  - request missing fields,
  - prepare whatsapp message draft,
  - driver incident checklist assistant.
- OpenClaw возвращает structured payload + confidence + required approvals.

## 6. Non-Functional Requirements
- Security: RBAC, audit log, secret management, PII controls.
- Reliability: retry queues, dead-letter queue для sync jobs.
- Observability: metrics + trace + error alerts.
- Performance: загрузка списка заказов < 2s при 10k строк.
- Data quality: валидация даты/времени, timezone, дублей.

## 7. Data Model (MVP core)
- `sheet_sources`
- `orders`
- `order_source_snapshots`
- `price_book`
- `price_mismatch_incidents`
- `customers`
- `approval_tasks`
- `audit_logs`
- `telegram_links`

## 8. Acceptance Criteria (MVP-1)
- Подключён минимум 1 monthly Google Sheet, данные читаются и обновляются по расписанию.
- Заказ из Sheet отображается в Riderra с корректным статусом и источником.
- При конфликте цены создаётся incident с уведомлением.
- AI-драфт нельзя исполнить без explicit approval.
- Telegram-пользователь видит только разрешённые команды по роли.
- Есть импорт базовых клиентов из Planfix и проверка объёмов (source vs target counts).

## 9. Risks
- Нестабильность структуры Google Sheets.
- Проблемы качества/дублей в Planfix экспорте.
- Неверные AI-рекомендации при неполных данных.

## 10. Dependencies
- Доступ к Google API service account.
- Доступ к Planfix API/экспорту.
- OpenClaw API contract (в соседнем потоке).
- WhatsApp API provider (для этапа после MVP-1).
