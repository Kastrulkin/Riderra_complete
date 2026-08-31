#!/bin/bash

# 🚀 Скрипт автоматического обновления Riderra на сервере
# Использование: ./update.sh [--skip-git] [--skip-build] [--skip-pm2]

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Параметры
SKIP_GIT=false
SKIP_BUILD=false
SKIP_PM2=false

# Парсинг аргументов
for arg in "$@"; do
  case $arg in
    --skip-git)
      SKIP_GIT=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-pm2)
      SKIP_PM2=true
      shift
      ;;
    *)
      ;;
  esac
done

echo -e "${BLUE}🚀 Начинаем обновление Riderra...${NC}"

# Определяем директорию проекта
if [ -d "/opt/riderra" ]; then
  PROJECT_DIR="/opt/riderra"
elif [ -f "package.json" ]; then
  PROJECT_DIR="$(pwd)"
else
  echo -e "${RED}❌ Не найдена директория проекта. Запустите скрипт из корня проекта или установите PROJECT_DIR${NC}"
  exit 1
fi

cd "$PROJECT_DIR"
echo -e "${BLUE}📁 Рабочая директория: $PROJECT_DIR${NC}"

if [ -f ".env" ]; then
  echo -e "${BLUE}🔐 Загружаем переменные окружения из .env${NC}"
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
else
  echo -e "${YELLOW}⚠️  .env не найден, используем переменные окружения shell/PM2${NC}"
fi

# 1. Обновление из Git
if [ "$SKIP_GIT" = false ]; then
  echo -e "\n${YELLOW}📥 Обновление кода из Git...${NC}"
  
  # Проверяем статус
  if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Обнаружены локальные изменения. Сохраняем в stash...${NC}"
    git stash push -m "Auto-stash before update $(date +%Y-%m-%d_%H:%M:%S)" || true
  fi
  
  # Получаем изменения
  git fetch origin || {
    echo -e "${RED}❌ Ошибка при получении изменений из Git${NC}"
    exit 1
  }
  
  # Проверяем, есть ли новые коммиты
  LOCAL=$(git rev-parse @)
  REMOTE=$(git rev-parse @{u})
  BASE=$(git merge-base @ @{u})
  
  if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}✓ Код уже актуален${NC}"
  else
    echo -e "${BLUE}📥 Получены новые изменения, применяем...${NC}"
    git pull origin master || {
      echo -e "${RED}❌ Ошибка при применении изменений из Git${NC}"
      exit 1
    }
    echo -e "${GREEN}✓ Код обновлён${NC}"
  fi
else
  echo -e "${YELLOW}⏭️  Пропуск обновления из Git${NC}"
fi

# 2. Установка зависимостей
echo -e "\n${YELLOW}📦 Установка зависимостей...${NC}"
# Nuxt and the static-generation toolchain are development dependencies. They
# are required only while producing the static release artifact and are pruned
# before the application is restarted.
npm install --include=dev --no-audit || {
  echo -e "${RED}❌ Ошибка при установке зависимостей${NC}"
  exit 1
}
echo -e "${GREEN}✓ Зависимости установлены${NC}"

# 3. Применение миграций Prisma (PostgreSQL)
if [ -f "prisma/schema.prisma" ]; then
  echo -e "\n${YELLOW}🗄️  Применение миграций базы данных...${NC}"
  npx prisma migrate deploy || {
    echo -e "${RED}❌ Ошибка применения Prisma migrations${NC}"
    exit 1
  }
  npx prisma generate || echo -e "${YELLOW}⚠️  Prisma generate пропущен${NC}"
fi

