const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function plainText (markdown = '') {
  return String(markdown)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`[\]-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify (value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

async function upsertPage ({ tenantId, title, contentMarkdown, parentId, sortOrder, sourcePageId }) {
  const existing = await prisma.wikiPage.findFirst({ where: { tenantId, title } })
  const data = {
    title,
    slug: slugify(title),
    contentMarkdown,
    contentText: plainText(contentMarkdown),
    parentId,
    sortOrder,
    isPublished: true
  }

  if (existing) {
    return prisma.wikiPage.update({ where: { id: existing.id }, data })
  }

  return prisma.wikiPage.create({
    data: {
      tenantId,
      ...data,
      sourceProvider: 'riderra',
      sourcePageId
    }
  })
}

async function main () {
  const paymentsPage = await prisma.wikiPage.findFirst({
    where: { title: 'Общая информация по международным платежам' }
  })
  if (!paymentsPage) throw new Error('Wiki page not found: Общая информация по международным платежам')

  const tenantId = paymentsPage.tenantId
  const systemsPage = await prisma.wikiPage.findFirst({
    where: { tenantId, title: 'Системы', isPublished: true }
  })
  if (!systemsPage) throw new Error('Wiki section not found: Системы')

  const paymentsContent = `# Международные платежи

Краткий порядок проверки и проведения платежа иностранному вендору или исполнителю.

## До оплаты

- Сверьте получателя: юридическое имя, страна и договор.
- Получите счёт или другой документ-основание.
- Проверьте валюту, сумму и банковские реквизиты: банк, SWIFT/BIC, IBAN или номер счёта.
- Уточните комиссии: OUR, SHA или BEN.
- Свяжите платёж с вендором и заказами, за которые платим.

## Согласование

- Подготовьте платёж как черновик.
- Финансовый сотрудник проверяет сумму, валюту, назначение и реквизиты.
- Владелец или уполномоченный сотрудник подтверждает отправку.
- Не меняйте реквизиты только по сообщению в чате: перепроверьте их по известному контакту.

## После отправки

- Сохраните подтверждение банка и фактическую комиссию.
- Запишите дату, сумму, валюту, получателя и связанные заказы.
- Сообщите вендору номер или подтверждение платежа без лишних банковских данных.

## Если платёж задержан или возвращён

- Не отправляйте его повторно, пока банк не назвал причину.
- Проверьте реквизиты, валютные ограничения и документы.
- Перед повторной отправкой получите новое согласование.

Если есть сомнение по санкциям, получателю или назначению, остановите платёж и передайте вопрос финансовому сотруднику.`

  await upsertPage({
    tenantId,
    title: paymentsPage.title,
    contentMarkdown: paymentsContent,
    parentId: paymentsPage.parentId,
    sortOrder: paymentsPage.sortOrder,
    sourcePageId: 'riderra-international-payments'
  })

  const guideContent = `# Новая диспетчерская система ETO

ETO заменяет iVcardo. Здесь собраны только основные действия для ежедневной работы.

## Инструкции

- [[ETO: быстрый старт для диспетчера]]
- [[ETO: как добавить водителя]]
- [[ETO: как добавить вендора]]
- [[ETO: как назначить заказ]]
- [[ETO Driver: как пользоваться приложением]]

## Главное правило

Сначала проверьте данные заказа и статус исполнителя, затем назначайте заказ. После назначения убедитесь, что водитель или вендор получил задание и принял его.`

  const guide = await upsertPage({
    tenantId,
    title: 'Новая диспетчерская система ETO',
    contentMarkdown: guideContent,
    parentId: systemsPage.id,
    sortOrder: 0,
    sourcePageId: 'riderra-eto-guide'
  })

  const articles = [
    {
      title: 'ETO: быстрый старт для диспетчера',
      sourcePageId: 'riderra-eto-quick-start',
      content: `# Быстрый старт

1. Откройте Dispatch Panel и проверьте новые заказы.
2. Откройте заказ и сверьте дату, время, маршрут, пассажира, класс машины и комментарий.
3. Убедитесь, что нужный водитель или вендор уже создан в ETO.
4. Назначьте заказ по инструкции [[ETO: как назначить заказ]].
5. Проверьте, что исполнитель получил задание и принял его.
6. Следите за статусами до завершения поездки.

Новые учётные записи: [[ETO: как добавить водителя]] и [[ETO: как добавить вендора]].`
    },
    {
      title: 'ETO: как добавить водителя',
      sourcePageId: 'riderra-eto-add-driver',
      content: `# Как добавить водителя

1. Откройте **Users → Drivers**.
2. Нажмите **Add New**.
3. В **General** заполните display name, unique ID, username, email, password, язык и часовой пояс.
4. Поставьте статус **Approved**.
5. Добавьте телефон. При необходимости заполните документы и **Driver Income**.
6. Нажмите **Add** или **Save**.
7. Передайте водителю адрес компании, логин и временный пароль безопасным способом.

После создания проверьте вход по инструкции [[ETO Driver: как пользоваться приложением]].

[Официальная справка ETO](https://kb.easytaxioffice.com/help/add-a-new-driver)`
    },
    {
      title: 'ETO: как добавить вендора',
      sourcePageId: 'riderra-eto-add-vendor',
      content: `# Как добавить вендора

В ETO вендор создаётся как **Fleet Operator**.

1. Откройте **Settings → Users → Admins**.
2. Нажмите **Add New**.
3. Выберите роль **Fleet Operator**.
4. Заполните название, контакт, email, логин и временный пароль.
5. Сохраните аккаунт и безопасно передайте доступ вендору.
6. Создайте водителей вендора и привяжите их к Fleet account.
7. Сделайте тестовое назначение и убедитесь, что вендор видит заказ.

Вендору назначается заказ, после чего его оператор выбирает конкретного водителя. См. [[ETO: как назначить заказ]].

[Официальная справка ETO](https://kb.easytaxioffice.com/help/partner-fleet-operator-account)`
    },
    {
      title: 'ETO: как назначить заказ',
      sourcePageId: 'riderra-eto-assign-booking',
      content: `# Как назначить заказ

1. Найдите заказ в **Dispatch Panel** или **Bookings**.
2. Проверьте маршрут, время, пассажира, класс машины и комментарий.
3. В колонке водителя нажмите **Assign driver +**.
4. Выберите водителя или Fleet Operator и подтвердите назначение.
5. Убедитесь, что исполнитель получил уведомление и принял заказ.

## Как заменить исполнителя

Откройте заказ и в разделе **Payment and Driver** нажмите имя текущего водителя, затем выберите нового. То же действие доступно из списка заказов.

Не оставляйте заказ назначенным водителю, который его отклонил или не подтвердил.

[Официальная справка ETO](https://kb.easytaxioffice.com/help/assigning-a-job)`
    },
    {
      title: 'ETO Driver: как пользоваться приложением',
      sourcePageId: 'riderra-eto-driver-app',
      content: `# Приложение ETO Driver

## Первый вход

1. Установите **ETO Driver** из App Store или Google Play.
2. Выберите компанию Riderra или введите HOST URL из **Settings → Mobile Apps**.
3. Войдите по email и паролю, созданным диспетчером.
4. Разрешите уведомления и геолокацию **всегда**.

## Работа с заказом

1. Откройте уведомление о новом задании.
2. Нажмите **Accept** или **Reject**. При отказе укажите причину.
3. Перед началом работы поставьте доступность **Available**.
4. Во время поездки меняйте статусы по порядку:
   - **En Route** — выехал к пассажиру;
   - **Arrived** — прибыл на подачу;
   - **On board** — пассажир в машине;
   - **Completed** — поездка завершена.
5. Не ставьте **Completed**, пока пассажир не доставлен.

Если уведомления или геолокация не работают, перезапустите приложение и проверьте разрешения телефона.

[Официальная справка ETO](https://kb.easytaxioffice.com/help/how-to-use-driver-app)`
    }
  ]

  for (let index = 0; index < articles.length; index += 1) {
    const article = articles[index]
    await upsertPage({
      tenantId,
      title: article.title,
      contentMarkdown: article.content,
      parentId: guide.id,
      sortOrder: index,
      sourcePageId: article.sourcePageId
    })
  }

  console.log(JSON.stringify({ updated: paymentsPage.title, section: guide.title, articles: articles.map(article => article.title) }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
