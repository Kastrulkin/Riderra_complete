# Короткий алгоритм обновления

Используйте `UPDATE_INSTRUCTIONS.md` как основной документ.

Ручная последовательность:
```bash
cd /opt/riderra
git pull origin master
npm install
npx prisma db push
npx prisma generate
rm -rf .nuxt dist node_modules/.cache
npm run generate
pm2 restart riderra --update-env
pm2 status riderra
```
