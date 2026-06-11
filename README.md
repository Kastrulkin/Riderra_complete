# Riderra

Riderra — Nuxt 2 + Express + Prisma проект для работы с водителями:
- регистрация и авторизация (`admin`, `driver`)
- заявки и маршруты водителей
- админ-управление водителями и городскими маршрутами
- webhook приёма заказов и система отзывов

## Технологии
- Frontend: Nuxt 2 (SPA)
- Backend: Express (через Nuxt `serverMiddleware`)
- ORM: Prisma
- База данных: PostgreSQL

## Быстрый старт (локально)
1. Скопируйте переменные:
```bash
cp .env.example .env
```
2. Поднимите Postgres (docker):
```bash
docker compose up -d postgres
```
3. Установите зависимости и примените схему:
```bash
npm install
npx prisma migrate dev
npx prisma generate
```
4. Запустите приложение:
```bash
npm run dev
```

Приложение по умолчанию: `http://localhost:3001`.

## Важные переменные окружения
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_SECRET` — обязателен
- `ADMIN_SETUP_KEY` — ключ для одноразового bootstrap админа через `/api/auth/create-admin`
- `CORS_ORIGIN` — список разрешённых origin через запятую
- `EASYTAXI_WEBHOOK_SECRET` — секрет для `/api/webhooks/easytaxi/order`; в production обязателен
- `OPENCLAW_WEBHOOK_SECRET` — секрет для `/api/webhooks/openclaw/order-draft`; в production обязателен
- `TELEGRAM_WEBHOOK_SECRET` — секрет Telegram webhook; в production обязателен для `/api/telegram/webhook`
- `GOOGLE_MAPS_API_KEY` — ключ Google Maps

## Полезные команды
```bash
npm run dev
npm run build
npm run start
npm run lint
npm run prisma:migrate   # prisma migrate deploy
npm run prisma:generate
```

В production webhook endpoint'ы без настроенного секрета отклоняют запросы. EasyTaxi принимает либо заголовок `X-EasyTaxi-Webhook-Secret`, либо HMAC SHA-256 подпись в `X-EasyTaxi-Signature`.

## Где что находится
- API: `server/index.js`
- Prisma schema: `prisma/schema.prisma`
- Страницы: `pages/`
- Middleware доступа: `middleware/`
- Vuex store: `store/index.js`

## Документация
- Продуктовый канон для людей и AI-агентов: `PRODUCT.md`
- Реестр агентских capability и границ безопасности: `docs/AGENT_REGISTRY_V1.md`
- Use cases и статусы готовности: `docs/use-cases.md`
- Интеграции и источники истины: `docs/integrations.md`
- Контракт соседнего агента/OpenClaw: `docs/contracts/riderra-openclaw/PHASE1.md`
- Деплой и сервер: `README_DEPLOY.md`
- Авторизация и роли: `README_AUTH.md`
- Комиссии/приоритизация: `README_COMMISSION_SYSTEM.md`
- Обновление прода: `UPDATE_INSTRUCTIONS.md`

Публичная видимость для AI-агентов уже обслуживается через `/llms.txt`,
`/api/public/openapi.json`, `/api/public/riderra-profile`,
`/api/public/source-truth` и проверяется командой
`npm run smoke:public-ai-visibility`.
