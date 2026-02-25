# RBAC + Telegram Setup

## 1) Seed roles and permissions
```bash
node scripts/rbac_seed.js
```

## 2) Temporary staff password bootstrap
```bash
STAFF_TEMP_PASSWORD='Riderra2026!' node scripts/staff_set_password.js
```
After first login, rotate passwords for all users.

## 3) Telegram env
Set in `.env`:
```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
TELEGRAM_GROUP_CHAT_ID=-100xxxxxxxxxx
```

## 4) Link Telegram user to staff user
Endpoint (owner/admin with permission `telegram.link.manage`):
`POST /api/admin/telegram-links`

Body:
```json
{
  "email": "bellavitomatern@gmail.com",
  "telegramUserId": "123456789",
  "telegramChatId": "123456789"
}
```

## 5) Configure webhook in Telegram
```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<your-domain>/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## 6) Commands
- Private chat commands:
  - `/customer <query>`
  - `/company <query>`
  - `/help`
- Group chat commands:
  - `/price <город>`
  - `/childseat <город>`
  - `/chatid` (показать numeric chat id для настройки)
  - `/help`
  - Important message trigger: `#важно ...` or text with `водитель ... в отпуске/недоступен с ... по ...`
- Private chat Copilot commands:
  - `/tasks` - показать открытые задачи сотрудника
  - `/task-done <task_id>` - отметить задачу выполненной
  - `/report la` - оперативная сводка по поездкам в Los Angeles
  - `/new-order-check` - показать последний активный заказ
  - `/easytaxi-reminder` - создать reminder по назначению в EasyTaxi

Commands use CRM read permission (`crm.read`).

## 7) Group workflow (Draft -> Approval)
1. Employee writes important message in allowed group.
2. Bot saves `OpsEventDraft` (temporary DB) and confirms in chat.
3. Dispatcher/owner reviews draft in Riderra and approves/rejects:
   - approve creates permanent `OpsEvent`
   - for vacation/unavailability also creates `DriverUnavailability`
4. Conflict endpoint checks overlap with active orders by `pickupAt`.

## 8) Copilot response format (group chat)
Bot answers in unified format:
- starts with: `Я помощник Riderra, работаю в тестовом режиме.`
- includes: `Вижу такую информацию ...`
- includes explicit source line (`прайс-лист`, `комментарий сотрудника`, `правило`)
- includes status line (`подтверждено` или `не аппрувнуто`)