# 4. Очистка кеша и пересборка
if [ "$SKIP_BUILD" = false ]; then
  echo -e "\n${YELLOW}🧹 Очистка кеша и старых файлов сборки...${NC}"
  rm -rf .nuxt dist node_modules/.cache
  echo -e "${GREEN}✓ Кеш очищен${NC}"
  
  echo -e "\n${YELLOW}🔨 Пересборка проекта...${NC}"
  npm run generate || {
    echo -e "${RED}❌ Ошибка при сборке проекта${NC}"
    exit 1
  }
  echo -e "${GREEN}✓ Проект пересобран${NC}"
  
  # Проверяем, что файлы созданы
  if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Директория dist не создана после сборки${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⏭️  Пропуск пересборки${NC}"
fi

# 5. Удаление сборочных зависимостей и аудит runtime
echo -e "\n${YELLOW}🔒 Удаление сборочных зависимостей...${NC}"
npm prune --omit=dev --no-audit || {
  echo -e "${RED}❌ Не удалось удалить сборочные зависимости${NC}"
  exit 1
}
npm run security:audit-production || {
  echo -e "${RED}❌ Runtime-аудит зависимостей не пройден${NC}"
  exit 1
}
echo -e "${GREEN}✓ В production оставлены только runtime-зависимости; аудит пройден${NC}"

# 6. Очистка кеша Nginx
echo -e "\n${YELLOW}🌐 Очистка кеша Nginx...${NC}"
if command -v systemctl &> /dev/null && systemctl is-active --quiet nginx 2>/dev/null; then
  rm -rf /var/cache/nginx/* 2>/dev/null || true
  rm -rf /var/lib/nginx/cache/* 2>/dev/null || true
  systemctl reload nginx 2>/dev/null || echo -e "${YELLOW}⚠️  Nginx не перезагружен (возможно, не установлен)${NC}"
  echo -e "${GREEN}✓ Кеш Nginx очищен${NC}"
else
  echo -e "${YELLOW}⚠️  Nginx не найден или не запущен${NC}"
fi

# 7. Перезапуск PM2
if [ "$SKIP_PM2" = false ]; then
  echo -e "\n${YELLOW}🔄 Перезапуск PM2...${NC}"
  if command -v pm2 &> /dev/null; then
    pm2 restart riderra --update-env || {
      echo -e "${RED}❌ Ошибка при перезапуске PM2${NC}"
      exit 1
    }
    # PM2 does not reliably refresh cron_restart on startOrReload for a stopped
    # one-shot process, so recreate only this scheduler entry from the manifest.
    pm2 delete booking-price-monitor >/dev/null 2>&1 || true
    pm2 start ecosystem.config.js --only booking-price-monitor --update-env || true
    pm2 save >/dev/null 2>&1 || true
    echo -e "${GREEN}✓ PM2 перезапущен${NC}"
    
    # Проверяем статус
    sleep 2
    pm2 status riderra
  else
    echo -e "${YELLOW}⚠️  PM2 не найден. Перезапустите приложение вручную${NC}"
  fi
else
  echo -e "${YELLOW}⏭️  Пропуск перезапуска PM2${NC}"
fi

# 8. Финальная проверка
echo -e "\n${BLUE}🔍 Финальная проверка...${NC}"
if command -v pm2 &> /dev/null; then
  STATUS=$(pm2 jlist | node -e "let input=''; process.stdin.on('data', d => input += d); process.stdin.on('end', () => { try { const apps = JSON.parse(input || '[]'); const app = apps.find(item => item.name === 'riderra'); process.stdout.write(app?.pm2_env?.status || 'missing'); } catch (_) { process.stdout.write('unknown'); } })")
  if [ "$STATUS" = "online" ]; then
    echo -e "${GREEN}✅ Приложение работает (статус: online)${NC}"
  else
    echo -e "${RED}❌ Приложение не работает (статус: $STATUS)${NC}"
    echo -e "${YELLOW}📋 Последние логи:${NC}"
    pm2 logs riderra --lines 10 --nostream
    exit 1
  fi
fi

echo -e "\n${GREEN}🎉 Обновление завершено успешно!${NC}"
echo -e "${BLUE}📋 Для просмотра логов: pm2 logs riderra${NC}"
echo -e "${BLUE}🌐 Сайт должен быть доступен через несколько секунд${NC}"
