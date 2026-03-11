# Riderra x OpenClaw: Chat Orchestration v1

Дата: 2026-03-11  
Статус: Draft for implementation

## 1) SQL-модель (PostgreSQL) для chat orchestration

Ниже модель для внедрения поверх текущих `Order`, `HumanApproval`, `AuditLog`.
`tenant_id` обязателен везде.

```sql
-- 1. Поток задач по чату для заказа
create table if not exists chat_task (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  order_id text not null,
  task_type text not null check (task_type in ('clarification','dispatch_info')),
  state text not null check (
    state in (
      'new_order',
      'missing_data_detected',
      'request_sent',
      'customer_replied',
      'field_validated',
      'field_rejected',
      'order_complete',
      'ready_to_notify',
      'notify_draft',
      'notify_sent',
      'notify_ack',
      'notify_no_reply',
      'esim_offer_ready',
      'esim_offered',
      'converted',
      'declined',
      'handoff_human',
      'closed'
    )
  ),
  priority int not null default 100,
  assigned_to_user_id text null,
  channel text null check (channel in ('telegram','whatsapp','email','sms')),
  customer_actor_id text null,
  openclaw_thread_id text null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, order_id, task_type)
);

create index if not exists idx_chat_task_tenant_state
  on chat_task (tenant_id, state, priority, updated_at desc);

-- 2. Сообщения внутри задачи
create table if not exists chat_message (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  chat_task_id uuid not null references chat_task(id) on delete cascade,
  direction text not null check (direction in ('outbound','inbound','internal')),
  source text not null check (source in ('operator','openclaw','customer','system')),
  channel text null check (channel in ('telegram','whatsapp','email','sms')),
  body_text text not null,
  body_json jsonb null,
  provider_message_id text null,
  confidence numeric(5,4) null,
  approval_status text null check (approval_status in ('pending_human','approved','rejected','expired')),
  trace_id text null,
  idempotency_key text null,
  created_by_user_id text null,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_chat_message_idempotency
  on chat_message (tenant_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_chat_message_task_created
  on chat_message (chat_task_id, created_at desc);

-- 3. События переходов state machine
create table if not exists chat_task_transition (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  chat_task_id uuid not null references chat_task(id) on delete cascade,
  from_state text not null,
  to_state text not null,
  reason text null,
  actor_type text not null check (actor_type in ('operator','openclaw','system')),
  actor_user_id text null,
  trace_id text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_task_transition_task
  on chat_task_transition (chat_task_id, created_at desc);

-- 4. Джобы capability на выполнение в OpenClaw
create table if not exists capability_job (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  chat_task_id uuid null references chat_task(id) on delete set null,
  order_id text not null,
  capability text not null,
  payload jsonb not null,
  approval_mode text not null check (approval_mode in ('required','not_required')),
  status text not null check (status in ('queued','sent','pending_human','approved','rejected','completed','failed')),
  billing_units int not null default 0,
  billing_amount numeric(12,2) null,
  external_ref text null,
  trace_id text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create index if not exists idx_capability_job_tenant_status
  on capability_job (tenant_id, status, created_at desc);

-- 5. Callback ledger от OpenClaw
create table if not exists capability_callback (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  capability_job_id uuid not null references capability_job(id) on delete cascade,
  callback_status text not null check (callback_status in ('pending_human','approved','rejected','completed','failed')),
  payload jsonb not null,
  trace_id text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create index if not exists idx_capability_callback_job
  on capability_callback (capability_job_id, created_at desc);
```

## 2) API-эндпоинты Riderra ↔ OpenClaw

### 2.1 Riderra (control plane) -> OpenClaw (runtime)

1. `POST /internal/openclaw/capability/build`
Назначение: собрать draft сообщения/извлечения.

2. `POST /internal/openclaw/capability/send`
Назначение: отправка draft в канал (только если approval=approved).

3. `POST /internal/openclaw/capability/classify`
Назначение: классифицировать входящий ответ клиента.

4. `POST /internal/openclaw/capability/extract-validate`
Назначение: извлечь поле и вернуть confidence + нормализованное значение.

Headers:
- `X-OpenClaw-Internal-Token`
- `X-Trace-Id`
- `Idempotency-Key`

### 2.2 OpenClaw -> Riderra callbacks

1. `POST /api/internal/openclaw/callback`
Назначение: вернуть результат capability.

Payload envelope:
- `tenant_id`
- `trace_id`
- `idempotency_key`
- `capability_job_id`
- `status` (`pending_human|approved|rejected|completed|failed`)
- `result`
- `billing`

Валидации:
- reject при tenant mismatch
- dedupe по `(tenant_id, idempotency_key)`
- запись в `capability_callback` + `audit_log`

### 2.3 Riderra UI/API для вкладки Чаты

