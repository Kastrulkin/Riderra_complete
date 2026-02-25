# Telegram Command Map

## Base Commands (all authenticated roles)
- `/start` - привязка Telegram аккаунта к пользователю Riderra.
- `/me` - текущая роль и доступные команды.
- `/tasks` - pending approval tasks по роли.
- `/orders` - краткий список активных заказов (role-filtered).
- `/incidents` - активные инциденты расхождений цен (role-filtered).

## Approval Commands
- `/approve <task_id>`
- `/reject <task_id> <reason>`
- `/task <task_id>` - детали драфта/рисков/источников.

## Dispatcher/Operator
- `/order <id>`
- `/order-status <id> <status>`
- `/needs-info <id>` - запрос недостающих данных (создаёт AI draft).

## Finance/Pricing
- `/price-incidents`
- `/price-diff <city|route>`
- `/price-approve <task_id>`

## Sales/CRM
- `/customer <id|phone>`
- `/outreach-draft <segment>`
- `/outreach-approve <task_id>`

## Owner/Admin
- `/sync-status`
- `/run-sync <sheet_source_id>`
- `/migration-status planfix`
- `/rbac-audit <user_id>`

## UX Rules
- Все команды возвращают compact карточки + inline кнопки.
- Любой рискованный action через approve/reject.
- Все ответы логируются в `audit_logs`.
