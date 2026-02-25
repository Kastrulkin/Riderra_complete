# Planfix -> Riderra Client Migration Plan

## Objective
Перенести клиентскую базу из Planfix в Riderra CRM так, чтобы отказаться от Planfix без потери критичных данных.

## 1. Source Data Scope
Минимальный набор из Planfix:
- Clients/Contacts
- Companies
- Phones, emails, messenger IDs
- Notes (последние N по клиенту)
- Tags/segments
- Responsible manager
- Consent/communication preferences (если есть)

## 2. Target Schema (Riderra)
- `customers`
- `customer_contacts`
- `customer_tags`
- `customer_notes`
- `customer_consents`
- `customer_external_links` (planfix_id, legacy refs)

## 3. Migration Strategy
1. `Extract`: выгрузка через Planfix API/CSV в stage.
2. `Transform`: нормализация телефонов/email, timezone, имен.
3. `Deduplicate`: ключи сопоставления:
   - primary: normalized phone
   - secondary: email
   - fallback: name + company + recent trip signals
4. `Load`: импорт в PostgreSQL транзакционными батчами.
5. `Reconcile`: сверка counts + выборочный ручной QA.

## 4. Mapping Rules
- `planfix_contact.id` -> `customer_external_links.external_id`
- `name/company` -> `customers.display_name/company_name`
- `phone/email` -> `customer_contacts`
- `manager` -> `customers.owner_user_id`
- `tags` -> `customer_tags`
- `notes` -> `customer_notes` (ограничение размера и санация)

## 5. Data Quality Gates
- Невалидный телефон/email -> quarantine table.
- Дубликаты с конфликтами -> review queue.
- Отсутствие канала связи -> flag `incomplete_profile`.

## 6. Security and Compliance
- Минимизировать PII в логах.
- Ролевой доступ к CRM и outreach.
- Сохранить source traceability (кто/когда мигрировал запись).

## 7. Cutover Plan
1. Dry-run на копии данных.
2. Freeze окно для Planfix (только чтение) на момент финального delta-import.
3. Delta-import за последние 7-14 дней.
4. QA + sign-off Owner.
5. Переключение пользователей на Riderra CRM.

## 8. Acceptance Criteria
- Перенесено >= 99% валидных контактов.
- 100% migrated records имеют `external_links` на Planfix.
- <= 1% записей в manual review queue после дедупликации.
- Пользователи работают в Riderra без обращения к Planfix.
