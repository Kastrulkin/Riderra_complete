# Авторизация, tenant и RBAC

Актуально на 2026-08-11.

## Модель доступа

Riderra совмещает legacy-поле роли пользователя с tenant-scoped RBAC:

- JWT подтверждает пользователя;
- `TenantMembership` связывает пользователя с рабочим пространством;
- `Role`, `Permission`, `RolePermission` и `UserRole` задают разрешения;
- `resolveActorContext` формирует tenant, actor, role, permissions и trace context;
- `requireCan(...)` проверяет capability конкретного API.

Базовые рабочие роли: `owner`, `financial`, `operator`, `dispatcher`, `audit`, `pricing_admin`. Для водительской поверхности используется роль/профиль `driver`. Legacy `admin` остаётся для совместимости части старых endpoints, но новые API должны проверять actor context и permission, а не только строку роли.

## Основные разрешения

- `pricing.read` — просмотр прайсов, сравнений и Booking calculations;
- `pricing.manage` — настройка источников, запуск сравнений и подтверждение mappings;
- order/ops permissions — чтение и изменение операционных заказов;
- CRM permissions — работа с компаниями и контактами;
- approval/administrative permissions — критичные действия и настройки.

Точная привязка permissions находится в middleware и route definitions; она важнее этого обзорного списка.

## Auth API

- `POST /api/auth/register` — регистрация водительского пользователя;
- `POST /api/auth/login` — вход;
- `GET /api/auth/me` — текущий пользователь;
- `POST /api/auth/create-admin` — одноразовый bootstrap, требует `x-setup-key: ADMIN_SETUP_KEY`.

JWT передаётся как `Authorization: Bearer <token>`.

## Safety boundary

- Любой новый operational read/write должен быть ограничен tenant.
- Изменения цен, ролей, заказов и внешние отправки требуют соответствующего permission и, где предусмотрено политикой, Human Approval.
- Webhook endpoints используют отдельные секреты и не считаются пользовательской JWT-сессией.
- `x-admin-token` не является поддерживаемой схемой доступа.

## Основные frontend-маршруты

- `/staff-login` и `/login` — вход сотрудников/общий вход;
- `/driver-login`, `/driver-dashboard` — водительская поверхность;
- `/admin` и `/admin-*` — tenant/RBAC-защищённые рабочие экраны.

Матрица ролей MVP-1: `docs/mvp1/RBAC_MATRIX.md`.
