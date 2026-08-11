# Riderra

Riderra — production-система управления частными пассажирскими трансферами. Она объединяет операционные заказы, водителей и транспортные компании, CRM клиентов и поставщиков, внутренний прайс, внешние ценовые снимки, коммуникации и контролируемые AI-процессы.

Текущее состояние production и фактические объёмы описаны в [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md), устройство системы — в [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Что уже работает

- месячные заказы из настраиваемых Google Sheets, архив и аналитика;
- водители, автопарки, маршруты, недоступность и приоритизация;
- CRM компаний, клиентов, исполнителей, контактов и менеджеров;
- основной прайс Riderra 005, клиентские и поставщицкие прайсы, маржа и конфликты;
- универсальное сравнение публичных цен трансферных компаний с историческими снимками, сопоставлением адресов и классов машин, возобновляемыми запусками и Excel-экспортом;
- отдельный расчёт Booking по модели Simon: точки 5/10/20/40/60 км, BCOM, PMF и расчётная цена исполнителя;
- мониторинг цен Booking по расписанию; прайс 005 используется только как справочное сравнение и этим процессом не изменяется;
- AI Inbox, чат-задачи, черновики сообщений, Human Approval и audit log;
- публичная поверхность для людей и AI-агентов: сайт, `/llms.txt`, публичные API и черновик заявки без автоматического подтверждения бронирования.

## Принципы и источники истины

- Заказы MVP-1: месячная Google Sheet остаётся операционным источником истины; Riderra читает и нормализует данные.
- Продажные цены Riderra: внутренний прайс является финальным источником истины.
- Публичные цены клиентов/конкурентов и согласованные цены поставщиков: отдельные версии и доказательства для сравнения, а не автоматическая замена основного прайса.
- Booking: рабочий прайс и расчёт ведутся отдельно; 005 может участвовать только в справочной сверке.
- AI-действия: `Draft -> Approval -> Execute -> Audit`.
- Любые данные и операции ограничиваются tenant и RBAC.

## Стек

| Слой | Технологии |
| --- | --- |
| Frontend | Nuxt 2, Vue 2, Vuex, SPA (`ssr: false`) |
| Backend | Node.js 18+, Express 4 через Nuxt `serverMiddleware` |
| Data | PostgreSQL, Prisma 5; векторные представления мест — `halfvec(2560)` |
| Pricing/exports | ExcelJS, CSV/PapaParse, версионированные политики расчёта |
| Integrations | Google Sheets, Google Maps, Telegram, SMTP/email, EasyTaxi, OpenClaw, WhatsApp runtime, публичные сайты цен |
| Semantic matching | опциональные GigaChat Embeddings (`EmbeddingsGigaR`) |
| Runtime | Nginx, PM2, cron-процессы; Docker Compose доступен для локальной/альтернативной установки |
| Security | JWT, tenant RBAC, webhook secrets, idempotency, HumanApproval, AuditLog |

## Архитектура в одном абзаце

Riderra разворачивается как модульный монолит: Nuxt SPA и Express API работают одним приложением, PostgreSQL хранит tenant-scoped состояние, а PM2 запускает основной процесс и отдельные одноразовые процессы по расписанию. `server/index.js` остаётся composition root и содержит часть legacy API; новые предметные области выносятся в `server/routes`, `server/controllers` и `server/services`. Интеграции не пишут напрямую в критичные сущности: входные данные проходят нормализацию, сопоставление, draft/review и audit.

Подробная схема потоков и границ модулей: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Быстрый старт

1. Подготовьте окружение:

```bash
cp .env.example .env
docker compose up -d postgres
npm install
```

2. Для новой пустой PostgreSQL создайте схему и migration baseline:

```bash
npm run prisma:bootstrap
npm run prisma:generate
```

`prisma:bootstrap` нельзя применять к существующей рабочей базе. Для обычного обновления используйте `npm run prisma:migrate`.

3. Запустите приложение:

```bash
npm run dev
```

Локальный адрес по умолчанию: `http://localhost:3001`.

## Основные команды

```bash
npm run dev
npm run build
npm run generate
npm run lint
npm run prisma:migrate
npm run prisma:generate
npm run test:price-comparisons
npm run test:booking-partner-rates
npm run smoke:public-ai-visibility
npm run security:release-gate
```

Полный список команд находится в [`package.json`](package.json).

## Структура репозитория

| Путь | Назначение |
| --- | --- |
| `pages/` | пользовательские и административные сценарии Nuxt |
| `server/index.js` | composition root, middleware и legacy API |
| `server/routes/` | модульные HTTP-маршруты |
| `server/controllers/` | контроллеры публичной и auth-поверхности |
| `server/services/` | бизнес-логика, pricing adapters, matching, exports |
| `prisma/schema.prisma` | модель данных PostgreSQL |
| `scripts/` | импорт, фоновые процессы, smoke и operational tooling |
| `scripts/tests/` | unit/contract/regression тесты Node Test Runner |
| `docs/` | продуктовый, архитектурный и интеграционный канон |

## Документация

- [`PRODUCT.md`](PRODUCT.md) — продуктовый канон и границы обещаний.
- [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) — текущий production-снимок и известные ограничения.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — архитектура, модули и ключевые потоки.
- [`docs/integrations.md`](docs/integrations.md) — интеграции и источники истины.
- [`docs/use-cases.md`](docs/use-cases.md) — реализованные и планируемые сценарии.
- [`docs/AGENT_REGISTRY_V1.md`](docs/AGENT_REGISTRY_V1.md) — capabilities и safety boundary для AI.
- [`docs/contracts/riderra-openclaw/PHASE1.md`](docs/contracts/riderra-openclaw/PHASE1.md) — контракт соседнего агента.
- [`README_DEPLOY.md`](README_DEPLOY.md) — production-развёртывание.
- [`README_AUTH.md`](README_AUTH.md) — авторизация, tenant и RBAC.
- [`README_COMMISSION_SYSTEM.md`](README_COMMISSION_SYSTEM.md) — комиссия и приоритизация водителей.

## Важное ограничение

В репозитории есть публичные, внутренние и experimental API. Публичным контрактом считаются только `/llms.txt`, `/api/public/openapi.json` и перечисленные в нём `/api/public/*` endpoints. Административные API не следует использовать как внешний стабильный контракт без отдельного согласования.
