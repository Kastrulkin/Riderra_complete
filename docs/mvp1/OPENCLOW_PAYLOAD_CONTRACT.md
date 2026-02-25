# OpenClaw -> Riderra Payload Contract (Required)

## Why needed
Riderra должна принимать от OpenClaw структурированные draft-действия, которые идут в approval pipeline.

## Minimal envelope
```json
{
  "contract_version": "1.0.0",
  "trace_id": "uuid",
  "source": "openclaw",
  "intent": "create_order_draft | request_missing_info | whatsapp_draft | driver_checklist_step",
  "confidence": 0.0,
  "risk_level": "low | medium | high",
  "requires_approval": true,
  "proposed_by": "agent_id",
  "created_at": "ISO-8601",
  "payload": {}
}
```

## Intent payloads
### create_order_draft
```json
{
  "external_ref": "email_id_or_thread",
  "client": {"name":"", "phone":"", "email":"", "lang":""},
  "trip": {
    "from":"",
    "to":"",
    "pickup_datetime_local":"ISO-8601",
    "flight_no":"",
    "pax":0,
    "bags":0,
    "vehicle_class":""
  },
  "pricing": {
    "source":"price_book|dispatch|unknown",
    "quoted_price":0,
    "currency":"EUR",
    "price_rule_id":"optional"
  },
  "missing_fields": ["phone", "pickup_datetime_local"]
}
```

### request_missing_info
```json
{
  "order_ref":"",
  "channel":"whatsapp|email|telegram",
  "message_draft":"",
  "missing_fields":["flight_no","bags"]
}
```

### whatsapp_draft
```json
{
  "order_ref":"",
  "recipient":{"phone":"", "name":""},
  "template":"trip_confirmation|upsell_sim|missing_info",
  "message_draft":"",
  "variables":{}
}
```

### driver_checklist_step
```json
{
  "order_ref":"",
  "driver_ref":"",
  "checklist_code":"client_no_show",
  "step":"collect_photo|collect_geo|call_client|wait_15m",
  "instructions":"",
  "required_evidence":["photo","geolocation","timestamp"]
}
```

## Response from Riderra
- `202 Accepted` + `approval_task_id` если payload валиден и создан draft.
- `400` schema validation error.
- `409` duplicate (same trace_id/external_ref).

## Hard requirements
- `requires_approval` must be `true` in MVP-1.
- `confidence` and `risk_level` are mandatory.
- Idempotency key: `trace_id`.
