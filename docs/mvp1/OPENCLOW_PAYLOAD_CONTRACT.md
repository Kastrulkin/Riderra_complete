# OpenClaw <-> Riderra Runtime Contract (Required)

## Why needed
Riderra и OpenClaw должны обмениваться строго-валидируемыми runtime payload-ами для build/send/classify/extract без дрейфа схемы между релизами.

## Version discipline
- Current required version: `1.0.0`
- Field `contract_version` is mandatory in every request and every response.
- Riderra rejects:
  - request without `contract_version`
  - request with unsupported `contract_version`
  - response from OpenClaw without `contract_version`
  - response from OpenClaw with unsupported `contract_version`
- Supported versions are enforced in code by `server/openclaw_contract.js`.

## Request envelope
```json
{
  "contract_version": "1.0.0",
  "tenant_id": "riderra",
  "trace_id": "uuid",
  "idempotency_key": "uuid-or-stable-key",
  "actor": {
    "id": "user-or-system-id",
    "role": "staff | system | owner | dispatcher"
  },
  "capability": "riderra.customer.message.compose",
  "approval": {
    "mode": "human_required | approved | not_required"
  },
  "billing": {
    "mode": "track_only",
    "unit": "message | classification | extraction"
  }
}
```

## Supported capabilities
### `riderra.customer.message.compose` (`build`)
```json
{
  "task": {"id":"", "type":"clarification", "state":"missing_data_detected", "channel":"telegram"},
  "order": {
    "id":"",
    "external_key":"",
    "route_from":"",
    "route_to":"",
    "client_price": 0,
    "status":"draft",
    "needs_info": true,
    "info_reason":"Уточнить багаж"
  },
  "agent": {
    "id":"",
    "code":"clarification_default",
    "name":"Clarification Agent",
    "prompt":"..."
  },
  "conversation_history": [],
  "input":"optional operator hint"
}
```

### `riderra.customer.message.send` (`send`)
```json
{
  "task": {"id":"", "type":"clarification", "state":"ready_to_notify", "channel":"telegram"},
  "order": {"id":"", "external_key":"", "route_from":"", "route_to":""},
  "message": {"id":"", "channel":"telegram", "text":"..."}
}
```

### `riderra.customer.reply.classify` (`classify`)
```json
{
  "task": {"id":"", "type":"clarification", "state":"request_sent"},
  "order": {"id":"", "external_key":"", "needs_info":true, "info_reason":"..."},
  "message": {"id":"", "text":"Ответ клиента", "channel":"telegram"},
  "conversation_history": []
}
```

### `riderra.order.field.extract_validate` (`extract`)
```json
{
  "task": {"id":"", "type":"clarification", "state":"customer_replied"},
  "order": {
    "id":"",
    "external_key":"",
    "from":"",
    "to":"",
    "pickup_at":"ISO-8601",
    "info_reason":"Уточнить багаж"
  },
  "message": {"id":"", "text":"2 suitcases", "channel":"telegram"}
}
```

## Response contracts
### build
```json
{
  "contract_version": "1.0.0",
  "result": {
    "text": "Здравствуйте! Пожалуйста, уточните багаж по поездке."
  }
}
```

### send
```json
{
  "contract_version": "1.0.0",
  "accepted": true,
  "provider_message_id": "provider-123"
}
```

### classify
```json
{
  "contract_version": "1.0.0",
  "result": {
    "class": "answer",
    "confidence": 0.92,
    "requires_human": false
  }
}
```

### extract
```json
{
  "contract_version": "1.0.0",
  "result": {
    "valid": true,
    "confidence": 0.93,
    "field": "luggage",
    "value": "2 suitcases"
  }
}
```

## Hard requirements
- All requests must include stable `trace_id` and optional `idempotency_key`.
- Riderra validates outgoing request payloads before calling OpenClaw.
- Riderra validates incoming OpenClaw responses before accepting runtime success.
- Contract regressions are covered by `scripts/openclaw_runtime_contract_smoke.js`.
