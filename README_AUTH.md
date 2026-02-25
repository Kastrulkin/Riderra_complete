# Авторизация и роли

## Роли
- `admin`
- `driver`

## API
- `POST /api/auth/register` — регистрация водителя
- `POST /api/auth/login` — вход
- `GET /api/auth/me` — текущий пользователь (`Authorization: Bearer <token>`)
- `POST /api/auth/create-admin` — bootstrap админа (требует `x-setup-key: ADMIN_SETUP_KEY`)

## Доступ к админ API
Все админские endpoints защищены связкой:
- JWT middleware (`authenticateToken`)
- роль `admin` (`requireAdmin`)

Legacy-схема с `x-admin-token` удалена.

## Frontend маршруты
- `/login` — общий вход
- `/register` — регистрация
- `/driver-dashboard` — кабинет водителя
- `/admin-drivers` — админ-панель водителей
- `/admin-city-routes` — админ-панель маршрутов
