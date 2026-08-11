# Деплой Riderra (PostgreSQL)

Актуально на 2026-08-11. Архитектура и runtime-компоненты описаны в `docs/ARCHITECTURE.md`.

## Сервер
- IP: `91.229.9.217`
- Проект: `/opt/riderra`
- PM2 процессы: `riderra`, `booking-price-monitor`

## Обязательные требования
- Node.js 18+
- PostgreSQL 14+
- PM2
- Nginx (опционально, как reverse proxy)

## Первичная установка на сервере
```bash
cd /opt
# git clone <repo-url> riderra
cd riderra
cp .env.example .env
# заполните .env
npm install
npm run prisma:bootstrap
npm run prisma:generate
npm run generate
pm2 start ecosystem.config.js
pm2 save
```

`booking-price-monitor` является one-shot процессом: PM2 будит его каждые пять минут, а сам скрипт выполняет сбор только внутри настроенного окна и затем останавливается. Статус `stopped` между запусками нормален.

## Обновление
Рекомендуемый путь:
```bash
cd /opt/riderra
bash update.sh
```

## Docker-вариант
```bash
cp .env.example .env
docker compose up -d --build
```

Сервисы:
- `app` — Nuxt/Express
- `postgres` — PostgreSQL 16

## Миграция с SQLite на PostgreSQL
1. Сделайте бэкап текущей SQLite БД (`prisma/dev.db` или `prisma/data/prod.db`).
2. Поднимите PostgreSQL и настройте `DATABASE_URL`.
3. Создайте актуальную схему в новой пустой PostgreSQL и зафиксируйте migration baseline:
```bash
npm run prisma:bootstrap
npm run prisma:generate
```
4. Перенесите данные отдельным ETL-скриптом/инструментом (например, `pgloader`) из бэкапа SQLite.
5. Проверьте критичные таблицы: `users`, `drivers`, `orders`, `reviews`, `city_routes`, `driver_city_routes`.

Для последующих обновлений уже подготовленной PostgreSQL используйте только:
```bash
npm run prisma:migrate
```

## Минимальный чек-лист безопасности
- Установлен сильный `JWT_SECRET`
- `ADMIN_SETUP_KEY` задан и хранится вне git
- `CORS_ORIGIN` ограничен нужными доменами
- `EASYTAXI_WEBHOOK_SECRET`, `OPENCLAW_WEBHOOK_SECRET` и `TELEGRAM_WEBHOOK_SECRET` заданы для включённых webhook'ов
- В репозитории нет реальных SMTP/API ключей
- `PRICING_EMBEDDINGS_ENABLED` включён только при настроенных GigaChat credentials и TLS verification

## Проверка после обновления

```bash
pm2 status
pm2 logs riderra --lines 50 --nostream
curl -fsS http://127.0.0.1:3000/api/public/source-truth
npm run smoke:public-ai-visibility
```

При изменении `cron_restart` запись `booking-price-monitor` должна быть пересоздана из `ecosystem.config.js`; актуальный `update.sh` делает это автоматически.
