# Обновление продакшена

## Сервер
`91.229.9.217`

## Команда обновления
```bash
cd /opt/riderra
bash update.sh
```

Скрипт делает:
1. `git fetch/pull`
2. `npm install`
3. `npx prisma db push && npx prisma generate`
4. очистку build-кеша
5. `npm run generate`
6. restart PM2

## Проверка после обновления
```bash
pm2 status riderra
pm2 logs riderra --lines 30
```
