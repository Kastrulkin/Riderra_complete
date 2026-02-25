# Система комиссий и приоритизации

## Логика
Приоритет водителя рассчитывается из трёх факторов:
- 50% — комиссия (`чем ниже комиссия, тем выше балл`)
- 30% — соответствие цены маршрута целевой цене
- 20% — рейтинг

Формула в коде: `server/index.js` (`calculateDriverScore`).

## Основные endpoints
- `POST /api/drivers/priority`
- `POST /api/webhooks/easytaxi/order`
- `PUT /api/admin/drivers/:driverId/status`

## Модели БД
Ключевые сущности в `prisma/schema.prisma`:
- `Driver`
- `DriverRoute`
- `Order`
- `Review`
- `CityRoute`
- `DriverCityRoute`
