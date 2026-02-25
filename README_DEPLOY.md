# Деплой Riderra (PostgreSQL)

## Сервер
- IP: `91.229.9.217`
- Проект: `/opt/riderra`
- PM2 процесс: `riderra`

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
npx prisma db push
npx prisma generate
npm run generate
pm2 start ecosystem.config.js
pm2 save
```

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
3. Примените актуальную схему:
```bash
npx prisma db push
npx prisma generate
```
4. Перенесите данные отдельным ETL-скриптом/инструментом (например, `pgloader`) из бэкапа SQLite.
5. Проверьте критичные таблицы: `users`, `drivers`, `orders`, `reviews`, `city_routes`, `driver_city_routes`.

## Минимальный чек-лист безопасности
- Установлен сильный `JWT_SECRET`
- `ADMIN_SETUP_KEY` задан и хранится вне git
- `CORS_ORIGIN` ограничен нужными доменами
- В репозитории нет реальных SMTP/API ключей