1. `GET /api/admin/chats/tasks?state=&taskType=&assignee=&limit=`
2. `GET /api/admin/chats/tasks/:id`
3. `POST /api/admin/chats/tasks/:id/transition`
4. `POST /api/admin/chats/tasks/:id/draft-message`
5. `POST /api/admin/chats/messages/:id/approve`
6. `POST /api/admin/chats/messages/:id/reject`
7. `POST /api/admin/chats/messages/:id/send`
8. `POST /api/admin/chats/tasks/:id/handoff-human`

## 3) JSON-схемы capability (v1)

Все capability используют единый envelope:

```json
{
  "tenant_id": "uuid",
  "trace_id": "string",
  "idempotency_key": "string",
  "actor": {
    "type": "operator|system",
    "id": "string",
    "role": "string"
  },
  "order_id": "string",
  "capability": "string",
  "approval": {
    "mode": "required|not_required",
    "approval_id": "string|null"
  },
  "billing": {
    "cost_center": "operations",
    "currency": "EUR"
  },
  "payload": {}
}
```

### 3.1 `riderra.order.missing_fields.detect`

Request `payload`:

```json
{
  "order_snapshot": {
    "flight_number": null,
    "pickup_time": "2026-03-11T14:30:00+03:00",
    "pickup_address": "",
    "luggage": null,
    "from": "LHR",
    "to": "London"
  },
  "required_fields": ["flight_number", "pickup_address", "luggage"]
}
```

Response `result`:

```json
{
  "missing_fields": ["flight_number", "pickup_address", "luggage"],
  "critical_block": "flight_number",
  "confidence": 0.98
}
```

### 3.2 `riderra.customer.message.compose`

Request `payload`:

```json
{
  "task_type": "clarification|dispatch_info",
  "language": "ru",
  "channel": "telegram|whatsapp",
  "goal": "ask_missing_field|send_driver_info|offer_esim",
  "context": {
    "customer_name": "string",
    "driver_name": "string",
    "driver_phone": "string",
    "esim_url": "https://..."
  }
}
```

Response `result`:

```json
{
  "draft_text": "string",
  "machine_json": {
    "cta": "string",
    "requested_fields": ["flight_number"]
  },
  "guard_flags": []
}
```

### 3.3 `riderra.customer.reply.classify`

Response `result`:

```json
{
  "class": "answer|question|negative|irrelevant",
  "confidence": 0.91,
  "requires_human": false
}
```

### 3.4 `riderra.order.field.extract_validate`

Response `result`:

```json
{
  "field": "flight_number",
  "value_raw": "SU 245",
  "value_normalized": "SU245",
  "valid": true,
  "confidence": 0.87,
  "error_code": null
}
```

## 4) UI-спека вкладки Чаты

Цель: быстро обрабатывать 2 потока:
1. `clarification` (нужно уточнить)
2. `dispatch_info` (всё ясно, отправить данные водителя и ссылку eSIM)

### 4.1 Layout

1. Левая колонка (queue):
- карточки задач
- бейджи `state`, `task_type`, SLA
- фильтры: `Нужно уточнение`, `Готово к рассылке`, `Нужно одобрение`, `Низкая уверенность`

2. Центр (conversation):
- таймлайн сообщений
- входящие/исходящие
- confidence и source (`operator|openclaw|customer`)

3. Правая колонка (actions):
- `Сгенерировать черновик`
- `Одобрить`
- `Отклонить`
- `Отправить`
- `Передать человеку`
- `Закрыть задачу`

### 4.2 Правила блокировок

1. `send` заблокирован, если:
- `approval_status != approved`
- нарушен throttle
- не заполнены обязательные поля для task

2. `esim_offer` доступен только если:
- `order_complete = true`
- нет открытых critical missing fields

3. Авто-эскалация в `handoff_human`, если:
- `confidence < threshold`
- клиент негативный/конфликт
- 2+ безуспешных follow-up

### 4.3 State-модель для task_type

`clarification`:
- `missing_data_detected -> request_sent -> customer_replied -> field_validated|field_rejected -> order_complete -> closed`

`dispatch_info`:
- `ready_to_notify -> notify_draft -> notify_sent -> notify_ack|notify_no_reply -> closed`

## 5) Внедрение по спринтам

1. Sprint 1:
- SQL-таблицы `chat_task`, `chat_message`, `chat_task_transition`
- API вкладки `Чаты` + ручной approve/send
- capability `compose`, `send` через OpenClaw

2. Sprint 2:
- capability `classify`, `extract_validate`
- auto-transition по входящим ответам
- throttle + anti-spam + escalation

3. Sprint 3:
- `dispatch_info` поток
- eSIM upsell только после `order_complete`
- learning loop по правкам операторов

