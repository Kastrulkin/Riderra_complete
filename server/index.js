// Загружаем переменные окружения из .env файла (для локальной разработки)
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config()
  } catch (e) {
    // dotenv не установлен, используем переменные из окружения
  }
}

const express = require('express')
const bodyParser = require('body-parser')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const fs = require('fs/promises')
const crypto = require('crypto')
const {
  buildOpenClawEnvelope,
  validateOpenClawPayload,
  validateOpenClawResponse
} = require('./openclaw_contract')

const prisma = new PrismaClient()
const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// CORS middleware
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin
  if (allowedOrigins.length === 0) {
    res.header('Access-Control-Allow-Origin', '*')
  } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin)
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  res.header('Vary', 'Origin')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use(bodyParser.json())

function renderPrivacyPolicyHtml(lang = 'ru') {
  const isEn = String(lang || '').toLowerCase() === 'en'
  const pageLang = isEn ? 'en' : 'ru'
  const title = isEn ? 'Privacy Policy | Riderra' : 'Политика конфиденциальности | Riderra'
  const description = isEn ? 'Riderra privacy policy.' : 'Политика конфиденциальности Riderra.'
  const homeLabel = isEn ? 'Back to Riderra homepage' : 'На главную Riderra'
  const eyebrow = 'Riderra'
  const h1 = isEn ? 'Privacy Policy' : 'Политика конфиденциальности'
  const updated = isEn ? 'Last updated: April 13, 2026' : 'Дата обновления: 13 апреля 2026'
  const sections = isEn
    ? [
        {
          title: '1. Data we collect',
          body: 'We may process names, phone numbers, email addresses, trip details, routes, transfer date and time, flight information, payment and contract data, as well as order-related communication and operational notes.'
        },
        {
          title: '2. Why we use data',
          body: 'We use this data to process requests, organize transfers, communicate with customers, assign drivers, maintain service quality, reconcile payments, prevent errors, and comply with legal obligations.'
        },
        {
          title: '3. Who we may share data with',
          body: 'We share only the minimum necessary data with trip executors, dispatch systems, payment providers, and technical service providers where required to deliver the service.'
        },
        {
          title: '4. Storage and protection',
          body: 'Riderra applies organizational and technical safeguards to protect data against unauthorized access, loss, alteration, or disclosure. Access to operational data is restricted to authorized employees and contractors.'
        },
        {
          title: '5. Your rights',
          body: 'You may request clarification, correction, or deletion of personal data unless we are required to retain it for contractual, accounting, or other legal reasons.'
        },
        {
          title: '6. Contact',
          body: 'For privacy-related questions, contact '
        }
      ]
    : [
        {
          title: '1. Какие данные мы собираем',
          body: 'Мы можем обрабатывать имя, номер телефона, адрес электронной почты, детали поездки, маршрут, дату и время трансфера, информацию о рейсе, платежные и договорные данные, а также переписку по заказу и служебные комментарии.'
        },
        {
          title: '2. Для чего мы используем данные',
          body: 'Данные используются для обработки заявок, организации трансферов, связи с клиентом, подбора водителя, контроля качества сервиса, финансовых сверок, предотвращения ошибок и исполнения юридических обязательств.'
        },
        {
          title: '3. С кем мы можем делиться данными',
          body: 'Мы передаем только необходимый минимум данных исполнителям поездок, диспетчерским системам, платежным и техническим провайдерам, если это требуется для выполнения заказа или работы сервиса.'
        },
        {
          title: '4. Хранение и защита',
          body: 'Riderra применяет организационные и технические меры защиты для ограничения доступа к данным, их утраты, несанкционированного изменения или раскрытия. Доступ к рабочим данным предоставляется только уполномоченным сотрудникам и подрядчикам.'
        },
        {
          title: '5. Ваши права',
          body: 'Вы можете запросить уточнение, обновление или удаление персональных данных, если это не противоречит договорным, бухгалтерским или иным обязательствам по хранению информации.'
        },
        {
          title: '6. Контакты',
          body: 'По вопросам обработки данных и конфиденциальности можно написать на '
        }
      ]

  return `<!doctype html>
<html lang="${pageLang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f7fb;
        --card: #ffffff;
        --text: #122033;
        --muted: #5c667a;
        --accent: #2948a3;
        --line: rgba(18, 32, 51, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: linear-gradient(180deg, #f5f7fb 0%, #ffffff 100%);
        color: var(--text);
      }
      .wrap {
        max-width: 920px;
        margin: 0 auto;
        padding: 48px 20px 64px;
      }
      .card {
        background: var(--card);
        border-radius: 24px;
        box-shadow: 0 24px 80px rgba(20, 35, 90, 0.12);
        padding: 40px 48px;
      }
      .eyebrow {
        margin: 0 0 12px;
        color: var(--accent);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: 40px;
        line-height: 1.08;
      }
      .updated {
        margin: 16px 0 0;
        color: var(--muted);
        font-size: 15px;
      }
      h2 {
        margin: 28px 0 10px;
        font-size: 24px;
        line-height: 1.25;
      }
      p {
        margin: 0 0 16px;
        font-size: 17px;
        line-height: 1.7;
      }
      a {
        color: var(--accent);
        text-decoration: none;
        font-weight: 600;
      }
      a:hover { text-decoration: underline; }
      .back {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 24px;
        color: var(--muted);
        font-size: 14px;
      }
      .back:before {
        content: "←";
      }
      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 24px;
      }
      .lang-switch {
        display: inline-flex;
        align-items: center;
        padding: 4px;
        background: rgba(18, 32, 51, 0.06);
        border-radius: 999px;
        border: 1px solid var(--line);
      }
      .lang-switch a,
      .lang-switch span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 48px;
        height: 36px;
        padding: 0 14px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: .04em;
        text-transform: uppercase;
      }
      .lang-switch a {
        color: var(--muted);
      }
      .lang-switch span {
        background: #fff;
        color: var(--accent);
        box-shadow: 0 4px 18px rgba(20, 35, 90, 0.12);
      }
      @media (max-width: 767px) {
        .wrap { padding-top: 24px; padding-bottom: 36px; }
        .card { padding: 28px 20px; border-radius: 18px; }
        h1 { font-size: 30px; }
        h2 { font-size: 21px; }
        p { font-size: 16px; }
        .toolbar {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <div class="toolbar">
        <a class="back" href="https://riderra.com/">${homeLabel}</a>
        <div class="lang-switch" aria-label="Language switcher">
          ${isEn ? '<a href="/privacy-policy">RU</a><span>EN</span>' : '<span>RU</span><a href="/privacy-policy/en">EN</a>'}
        </div>
      </div>
      <section class="card">
        <p class="eyebrow">${eyebrow}</p>
        <h1>${h1}</h1>
        <p class="updated">${updated}</p>

        ${sections.map((section, index) => {
          if (index === sections.length - 1) {
            return `<h2>${section.title}</h2><p>${section.body}<a href="mailto:info@riderra.com">info@riderra.com</a>.</p>`
          }
          return `<h2>${section.title}</h2><p>${section.body}</p>`
        }).join('')}
      </section>
    </main>
  </body>
</html>`
}

app.get(['/privacy-policy', '/privacy-policy/en'], (req, res) => {
  const lang = req.path.endsWith('/en') || req.query.lang === 'en' ? 'en' : 'ru'
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.status(200).send(renderPrivacyPolicyHtml(lang))
})

function renderTermsHtml(lang = 'ru') {
  const isEn = String(lang || '').toLowerCase() === 'en'
  const pageLang = isEn ? 'en' : 'ru'
  const title = isEn ? 'Terms and Conditions | Riderra' : 'Пользовательское соглашение | Riderra'
  const description = isEn
    ? 'Riderra terms and conditions.'
    : 'Пользовательское соглашение Riderra.'
  const homeLabel = isEn ? 'Back to Riderra homepage' : 'На главную Riderra'
  const h1 = isEn ? 'Terms and Conditions' : 'Пользовательское соглашение'
  const updated = isEn ? 'Last updated: April 13, 2026' : 'Дата обновления: 13 апреля 2026'
  const sections = isEn
    ? [
        {
          title: '1. Scope',
          body: 'These Terms govern the use of Riderra websites, forms, communication channels, and transfer booking services. By submitting a request or using the service, the user agrees to these Terms.'
        },
        {
          title: '2. Service',
          body: 'Riderra arranges passenger transportation and related support services through its own operational team and partner executors. Service availability depends on route, city, vehicle class, timing, and confirmation.'
        },
        {
          title: '3. Booking information',
          body: 'The user is responsible for providing accurate booking details, including pickup and drop-off points, date and time, flight information where relevant, passenger count, luggage details, and any special requirements.'
        },
        {
          title: '4. Changes and cancellation',
          body: 'Booking changes and cancellations are subject to service conditions, timing, route specifics, and partner rules. Additional charges may apply if the user changes confirmed trip details after assignment.'
        },
        {
          title: '5. Pricing and payment',
          body: 'The final price is confirmed by Riderra at the time of booking or confirmation. Prices may depend on route, class of vehicle, extras, waiting time, and local conditions. Payment terms may vary by customer segment and contract.'
        },
        {
          title: '6. Liability',
          body: 'Riderra uses reasonable efforts to organize the requested service but is not liable for delays, changes, or failures caused by incorrect customer data, force majeure, airport disruptions, third-party actions, or conditions beyond reasonable control.'
        },
        {
          title: '7. Data and communication',
          body: 'By using the service, the user agrees that Riderra may process booking-related data and contact the user regarding the booking, operational clarifications, support, and service updates.'
        },
        {
          title: '8. Contact',
          body: 'For questions regarding these Terms, contact '
        }
      ]
    : [
        {
          title: '1. Предмет соглашения',
          body: 'Настоящее Пользовательское соглашение регулирует использование сайтов, форм, каналов связи и сервиса бронирования трансферов Riderra. Отправляя заявку или используя сервис, пользователь принимает условия настоящего соглашения.'
        },
        {
          title: '2. Описание сервиса',
          body: 'Riderra организует пассажирские перевозки и сопутствующие сервисы с использованием собственной операционной команды и партнерских исполнителей. Возможность выполнения услуги зависит от маршрута, города, класса автомобиля, времени и подтверждения.'
        },
        {
          title: '3. Данные бронирования',
          body: 'Пользователь обязан предоставлять корректные данные по заказу: точку подачи и назначения, дату и время, информацию о рейсе при необходимости, количество пассажиров, багаж и специальные требования.'
        },
        {
          title: '4. Изменение и отмена',
          body: 'Изменения и отмена заказа регулируются условиями услуги, сроками, особенностями маршрута и правилами партнеров. При изменении подтвержденных деталей поездки после назначения возможны дополнительные расходы.'
        },
        {
          title: '5. Стоимость и оплата',
          body: 'Итоговая стоимость подтверждается Riderra при бронировании или подтверждении заказа. Цена может зависеть от маршрута, класса автомобиля, дополнительных услуг, ожидания и локальных условий. Платежные условия могут отличаться в зависимости от сегмента клиента и договоренностей.'
        },
        {
          title: '6. Ограничение ответственности',
          body: 'Riderra предпринимает разумные усилия для организации услуги, но не несет ответственность за задержки, изменения или невозможность оказания услуги, вызванные некорректными данными клиента, форс-мажором, сбоями аэропортов, действиями третьих лиц или обстоятельствами вне разумного контроля.'
        },
        {
          title: '7. Данные и коммуникация',
          body: 'Используя сервис, пользователь соглашается с тем, что Riderra может обрабатывать данные, связанные с бронированием, и связываться с пользователем по вопросам заказа, уточнений, поддержки и уведомлений по услуге.'
        },
        {
          title: '8. Контакты',
          body: 'По вопросам, связанным с условиями использования сервиса, можно написать на '
        }
      ]

  return `<!doctype html>
<html lang="${pageLang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f7fb;
        --card: #ffffff;
        --text: #122033;
        --muted: #5c667a;
        --accent: #2948a3;
        --line: rgba(18, 32, 51, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: linear-gradient(180deg, #f5f7fb 0%, #ffffff 100%);
        color: var(--text);
      }
      .wrap {
        max-width: 920px;
        margin: 0 auto;
        padding: 48px 20px 64px;
      }
      .card {
        background: var(--card);
        border-radius: 24px;
        box-shadow: 0 24px 80px rgba(20, 35, 90, 0.12);
        padding: 40px 48px;
      }
      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 24px;
      }
      .back {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--muted);
        font-size: 14px;
      }
      .back:before { content: "←"; }
      .lang-switch {
        display: inline-flex;
        align-items: center;
        padding: 4px;
        background: rgba(18, 32, 51, 0.06);
        border-radius: 999px;
        border: 1px solid var(--line);
      }
      .lang-switch a,
      .lang-switch span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 48px;
        height: 36px;
        padding: 0 14px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: .04em;
        text-transform: uppercase;
      }
      .lang-switch a { color: var(--muted); text-decoration: none; }
      .lang-switch span {
        background: #fff;
        color: var(--accent);
        box-shadow: 0 4px 18px rgba(20, 35, 90, 0.12);
      }
      .eyebrow {
        margin: 0 0 12px;
        color: var(--accent);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: 40px;
        line-height: 1.08;
      }
      .updated {
        margin: 16px 0 0;
        color: var(--muted);
        font-size: 15px;
      }
      h2 {
        margin: 28px 0 10px;
        font-size: 24px;
        line-height: 1.25;
      }
      p {
        margin: 0 0 16px;
        font-size: 17px;
        line-height: 1.7;
      }
      a { color: var(--accent); }
      @media (max-width: 767px) {
        .wrap { padding-top: 24px; padding-bottom: 36px; }
        .card { padding: 28px 20px; border-radius: 18px; }
        .toolbar { align-items: flex-start; flex-direction: column; }
        h1 { font-size: 30px; }
        h2 { font-size: 21px; }
        p { font-size: 16px; }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <div class="toolbar">
        <a class="back" href="https://riderra.com/">${homeLabel}</a>
        <div class="lang-switch" aria-label="Language switcher">
          ${isEn ? '<a href="/terms">RU</a><span>EN</span>' : '<span>RU</span><a href="/terms/en">EN</a>'}
        </div>
      </div>
      <section class="card">
        <p class="eyebrow">Riderra</p>
        <h1>${h1}</h1>
        <p class="updated">${updated}</p>
        ${sections.map((section, index) => {
          if (index === sections.length - 1) {
            return `<h2>${section.title}</h2><p>${section.body}<a href="mailto:info@riderra.com">info@riderra.com</a>.</p>`
          }
          return `<h2>${section.title}</h2><p>${section.body}</p>`
        }).join('')}
      </section>
    </main>
  </body>
</html>`
}

app.get(['/terms', '/terms/en', '/terms-and-conditions', '/user-agreement'], (req, res) => {
  const lang = req.path.endsWith('/en') || req.query.lang === 'en' ? 'en' : 'ru'
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.status(200).send(renderTermsHtml(lang))
})

function renderDataDeletionHtml(lang = 'ru') {
  const isEn = String(lang || '').toLowerCase() === 'en'
  const pageLang = isEn ? 'en' : 'ru'
  const title = isEn ? 'Data Deletion Instructions | Riderra' : 'Удаление данных пользователей | Riderra'
  const description = isEn
    ? 'How to request deletion or anonymization of personal data processed by Riderra.'
    : 'Как запросить удаление или обезличивание персональных данных, обрабатываемых Riderra.'
  const homeLabel = isEn ? 'Back to Riderra homepage' : 'На главную Riderra'
  const h1 = isEn ? 'Data Deletion Instructions' : 'Удаление данных пользователей'
  const updated = isEn ? 'Last updated: April 14, 2026' : 'Дата обновления: 14 апреля 2026'
  const sections = isEn
    ? [
        {
          title: '1. How to submit a request',
          body: 'Send a request to info@riderra.com with the subject line "Data deletion request". Please include your full name, contact details used with Riderra, and any booking number, email thread, or phone number that helps identify the data to be removed.'
        },
        {
          title: '2. Verification',
          body: 'Riderra may ask for additional information to verify the identity of the requester and prevent accidental or unauthorized deletion of data.'
        },
        {
          title: '3. Processing timeline',
          body: 'After verification, Riderra reviews the request and processes it within a reasonable operational period. If certain records must be retained due to legal, accounting, anti-fraud, or contractual obligations, Riderra may keep the minimum amount of data required for compliance.'
        },
        {
          title: '4. Contact',
          body: 'For data deletion or privacy requests, contact '
        }
      ]
    : [
        {
          title: '1. Как подать запрос',
          body: 'Отправьте запрос на info@riderra.com с темой письма «Запрос на удаление данных». Укажите ваше полное имя, контактные данные, которые использовались при работе с Riderra, а также номер заказа, email-переписку или номер телефона, если они помогают идентифицировать данные.'
        },
        {
          title: '2. Проверка личности',
          body: 'Riderra может запросить дополнительную информацию для подтверждения личности заявителя и предотвращения случайного или несанкционированного удаления данных.'
        },
        {
          title: '3. Срок обработки',
          body: 'После подтверждения личности Riderra рассматривает запрос и исполняет его в разумный операционный срок. Если часть записей должна храниться по закону, для бухгалтерии, антифрода или исполнения договора, Riderra может сохранить минимально необходимый объём данных.'
        },
        {
          title: '4. Контакты',
          body: 'По вопросам удаления данных и конфиденциальности напишите на '
        }
      ]

  return `<!doctype html>
<html lang="${pageLang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f7fb;
        --card: #fff;
        --text: #14235a;
        --muted: #5b6884;
        --accent: #2948a3;
        --line: rgba(20, 35, 90, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: linear-gradient(180deg, #edf3ff 0%, #f8fbff 100%);
        color: var(--text);
      }
      .wrap {
        max-width: 920px;
        margin: 0 auto;
        padding: 42px 20px 60px;
      }
      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 18px;
      }
      .back {
        color: var(--accent);
        text-decoration: none;
        font-weight: 600;
      }
      .lang-switch {
        display: flex;
        gap: 10px;
        font-size: 14px;
      }
      .lang-switch span {
        font-weight: 700;
      }
      .lang-switch a {
        color: var(--accent);
        text-decoration: none;
      }
      .card {
        padding: 34px 34px 28px;
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 24px;
        box-shadow: 0 20px 60px rgba(20, 35, 90, 0.08);
      }
      .eyebrow {
        margin: 0 0 12px;
        color: var(--accent);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: 40px;
        line-height: 1.08;
      }
      .updated {
        margin: 16px 0 0;
        color: var(--muted);
        font-size: 15px;
      }
      h2 {
        margin: 28px 0 10px;
        font-size: 24px;
        line-height: 1.25;
      }
      p {
        margin: 0 0 16px;
        font-size: 17px;
        line-height: 1.7;
      }
      a { color: var(--accent); }
      @media (max-width: 767px) {
        .wrap { padding-top: 24px; padding-bottom: 36px; }
        .card { padding: 28px 20px; border-radius: 18px; }
        .toolbar { align-items: flex-start; flex-direction: column; }
        h1 { font-size: 30px; }
        h2 { font-size: 21px; }
        p { font-size: 16px; }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <div class="toolbar">
        <a class="back" href="https://riderra.com/">${homeLabel}</a>
        <div class="lang-switch" aria-label="Language switcher">
          ${isEn ? '<a href="/data-deletion">RU</a><span>EN</span>' : '<span>RU</span><a href="/data-deletion/en">EN</a>'}
        </div>
      </div>
      <section class="card">
        <p class="eyebrow">Riderra</p>
        <h1>${h1}</h1>
        <p class="updated">${updated}</p>
        ${sections.map((section, index) => {
          if (index === sections.length - 1) {
            return `<h2>${section.title}</h2><p>${section.body}<a href="mailto:info@riderra.com">info@riderra.com</a>.</p>`
          }
          return `<h2>${section.title}</h2><p>${section.body}</p>`
        }).join('')}
      </section>
    </main>
  </body>
</html>`
}

app.get(['/data-deletion', '/data-deletion/en', '/data-deletion-instructions', '/facebook-data-deletion', '/facebook-data-deletion/en'], (req, res) => {
  const lang = req.path.endsWith('/en') || req.query.lang === 'en' ? 'en' : 'ru'
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.status(200).send(renderDataDeletionHtml(lang))
})

// JWT секрет
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required')
}

// Настройки email
const EMAIL_TO = process.env.EMAIL_TO || 'demyanov@riderra.com' // Email получателя заявок
const EMAIL_FROM = process.env.EMAIL_FROM || 'farmout@riderra.com' // Email отправителя
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.yandex.ru' // SMTP хост
const SMTP_PORT = process.env.SMTP_PORT || 587 // SMTP порт
const SMTP_USER = process.env.SMTP_USER || '' // SMTP пользователь (email)
const SMTP_PASS = process.env.SMTP_PASS || '' // SMTP пароль

// Создаем транспортер для отправки email
let transporter = null
if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT) || 587,
    secure: false, // false для порта 587 (TLS), true для 465 (SSL)
    requireTLS: true, // Требуем TLS для порта 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  })
}

// Функция отправки email с заявкой водителя
async function sendDriverRegistrationEmail(data) {
  if (!transporter) {
    console.warn('Email transporter not configured. Set SMTP_USER and SMTP_PASS environment variables.')
    console.warn('SMTP_USER:', SMTP_USER ? 'SET' : 'NOT SET')
    console.warn('SMTP_PASS:', SMTP_PASS ? 'SET' : 'NOT SET')
    return false
  }

  try {
    console.log('Attempting to send email...')
    console.log('EMAIL_FROM:', EMAIL_FROM)
    console.log('EMAIL_TO:', EMAIL_TO)
    console.log('SMTP_HOST:', SMTP_HOST)
    console.log('SMTP_PORT:', SMTP_PORT)
    
    const routesText = data.routes && data.routes.length > 0
      ? data.routes.map((r, idx) => 
          `${idx + 1}. ${r.from || '-'} → ${r.to || '-'} | ${r.price || '-'} ${r.currency || ''}`
        ).join('\n')
      : 'Не указаны'

    const subject = `[Riderra] ${data.lang === 'ru' ? 'Регистрация водителя' : 'Driver registration'}`
    const html = `
      <h2>${data.lang === 'ru' ? 'Новая заявка на регистрацию перевозчика' : 'New driver registration request'}</h2>
      <p><strong>${data.lang === 'ru' ? 'Имя/Компания' : 'Name/Company'}:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>${data.lang === 'ru' ? 'Телефон' : 'Phone'}:</strong> ${data.phone}</p>
      <p><strong>${data.lang === 'ru' ? 'Город/регион работы' : 'City/Operating region'}:</strong> ${data.city || '-'}</p>
      <p><strong>${data.lang === 'ru' ? 'Цена за километр' : 'Price per km'}:</strong> ${data.pricePerKm || '-'}</p>
      <p><strong>${data.lang === 'ru' ? 'Комиссия' : 'Commission'}:</strong> ${data.commissionRate || 15}%</p>
      <p><strong>${data.lang === 'ru' ? 'Фиксированные маршруты' : 'Fixed routes'}:</strong></p>
      <pre>${routesText}</pre>
      ${data.comment ? `<p><strong>${data.lang === 'ru' ? 'Комментарий' : 'Comment'}:</strong> ${data.comment}</p>` : ''}
    `
    const text = `
${data.lang === 'ru' ? 'Новая заявка на регистрацию перевозчика' : 'New driver registration request'}

${data.lang === 'ru' ? 'Имя/Компания' : 'Name/Company'}: ${data.name}
Email: ${data.email}
${data.lang === 'ru' ? 'Телефон' : 'Phone'}: ${data.phone}
${data.lang === 'ru' ? 'Город/регион работы' : 'City/Operating region'}: ${data.city || '-'}
${data.lang === 'ru' ? 'Цена за километр' : 'Price per km'}: ${data.pricePerKm || '-'}
${data.lang === 'ru' ? 'Комиссия' : 'Commission'}: ${data.commissionRate || 15}%
${data.lang === 'ru' ? 'Фиксированные маршруты' : 'Fixed routes'}:
${routesText}
${data.comment ? `${data.lang === 'ru' ? 'Комментарий' : 'Comment'}: ${data.comment}` : ''}
    `

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      subject: subject,
      text: text,
      html: html
    })

    console.log('Email sent successfully! Message ID:', info.messageId)
    console.log('Email response:', info.response)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    console.error('Error code:', error.code)
    console.error('Error command:', error.command)
    console.error('Error response:', error.response)
    console.error('Error responseCode:', error.responseCode)
    console.error('Error stack:', error.stack)
    return false
  }
}

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' })
    }
    req.user = user
    try {
      const [acl, dbUser] = await Promise.all([
        getUserRolesAndPermissions(user.id),
        prisma.user.findUnique({
          where: { id: user.id },
          select: { abacCountries: true, abacCities: true, abacTeams: true }
        })
      ])
      req.userRoles = acl.roles
      req.userPermissions = acl.permissions
      req.userAbac = {
        countries: parseScopeList(dbUser?.abacCountries),
        cities: parseScopeList(dbUser?.abacCities),
        teams: sanitizeTeamScopes(dbUser?.abacTeams)
      }
    } catch (aclError) {
      req.userRoles = []
      req.userPermissions = []
      req.userAbac = { countries: [], cities: [], teams: [] }
    }
    next()
  })
}

// Middleware для проверки роли админа
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin' && !hasPermission(req, 'admin.panel')) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// Middleware для проверки роли водителя
function requireDriver(req, res, next) {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Driver access required' })
  }
  next()
}

function findMatchingRoute(routes, fromPoint, toPoint) {
  const safeFrom = String(fromPoint || '').toLowerCase()
  const safeTo = String(toPoint || '').toLowerCase()
  return routes.find((route) =>
    route.fromPoint.toLowerCase().includes(safeFrom) &&
    route.toPoint.toLowerCase().includes(safeTo)
  )
}

async function getUserRolesAndPermissions(userId) {
  const links = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  })

  const roles = [...new Set(links.map((l) => l.role.code))]
  const permissions = [
    ...new Set(
      links.flatMap((l) => l.role.permissions.map((rp) => rp.permission.code))
    )
  ]
  return { roles, permissions }
}

function normalizeScopeToken(value) {
  return String(value || '').trim().toLowerCase()
}

const ALLOWED_TEAM_SCOPES = new Set([
  'all',
  'coordination',
  'dispatch',
  'ops_control',
  'finance',
  'pricing',
  'sales',
  'audit'
])

function parseScopeList(raw) {
  return String(raw || '')
    .split(/[,\n;|/]+/)
    .map((x) => normalizeScopeToken(x))
    .filter(Boolean)
}

function sanitizeTeamScopes(raw) {
  const values = parseScopeList(raw)
  if (!values.length) return ['all']
  const filtered = [...new Set(values.filter((x) => ALLOWED_TEAM_SCOPES.has(x)))]
  return filtered.length ? filtered : ['all']
}

function hasScopeMatch(actorScopes, targetValue) {
  const scopes = actorScopes || []
  if (!scopes.length) return true
  if (scopes.includes('all') || scopes.includes('*') || scopes.includes('globe')) return true
  if (Array.isArray(targetValue)) {
    const targets = targetValue.map((x) => normalizeScopeToken(x)).filter(Boolean)
    if (!targets.length) return true
    return targets.some((target) => scopes.includes(target))
  }
  const target = normalizeScopeToken(targetValue)
  if (!target) return true
  return scopes.includes(target)
}

function buildGeoScopeWhere(req, countryField = 'country', cityField = 'city') {
  const countries = req.userAbac?.countries || []
  const cities = req.userAbac?.cities || []
  const and = []
  const countriesScoped = countries.length && !countries.includes('all') && !countries.includes('*') && !countries.includes('globe')
  const citiesScoped = cities.length && !cities.includes('all') && !cities.includes('*') && !cities.includes('globe')
  if (countriesScoped) {
    and.push({
      OR: countries.map((country) => ({
        [countryField]: { equals: country, mode: 'insensitive' }
      }))
    })
  }
  if (citiesScoped) {
    and.push({
      OR: cities.map((city) => ({
        [cityField]: { equals: city, mode: 'insensitive' }
      }))
    })
  }
  return and.length ? { AND: and } : {}
}

function buildCityScopeWhere(req, cityField = 'city') {
  const cities = req.userAbac?.cities || []
  if (!cities.length) return {}
  if (cities.includes('all') || cities.includes('*') || cities.includes('globe')) return {}
  return {
    AND: [
      {
        OR: cities.map((city) => ({
          [cityField]: { equals: city, mode: 'insensitive' }
        }))
      }
    ]
  }
}

function inferTeamScopeForAction(action) {
  const map = {
    'pricing.read': ['pricing'],
    'pricing.manage': ['pricing'],
    'directions.read': ['pricing'],
    'directions.manage': ['pricing'],
    'ops.read': ['ops_control'],
    'ops.manage': ['ops_control'],
    'ops.drafts.resolve': ['ops_control'],
    'approvals.resolve': ['ops_control'],
    'drivers.read': ['dispatch', 'ops_control', 'coordination'],
    'drivers.manage': ['dispatch', 'ops_control', 'coordination'],
    'crm.read': ['sales', 'coordination', 'audit'],
    'crm.manage': ['sales', 'coordination', 'audit'],
    'orders.transition.request': ['coordination', 'dispatch', 'ops_control', 'finance'],
    'settings.manage': ['all'],
    'telegram.links.manage': ['all']
  }
  return map[action] || null
}

function can(actor, action, resource, context = {}) {
  if (!actor) return false
  const permissions = actor.permissions || []
  const role = actor.role || actor.actorRole || null
  const actorId = actor.actorId || null
  const actorTenantId = actor.tenantId || null
  const actorCountries = actor.allowedCountries || []
  const actorCities = actor.allowedCities || []
  const actorTeams = actor.allowedTeams || []
  const targetTenantId = context.tenantId || null
  const isSupervisor = role === 'staff_supervisor' || permissions.includes('approvals.resolve')
  const isExternal = ['executor', 'customer', 'passenger'].includes(role)

  if (targetTenantId && actorTenantId && actorTenantId !== targetTenantId) return false
  if (role === 'admin' || permissions.includes('*')) return true
  if (
    isExternal &&
    ['crm.read', 'crm.manage', 'pricing.read', 'pricing.manage', 'settings.manage', 'directions.manage', 'ops.manage', 'approvals.resolve'].includes(action)
  ) return false
  if (!hasScopeMatch(actorCountries, context.country)) return false
  if (!hasScopeMatch(actorCities, context.city)) return false
  if (!hasScopeMatch(actorTeams, context.team)) return false
  if (Array.isArray(context.allowedCurrentStatuses) && context.allowedCurrentStatuses.length > 0) {
    const currentStatus = normalizeScopeToken(context.currentStatus)
    if (!context.allowedCurrentStatuses.map((x) => normalizeScopeToken(x)).includes(currentStatus)) {
      return false
    }
  }

  if (context.ownerUserId && !isSupervisor && actorId && context.ownerUserId !== actorId) return false

  if (context.businessHours?.enabled) {
    const tz = String(context.businessHours.timezone || process.env.BUSINESS_TIMEZONE || 'Europe/Moscow')
    const startHour = Number.isFinite(context.businessHours.startHour) ? context.businessHours.startHour : 6
    const endHour = Number.isFinite(context.businessHours.endHour) ? context.businessHours.endHour : 23
    const hourStr = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: tz
    }).format(new Date())
    const hour = Number.parseInt(hourStr, 10)
    if (!Number.isFinite(hour) || hour < startHour || hour > endHour) {
      return false
    }
  }

  if (action === 'permission.check') {
    if (Array.isArray(context.anyOf) && context.anyOf.length > 0) {
      return context.anyOf.some((code) => permissions.includes(code))
    }
    if (typeof context.permissionCode === 'string' && context.permissionCode) {
      return permissions.includes(context.permissionCode)
    }
    return false
  }

  const actionPermissionMap = {
    'drivers.read': ['drivers.read'],
    'drivers.manage': ['drivers.manage'],
    'orders.read': ['orders.read'],
    'orders.transition.request': [
      'orders.validate',
      'orders.assign',
      'orders.reassign',
      'orders.confirmation.manage',
      'incidents.manage',
      'claims.compose',
      'reconciliation.run',
      'payouts.manage',
      'approvals.resolve'
    ],
    'approvals.resolve': ['approvals.resolve'],
    'directions.read': ['directions.read', 'directions.manage'],
    'directions.manage': ['directions.manage'],
    'settings.manage': ['settings.manage'],
    'crm.read': ['crm.read'],
    'crm.manage': ['crm.manage'],
    'pricing.read': ['pricing.read'],
    'pricing.manage': ['pricing.manage'],
    'ops.read': ['ops.read'],
    'ops.manage': ['ops.manage'],
    'ops.drafts.resolve': ['ops.manage', 'approvals.resolve'],
    'telegram.links.manage': ['telegram.link.manage']
  }

  if (actionPermissionMap[action]) {
    return actionPermissionMap[action].some((code) => permissions.includes(code))
  }

  if (action === 'orders.transition') {
    if (['paid', 'closed'].includes(String(context.toStatus || '').toLowerCase()) && !isSupervisor) {
      return false
    }
    if (role === 'executor') {
      if (!actorId || !context.ownerUserId || context.ownerUserId !== actorId) return false
      const allowedExecutorTargets = ['in_progress', 'completed', 'incident_open']
      if (!allowedExecutorTargets.includes(String(context.toStatus || '').toLowerCase())) return false
    }
    return canTransitionByPermissions(
      permissions,
      context.fromStatus || '',
      context.toStatus || ''
    )
  }

  return false
}

function buildActorFromReq(req) {
  return {
    actorId: req.actorContext?.actorId || req.user?.id || null,
    role: req.user?.role,
    actorRole: req.actorContext?.actorRole,
    permissions: req.userPermissions || [],
    allowedCountries: req.userAbac?.countries || [],
    allowedCities: req.userAbac?.cities || [],
    allowedTeams: req.userAbac?.teams || [],
    tenantId: req.actorContext?.tenantId || null
  }
}

function hasPermission(req, permissionCode) {
  return can(
    buildActorFromReq(req),
    'permission.check',
    'permission',
    { permissionCode, tenantId: req.actorContext?.tenantId || null }
  )
}

function requirePermission(permissionCode) {
  return (req, res, next) => {
    if (!hasPermission(req, permissionCode)) {
      return res.status(403).json({ error: `Permission required: ${permissionCode}` })
    }
    next()
  }
}

function hasAnyPermission(req, permissionCodes) {
  return can(
    buildActorFromReq(req),
    'permission.check',
    'permission',
    { anyOf: permissionCodes, tenantId: req.actorContext?.tenantId || null }
  )
}

function requireCan(action, resource, contextBuilder = null) {
  return async (req, res, next) => {
    try {
      const extraContext = typeof contextBuilder === 'function'
        ? await contextBuilder(req)
        : {}
      const inferredTeam = inferTeamScopeForAction(action)
      const context = {
        tenantId: req.actorContext?.tenantId || null,
        ...(extraContext || {}),
        team: (extraContext && Object.prototype.hasOwnProperty.call(extraContext, 'team'))
          ? extraContext.team
          : inferredTeam
      }
      if (!can(buildActorFromReq(req), action, resource, context)) {
        return res.status(403).json({ error: `Policy denied: ${action} on ${resource}` })
      }
      next()
    } catch (error) {
      console.error('requireCan failed:', error)
      res.status(500).json({ error: 'Policy evaluation failed' })
    }
  }
}

function requireAnyPermission(permissionCodes) {
  return (req, res, next) => {
    if (!hasAnyPermission(req, permissionCodes)) {
      return res.status(403).json({ error: `One of permissions required: ${permissionCodes.join(', ')}` })
    }
    next()
  }
}

async function getConfiguredTenant(tenantCode = null) {
  const code = String(tenantCode || process.env.TENANT_CODE || 'riderra').trim().toLowerCase()
  const tenant = await prisma.tenant.findUnique({
    where: { code }
  })
  if (!tenant || !tenant.isActive) {
    throw new Error(`Tenant "${code}" is not configured or inactive`)
  }
  return tenant
}

async function ensureDefaultTenantMembership(userId, role = 'staff') {
  const tenant = await getConfiguredTenant()
  const membership = await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId } },
    update: { isActive: true },
    create: {
      tenantId: tenant.id,
      userId,
      role,
      isActive: true
    }
  })
  return { tenant, membership }
}

async function resolveActorContext(req, res, next) {
  try {
    const traceId = String(req.headers['x-trace-id'] || '').trim() || crypto.randomUUID()
    const requestedTenantCode = String(req.headers['x-tenant-code'] || req.query.tenant_code || req.body?.tenant_code || '').trim().toLowerCase()
    const isAuthenticated = !!req.user?.id

    if (!isAuthenticated) {
      const tenant = await getConfiguredTenant(requestedTenantCode || null)
      if (!tenant || !tenant.isActive) return res.status(403).json({ error: 'Tenant is not active or not found' })
      req.actorContext = {
        traceId,
        tenantId: tenant.id,
        tenantCode: tenant.code,
        actorId: null,
        actorRole: 'system',
        channel: 'api',
        chatType: 'service'
      }
      return next()
    }

    let membership = null
    if (requestedTenantCode) {
      membership = await prisma.tenantMembership.findFirst({
        where: {
          userId: req.user.id,
          isActive: true,
          tenant: { code: requestedTenantCode, isActive: true }
        },
        include: { tenant: true }
      })
      if (!membership) {
        return res.status(403).json({ error: 'Tenant mismatch or no membership for requested tenant' })
      }
    } else {
      membership = await prisma.tenantMembership.findFirst({
        where: { userId: req.user.id, isActive: true, tenant: { isActive: true } },
        include: { tenant: true },
        orderBy: { createdAt: 'asc' }
      })
    }

    if (!membership) {
      return res.status(403).json({ error: 'No active tenant membership found' })
    }

    req.actorContext = {
      traceId,
      tenantId: membership.tenantId,
      tenantCode: membership.tenant.code,
      actorId: req.user.id,
      actorRole: membership.role || req.user.role || 'staff',
      channel: 'api',
      chatType: 'dm'
    }
    next()
  } catch (error) {
    console.error('resolveActorContext failed:', error)
    res.status(500).json({ error: 'Failed to resolve actor context' })
  }
}

function requireActorContext(req, res, next) {
  if (!req.actorContext?.tenantId) {
    return res.status(403).json({ error: 'Tenant context required' })
  }
  next()
}

async function writeAuditLog({
  tenantId,
  actorId = null,
  actorRole = null,
  action,
  resource,
  resourceId = null,
  traceId,
  decision = null,
  result = 'ok',
  context = null
}) {
  if (!tenantId || !traceId || !action || !resource) return
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId,
        actorRole,
        action,
        resource,
        resourceId,
        traceId,
        decision,
        result,
        contextJson: context ? JSON.stringify(context) : null
      }
    })
  } catch (error) {
    console.error('Audit log write failed:', error)
  }
}

function getIdempotencyKey(req) {
  return String(
    req.headers['idempotency-key'] ||
    req.body?.idempotency_key ||
    req.body?.idempotencyKey ||
    req.query?.idempotency_key ||
    ''
  ).trim()
}

function ensureIdempotencyKey(req, action, payload = {}) {
  if (getIdempotencyKey(req)) return
  const tenantId = req.actorContext?.tenantId || 'tenant'
  const actorId = req.actorContext?.actorId || 'actor'
  const fingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify({ tenantId, actorId, action, payload }))
    .digest('hex')
    .slice(0, 24)
  if (!req.body || typeof req.body !== 'object') req.body = {}
  req.body.idempotency_key = `auto:${action}:${fingerprint}`
}

async function withIdempotency(req, action, requestPayload, operation) {
  const idempotencyKey = getIdempotencyKey(req)
  if (!idempotencyKey) {
    const error = new Error('idempotency_key is required')
    error.statusCode = 400
    throw error
  }
  const tenantId = req.actorContext?.tenantId
  if (!tenantId) {
    const error = new Error('tenant context required for idempotency')
    error.statusCode = 403
    throw error
  }
  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(requestPayload || {}))
    .digest('hex')

  let keyRow = await prisma.idempotencyKey.findUnique({
    where: {
      tenantId_key_action: {
        tenantId,
        key: idempotencyKey,
        action
      }
    }
  })

  if (keyRow?.status === 'completed' && keyRow.responseJson) {
    return { replayed: true, data: JSON.parse(keyRow.responseJson) }
  }
  if (keyRow?.status === 'processing') {
    const error = new Error('idempotent request in progress')
    error.statusCode = 409
    throw error
  }

  if (!keyRow) {
    try {
      keyRow = await prisma.idempotencyKey.create({
        data: {
          tenantId,
          key: idempotencyKey,
          action,
          requestHash,
          status: 'processing',
          traceId: req.actorContext?.traceId || null
        }
      })
    } catch (_) {
      keyRow = await prisma.idempotencyKey.findUnique({
        where: {
          tenantId_key_action: {
            tenantId,
            key: idempotencyKey,
            action
          }
        }
      })
      if (keyRow?.status === 'completed' && keyRow.responseJson) {
        return { replayed: true, data: JSON.parse(keyRow.responseJson) }
      }
    }
  }

  const result = await operation()
  await prisma.idempotencyKey.update({
    where: { id: keyRow.id },
    data: {
      status: 'completed',
      requestHash,
      responseJson: JSON.stringify(result),
      traceId: req.actorContext?.traceId || null
    }
  })
  return { replayed: false, data: result }
}

async function ensureHumanApproval(req, {
  action,
  resource,
  resourceId = null,
  payload,
  required = false
}) {
  if (!required) return { approved: true, approval: null }
  const tenantId = req.actorContext?.tenantId
  if (!tenantId) {
    const error = new Error('Tenant context required')
    error.statusCode = 403
    throw error
  }
  const approvalId = String(req.body?.approvalId || req.headers['x-approval-id'] || '').trim()
  if (approvalId) {
    const approved = await prisma.humanApproval.findFirst({
      where: {
        id: approvalId,
        tenantId,
        action,
        resource,
        resourceId: resourceId || null,
        status: 'approved'
      }
    })
    if (approved) return { approved: true, approval: approved }
  }

  const existing = await prisma.humanApproval.findFirst({
    where: {
      tenantId,
      action,
      resource,
      resourceId: resourceId || null,
      status: 'pending_human'
    },
    orderBy: { createdAt: 'desc' }
  })
  if (existing) {
    const error = new Error('pending_human approval required')
    error.statusCode = 409
    error.details = { code: 'pending_human', approvalId: existing.id }
    throw error
  }

  const created = await prisma.humanApproval.create({
    data: {
      tenantId,
      action,
      resource,
      resourceId: resourceId || null,
      payloadJson: JSON.stringify(payload || {}),
      requesterId: req.actorContext?.actorId || null,
      traceId: req.actorContext?.traceId || null,
      status: 'pending_human',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  })
  const error = new Error('pending_human approval required')
  error.statusCode = 409
  error.details = { code: 'pending_human', approvalId: created.id }
  throw error
}

function normalizeVpnStatus(status) {
  const value = String(status || '').trim().toLowerCase()
  if (['active', 'disabled', 'pending'].includes(value)) return value
  return 'pending'
}

function normalizeVpnSyncState(state) {
  const value = String(state || '').trim().toLowerCase()
  if (['pending', 'applied', 'error'].includes(value)) return value
  return 'pending'
}

function buildDefaultVpnProfile(tenantId = null) {
  return {
    id: null,
    tenantId,
    name: String(process.env.VPN_PROFILE_NAME || 'Riderra Corporate VPN').trim() || 'Riderra Corporate VPN',
    serverHost: String(process.env.VPN_SERVER_HOST || '').trim(),
    serverPort: Number(process.env.VPN_SERVER_PORT || 443) || 443,
    protocol: String(process.env.VPN_PROTOCOL || 'vless').trim() || 'vless',
    security: String(process.env.VPN_SECURITY || 'reality').trim() || 'reality',
    transport: String(process.env.VPN_TRANSPORT || 'tcp').trim() || 'tcp',
    flow: String(process.env.VPN_FLOW || 'xtls-rprx-vision').trim() || 'xtls-rprx-vision',
    publicKey: String(process.env.VPN_REALITY_PUBLIC_KEY || '').trim(),
    shortId: String(process.env.VPN_REALITY_SHORT_ID || '').trim(),
    serverName: String(process.env.VPN_SERVER_NAME || '').trim(),
    fingerprint: String(process.env.VPN_FINGERPRINT || 'chrome').trim() || 'chrome',
    isActive: true,
    notes: String(process.env.VPN_NOTES || '').trim() || null
  }
}

function sanitizeVpnProfileInput(input = {}, tenantId) {
  return {
    tenantId,
    name: String(input.name || 'Riderra Corporate VPN').trim() || 'Riderra Corporate VPN',
    serverHost: String(input.serverHost || '').trim(),
    serverPort: Math.max(1, Math.min(65535, Number(input.serverPort || 443) || 443)),
    protocol: String(input.protocol || 'vless').trim().toLowerCase() || 'vless',
    security: String(input.security || 'reality').trim().toLowerCase() || 'reality',
    transport: String(input.transport || 'tcp').trim().toLowerCase() || 'tcp',
    flow: String(input.flow || 'xtls-rprx-vision').trim() || 'xtls-rprx-vision',
    publicKey: String(input.publicKey || '').trim(),
    shortId: String(input.shortId || '').trim(),
    serverName: String(input.serverName || '').trim(),
    fingerprint: String(input.fingerprint || 'chrome').trim() || 'chrome',
    isActive: input.isActive !== false,
    notes: String(input.notes || '').trim() || null
  }
}

function sanitizeVpnGrantInput(input = {}, profile = null) {
  const status = normalizeVpnStatus(input.status)
  const syncState = normalizeVpnSyncState(input.syncState)
  const employeeEmail = String(input.employeeEmail || '').trim().toLowerCase() || null
  const employeeLogin = String(input.employeeLogin || '').trim() || null
  const deviceName = String(input.deviceName || '').trim()
  return {
    employeeName: String(input.employeeName || '').trim(),
    employeeEmail,
    employeeLogin,
    deviceName,
    uuid: String(input.uuid || crypto.randomUUID()).trim(),
    status,
    comment: String(input.comment || '').trim() || null,
    connectionLabel: String(input.connectionLabel || '').trim() || null,
    syncState,
    profileId: input.profileId || profile?.id || null,
    disabledAt: status === 'disabled' ? new Date() : null,
    appliedAt: syncState === 'applied' ? new Date() : null,
    lastSyncError: String(input.lastSyncError || '').trim() || null
  }
}

function buildVpnConnectionBundle(profile, grant) {
  const serverHost = String(profile?.serverHost || '').trim()
  const serverPort = Number(profile?.serverPort || 443) || 443
  const protocol = String(profile?.protocol || 'vless').trim() || 'vless'
  const security = String(profile?.security || 'reality').trim() || 'reality'
  const transport = String(profile?.transport || 'tcp').trim() || 'tcp'
  const flow = String(profile?.flow || 'xtls-rprx-vision').trim() || 'xtls-rprx-vision'
  const publicKey = String(profile?.publicKey || '').trim()
  const shortId = String(profile?.shortId || '').trim()
  const serverName = String(profile?.serverName || '').trim()
  const fingerprint = String(profile?.fingerprint || 'chrome').trim() || 'chrome'
  const uuid = String(grant?.uuid || '').trim()
  const label = encodeURIComponent(String(grant?.connectionLabel || `${grant?.employeeName || 'Riderra'} ${grant?.deviceName || ''}`).trim())
  const url = `${protocol}://${uuid}@${serverHost}:${serverPort}?type=${encodeURIComponent(transport)}&security=${encodeURIComponent(security)}&pbk=${encodeURIComponent(publicKey)}&fp=${encodeURIComponent(fingerprint)}&sni=${encodeURIComponent(serverName)}&sid=${encodeURIComponent(shortId)}&flow=${encodeURIComponent(flow)}&encryption=none#${label}`
  const lines = [
    `Server: ${serverHost}`,
    `Port: ${serverPort}`,
    `UUID: ${uuid}`,
    `Protocol: ${protocol.toUpperCase()}`,
    `Transport: ${transport}`,
    `Security: ${security.toUpperCase()}`,
    `Flow: ${flow}`,
    `Public Key: ${publicKey}`,
    `Short ID: ${shortId}`,
    `Server Name (SNI): ${serverName}`,
    `Fingerprint: ${fingerprint}`,
    '',
    'Steps:',
    '1. Install a VLESS/REALITY capable client such as v2RayTun, Hiddify, Streisand, v2Box or Nekoray.',
    '2. Create a new VLESS connection.',
    '3. Copy the parameters below or import the URI.',
    '4. Save the profile and connect.'
  ]

  return {
    serverHost,
    serverPort,
    protocol,
    security,
    transport,
    flow,
    publicKey,
    shortId,
    serverName,
    fingerprint,
    uuid,
    uri: url,
    text: lines.join('\n')
  }
}

function normalizeOrderStatus(status) {
  return String(status || '').trim().toLowerCase()
}

const ORDER_STATUS_TRANSITIONS = {
  draft: ['waiting_info', 'validated', 'pending_dispatch', 'cancelled'],
  waiting_info: ['validated', 'cancelled'],
  validated: ['pending_dispatch', 'cancelled'],
  pending_dispatch: ['assigned', 'dispatch_risk', 'cancelled', 'waiting_info'],
  dispatch_risk: ['pending_dispatch', 'assigned', 'cancelled'],
  assigned: ['assigned', 'accepted', 'pending_ops_control', 'cancelled', 'waiting_info'],
  accepted: ['pending_ops_control', 'in_progress', 'completed', 'cancelled'],
  pending_ops_control: ['confirmed', 'cancelled', 'waiting_info'],
  confirmed: ['in_progress', 'incident_open', 'ready_finance', 'cancelled'],
  in_progress: ['incident_open', 'completed', 'ready_finance', 'cancelled'],
  incident_open: ['incident_reported', 'ready_finance', 'cancelled'],
  incident_reported: ['ready_finance', 'cancelled'],
  completed: ['ready_finance', 'cancelled'],
  ready_finance: ['finance_hold', 'paid', 'cancelled'],
  finance_hold: ['ready_finance', 'paid', 'cancelled'],
  paid: ['closed'],
  closed: [],
  pending: ['assigned', 'pending_ops_control', 'cancelled'],
  cancelled: []
}

function canTransitionByPermissions(perms, fromStatus, toStatus) {
  const from = normalizeOrderStatus(fromStatus)
  const to = normalizeOrderStatus(toStatus)
  const allowedTargets = ORDER_STATUS_TRANSITIONS[from] || []
  if (!allowedTargets.includes(to)) return false
  if (perms.includes('*') || perms.includes('approvals.resolve')) return true

  const has = (code) => perms.includes(code)
  const byDomain = {
    'orders.create_draft': [['new', 'draft']],
    'orders.validate': [['draft', 'waiting_info'], ['draft', 'validated'], ['waiting_info', 'validated'], ['validated', 'pending_dispatch']],
    'orders.assign': [
      ['pending', 'assigned'],
      ['pending_dispatch', 'assigned'],
      ['dispatch_risk', 'assigned'],
      ['pending_dispatch', 'waiting_info'],
      ['assigned', 'waiting_info'],
      ['dispatch_risk', 'waiting_info']
    ],
    'orders.reassign': [['assigned', 'assigned']],
    'orders.confirmation.manage': [
      ['assigned', 'pending_ops_control'],
      ['accepted', 'pending_ops_control'],
      ['pending_ops_control', 'confirmed'],
      ['confirmed', 'in_progress'],
      ['in_progress', 'completed'],
      ['confirmed', 'ready_finance'],
      ['completed', 'ready_finance'],
      ['pending_ops_control', 'waiting_info']
    ],
    'incidents.manage': [
      ['confirmed', 'incident_open'],
      ['in_progress', 'incident_open'],
      ['incident_open', 'incident_reported'],
      ['incident_reported', 'ready_finance']
    ],
    'claims.compose': [['incident_open', 'incident_reported']],
    'reconciliation.run': [['ready_finance', 'finance_hold'], ['finance_hold', 'ready_finance']],
    'payouts.manage': [['ready_finance', 'paid'], ['finance_hold', 'paid'], ['paid', 'closed']]
  }

  for (const [permCode, pairs] of Object.entries(byDomain)) {
    if (!has(permCode)) continue
    if (pairs.some(([a, b]) => a === from && b === to)) return true
  }

  if (to === 'cancelled' && (has('orders.assign') || has('orders.reassign') || has('orders.confirmation.manage') || has('incidents.manage'))) {
    return true
  }

  return false
}

function isKnownOrderStatus(status) {
  const normalized = normalizeOrderStatus(status)
  return Object.prototype.hasOwnProperty.call(ORDER_STATUS_TRANSITIONS, normalized)
}

function normalizeIncomingOrderStatus(status, fallback = 'pending') {
  const normalized = normalizeOrderStatus(status)
  if (!normalized) return fallback
  return isKnownOrderStatus(normalized) ? normalized : fallback
}

function appendOrderComment(comment, reason) {
  if (!reason) return comment
  return [comment, reason].filter(Boolean).join('\n')
}

async function applyOrderStatusTransition({
  orderId,
  tenantId = null,
  toStatus,
  reason = null,
  actorPermissions = [],
  actorRole = null,
  actorUserId = null,
  actorEmail = null,
  source = 'system',
  bypassPermissions = false,
  tx = prisma
}) {
  const targetStatus = normalizeOrderStatus(toStatus)
  if (!targetStatus) {
    const error = new Error('toStatus is required')
    error.statusCode = 400
    throw error
  }

  const order = await tx.order.findFirst({
    where: {
      id: orderId,
      ...(tenantId ? { tenantId } : {})
    },
    include: {
      driver: {
        select: { userId: true }
      }
    }
  })
  if (!order) {
    const error = new Error('Order not found')
    error.statusCode = 404
    throw error
  }

  const currentStatus = normalizeOrderStatus(order.status)
  const allowedTargets = ORDER_STATUS_TRANSITIONS[currentStatus] || []
  if (currentStatus !== targetStatus && !allowedTargets.includes(targetStatus)) {
    const error = new Error(`Transition denied: ${currentStatus} -> ${targetStatus}`)
    error.statusCode = 403
    error.details = { currentStatus, targetStatus }
    throw error
  }

  if (!bypassPermissions && !can(
    {
      permissions: actorPermissions || [],
      tenantId: tenantId || order.tenantId || null,
      actorId: actorUserId || null,
      actorRole: actorRole || null
    },
    'orders.transition',
    'order',
    {
      tenantId: tenantId || order.tenantId || null,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      ownerUserId: order.driver?.userId || null
    }
  )) {
    const error = new Error(`Transition denied: ${currentStatus} -> ${targetStatus}`)
    error.statusCode = 403
    error.details = { currentStatus, targetStatus }
    throw error
  }

  const nextComment = appendOrderComment(
    order.comment,
    reason ? `[status:${currentStatus}->${targetStatus}] ${reason}` : null
  )
  const patch = {}
  if (currentStatus !== targetStatus) patch.status = targetStatus
  if (nextComment !== order.comment) patch.comment = nextComment

  const shouldLogHistory = currentStatus !== targetStatus
  if (Object.keys(patch).length === 0 && !shouldLogHistory) {
    return order
  }

  const updatedOrder = Object.keys(patch).length === 0
    ? order
    : await tx.order.update({
    where: { id: order.id },
    data: patch
  })

  if (shouldLogHistory) {
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        tenantId: order.tenantId || tenantId || null,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        reason: reason || null,
        actorUserId,
        actorEmail,
        source
      }
    })
  }

  return updatedOrder
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function pickField(row, aliases) {
  const normalized = Object.entries(row).reduce((acc, [key, value]) => {
    acc[normalizeHeader(key)] = value
    return acc
  }, {})
  for (const alias of aliases) {
    const value = normalized[normalizeHeader(alias)]
    if (value !== undefined && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return null
}

function parseColumnMapping(raw) {
  if (!raw) return {}
  if (typeof raw === 'object' && raw !== null) return raw
  try {
    const parsed = JSON.parse(String(raw))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (_) {
    return {}
  }
}

function aliasesWithMapping(defaultAliases, mapping, key) {
  const customHeader = mapping && mapping[key] ? String(mapping[key]).trim() : ''
  if (!customHeader) return defaultAliases
  return [customHeader, ...defaultAliases]
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function toFloat(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback
  const normalized = String(value).replace(',', '.').replace(/[^\d.\-]/g, '')
  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toInt(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = parseInt(String(value).replace(/[^\d\-]/g, ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseDateTimeFlexible(input) {
  if (!input) return null
  const raw = String(input).trim()
  if (!raw) return null

  const isoAttempt = new Date(raw)
  if (!Number.isNaN(isoAttempt.getTime())) return isoAttempt

  // dd.mm.yyyy [hh:mm]
  const ru = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/)
  if (ru) {
    const [, d, m, y, hh = '0', mm = '0'] = ru
    const dt = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      0,
      0
    )
    if (!Number.isNaN(dt.getTime())) return dt
  }

  // yyyy-mm-dd [hh:mm]
  const en = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/)
  if (en) {
    const [, y, m, d, hh = '0', mm = '0'] = en
    const dt = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      0,
      0
    )
    if (!Number.isNaN(dt.getTime())) return dt
  }

  return null
}

function parseDateBoundary(input, boundary = 'start') {
  const raw = String(input || '').trim()
  if (!raw) return null

  const dateOnlyRu = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dateOnlyRu) {
    const [, d, m, y] = dateOnlyRu
    return boundary === 'end'
      ? new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999)
      : new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0)
  }

  const dateOnlyEn = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (dateOnlyEn) {
    const [, y, m, d] = dateOnlyEn
    return boundary === 'end'
      ? new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999)
      : new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0)
  }

  return parseDateTimeFlexible(raw)
}

async function getGoogleAccessToken() {
  const serviceAccountFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE
  if (!serviceAccountFile) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_FILE is not configured')
  }

  const fileContents = await fs.readFile(serviceAccountFile, 'utf8')
  const serviceAccount = JSON.parse(fileContents)
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Invalid service account JSON: missing client_email/private_key')
  }

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }

  const encodedHeader = toBase64Url(JSON.stringify(header))
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsignedToken)
  signer.end()
  const signature = signer
    .sign(serviceAccount.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  const assertion = `${unsignedToken}.${signature}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  })

  if (!tokenResponse.ok) {
    const details = await tokenResponse.text()
    throw new Error(`Failed to get Google access token: ${details}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

function normalizeGoogleSheetId(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (match && match[1]) return match[1]
  return raw
}

async function fetchGoogleSheetRows(sheetSource) {
  const accessToken = await getGoogleAccessToken()
  const tabName = String(sheetSource.tabName || '').trim() || 'таблица'
  const range = `${tabName}!A:AZ`
  const sheetId = normalizeGoogleSheetId(sheetSource.googleSheetId)
  if (!sheetId) {
    throw new Error('Google Sheet ID is empty')
  }
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Failed to read Google Sheet: ${details}`)
  }
  const data = await response.json()
  return data.values || []
}

async function syncSheetSource(sheetSourceId, tenantId) {
  if (!tenantId) {
    const error = new Error('tenantId is required for sheet sync')
    error.statusCode = 403
    throw error
  }
  const source = await prisma.sheetSource.findFirst({ where: { id: sheetSourceId, tenantId } })
  if (!source) {
    throw new Error('Sheet source not found')
  }
  if (!source.syncEnabled) {
    throw new Error('Sync is disabled for this source')
  }
  const effectiveTenantId = tenantId

  const rows = await fetchGoogleSheetRows(source)
  if (rows.length === 0) {
    await prisma.sheetSource.update({
      where: { id: source.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'success',
        lastSyncError: null
      }
    })
    return { created: 0, updated: 0, unchanged: 0, errors: 0, total: 0 }
  }

  const headers = rows[0].map((h) => String(h || '').trim())
  const mapping = parseColumnMapping(source.columnMapping)
  const stats = { created: 0, updated: 0, unchanged: 0, errors: 0, total: 0 }

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i]
    if (!cells || cells.every((cell) => String(cell || '').trim() === '')) {
      continue
    }
    stats.total++

    const sourceRow = i + 1
    const raw = {}
    headers.forEach((header, idx) => {
      if (header) raw[header] = cells[idx] !== undefined ? String(cells[idx]).trim() : ''
    })
    const rowHash = crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex')

    const latestSnapshot = await prisma.orderSourceSnapshot.findFirst({
      where: { sheetSourceId: source.id, sourceRow },
      orderBy: { createdAt: 'desc' }
    })
    if (latestSnapshot && latestSnapshot.rowHash === rowHash) {
      stats.unchanged++
      continue
    }

    try {
      const externalKey =
        pickField(raw, aliasesWithMapping(['external key', 'order id', 'номер заказа', 'id', 'номер'], mapping, 'orderNumber')) ||
        `${source.googleSheetId}:${source.tabName}:${sourceRow}`

      const fromPoint = pickField(raw, aliasesWithMapping(['from', 'откуда', 'адрес подачи', 'pickup'], mapping, 'fromPoint')) || 'UNKNOWN'
      const toPoint = pickField(raw, aliasesWithMapping(['to', 'куда', 'адрес назначения', 'dropoff'], mapping, 'toPoint')) || 'UNKNOWN'
      const vehicleType = pickField(raw, aliasesWithMapping(['vehicle type', 'тип авто', 'класс', 'class'], mapping, 'vehicleType')) || 'standard'
      const clientPrice = toFloat(pickField(raw, aliasesWithMapping(['price', 'цена', 'стоимость', 'сумма', 'client price'], mapping, 'sum')), 0)
      const passengers = toInt(pickField(raw, aliasesWithMapping(['passengers', 'пассажиры', 'pax'], mapping, 'passengers')), null)
      const luggage = toInt(pickField(raw, aliasesWithMapping(['luggage', 'багаж'], mapping, 'luggage')), null)
      const pickupRaw = pickField(raw, aliasesWithMapping([
        'pickup datetime',
        'pickup time',
        'дата и время подачи',
        'дата подачи',
        'дата',
        'время'
      ], mapping, 'date'))
      const pickupAt = parseDateTimeFlexible(pickupRaw)
      const lang = pickField(raw, aliasesWithMapping(['lang', 'язык'], mapping, 'lang')) || null
      const comment = pickField(raw, aliasesWithMapping(['comment', 'комментарий', 'примечание'], mapping, 'comment')) || null
      const incomingStatus = normalizeIncomingOrderStatus(
        pickField(raw, aliasesWithMapping(['status', 'статус'], mapping, 'status')) || 'pending',
        'pending'
      )
      const orderPayload = {
        source: 'google_sheet',
        sourceRow,
        fromPoint,
        toPoint,
        vehicleType,
        clientPrice,
        passengers,
        luggage,
        pickupAt,
        lang,
        comment
      }

      const existingOrder = await prisma.order.findUnique({
        where: { externalKey },
        select: { id: true, status: true, tenantId: true }
      })

      let upserted
      if (!existingOrder) {
        upserted = await prisma.order.create({
          data: {
            externalKey,
            ...orderPayload,
            tenantId: effectiveTenantId,
            status: incomingStatus
          }
        })
      } else {
        if (existingOrder.tenantId && existingOrder.tenantId !== effectiveTenantId) {
          throw new Error(`Tenant mismatch for order externalKey=${externalKey}`)
        }
        upserted = await prisma.order.update({
          where: { id: existingOrder.id },
          data: { ...orderPayload, tenantId: existingOrder.tenantId || effectiveTenantId }
        })
        if (normalizeOrderStatus(existingOrder.status) !== incomingStatus) {
          try {
            upserted = await applyOrderStatusTransition({
              orderId: existingOrder.id,
              tenantId: existingOrder.tenantId || effectiveTenantId,
              toStatus: incomingStatus,
              reason: `Synced from Google Sheet source "${source.name || source.id}"`,
              source: 'google_sheet_sync',
              bypassPermissions: true
            })
          } catch (statusError) {
            console.warn(`Status sync skipped for order ${existingOrder.id}: ${statusError.message}`)
          }
        }
      }

      await prisma.orderSourceSnapshot.create({
        data: {
          orderId: upserted.id,
          tenantId: upserted.tenantId || effectiveTenantId,
          sheetSourceId: source.id,
          sourceRow,
          rowHash,
          rawPayload: JSON.stringify(raw)
        }
      })

      if (!latestSnapshot) stats.created++
      else stats.updated++
    } catch (error) {
      stats.errors++
      await prisma.orderSourceSnapshot.create({
        data: {
          orderId: null,
          tenantId: effectiveTenantId,
          sheetSourceId: source.id,
          sourceRow,
          rowHash,
          rawPayload: JSON.stringify({ row: raw, error: error.message || 'unknown error' })
        }
      })
    }
  }

  await prisma.sheetSource.update({
    where: { id: source.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncStatus: stats.errors > 0 ? 'partial_success' : 'success',
      lastSyncError: stats.errors > 0 ? `${stats.errors} rows failed` : null
    }
  })

  return stats
}

async function promoteStagingToCustomerCrm(tenantId) {
  const stats = {
    companies: { upserted: 0 },
    contacts: { upserted: 0 },
    companySegments: { upserted: 0 },
    contactSegments: { upserted: 0 },
    links: { upserted: 0 }
  }

  const stagingCompanies = await prisma.crmCompany.findMany({
    where: tenantId ? { tenantId } : undefined
  })
  const stagingContacts = await prisma.crmContact.findMany({
    where: tenantId ? { tenantId } : undefined
  })
  const stagingCompanySegments = await prisma.crmCompanySegment.findMany({
    where: tenantId ? { company: { tenantId } } : undefined,
    include: { company: true }
  })
  const stagingContactSegments = await prisma.crmContactSegment.findMany({
    where: tenantId ? { contact: { tenantId } } : undefined,
    include: { contact: true }
  })
  const stagingLinks = await prisma.crmCompanyContact.findMany({
    where: tenantId ? { company: { tenantId }, contact: { tenantId } } : undefined,
    include: { company: true, contact: true }
  })

  for (const row of stagingCompanies) {
    await prisma.customerCompany.upsert({
      where: {
        sourceSystem_externalId: {
          sourceSystem: row.sourceSystem,
          externalId: row.externalId
        }
      },
      update: {
        name: row.name,
        website: row.website,
        phone: row.phone,
        email: row.email,
        telegramUrl: row.telegramUrl,
        registrationCountry: row.countryPresence,
        presenceCities: row.cityPresence,
        countryPresence: row.countryPresence,
        cityPresence: row.cityPresence,
        comment: row.comment,
        ownerName: row.ownerName,
        companyType: row.companyType,
        extraInfo: row.extraInfo
      },
      create: {
        tenantId: tenantId || row.tenantId || null,
        sourceSystem: row.sourceSystem,
        externalId: row.externalId,
        name: row.name,
        website: row.website,
        phone: row.phone,
        email: row.email,
        telegramUrl: row.telegramUrl,
        registrationCountry: row.countryPresence,
        presenceCities: row.cityPresence,
        countryPresence: row.countryPresence,
        cityPresence: row.cityPresence,
        comment: row.comment,
        ownerName: row.ownerName,
        companyType: row.companyType,
        extraInfo: row.extraInfo
      }
    })
    stats.companies.upserted++
  }

  for (const row of stagingContacts) {
    await prisma.customerContact.upsert({
      where: {
        sourceSystem_externalId: {
          sourceSystem: row.sourceSystem,
          externalId: row.externalId
        }
      },
      update: {
        fullName: row.fullName,
        website: row.website,
        phone: row.phone,
        email: row.email,
        telegramUrl: row.telegramUrl,
        registrationCountry: row.countryPresence,
        presenceCities: row.cityPresence,
        countryPresence: row.countryPresence,
        cityPresence: row.cityPresence,
        comment: row.comment,
        position: row.position,
        ownerName: row.ownerName
      },
      create: {
        tenantId: tenantId || row.tenantId || null,
        sourceSystem: row.sourceSystem,
        externalId: row.externalId,
        fullName: row.fullName,
        website: row.website,
        phone: row.phone,
        email: row.email,
        telegramUrl: row.telegramUrl,
        registrationCountry: row.countryPresence,
        presenceCities: row.cityPresence,
        countryPresence: row.countryPresence,
        cityPresence: row.cityPresence,
        comment: row.comment,
        position: row.position,
        ownerName: row.ownerName
      }
    })
    stats.contacts.upserted++
  }

  const customerCompanies = await prisma.customerCompany.findMany({
    where: tenantId ? { tenantId } : undefined,
    select: { id: true, sourceSystem: true, externalId: true }
  })
  const customerContacts = await prisma.customerContact.findMany({
    where: tenantId ? { tenantId } : undefined,
    select: { id: true, sourceSystem: true, externalId: true }
  })

  const companyMap = new Map(
    customerCompanies.map((c) => [`${c.sourceSystem}:${c.externalId}`, c.id])
  )
  const contactMap = new Map(
    customerContacts.map((c) => [`${c.sourceSystem}:${c.externalId}`, c.id])
  )

  for (const row of stagingCompanySegments) {
    const companyId = companyMap.get(`${row.company.sourceSystem}:${row.company.externalId}`)
    if (!companyId) continue
    await prisma.customerCompanySegment.upsert({
      where: { companyId_segment: { companyId, segment: row.segment } },
      update: { sourceFile: row.sourceFile },
      create: { companyId, segment: row.segment, sourceFile: row.sourceFile }
    })
    stats.companySegments.upserted++
  }

  for (const row of stagingContactSegments) {
    const contactId = contactMap.get(`${row.contact.sourceSystem}:${row.contact.externalId}`)
    if (!contactId) continue
    await prisma.customerContactSegment.upsert({
      where: { contactId_segment: { contactId, segment: row.segment } },
      update: { sourceFile: row.sourceFile },
      create: { contactId, segment: row.segment, sourceFile: row.sourceFile }
    })
    stats.contactSegments.upserted++
  }

  for (const row of stagingLinks) {
    const companyId = companyMap.get(`${row.company.sourceSystem}:${row.company.externalId}`)
    const contactId = contactMap.get(`${row.contact.sourceSystem}:${row.contact.externalId}`)
    if (!companyId || !contactId) continue
    await prisma.customerCompanyContact.upsert({
      where: { companyId_contactId: { companyId, contactId } },
      update: { source: row.source, matchType: row.matchType },
      create: { companyId, contactId, source: row.source, matchType: row.matchType }
    })
    stats.links.upserted++
  }

  return stats
}

app.post('/api/requests', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { name, email, phone, fromPoint, toPoint, date, passengers, luggage, comment, lang } = req.body
    const created = await prisma.request.create({ data: {
      tenantId: req.actorContext.tenantId,
      name, email, phone, fromPoint, toPoint,
      date: date ? new Date(date) : null,
      passengers: passengers ?? null,
      luggage: luggage ?? null,
      comment: comment ?? null,
      lang: lang ?? null
    }})
    res.json(created)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

app.post('/api/drivers', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      country,
      city,
      fixedRoutes,
      fixedRoutesJson,
      pricePerKm,
      kmRate,
      hourlyRate,
      childSeatPrice,
      pricingCurrency,
      comment,
      lang,
      commissionRate,
      routes
    } = req.body
    
    console.log('Received driver registration:', { name, email, phone, city })
    
    // Сохраняем в базу данных
    const created = await prisma.driver.create({ data: {
      tenantId: req.actorContext.tenantId,
      name, 
      email, 
      phone, 
      country: country || null,
      city,
      fixedRoutesJson: fixedRoutesJson || (fixedRoutes ? JSON.stringify(fixedRoutes) : null),
      pricePerKm: (pricePerKm && pricePerKm.trim() !== '') ? pricePerKm : null,
      kmRate: kmRate !== undefined && kmRate !== null && kmRate !== '' ? parseFloat(kmRate) : null,
      hourlyRate: hourlyRate !== undefined && hourlyRate !== null && hourlyRate !== '' ? parseFloat(hourlyRate) : null,
      childSeatPrice: childSeatPrice !== undefined && childSeatPrice !== null && childSeatPrice !== '' ? parseFloat(childSeatPrice) : null,
      pricingCurrency: pricingCurrency ? String(pricingCurrency) : null,
      comment: (comment && comment.trim() !== '') ? comment : null,
      lang: lang || null,
      commissionRate: commissionRate ? parseFloat(commissionRate) : 15.0
    }})

    console.log('Driver saved to database:', created.id)

    // Отправляем email с заявкой (не блокируем сохранение, если email не настроен)
    let routesData = []
    if (routes && Array.isArray(routes)) {
      routesData = routes
    } else if (fixedRoutesJson) {
      try {
        routesData = JSON.parse(fixedRoutesJson)
      } catch (e) {
        routesData = []
      }
    }

    try {
      const emailSent = await sendDriverRegistrationEmail({
        name,
        email,
        phone,
        city,
        pricePerKm,
        commissionRate: commissionRate ? parseFloat(commissionRate) : 15.0,
        routes: routesData,
        comment,
        lang: lang || 'ru'
      })
      if (emailSent) {
        console.log('Email sent successfully')
      } else {
        console.warn('Email not sent (SMTP not configured)')
      }
    } catch (emailError) {
      console.error('Error sending email (non-blocking):', emailError)
      // Не блокируем ответ, если email не отправился
    }

    res.json({ success: true, driver: created })
  } catch (e) {
    console.error('Error in /api/drivers:', e)
    console.error('Error stack:', e.stack)
    res.status(500).json({ error: 'failed', message: e.message })
  }
})

module.exports = app
module.exports.__internal = {
  can
}

// Admin endpoints
app.get('/api/admin/requests', authenticateToken, resolveActorContext, requireActorContext, requireCan('orders.read', 'order', () => ({
  team: ['coordination', 'dispatch', 'ops_control', 'sales', 'finance', 'audit']
})), async (req, res) => {
  try {
    const rows = await prisma.request.findMany({
      where: { tenantId: req.actorContext.tenantId },
      orderBy: { createdAt: 'desc' }
    })
    res.json(rows)
  } catch (e) { res.status(500).json({ error: 'failed' }) }
})

app.get('/api/admin/drivers', authenticateToken, resolveActorContext, requireActorContext, requireCan('drivers.read', 'driver'), async (req, res) => {
  try {
    const rows = await prisma.driver.findMany({
      where: {
        tenantId: req.actorContext.tenantId,
        ...buildGeoScopeWhere(req, 'country', 'city')
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(rows)
  } catch (e) { res.status(500).json({ error: 'failed' }) }
})

app.get('/api/admin/fleet-vehicles', authenticateToken, resolveActorContext, requireActorContext, requireCan('drivers.read', 'driver'), async (req, res) => {
  try {
    const { q = '', driverId = '', active = '', limit = '500' } = req.query
    const take = Math.min(parseInt(limit, 10) || 500, 3000)
    const where = {
      tenantId: req.actorContext.tenantId
    }
    if (driverId) where.driverId = String(driverId)
    if (active !== '') where.isActive = String(active) === 'true'
    if (q) {
      const text = String(q)
      where.OR = [
        { vehicleClass: { contains: text, mode: 'insensitive' } },
        { brand: { contains: text, mode: 'insensitive' } },
        { model: { contains: text, mode: 'insensitive' } },
        { plateNumber: { contains: text, mode: 'insensitive' } },
        { driver: { name: { contains: text, mode: 'insensitive' } } },
        { driver: { city: { contains: text, mode: 'insensitive' } } }
      ]
    }

    const rows = await prisma.fleetVehicle.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true
          }
        }
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      take
    })
    res.json({ rows })
  } catch (error) {
    console.error('Error fetching fleet vehicles:', error)
    res.status(500).json({ error: 'Failed to fetch vehicles' })
  }
})

app.post('/api/admin/fleet-vehicles', authenticateToken, resolveActorContext, requireActorContext, requireCan('drivers.manage', 'driver', async (req) => {
  if (!req.body?.driverId) return {}
  const driver = await prisma.driver.findFirst({
    where: { id: String(req.body.driverId), tenantId: req.actorContext.tenantId },
    select: { country: true, city: true }
  })
  return { country: driver?.country || null, city: driver?.city || null }
}), async (req, res) => {
  try {
    const {
      driverId = null,
      vehicleClass,
      brand = null,
      model = null,
      plateNumber,
      productionYear = null,
      color = null,
      seats = null,
      notes = null,
      isActive = true
    } = req.body || {}

    const vehicleClassValue = String(vehicleClass || '').trim()
    const plateValue = String(plateNumber || '').trim()
    if (!vehicleClassValue) return res.status(400).json({ error: 'vehicleClass is required' })
    if (!plateValue) return res.status(400).json({ error: 'plateNumber is required' })

    let effectiveDriverId = null
    if (driverId) {
      const driver = await prisma.driver.findFirst({
        where: { id: String(driverId), tenantId: req.actorContext.tenantId },
        select: { id: true }
      })
      if (!driver) return res.status(404).json({ error: 'Driver not found' })
      effectiveDriverId = driver.id
    }

    const payload = {
      driverId: effectiveDriverId,
      vehicleClass: vehicleClassValue,
      brand,
      model,
      plateNumber: plateValue,
      productionYear,
      color,
      seats,
      notes,
      isActive: !!isActive
    }
    ensureIdempotencyKey(req, 'fleet_vehicle.create', payload)
    const wrapped = await withIdempotency(req, 'fleet_vehicle.create', payload, async () => {
      const row = await prisma.fleetVehicle.create({
        data: {
          tenantId: req.actorContext.tenantId,
          driverId: effectiveDriverId,
          vehicleClass: vehicleClassValue,
          brand: brand ? String(brand).trim() : null,
          model: model ? String(model).trim() : null,
          plateNumber: plateValue,
          productionYear: productionYear === null || productionYear === undefined || productionYear === '' ? null : parseInt(productionYear, 10),
          color: color ? String(color).trim() : null,
          seats: seats === null || seats === undefined || seats === '' ? null : parseInt(seats, 10),
          notes: notes ? String(notes).trim() : null,
          isActive: !!isActive
        }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'fleet_vehicle.create',
        resource: 'fleet_vehicle',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return row
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error creating fleet vehicle:', error)
    res.status(500).json({ error: 'Failed to create vehicle' })
  }
})

app.put('/api/admin/fleet-vehicles/:vehicleId', authenticateToken, resolveActorContext, requireActorContext, requireCan('drivers.manage', 'driver', async (req) => {
  const existing = await prisma.fleetVehicle.findFirst({
    where: { id: String(req.params.vehicleId), tenantId: req.actorContext.tenantId },
    include: {
      driver: { select: { country: true, city: true } }
    }
  })
  return { country: existing?.driver?.country || null, city: existing?.driver?.city || null }
}), async (req, res) => {
  try {
    const vehicleId = String(req.params.vehicleId)
    const existing = await prisma.fleetVehicle.findFirst({
      where: { id: vehicleId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'Vehicle not found' })

    const data = {}
    if (req.body.vehicleClass !== undefined) {
      const cls = String(req.body.vehicleClass || '').trim()
      if (!cls) return res.status(400).json({ error: 'vehicleClass is required' })
      data.vehicleClass = cls
    }
    if (req.body.plateNumber !== undefined) {
      const plate = String(req.body.plateNumber || '').trim()
      if (!plate) return res.status(400).json({ error: 'plateNumber is required' })
      data.plateNumber = plate
    }
    const nullableTextFields = ['brand', 'model', 'color', 'notes']
    for (const field of nullableTextFields) {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field] ? String(req.body[field]).trim() : null
      }
    }
    if (req.body.driverId !== undefined) {
      if (!req.body.driverId) {
        data.driverId = null
      } else {
        const driver = await prisma.driver.findFirst({
          where: { id: String(req.body.driverId), tenantId: req.actorContext.tenantId },
          select: { id: true }
        })
        if (!driver) return res.status(404).json({ error: 'Driver not found' })
        data.driverId = driver.id
      }
    }
    if (req.body.productionYear !== undefined) {
      data.productionYear = req.body.productionYear === null || req.body.productionYear === '' ? null : parseInt(req.body.productionYear, 10)
    }
    if (req.body.seats !== undefined) {
      data.seats = req.body.seats === null || req.body.seats === '' ? null : parseInt(req.body.seats, 10)
    }
    if (req.body.isActive !== undefined) data.isActive = !!req.body.isActive

    const payload = { vehicleId, data }
    ensureIdempotencyKey(req, 'fleet_vehicle.update', payload)
    const wrapped = await withIdempotency(req, 'fleet_vehicle.update', payload, async () => {
      const row = await prisma.fleetVehicle.update({
        where: { id: existing.id },
        data
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'fleet_vehicle.update',
        resource: 'fleet_vehicle',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return row
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error updating fleet vehicle:', error)
    res.status(500).json({ error: 'Failed to update vehicle' })
  }
})

app.delete('/api/admin/fleet-vehicles/:vehicleId', authenticateToken, resolveActorContext, requireActorContext, requireCan('drivers.manage', 'driver'), async (req, res) => {
  try {
    const vehicleId = String(req.params.vehicleId)
    const existing = await prisma.fleetVehicle.findFirst({
      where: { id: vehicleId, tenantId: req.actorContext.tenantId },
      select: { id: true, isActive: true }
    })
    if (!existing) return res.status(404).json({ error: 'Vehicle not found' })
    const payload = { vehicleId, deactivate: true }
    ensureIdempotencyKey(req, 'fleet_vehicle.deactivate', payload)
    const wrapped = await withIdempotency(req, 'fleet_vehicle.deactivate', payload, async () => {
      const row = await prisma.fleetVehicle.update({
        where: { id: existing.id },
        data: { isActive: false }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'fleet_vehicle.deactivate',
        resource: 'fleet_vehicle',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return { success: true }
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error deactivating fleet vehicle:', error)
    res.status(500).json({ error: 'Failed to deactivate vehicle' })
  }
})

// API для расчета приоритета водителей
app.post('/api/drivers/priority', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { fromPoint, toPoint, vehicleType } = req.body
    
    // Получаем всех активных и верифицированных водителей
    const drivers = await prisma.driver.findMany({
      where: {
        tenantId: req.actorContext.tenantId,
        isActive: true,
        verificationStatus: 'verified'
      },
      include: {
        routes: {
          where: {
            tenantId: req.actorContext.tenantId,
            isActive: true
          }
        }
      }
    })
    
    // Рассчитываем приоритет для каждого водителя
    const prioritizedDrivers = drivers.map(driver => {
      const score = calculateDriverScore(driver, fromPoint, toPoint)
      return {
        ...driver,
        priorityScore: score
      }
    }).sort((a, b) => b.priorityScore - a.priorityScore)
    
    res.json(prioritizedDrivers)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

// Функция расчета приоритета водителя
function calculateDriverScore(driver, fromPoint, toPoint) {
  // Базовые параметры
  const commissionRate = Number(driver.commissionRate || 30)
  const normalizedCommission = Math.max(0, Math.min(30, commissionRate))
  const commissionScore = ((30 - normalizedCommission) / 30) * 100 // Чем ниже комиссия, тем выше балл
  const ratingScore = (driver.rating / 5) * 100 // 1-5 -> 0-100 баллов
  
  // Проверяем, есть ли подходящий маршрут
  const matchingRoute = findMatchingRoute(driver.routes, fromPoint, toPoint)
  
  let priceScore = 50 // Базовый балл, если маршрут не найден
  if (matchingRoute) {
    // Если цена водителя меньше или равна нашей целевой цене - высокий балл
    priceScore = matchingRoute.driverPrice <= matchingRoute.ourPrice ? 100 : 50
  }
  
  // Итоговый балл: 50% комиссия, 30% цена, 20% рейтинг
  const finalScore = (0.5 * commissionScore) + (0.3 * priceScore) + (0.2 * ratingScore)
  
  return Math.round(finalScore * 100) / 100 // Округляем до 2 знаков
}

// API для управления маршрутами водителей
app.post('/api/drivers/:driverId/routes', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { driverId } = req.params
    const { fromPoint, toPoint, driverPrice, ourPrice, currency = 'EUR' } = req.body
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    
    const route = await prisma.driverRoute.create({
      data: {
        tenantId: req.actorContext.tenantId,
        driverId: driver.id,
        fromPoint,
        toPoint,
        driverPrice: parseFloat(driverPrice),
        ourPrice: parseFloat(ourPrice),
        currency
      }
    })
    
    res.json(route)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

app.get('/api/drivers/:driverId/routes', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { driverId } = req.params
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    
    const routes = await prisma.driverRoute.findMany({
      where: { driverId: driver.id, tenantId: req.actorContext.tenantId },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(routes)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

// API для обновления данных водителя (для самого водителя)
app.put('/api/drivers/me', authenticateToken, resolveActorContext, requireActorContext, async (req, res) => {
  try {
    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id, tenantId: req.actorContext.tenantId }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    const { commissionRate, kmRate, hourlyRate, childSeatPrice, pricingCurrency } = req.body

    const data = {
      commissionRate: commissionRate ? parseFloat(commissionRate) : undefined,
      kmRate: kmRate !== undefined ? (kmRate === null || kmRate === '' ? null : parseFloat(kmRate)) : undefined,
      hourlyRate: hourlyRate !== undefined ? (hourlyRate === null || hourlyRate === '' ? null : parseFloat(hourlyRate)) : undefined,
      childSeatPrice: childSeatPrice !== undefined ? (childSeatPrice === null || childSeatPrice === '' ? null : parseFloat(childSeatPrice)) : undefined,
      pricingCurrency: pricingCurrency !== undefined ? (pricingCurrency ? String(pricingCurrency) : null) : undefined
    }
    const payload = { driverId: driver.id, data }
    ensureIdempotencyKey(req, 'driver.self.update', payload)
    const wrapped = await withIdempotency(req, 'driver.self.update', payload, async () => {
      const updated = await prisma.driver.update({
        where: { id: driver.id },
        data
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'driver.self.update',
        resource: 'driver',
        resourceId: updated.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return updated
    })

    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error updating driver:', error)
    res.status(500).json({ error: 'Failed to update driver' })
  }
})

// API для удаления маршрута водителя
app.delete('/api/drivers/routes/:routeId', authenticateToken, resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { routeId } = req.params

    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id, tenantId: req.actorContext.tenantId }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    // Проверяем, что маршрут принадлежит этому водителю
    const route = await prisma.driverRoute.findFirst({
      where: {
        id: routeId,
        tenantId: req.actorContext.tenantId,
        driverId: driver.id
      }
    })

    if (!route) {
      return res.status(404).json({ error: 'Route not found' })
    }

    const payload = { routeId: route.id, driverId: driver.id }
    ensureIdempotencyKey(req, 'driver.route.deactivate', payload)
    const wrapped = await withIdempotency(req, 'driver.route.deactivate', payload, async () => {
      await prisma.driverRoute.update({
        where: { id: routeId },
        data: { isActive: false }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'driver.route.deactivate',
        resource: 'driver_route',
        resourceId: route.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return { success: true }
    })

    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error deleting route:', error)
    res.status(500).json({ error: 'Failed to delete route' })
  }
})

// API для обновления статуса водителя (для админов)
app.put('/api/admin/drivers/:driverId/status', authenticateToken, resolveActorContext, requireActorContext, requireCan('drivers.manage', 'driver', async (req) => {
  const existing = await prisma.driver.findFirst({
    where: { id: req.params.driverId, tenantId: req.actorContext.tenantId },
    select: { country: true, city: true, verificationStatus: true }
  })
  return {
    country: existing?.country || null,
    city: existing?.city || null,
    currentStatus: existing?.verificationStatus || null
  }
}), async (req, res) => {
  try {
    const { driverId } = req.params
    const { isActive, verificationStatus } = req.body
    
    const existing = await prisma.driver.findFirst({
      where: { id: driverId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'Driver not found' })

    const payload = {
      driverId,
      isActive: isActive !== undefined ? !!isActive : undefined,
      verificationStatus: verificationStatus || undefined
    }
    ensureIdempotencyKey(req, 'drivers.status.update', payload)
    const wrapped = await withIdempotency(req, 'drivers.status.update', payload, async () => {
      const updated = await prisma.driver.update({
        where: { id: existing.id },
        data: {
          isActive: isActive !== undefined ? isActive : undefined,
          verificationStatus: verificationStatus || undefined
        }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'drivers.status.update',
        resource: 'driver',
        resourceId: updated.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return updated
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

app.put('/api/admin/drivers/:driverId', authenticateToken, resolveActorContext, requireActorContext, requireCan('drivers.manage', 'driver', async (req) => {
  const existing = await prisma.driver.findFirst({
    where: { id: req.params.driverId, tenantId: req.actorContext.tenantId },
    select: { country: true, city: true }
  })
  return {
    country: req.body?.country !== undefined ? req.body.country : (existing?.country || null),
    city: req.body?.city !== undefined ? req.body.city : (existing?.city || null)
  }
}), async (req, res) => {
  try {
    const { driverId } = req.params
    const data = {}
    const nullableTextFields = ['country', 'city', 'comment', 'telegramUserId']
    for (const field of nullableTextFields) {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field] ? String(req.body[field]).trim() : null
      }
    }
    if (req.body.commissionRate !== undefined) {
      data.commissionRate = req.body.commissionRate === null || req.body.commissionRate === ''
        ? null
        : parseFloat(req.body.commissionRate)
    }
    if (req.body.isActive !== undefined) data.isActive = !!req.body.isActive
    if (req.body.verificationStatus !== undefined) data.verificationStatus = String(req.body.verificationStatus)

    const existing = await prisma.driver.findFirst({
      where: { id: driverId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'Driver not found' })

    const payload = { driverId, data }
    ensureIdempotencyKey(req, 'drivers.update', payload)
    const wrapped = await withIdempotency(req, 'drivers.update', payload, async () => {
      const updated = await prisma.driver.update({
        where: { id: existing.id },
        data
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'drivers.update',
        resource: 'driver',
        resourceId: updated.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: data
      })
      return updated
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

// Webhook для получения заказов от EasyTaxi
app.post('/api/webhooks/easytaxi/order', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { 
      orderId, 
      fromPoint, 
      toPoint, 
      clientPrice, 
      vehicleType, 
      passengers, 
      luggage, 
      comment,
      lang 
    } = req.body
    
    const tenantId = req.actorContext.tenantId
    req.body.idempotency_key = req.body.idempotency_key || `easytaxi:${orderId}`
    const payload = { orderId, fromPoint, toPoint, clientPrice, vehicleType, passengers, luggage, comment, lang }
    const wrapped = await withIdempotency(req, 'webhook.easytaxi.order', payload, async () => {
      console.log('Received order from EasyTaxi:', { orderId, fromPoint, toPoint, clientPrice })

      // Создаем заказ в нашей базе (или обновляем при повторе)
      const order = await prisma.order.upsert({
        where: { id: orderId },
        create: {
          id: orderId,
          tenantId,
          fromPoint,
          toPoint,
          clientPrice: parseFloat(clientPrice),
          vehicleType,
          passengers: passengers ? parseInt(passengers) : null,
          luggage: luggage ? parseInt(luggage) : null,
          comment: comment || null,
          lang: lang || null,
          status: 'pending'
        },
        update: {
          tenantId,
          fromPoint,
          toPoint,
          clientPrice: parseFloat(clientPrice),
          vehicleType,
          passengers: passengers ? parseInt(passengers) : null,
          luggage: luggage ? parseInt(luggage) : null,
          comment: comment || null,
          lang: lang || null
        }
      })

      // Находим подходящих водителей
      const drivers = await prisma.driver.findMany({
        where: {
          tenantId,
          isActive: true,
          verificationStatus: 'verified'
        },
      include: {
        routes: {
          where: {
            tenantId,
            isActive: true
          }
        }
      }
      })

      const prioritizedDrivers = drivers.map(driver => {
        const score = calculateDriverScore(driver, fromPoint, toPoint)
        return { ...driver, priorityScore: score }
      }).sort((a, b) => b.priorityScore - a.priorityScore)

      if (prioritizedDrivers.length > 0) {
        const topDriver = prioritizedDrivers[0]
        const matchedRoute = findMatchingRoute(topDriver.routes, fromPoint, toPoint)
        const clientPriceNumber = parseFloat(clientPrice)
        await prisma.order.update({
          where: { id: orderId },
          data: {
            driverId: topDriver.id,
            driverPrice: matchedRoute?.driverPrice || clientPriceNumber * 0.8,
            commission: ((topDriver.commissionRate || 0) / 100) * clientPriceNumber
          }
        })
        await applyOrderStatusTransition({
          orderId,
          tenantId,
          toStatus: 'assigned',
          reason: 'Auto-assigned by EasyTaxi webhook',
          source: 'easytaxi_webhook',
          bypassPermissions: true
        })
      }

      await writeAuditLog({
        tenantId,
        actorId: null,
        actorRole: 'system',
        action: 'webhook.easytaxi.order',
        resource: 'order',
        resourceId: orderId,
        traceId: req.actorContext.traceId,
        decision: 'auto',
        result: 'ok',
        context: { assigned: prioritizedDrivers.length > 0 }
      })

      return { success: true, orderId, assigned: prioritizedDrivers.length > 0 }
    })

    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (e) {
    console.error('Error processing EasyTaxi webhook:', e)
    const status = e.statusCode || 500
    res.status(status).json({ error: e.message || 'failed', ...(e.details || {}) })
  }
})

// API для получения статистики заказов
app.get('/api/admin/orders', authenticateToken, resolveActorContext, requireActorContext, requireCan('orders.read', 'order'), async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { tenantId: req.actorContext.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        driver: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })
    
    res.json(orders)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

app.post('/api/admin/orders/:orderId/info-note', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const { orderId } = req.params
    const { needsInfo, infoReason } = req.body || {}
    const tenantId = req.actorContext.tenantId
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true }
    })
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const payload = { orderId, needsInfo: Boolean(needsInfo), infoReason: infoReason || null }
    ensureIdempotencyKey(req, 'admin.order.info_note', payload)

    const wrapped = await withIdempotency(req, 'admin.order.info_note', payload, async () => {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          needsInfo: Boolean(needsInfo),
          infoReason: needsInfo ? (String(infoReason || '').trim() || null) : null
        }
      })

      if (updated.needsInfo) {
        const defaultAgentId = await pickDefaultAgentIdForTaskType(tenantId, 'clarification')
        await prisma.chatTask.upsert({
          where: { tenantId_orderId_taskType: { tenantId, orderId: updated.id, taskType: 'clarification' } },
          create: {
            tenantId,
            orderId: updated.id,
            taskType: 'clarification',
            state: 'missing_data_detected',
            priority: 50,
            agentConfigId: defaultAgentId
          },
          update: {
            state: 'missing_data_detected',
            priority: 50,
            ...(defaultAgentId ? { agentConfigId: defaultAgentId } : {})
          }
        })
      } else {
        await prisma.chatTask.updateMany({
          where: {
            tenantId,
            orderId: updated.id,
            taskType: 'clarification',
            state: { notIn: ['closed'] }
          },
          data: { state: 'order_complete' }
        })
      }

      await writeAuditLog({
        tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'order.info_note.update',
        resource: 'order',
        resourceId: orderId,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: { needsInfo: Boolean(needsInfo), infoReason }
      })
      return updated
    })
    res.json({ order: wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error updating order info note:', error)
    res.status(500).json({ error: 'Failed to update info note' })
  }
})

const CHAT_STATE_TRANSITIONS = {
  missing_data_detected: ['request_sent', 'handoff_human', 'closed'],
  request_sent: ['customer_replied', 'handoff_human', 'closed'],
  customer_replied: ['field_validated', 'field_rejected', 'handoff_human'],
  field_validated: ['missing_data_detected', 'order_complete', 'handoff_human'],
  field_rejected: ['request_sent', 'handoff_human'],
  order_complete: ['ready_to_notify', 'closed'],
  ready_to_notify: ['notify_draft', 'notify_sent', 'handoff_human', 'closed'],
  notify_draft: ['notify_sent', 'handoff_human', 'closed'],
  notify_sent: ['notify_ack', 'notify_no_reply', 'handoff_human', 'closed'],
  notify_ack: ['closed'],
  notify_no_reply: ['notify_sent', 'handoff_human', 'closed'],
  handoff_human: ['request_sent', 'notify_draft', 'closed'],
  closed: []
}

function parseJsonFieldOrNull(value, fieldName) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'object') return JSON.stringify(value)
  const raw = String(value)
  try {
    JSON.parse(raw)
    return raw
  } catch (_) {
    throw new Error(`${fieldName} must be valid JSON`)
  }
}

function parseJsonObjectSafe(value, fallback = {}) {
  if (!value) return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch (_) {
    return fallback
  }
}

function normalizeAgentType(raw) {
  const value = String(raw || '').trim().toLowerCase()
  if (!value) return 'order_completion'
  const map = {
    booking: 'order_completion',
    order: 'order_completion',
    dispatch: 'dispatch_notify',
    notification: 'dispatch_notify',
    driver: 'driver_ops'
  }
  return map[value] || value
}

async function resolveBusinessTenantIdOrThrow(req, businessId) {
  const actorTenantId = req.actorContext?.tenantId || null
  if (!actorTenantId) throw new Error('Actor tenant is not resolved')
  const scope = String(businessId || '').trim()
  if (!scope) return actorTenantId
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { id: scope },
        { code: scope }
      ]
    },
    select: { id: true }
  })
  if (!tenant) {
    const err = new Error('Business not found')
    err.statusCode = 404
    throw err
  }
  if (tenant.id !== actorTenantId) {
    const err = new Error('No access to this business')
    err.statusCode = 403
    throw err
  }
  return tenant.id
}

function serializeAgent(agent) {
  if (!agent) return null
  return {
    id: agent.id,
    code: agent.code,
    name: agent.name,
    type: agent.type,
    taskType: agent.taskType,
    description: agent.description || '',
    personality: agent.personality || '',
    identity: agent.identity || '',
    task: agent.task || '',
    speechStyle: agent.speechStyle || '',
    promptText: agent.promptText || '',
    workflow: agent.workflowJson || '',
    workflowFormat: agent.workflowFormat || 'json',
    restrictions: parseJsonObjectSafe(agent.restrictionsJson, {}),
    variables: parseJsonObjectSafe(agent.variablesJson, {}),
    constraints: parseJsonObjectSafe(agent.constraintsJson, {}),
    isActive: !!agent.isActive,
    requiresApproval: !!agent.requiresApproval,
    createdByUserId: agent.createdByUserId || null,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt
  }
}

async function pickDefaultAgentIdForTaskType(tenantId, taskType) {
  const agent = await prisma.chatAgentConfig.findFirst({
    where: {
      tenantId,
      isActive: true,
      taskType: String(taskType || '').trim().toLowerCase() || 'clarification'
    },
    orderBy: [{ updatedAt: 'desc' }],
    select: { id: true }
  })
  return agent?.id || null
}

function buildOrderChatPrefill(order = null, taskType = 'clarification') {
  const route = [order?.fromPoint, order?.toPoint].filter(Boolean).join(' -> ')
  const orderKey = String(order?.externalKey || '').trim()
  const infoReason = String(order?.infoReason || '').trim()
  if (taskType === 'dispatch_info') {
    const lines = [
      'Я помощник Riderra, работаю в тестовом режиме.',
      'Подтверждаем детали поездки:'
    ]
    if (orderKey) lines.push(`Номер заказа: ${orderKey}.`)
    if (route) lines.push(`Маршрут: ${route}.`)
    lines.push('При необходимости уточните дополнительную информацию в ответ на это сообщение.')
    return lines.join(' ')
  }
  const lines = ['Я помощник Riderra, работаю в тестовом режиме.']
  if (orderKey) lines.push(`Номер заказа: ${orderKey}.`)
  if (route) lines.push(`Маршрут: ${route}.`)
  if (infoReason) lines.push(`Нужно уточнить: ${infoReason}.`)
  else lines.push('Уточните, пожалуйста, недостающие детали по заказу.')
  lines.push('Спасибо! После ответа сразу подтвердим детали поездки.')
  return lines.join(' ')
}

async function buildTaskOwnerMap(taskRows = []) {
  const ids = [...new Set((taskRows || []).map((row) => String(row?.assignedToUserId || '').trim()).filter(Boolean))]
  if (!ids.length) return {}
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true }
  })
  return users.reduce((acc, user) => {
    acc[user.id] = { id: user.id, email: user.email || null }
    return acc
  }, {})
}

function attachTaskOwner(row, ownerMap = {}) {
  const ownerId = String(row?.assignedToUserId || '').trim()
  if (!ownerId) return { ...row, assignedOwner: null }
  return {
    ...row,
    assignedOwner: ownerMap[ownerId] || { id: ownerId, email: null }
  }
}

async function recordAiLearningEvent({
  tenantId,
  agentConfigId = null,
  chatTaskId = null,
  chatMessageId = null,
  promptKey = null,
  promptVersion = null,
  capability,
  intent,
  outcome,
  editedBeforeSend = null,
  responseTimeMs = null,
  context = null
}) {
  try {
    await prisma.aiLearningEvent.create({
      data: {
        tenantId,
        agentConfigId,
        chatTaskId,
        chatMessageId,
        promptKey,
        promptVersion,
        capability: String(capability || 'unknown'),
        intent: String(intent || 'operations'),
        outcome: String(outcome || 'unknown'),
        editedBeforeSend,
        responseTimeMs,
        contextJson: context ? JSON.stringify(context) : null
      }
    })
  } catch (error) {
    console.error('Error recording AI learning event:', error)
  }
}

function extractAgentPayload(body = {}, { requireCode = true } = {}) {
  const code = String(body.code || '').trim().toLowerCase()
  const payload = {
    code,
    name: String(body.name || '').trim(),
    type: normalizeAgentType(body.type),
    description: String(body.description || '').trim() || null,
    personality: String(body.personality || '').trim() || null,
    identity: String(body.identity || '').trim() || null,
    task: String(body.task || '').trim() || null,
    speechStyle: String(body.speechStyle || body.speech_style || '').trim() || null,
    taskType: String(body.taskType || 'clarification').trim().toLowerCase() || 'clarification',
    promptText: String(body.promptText || '').trim(),
    workflowJson: parseJsonFieldOrNull(body.workflowJson || body.workflow, 'workflowJson'),
    workflowFormat: String(body.workflowFormat || 'json').trim().toLowerCase() || 'json',
    restrictionsJson: parseJsonFieldOrNull(body.restrictionsJson || body.restrictions, 'restrictionsJson'),
    constraintsJson: parseJsonFieldOrNull(body.constraintsJson, 'constraintsJson'),
    variablesJson: parseJsonFieldOrNull(body.variablesJson || body.variables, 'variablesJson'),
    isActive: body.isActive !== false,
    requiresApproval: body.requiresApproval !== false
  }
  if ((requireCode && !payload.code) || !payload.name || !payload.promptText) {
    const err = new Error('code, name and promptText are required')
    err.statusCode = 400
    throw err
  }
  return payload
}

function extractAgentUpdateData(body = {}) {
  const data = {}
  if (Object.prototype.hasOwnProperty.call(body, 'code') && String(body.code || '').trim()) data.code = String(body.code || '').trim().toLowerCase()
  if (Object.prototype.hasOwnProperty.call(body, 'name')) data.name = String(body.name || '').trim()
  if (Object.prototype.hasOwnProperty.call(body, 'type')) data.type = normalizeAgentType(body.type)
  if (Object.prototype.hasOwnProperty.call(body, 'description')) data.description = String(body.description || '').trim() || null
  if (Object.prototype.hasOwnProperty.call(body, 'personality')) data.personality = String(body.personality || '').trim() || null
  if (Object.prototype.hasOwnProperty.call(body, 'identity')) data.identity = String(body.identity || '').trim() || null
  if (Object.prototype.hasOwnProperty.call(body, 'task')) data.task = String(body.task || '').trim() || null
  if (Object.prototype.hasOwnProperty.call(body, 'speechStyle') || Object.prototype.hasOwnProperty.call(body, 'speech_style')) data.speechStyle = String(body.speechStyle || body.speech_style || '').trim() || null
  if (Object.prototype.hasOwnProperty.call(body, 'taskType')) data.taskType = String(body.taskType || '').trim().toLowerCase()
  if (Object.prototype.hasOwnProperty.call(body, 'promptText')) data.promptText = String(body.promptText || '').trim()
  if (Object.prototype.hasOwnProperty.call(body, 'workflowJson') || Object.prototype.hasOwnProperty.call(body, 'workflow')) data.workflowJson = parseJsonFieldOrNull(body.workflowJson || body.workflow, 'workflowJson')
  if (Object.prototype.hasOwnProperty.call(body, 'workflowFormat')) data.workflowFormat = String(body.workflowFormat || 'json').trim().toLowerCase() || 'json'
  if (Object.prototype.hasOwnProperty.call(body, 'restrictionsJson') || Object.prototype.hasOwnProperty.call(body, 'restrictions')) data.restrictionsJson = parseJsonFieldOrNull(body.restrictionsJson || body.restrictions, 'restrictionsJson')
  if (Object.prototype.hasOwnProperty.call(body, 'constraintsJson')) data.constraintsJson = parseJsonFieldOrNull(body.constraintsJson, 'constraintsJson')
  if (Object.prototype.hasOwnProperty.call(body, 'variablesJson') || Object.prototype.hasOwnProperty.call(body, 'variables')) data.variablesJson = parseJsonFieldOrNull(body.variablesJson || body.variables, 'variablesJson')
  if (Object.prototype.hasOwnProperty.call(body, 'isActive')) data.isActive = !!body.isActive
  if (Object.prototype.hasOwnProperty.call(body, 'requiresApproval')) data.requiresApproval = !!body.requiresApproval
  return data
}

async function createAgentConfigForTenant({ req, tenantId, payload, action }) {
  const created = await prisma.chatAgentConfig.create({
    data: {
      tenantId,
      code: payload.code,
      name: payload.name,
      type: payload.type,
      description: payload.description,
      personality: payload.personality,
      identity: payload.identity,
      task: payload.task,
      speechStyle: payload.speechStyle,
      taskType: payload.taskType,
      promptText: payload.promptText,
      workflowJson: payload.workflowJson,
      workflowFormat: payload.workflowFormat,
      restrictionsJson: payload.restrictionsJson,
      constraintsJson: payload.constraintsJson,
      variablesJson: payload.variablesJson,
      isActive: payload.isActive,
      requiresApproval: payload.requiresApproval,
      createdByUserId: req.user?.id || null
    }
  })
  await writeAuditLog({
    tenantId,
    actorId: req.actorContext.actorId,
    actorRole: req.actorContext.actorRole,
    action,
    resource: 'chat_agent',
    resourceId: created.id,
    traceId: req.actorContext.traceId,
    decision: 'policy_allowed',
    result: 'ok',
    context: {
      code: payload.code,
      taskType: payload.taskType,
      isActive: payload.isActive,
      requiresApproval: payload.requiresApproval
    }
  })
  return created
}

async function updateAgentConfigForTenant({ req, tenantId, agentId, body, action }) {
  const existing = await prisma.chatAgentConfig.findFirst({
    where: { id: agentId, tenantId },
    select: { id: true }
  })
  if (!existing) {
    const err = new Error('Agent not found')
    err.statusCode = 404
    throw err
  }
  const data = extractAgentUpdateData(body || {})
  const updated = await prisma.chatAgentConfig.update({
    where: { id: existing.id },
    data
  })
  await writeAuditLog({
    tenantId,
    actorId: req.actorContext.actorId,
    actorRole: req.actorContext.actorRole,
    action,
    resource: 'chat_agent',
    resourceId: updated.id,
    traceId: req.actorContext.traceId,
    decision: 'policy_allowed',
    result: 'ok',
    context: data
  })
  return updated
}

async function deleteAgentConfigForTenant({ req, tenantId, agentId, action }) {
  const existing = await prisma.chatAgentConfig.findFirst({
    where: { id: agentId, tenantId },
    select: { id: true, code: true, taskType: true }
  })
  if (!existing) {
    const err = new Error('Agent not found')
    err.statusCode = 404
    throw err
  }
  await prisma.chatAgentConfig.delete({ where: { id: existing.id } })
  await writeAuditLog({
    tenantId,
    actorId: req.actorContext.actorId,
    actorRole: req.actorContext.actorRole,
    action,
    resource: 'chat_agent',
    resourceId: existing.id,
    traceId: req.actorContext.traceId,
    decision: 'policy_allowed',
    result: 'ok',
    context: {
      code: existing.code,
      taskType: existing.taskType
    }
  })
  return existing
}

function inferIntentFromTaskType(taskType) {
  const normalized = String(taskType || '').trim().toLowerCase()
  if (normalized === 'dispatch_info') return 'operations'
  if (normalized === 'clarification') return 'operations'
  return 'operations'
}

async function getActivePromptVersionByKey(tenantId, key) {
  if (!key) return null
  const template = await prisma.promptTemplate.findFirst({
    where: { tenantId, key: String(key), isActive: true },
    include: {
      versions: {
        where: { isActive: true },
        orderBy: { version: 'desc' },
        take: 1
      }
    }
  })
  if (!template || !template.versions?.[0]) return null
  return { template, version: template.versions[0] }
}

async function runAgentDryTest({ agent, message, conversationHistory = [], userData = null }) {
  const endpoint = String(process.env.OPENCLAW_SANDBOX_BRIDGE_URL || '').trim()
  const token = String(process.env.OPENCLAW_SANDBOX_BRIDGE_TOKEN || process.env.OPENCLAW_LOCALOS_TOKEN || '').trim()
  if (endpoint && token) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          business_id: agent.tenantId,
          agent_id: agent.id,
          message: String(message || ''),
          conversation_history: Array.isArray(conversationHistory) ? conversationHistory : [],
          dry_run: true,
          actor: {
            user_id: String(userData?.id || ''),
            role: 'sandbox_operator'
          }
        })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        return {
          success: false,
          runtime: 'openclaw_bridge',
          error: data?.error || `OpenClaw bridge HTTP ${response.status}`
        }
      }
      return {
        success: true,
        runtime: 'openclaw_bridge',
        response: String(data.response || data.message || '').trim(),
        usage: data.usage || {},
        decisionTrace: data.decision_trace || data.trace || {},
        toolCalls: data.tool_calls || []
      }
    } catch (error) {
      return {
        success: false,
        runtime: 'openclaw_bridge',
        error: error.message || 'OpenClaw bridge failed'
      }
    }
  }

  const fallbackPrompt = String(agent.promptText || '').slice(0, 1200)
  const simulated = [
    'Я помощник Riderra, работаю в тестовом режиме.',
    `Агент: ${agent.name}`,
    `Тип: ${agent.type || 'order_completion'}`,
    `Сообщение: ${String(message || '').trim() || '-'}`,
    fallbackPrompt ? `Prompt: ${fallbackPrompt}` : ''
  ].filter(Boolean).join('\n')
  return {
    success: true,
    runtime: 'local_fallback',
    response: simulated,
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    decisionTrace: { mode: 'fallback' },
    toolCalls: []
  }
}

function getOpenClawRuntimeConfig() {
  const baseUrl = String(
    process.env.OPENCLAW_RUNTIME_BASE_URL ||
    process.env.OPENCLAW_INTERNAL_BASE_URL ||
    ''
  ).trim().replace(/\/+$/, '')
  const token = String(
    process.env.OPENCLAW_RUNTIME_TOKEN ||
    process.env.OPENCLAW_INTERNAL_TOKEN ||
    ''
  ).trim()
  const timeoutMs = Math.max(1000, Number(process.env.OPENCLAW_RUNTIME_TIMEOUT_MS || 20000) || 20000)
  const buildPath = String(process.env.OPENCLAW_RUNTIME_BUILD_PATH || '/riderra/order-draft/build').trim() || '/riderra/order-draft/build'
  const sendPath = String(process.env.OPENCLAW_RUNTIME_SEND_PATH || '/riderra/order-draft/send').trim() || '/riderra/order-draft/send'
  const classifyPath = String(process.env.OPENCLAW_RUNTIME_CLASSIFY_PATH || '/riderra/order-draft/classify').trim() || '/riderra/order-draft/classify'
  const extractPath = String(process.env.OPENCLAW_RUNTIME_EXTRACT_PATH || '/riderra/order-draft/extract-validate').trim() || '/riderra/order-draft/extract-validate'
  return { baseUrl, token, timeoutMs, buildPath, sendPath, classifyPath, extractPath }
}

function normalizeOpenClawPath(pathValue, fallbackPath) {
  const raw = String(pathValue || fallbackPath || '').trim()
  if (!raw) return fallbackPath
  return raw.startsWith('/') ? raw : `/${raw}`
}

async function callOpenClawRuntime({
  path,
  payload,
  kind,
  traceId = null,
  idempotencyKey = null
}) {
  const requestErrors = validateOpenClawPayload(kind, payload)
  if (requestErrors.length) {
    return {
      configured: true,
      ok: false,
      status: 0,
      error: `OpenClaw request validation failed: ${requestErrors.join('; ')}`,
      data: null,
      validation: {
        request: requestErrors,
        response: []
      }
    }
  }
  const { baseUrl, token, timeoutMs } = getOpenClawRuntimeConfig()
  if (!baseUrl || !token) {
    return {
      configured: false,
      ok: false,
      status: 0,
      error: 'OpenClaw runtime is not configured',
      data: null,
      validation: {
        request: [],
        response: []
      }
    }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${baseUrl}${normalizeOpenClawPath(path, '/riderra/order-draft/build')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OpenClaw-Internal-Token': token,
        ...(traceId ? { 'X-Trace-Id': String(traceId) } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': String(idempotencyKey) } : {})
      },
      body: JSON.stringify(payload || {}),
      signal: controller.signal
    })
    const data = await response.json().catch(() => ({}))
    const responseErrors = response.ok ? validateOpenClawResponse(kind, data) : []
    return {
      configured: true,
      ok: response.ok && responseErrors.length === 0,
      status: response.status,
      error: response.ok
        ? (responseErrors.length ? `OpenClaw response validation failed: ${responseErrors.join('; ')}` : null)
        : (data?.error || `OpenClaw HTTP ${response.status}`),
      data,
      validation: {
        request: [],
        response: responseErrors
      }
    }
  } catch (error) {
    return {
      configured: true,
      ok: false,
      status: 0,
      error: error?.name === 'AbortError' ? 'OpenClaw timeout' : (error.message || 'OpenClaw request failed'),
      data: null,
      validation: {
        request: [],
        response: []
      }
    }
  } finally {
    clearTimeout(timer)
  }
}

function extractTextFromOpenClawResponse(data = {}) {
  const variants = [
    data?.text,
    data?.message,
    data?.response,
    data?.draft,
    data?.result?.text,
    data?.result?.message,
    data?.result?.response,
    data?.result?.draft,
    data?.payload?.text,
    data?.payload?.message,
    data?.payload?.draft
  ]
  for (const value of variants) {
    const text = String(value || '').trim()
    if (text) return text
  }
  return ''
}

function extractClassificationFromOpenClawResponse(data = {}) {
  const result = data?.result || data?.payload?.result || data
  const cls = String(
    result?.class ||
    result?.classification ||
    result?.label ||
    ''
  ).trim().toLowerCase()
  const confidence = Number(result?.confidence)
  const requiresHuman = Boolean(
    result?.requires_human ||
    result?.requiresHuman ||
    result?.human_required
  )
  return {
    class: cls || 'irrelevant',
    confidence: Number.isFinite(confidence) ? confidence : null,
    requiresHuman
  }
}

function extractValidationFromOpenClawResponse(data = {}) {
  const result = data?.result || data?.payload?.result || data
  const confidence = Number(result?.confidence)
  return {
    valid: Boolean(result?.valid || result?.is_valid || result?.validated),
    confidence: Number.isFinite(confidence) ? confidence : null,
    field: String(result?.field || result?.field_name || '').trim() || null,
    value: result?.value ?? result?.normalized_value ?? null,
    reason: String(result?.reason || result?.error || '').trim() || null
  }
}

function computeNextChatStateForInbound({ taskType, currentState, classification, extraction, agentPaused }) {
  const cls = String(classification?.class || '').toLowerCase()
  const requiresHuman = Boolean(classification?.requiresHuman)
  if (agentPaused) return currentState
  if (!cls || cls === 'unclassified') return 'customer_replied'

  if (taskType === 'dispatch_info') {
    if (requiresHuman || cls === 'negative' || cls === 'question') return 'handoff_human'
    if (cls === 'answer') return 'notify_ack'
    if (cls === 'irrelevant') return 'notify_no_reply'
    return currentState
  }

  if (requiresHuman || cls === 'negative' || cls === 'question' || cls === 'irrelevant') {
    return 'handoff_human'
  }
  if (cls === 'answer') {
    if (extraction?.valid && (extraction?.confidence == null || extraction.confidence >= 0.7)) {
      return 'field_validated'
    }
    return 'field_rejected'
  }
  return 'customer_replied'
}

function explainInboundDecision({ taskType, currentState, classification, extraction, agentPaused, candidateState }) {
  if (agentPaused) return 'Агент на паузе, авто-переходы отключены.'
  const cls = String(classification?.class || '').toLowerCase()
  if (taskType === 'clarification') {
    if (cls === 'answer' && extraction?.valid) return 'Ответ классифицирован как валидный и поле подтверждено.'
    if (cls === 'answer' && extraction && !extraction.valid) return 'Ответ получен, но извлечение/валидация не подтвердили поле.'
    if (cls === 'question') return 'Клиент задал вопрос, требуется ручная обработка.'
    if (classification?.requiresHuman) return 'Классификация пометила кейс как требующий human-in-the-loop.'
    return `Переход выбран по классу ответа: ${cls || 'unclassified'}.`
  }
  if (taskType === 'dispatch_info') {
    if (cls === 'ack') return 'Клиент подтвердил получение деталей.'
    if (cls === 'question') return 'Клиент задал вопрос по рассылке.'
    if (cls === 'no_reply') return 'Нет признаков ответа/подтверждения.'
    return `Переход выбран по классу ответа: ${cls || 'unclassified'}.`
  }
  if (candidateState === currentState) return 'Состояние не изменилось: подходящий переход не найден.'
  return 'Переход выбран по базовым правилам state machine.'
}

async function transitionChatTaskIfAllowed(taskId, currentState, targetState) {
  const from = String(currentState || '')
  const to = String(targetState || '')
  if (!to || from === to) {
    return { changed: false, state: from }
  }
  const allowed = CHAT_STATE_TRANSITIONS[from] || []
  if (!allowed.includes(to)) {
    return { changed: false, state: from }
  }
  const updated = await prisma.chatTask.update({
    where: { id: taskId },
    data: { state: to }
  })
  return { changed: true, state: updated.state }
}

app.get('/api/admin/chats/agents', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const rows = await prisma.chatAgentConfig.findMany({
      where: { tenantId: req.actorContext.tenantId },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }]
    })
    res.json({ rows: rows.map(serializeAgent) })
  } catch (error) {
    console.error('Error loading chat agents:', error)
    res.status(500).json({ error: 'Failed to load chat agents' })
  }
})

app.post('/api/admin/chats/agents', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const payload = extractAgentPayload(req.body || {}, { requireCode: true })
    ensureIdempotencyKey(req, 'chat_agent.create', payload)
    const wrapped = await withIdempotency(req, 'chat_agent.create', payload, async () => {
      return createAgentConfigForTenant({ req, tenantId, payload, action: 'chat_agent.create' })
    })
    res.json({ agent: serializeAgent(wrapped.data), idempotent: wrapped.replayed })
  } catch (error) {
    if (String(error?.message || '').includes('must be valid JSON')) {
      return res.status(400).json({ error: error.message })
    }
    console.error('Error creating chat agent:', error)
    res.status(500).json({ error: 'Failed to create chat agent' })
  }
})

app.put('/api/admin/chats/agents/:agentId', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const data = extractAgentUpdateData(req.body || {})
    const payload = { agentId: req.params.agentId, data }
    ensureIdempotencyKey(req, 'chat_agent.update', payload)
    const wrapped = await withIdempotency(req, 'chat_agent.update', payload, async () => {
      return updateAgentConfigForTenant({
        req,
        tenantId,
        agentId: req.params.agentId,
        body: req.body || {},
        action: 'chat_agent.update'
      })
    })
    res.json({ agent: serializeAgent(wrapped.data), idempotent: wrapped.replayed })
  } catch (error) {
    if (String(error?.message || '').includes('must be valid JSON')) {
      return res.status(400).json({ error: error.message })
    }
    console.error('Error updating chat agent:', error)
    res.status(500).json({ error: 'Failed to update chat agent' })
  }
})

app.get('/api/admin/chats/agents/:agentId', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const row = await prisma.chatAgentConfig.findFirst({
      where: { id: req.params.agentId, tenantId: req.actorContext.tenantId }
    })
    if (!row) return res.status(404).json({ error: 'Agent not found' })
    res.json({ agent: serializeAgent(row) })
  } catch (error) {
    console.error('Error loading chat agent details:', error)
    res.status(500).json({ error: 'Failed to load chat agent' })
  }
})

app.delete('/api/admin/chats/agents/:agentId', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    await deleteAgentConfigForTenant({
      req,
      tenantId: req.actorContext.tenantId,
      agentId: req.params.agentId,
      action: 'chat_agent.delete'
    })
    res.json({ ok: true })
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ error: error.message })
    console.error('Error deleting chat agent:', error)
    res.status(500).json({ error: 'Failed to delete chat agent' })
  }
})

app.get('/api/admin/ai-agents', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const rows = await prisma.chatAgentConfig.findMany({
      where: { tenantId: req.actorContext.tenantId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    })
    res.json({ agents: rows.map(serializeAgent) })
  } catch (error) {
    console.error('Error loading AI agents:', error)
    res.status(500).json({ error: 'Failed to load AI agents' })
  }
})

app.post('/api/admin/ai-agents', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const payload = extractAgentPayload(req.body || {}, { requireCode: true })
    ensureIdempotencyKey(req, 'admin.ai_agent.create', payload)
    const wrapped = await withIdempotency(req, 'admin.ai_agent.create', payload, async () => {
      return createAgentConfigForTenant({ req, tenantId, payload, action: 'admin.ai_agent.create' })
    })
    res.json({ success: true, agent: serializeAgent(wrapped.data), idempotent: wrapped.replayed })
  } catch (error) {
    const status = error.statusCode || (String(error?.message || '').includes('required') || String(error?.message || '').includes('valid JSON') ? 400 : 500)
    res.status(status).json({ error: error.message || 'Failed to create AI agent' })
  }
})

app.get('/api/admin/ai-agents/:agentId', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const row = await prisma.chatAgentConfig.findFirst({
      where: { id: req.params.agentId, tenantId: req.actorContext.tenantId }
    })
    if (!row) return res.status(404).json({ error: 'Agent not found' })
    res.json({ agent: serializeAgent(row) })
  } catch (error) {
    res.status(500).json({ error: 'Failed to load AI agent' })
  }
})

app.put('/api/admin/ai-agents/:agentId', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const data = extractAgentUpdateData(req.body || {})
    const payload = { agentId: req.params.agentId, data }
    ensureIdempotencyKey(req, 'admin.ai_agent.update', payload)
    const wrapped = await withIdempotency(req, 'admin.ai_agent.update', payload, async () => {
      return updateAgentConfigForTenant({
        req,
        tenantId,
        agentId: req.params.agentId,
        body: req.body || {},
        action: 'admin.ai_agent.update'
      })
    })
    res.json({ success: true, agent: serializeAgent(wrapped.data), idempotent: wrapped.replayed })
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ error: error.message })
    const status = error.statusCode || (String(error?.message || '').includes('valid JSON') ? 400 : 500)
    res.status(status).json({ error: error.message || 'Failed to update AI agent' })
  }
})

app.delete('/api/admin/ai-agents/:agentId', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const payload = { agentId: req.params.agentId }
    ensureIdempotencyKey(req, 'admin.ai_agent.delete', payload)
    const wrapped = await withIdempotency(req, 'admin.ai_agent.delete', payload, async () => {
      return deleteAgentConfigForTenant({
        req,
        tenantId: req.actorContext.tenantId,
        agentId: req.params.agentId,
        action: 'admin.ai_agent.delete'
      })
    })
    res.json({ success: true, idempotent: wrapped.replayed })
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ error: error.message })
    res.status(500).json({ error: 'Failed to delete AI agent' })
  }
})

app.get('/api/business/:businessId/ai-agents/manage', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = await resolveBusinessTenantIdOrThrow(req, req.params.businessId)
    const rows = await prisma.chatAgentConfig.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }]
    })
    res.json({ agents: rows.map(serializeAgent) })
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load business AI agents' })
  }
})

app.post('/api/business/:businessId/ai-agents/manage', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = await resolveBusinessTenantIdOrThrow(req, req.params.businessId)
    const payload = extractAgentPayload(req.body || {}, { requireCode: true })
    ensureIdempotencyKey(req, 'business.ai_agent.create', payload)
    const wrapped = await withIdempotency(req, 'business.ai_agent.create', payload, async () => {
      return createAgentConfigForTenant({ req, tenantId, payload, action: 'business.ai_agent.create' })
    })
    res.status(201).json({ success: true, agent: serializeAgent(wrapped.data), idempotent: wrapped.replayed })
  } catch (error) {
    res.status(error.statusCode || (String(error?.message || '').includes('required') || String(error?.message || '').includes('valid JSON') ? 400 : 500)).json({ error: error.message || 'Failed to create business AI agent' })
  }
})

app.put('/api/business/:businessId/ai-agents/manage/:agentId', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = await resolveBusinessTenantIdOrThrow(req, req.params.businessId)
    const data = extractAgentUpdateData(req.body || {})
    ensureIdempotencyKey(req, 'business.ai_agent.update', { agentId: req.params.agentId, data })
    const wrapped = await withIdempotency(req, 'business.ai_agent.update', { agentId: req.params.agentId, data }, async () => {
      return updateAgentConfigForTenant({
        req,
        tenantId,
        agentId: req.params.agentId,
        body: req.body || {},
        action: 'business.ai_agent.update'
      })
    })
    res.json({ success: true, agent: serializeAgent(wrapped.data), idempotent: wrapped.replayed })
  } catch (error) {
    res.status(error.statusCode || (String(error?.message || '').includes('valid JSON') ? 400 : 500)).json({ error: error.message || 'Failed to update business AI agent' })
  }
})

app.delete('/api/business/:businessId/ai-agents/manage/:agentId', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = await resolveBusinessTenantIdOrThrow(req, req.params.businessId)
    ensureIdempotencyKey(req, 'business.ai_agent.delete', { agentId: req.params.agentId })
    const wrapped = await withIdempotency(req, 'business.ai_agent.delete', { agentId: req.params.agentId }, async () => {
      return deleteAgentConfigForTenant({
        req,
        tenantId,
        agentId: req.params.agentId,
        action: 'business.ai_agent.delete'
      })
    })
    res.json({ success: true, idempotent: wrapped.replayed })
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to delete business AI agent' })
  }
})

app.post('/api/admin/ai-agents/:agentId/test', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.read', 'ops'), async (req, res) => {
  try {
    const row = await prisma.chatAgentConfig.findFirst({
      where: { id: req.params.agentId, tenantId: req.actorContext.tenantId }
    })
    if (!row) return res.status(404).json({ error: 'Agent not found' })
    const dryRun = req.body?.dry_run !== false
    if (!dryRun) return res.status(400).json({ error: 'Only dry_run=true is allowed' })
    const result = await runAgentDryTest({
      agent: row,
      message: req.body?.message || '',
      conversationHistory: req.body?.conversation_history || [],
      userData: req.user
    })
    await recordAiLearningEvent({
      tenantId: req.actorContext.tenantId,
      agentConfigId: row.id,
      promptKey: `agent:${row.code}`,
      promptVersion: 1,
      capability: 'agent.test',
      intent: inferIntentFromTaskType(row.taskType),
      outcome: result.success ? 'dry_run_success' : 'dry_run_failed',
      context: { runtime: result.runtime }
    })
    res.json({ dry_run: true, ...result })
  } catch (error) {
    console.error('Error testing AI agent:', error)
    res.status(500).json({ error: 'Failed to test AI agent' })
  }
})

app.post('/api/business/:businessId/ai-agents/:agentId/test', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.read', 'ops'), async (req, res) => {
  try {
    const tenantId = await resolveBusinessTenantIdOrThrow(req, req.params.businessId)
    const row = await prisma.chatAgentConfig.findFirst({
      where: { id: req.params.agentId, tenantId }
    })
    if (!row) return res.status(404).json({ error: 'Agent not found' })
    const dryRun = req.body?.dry_run !== false
    if (!dryRun) return res.status(400).json({ error: 'Only dry_run=true is allowed' })
    const result = await runAgentDryTest({
      agent: row,
      message: req.body?.message || '',
      conversationHistory: req.body?.conversation_history || [],
      userData: req.user
    })
    await recordAiLearningEvent({
      tenantId,
      agentConfigId: row.id,
      promptKey: `agent:${row.code}`,
      promptVersion: 1,
      capability: 'agent.test',
      intent: inferIntentFromTaskType(row.taskType),
      outcome: result.success ? 'dry_run_success' : 'dry_run_failed',
      context: { runtime: result.runtime }
    })
    res.json({ dry_run: true, ...result })
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to test business AI agent' })
  }
})

app.get('/api/admin/prompts', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const rows = await prisma.promptTemplate.findMany({
      where: { tenantId: req.actorContext.tenantId },
      include: {
        versions: {
          where: { isActive: true },
          orderBy: { version: 'desc' },
          take: 1
        }
      },
      orderBy: [{ updatedAt: 'desc' }]
    })
    const templates = rows.map((row) => ({
      key: row.key,
      title: row.title,
      description: row.description || '',
      isActive: row.isActive,
      prompt_version: row.versions?.[0]?.version || null,
      content: row.versions?.[0]?.content || ''
    }))
    res.json({ prompts: templates })
  } catch (error) {
    console.error('Error loading prompts:', error)
    res.status(500).json({ error: 'Failed to load prompts' })
  }
})

app.put('/api/admin/prompts/:promptKey', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const promptKey = String(req.params.promptKey || '').trim().toLowerCase()
    const content = String(req.body?.content || req.body?.prompt || '').trim()
    const title = String(req.body?.title || promptKey).trim() || promptKey
    const description = String(req.body?.description || '').trim() || null
    const notes = String(req.body?.notes || '').trim() || null
    if (!promptKey || !content) {
      return res.status(400).json({ error: 'promptKey and content are required' })
    }

    const result = await prisma.$transaction(async (tx) => {
      let template = await tx.promptTemplate.findFirst({
        where: { tenantId, key: promptKey }
      })
      if (!template) {
        template = await tx.promptTemplate.create({
          data: { tenantId, key: promptKey, title, description, isActive: true }
        })
      } else {
        template = await tx.promptTemplate.update({
          where: { id: template.id },
          data: { title, description, isActive: true }
        })
      }

      const latest = await tx.promptTemplateVersion.findFirst({
        where: { templateId: template.id },
        orderBy: { version: 'desc' },
        select: { version: true }
      })
      const nextVersion = (latest?.version || 0) + 1
      const version = await tx.promptTemplateVersion.create({
        data: {
          templateId: template.id,
          version: nextVersion,
          content,
          notes,
          isActive: true,
          createdByUserId: req.user?.id || null
        }
      })
      return { template, version }
    })

    res.json({
      success: true,
      prompt_key: result.template.key,
      prompt_version: result.version.version,
      content: result.version.content
    })
  } catch (error) {
    console.error('Error upserting prompt:', error)
    res.status(500).json({ error: 'Failed to save prompt' })
  }
})

app.get('/api/admin/ai/learning-metrics', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.read', 'ops'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const { days = '30' } = req.query
    const windowDays = Math.min(Math.max(parseInt(days, 10) || 30, 1), 365)
    const from = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
    const rows = await prisma.aiLearningEvent.findMany({
      where: { tenantId, createdAt: { gte: from } },
      orderBy: { createdAt: 'desc' },
      take: 10000
    })
    const byOutcome = {}
    const byCapability = {}
    for (const row of rows) {
      byOutcome[row.outcome] = (byOutcome[row.outcome] || 0) + 1
      byCapability[row.capability] = (byCapability[row.capability] || 0) + 1
    }
    res.json({
      period_days: windowDays,
      total_events: rows.length,
      by_outcome: byOutcome,
      by_capability: byCapability
    })
  } catch (error) {
    console.error('Error loading AI learning metrics:', error)
    res.status(500).json({ error: 'Failed to load AI learning metrics' })
  }
})

app.get('/api/business/:businessId/conversations', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.read', 'ops'), async (req, res) => {
  try {
    const tenantId = await resolveBusinessTenantIdOrThrow(req, req.params.businessId)
    const { agent_id = '', state = '', taskType = '', limit = '100' } = req.query
    const take = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 300)
    const where = {
      tenantId,
      ...(agent_id ? { agentConfigId: String(agent_id) } : {}),
      ...(state ? { state: String(state) } : {}),
      ...(taskType ? { taskType: String(taskType) } : {})
    }
    const tasks = await prisma.chatTask.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take,
      include: {
        order: {
          select: {
            id: true,
            externalKey: true,
            fromPoint: true,
            toPoint: true,
            clientPrice: true,
            status: true,
            comment: true
          }
        },
        agentConfig: true,
        _count: { select: { messages: true } }
      }
    })
    const conversationIds = tasks.map((x) => x.id)
    const lastMessages = conversationIds.length
      ? await prisma.chatMessage.findMany({
          where: { chatTaskId: { in: conversationIds } },
          orderBy: [{ createdAt: 'desc' }],
          select: { chatTaskId: true, bodyText: true, createdAt: true, direction: true }
        })
      : []
    const lastByConversation = {}
    for (const message of lastMessages) {
      if (!lastByConversation[message.chatTaskId]) lastByConversation[message.chatTaskId] = message
    }
    res.json({
      rows: tasks.map((task) => ({
        id: task.id,
        business_id: tenantId,
        agent_id: task.agentConfigId || null,
        agent: task.agentConfig ? serializeAgent(task.agentConfig) : null,
        state: task.state,
        task_type: task.taskType,
        channel: task.channel || 'telegram',
        agent_paused: !!task.agentPaused,
        order: task.order,
        message_count: task._count?.messages || 0,
        last_message: lastByConversation[task.id] || null,
        updated_at: task.updatedAt,
        created_at: task.createdAt
      }))
    })
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load conversations' })
  }
})

app.get('/api/conversations/:conversationId/messages', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.read', 'ops'), async (req, res) => {
  try {
    const task = await prisma.chatTask.findFirst({
      where: { id: req.params.conversationId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!task) return res.status(404).json({ error: 'Conversation not found' })
    const messages = await prisma.chatMessage.findMany({
      where: { chatTaskId: task.id },
      orderBy: { createdAt: 'asc' }
    })
    res.json({ rows: messages })
  } catch (error) {
    res.status(500).json({ error: 'Failed to load conversation messages' })
  }
})

app.post('/api/conversations/:conversationId/send-message', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'ops'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const task = await prisma.chatTask.findFirst({
      where: { id: req.params.conversationId, tenantId },
      include: { agentConfig: true }
    })
    if (!task) return res.status(404).json({ error: 'Conversation not found' })

    const bodyText = String(req.body?.bodyText || req.body?.message || '').trim()
    if (!bodyText) return res.status(400).json({ error: 'bodyText is required' })
    const message = await prisma.chatMessage.create({
      data: {
        tenantId,
        chatTaskId: task.id,
        direction: 'outbound',
        source: 'operator',
        channel: String(req.body?.channel || task.channel || 'telegram'),
        bodyText,
        approvalStatus: task.agentConfig?.requiresApproval ? 'pending_human' : 'approved',
        createdByUserId: req.user?.id || null,
        traceId: req.actorContext.traceId
      }
    })
    await recordAiLearningEvent({
      tenantId,
      agentConfigId: task.agentConfigId || null,
      chatTaskId: task.id,
      chatMessageId: message.id,
      promptKey: task.agentConfig ? `agent:${task.agentConfig.code}` : null,
      promptVersion: 1,
      capability: 'riderra.customer.message.compose',
      intent: inferIntentFromTaskType(task.taskType),
      outcome: 'draft_created',
      editedBeforeSend: true
    })
    res.json({ success: true, message })
  } catch (error) {
    res.status(500).json({ error: 'Failed to send conversation message' })
  }
})

app.post('/api/conversations/:conversationId/toggle-agent', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'ops'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const task = await prisma.chatTask.findFirst({
      where: { id: req.params.conversationId, tenantId },
      select: { id: true, agentPaused: true }
    })
    if (!task) return res.status(404).json({ error: 'Conversation not found' })
    const updated = await prisma.chatTask.update({
      where: { id: task.id },
      data: { agentPaused: !task.agentPaused }
    })
    res.json({ success: true, agent_paused: updated.agentPaused })
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle agent for conversation' })
  }
})

app.get('/api/admin/chats', authenticateToken, resolveActorContext, requireActorContext, requireCan('orders.read', 'order'), async (req, res) => {
  try {
    const { limit = '100', state = '', taskType = '' } = req.query
    const take = Math.min(parseInt(limit, 10) || 100, 300)
    const where = {
      tenantId: req.actorContext.tenantId,
      ...(state ? { state: String(state) } : {}),
      ...(taskType ? { taskType: String(taskType) } : {})
    }
    const rows = await prisma.chatTask.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
      take,
      include: {
        agentConfig: true,
        order: {
          select: {
            id: true,
            externalKey: true,
            fromPoint: true,
            toPoint: true,
            clientPrice: true,
            infoReason: true,
            status: true
          }
        },
        _count: { select: { messages: true } }
      }
    })
    res.json({ rows })
  } catch (error) {
    console.error('Error fetching chat queue:', error)
    res.status(500).json({ error: 'Failed to load chat queue' })
  }
})

app.get('/api/admin/chats/tasks', authenticateToken, resolveActorContext, requireActorContext, requireCan('orders.read', 'order'), async (req, res) => {
  try {
    const { limit = '200', state = '', taskType = '', agentId = '' } = req.query
    const take = Math.min(parseInt(limit, 10) || 200, 500)
    const agentFilter = String(agentId || '').trim()
    const where = {
      tenantId: req.actorContext.tenantId,
      ...(state ? { state: String(state) } : {}),
      ...(taskType ? { taskType: String(taskType) } : {}),
      ...(agentFilter === 'none'
        ? { agentConfigId: null }
        : (agentFilter ? { agentConfigId: agentFilter } : {}))
    }
    const rowsRaw = await prisma.chatTask.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
      take,
      include: {
        agentConfig: true,
        order: {
          select: {
            id: true,
            externalKey: true,
            source: true,
            sourceRow: true,
            fromPoint: true,
            toPoint: true,
            clientPrice: true,
            status: true,
            needsInfo: true,
            infoReason: true,
            updatedAt: true
          }
        },
        _count: { select: { messages: true } }
      }
    })
    const ownerMap = await buildTaskOwnerMap(rowsRaw)
    const rows = rowsRaw.map((row) => attachTaskOwner(row, ownerMap))
    res.json({ rows })
  } catch (error) {
    console.error('Error loading chat tasks:', error)
    res.status(500).json({ error: 'Failed to load chat tasks' })
  }
})

app.post('/api/admin/chats/sync-from-orders', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const { limit = 500 } = req.body || {}
    const orders = await prisma.order.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(parseInt(limit, 10) || 500, 2000),
      select: {
        id: true,
        status: true,
        needsInfo: true
      }
    })

    let clarificationCreated = 0
    let clarificationUpdated = 0
    let dispatchCreated = 0
    let dispatchUpdated = 0
    const dispatchReadyStatuses = new Set(['assigned', 'pending_ops_control', 'confirmed', 'in_progress'])

    for (const order of orders) {
      if (order.needsInfo) {
        const defaultClarificationAgentId = await pickDefaultAgentIdForTaskType(tenantId, 'clarification')
        const existing = await prisma.chatTask.findFirst({
          where: { tenantId, orderId: order.id, taskType: 'clarification' },
          select: { id: true }
        })
        await prisma.chatTask.upsert({
          where: { tenantId_orderId_taskType: { tenantId, orderId: order.id, taskType: 'clarification' } },
          create: {
            tenantId,
            orderId: order.id,
            taskType: 'clarification',
            state: 'missing_data_detected',
            priority: 50,
            agentConfigId: defaultClarificationAgentId
          },
          update: {
            state: 'missing_data_detected',
            priority: 50,
            ...(defaultClarificationAgentId ? { agentConfigId: defaultClarificationAgentId } : {})
          }
        })
        if (existing) clarificationUpdated += 1
        else clarificationCreated += 1
      }

      if (!order.needsInfo && dispatchReadyStatuses.has(String(order.status || '').toLowerCase())) {
        const defaultDispatchAgentId = await pickDefaultAgentIdForTaskType(tenantId, 'dispatch_info')
        const existing = await prisma.chatTask.findFirst({
          where: { tenantId, orderId: order.id, taskType: 'dispatch_info' },
          select: { id: true, state: true }
        })
        await prisma.chatTask.upsert({
          where: { tenantId_orderId_taskType: { tenantId, orderId: order.id, taskType: 'dispatch_info' } },
          create: {
            tenantId,
            orderId: order.id,
            taskType: 'dispatch_info',
            state: 'ready_to_notify',
            priority: 80,
            agentConfigId: defaultDispatchAgentId
          },
          update: {
            state: ['notify_sent', 'notify_ack', 'closed'].includes(existing?.state) ? existing.state : 'ready_to_notify',
            priority: 80,
            ...(defaultDispatchAgentId ? { agentConfigId: defaultDispatchAgentId } : {})
          }
        })
        if (existing) dispatchUpdated += 1
        else dispatchCreated += 1
      }
    }

    await writeAuditLog({
      tenantId,
      actorId: req.actorContext.actorId,
      actorRole: req.actorContext.actorRole,
      action: 'chats.sync_from_orders',
      resource: 'chat_task',
      resourceId: null,
      traceId: req.actorContext.traceId,
      decision: 'policy_allowed',
      result: 'ok',
      context: { clarificationCreated, clarificationUpdated, dispatchCreated, dispatchUpdated }
    })

    res.json({ clarificationCreated, clarificationUpdated, dispatchCreated, dispatchUpdated })
  } catch (error) {
    console.error('Error syncing chat tasks from orders:', error)
    res.status(500).json({ error: 'Failed to sync chat tasks from orders' })
  }
})

app.post('/api/admin/chats/queue-order', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const orderId = String(req.body?.orderId || '').trim()
    const taskType = String(req.body?.taskType || 'clarification').trim().toLowerCase() || 'clarification'
    const assignToMe = req.body?.assignToMe !== false
    if (!orderId) return res.status(400).json({ error: 'orderId is required' })
    if (!['clarification', 'dispatch_info'].includes(taskType)) {
      return res.status(400).json({ error: 'Unsupported taskType' })
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: {
        id: true,
        externalKey: true,
        fromPoint: true,
        toPoint: true,
        infoReason: true
      }
    })
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const state = taskType === 'clarification' ? 'missing_data_detected' : 'ready_to_notify'
    const priority = taskType === 'clarification' ? 50 : 80
    const defaultAgentId = await pickDefaultAgentIdForTaskType(tenantId, taskType)
    const payload = { orderId, taskType, state, priority, agentConfigId: defaultAgentId }
    ensureIdempotencyKey(req, 'chat_task.queue_one', payload)
    const wrapped = await withIdempotency(req, 'chat_task.queue_one', payload, async () => {
      return prisma.chatTask.upsert({
        where: { tenantId_orderId_taskType: { tenantId, orderId, taskType } },
        create: {
          tenantId,
          orderId,
          taskType,
          state,
          priority,
          agentConfigId: defaultAgentId,
          ...(assignToMe ? { assignedToUserId: req.user?.id || null } : {})
        },
        update: {
          state,
          priority,
          ...(defaultAgentId ? { agentConfigId: defaultAgentId } : {}),
          ...(assignToMe ? { assignedToUserId: req.user?.id || null } : {})
        }
      })
    })

    res.json({
      task: wrapped.data,
      prefillText: buildOrderChatPrefill(order, taskType),
      idempotent: wrapped.replayed
    })
  } catch (error) {
    console.error('Error queueing single chat order:', error)
    res.status(500).json({ error: 'Failed to queue order for chats' })
  }
})

app.post('/api/admin/chats/dispatch-one-click', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const orderId = String(req.body?.orderId || '').trim()
    const confirmed = req.body?.confirmed === true
    const messageText = String(req.body?.messageText || '').trim()
    if (!orderId) return res.status(400).json({ error: 'orderId is required' })
    if (!confirmed) return res.status(400).json({ error: 'human_confirmation_required' })
    if (!messageText) return res.status(400).json({ error: 'messageText is required' })

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: {
        id: true,
        externalKey: true,
        fromPoint: true,
        toPoint: true,
        infoReason: true
      }
    })
    if (!order) return res.status(404).json({ error: 'Order not found' })

    ensureIdempotencyKey(req, 'chat_dispatch.one_click_send', { orderId, messageText })
    const wrapped = await withIdempotency(req, 'chat_dispatch.one_click_send', { orderId, messageText }, async () => {
      const defaultAgentId = await pickDefaultAgentIdForTaskType(tenantId, 'dispatch_info')
      const task = await prisma.chatTask.upsert({
        where: { tenantId_orderId_taskType: { tenantId, orderId, taskType: 'dispatch_info' } },
        create: {
          tenantId,
          orderId,
          taskType: 'dispatch_info',
          state: 'ready_to_notify',
          priority: 80,
          agentConfigId: defaultAgentId,
          assignedToUserId: req.user?.id || null
        },
        update: {
          ...(defaultAgentId ? { agentConfigId: defaultAgentId } : {}),
          assignedToUserId: req.user?.id || null,
          priority: 80
        }
      })

      if (task.state === 'ready_to_notify') {
        await prisma.chatTask.update({
          where: { id: task.id },
          data: { state: 'notify_draft' }
        })
      }

      const message = await prisma.chatMessage.create({
        data: {
          tenantId,
          chatTaskId: task.id,
          direction: 'outbound',
          source: 'operator',
          channel: 'telegram',
          bodyText: messageText,
          approvalStatus: 'pending_human',
          traceId: req.actorContext.traceId,
          idempotencyKey: `${req.idempotencyKey || ''}:msg`,
          createdByUserId: req.user?.id || null
        }
      })

      await prisma.chatMessage.update({
        where: { id: message.id },
        data: { approvalStatus: 'approved' }
      })

      const runtimePayload = buildOpenClawEnvelope({
        tenantId,
        traceId: req.actorContext.traceId,
        idempotencyKey: req.idempotencyKey || null,
        actor: {
          id: req.actorContext.actorId || req.user?.id || null,
          role: req.actorContext.actorRole || 'staff'
        },
        capability: 'riderra.customer.message.send',
        approval: { mode: 'approved' },
        billing: { mode: 'track_only', unit: 'message' },
        extra: {
          task: {
            id: task.id,
            type: task.taskType,
            state: task.state,
            channel: 'telegram'
          },
          order: {
            id: order.id,
            external_key: order.externalKey || null,
            route_from: order.fromPoint || null,
            route_to: order.toPoint || null
          },
          message: {
            id: message.id,
            channel: 'telegram',
            text: messageText
          }
        }
      })

      const runtimeConfig = getOpenClawRuntimeConfig()
      const runtimeResult = await callOpenClawRuntime({
        path: runtimeConfig.sendPath,
        payload: runtimePayload,
        kind: 'send',
        traceId: req.actorContext.traceId,
        idempotencyKey: req.idempotencyKey || null
      })
      if (runtimeResult.configured && !runtimeResult.ok) {
        await prisma.chatMessage.update({
          where: { id: message.id },
          data: { approvalStatus: 'rejected' }
        })
        const currentTask = await prisma.chatTask.findFirst({
          where: { id: task.id },
          select: { id: true, state: true }
        })
        if (currentTask) {
          await transitionChatTaskIfAllowed(task.id, currentTask.state, 'handoff_human')
          await prisma.chatTask.update({
            where: { id: task.id },
            data: {
              lastError: runtimeResult.error || `OpenClaw send failed (${runtimeResult.status || 0})`
            }
          })
        }
        const err = new Error(runtimeResult.error || 'OpenClaw send failed')
        err.statusCode = 502
        err.details = { runtimeStatus: runtimeResult.status || 0, rollbackDone: true }
        throw err
      }

      const providerMessageId = String(
        runtimeResult.data?.provider_message_id ||
        runtimeResult.data?.providerMessageId ||
        runtimeResult.data?.message_id ||
        runtimeResult.data?.id ||
        ''
      ).trim() || `manual:${Date.now()}`

      const sentMessage = await prisma.chatMessage.update({
        where: { id: message.id },
        data: {
          approvalStatus: 'sent',
          providerMessageId,
          source: runtimeResult.configured ? 'openclaw' : 'operator'
        }
      })

      await prisma.chatTask.update({
        where: { id: task.id },
        data: {
          state: 'notify_sent',
          lastError: null
        }
      })
      return {
        taskId: task.id,
        messageId: sentMessage.id,
        runtime: {
          configured: runtimeResult.configured,
          ok: runtimeResult.ok,
          status: runtimeResult.status,
          error: runtimeResult.error || null
        }
      }
    })

    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error in one-click dispatch send:', error)
    if (error.statusCode === 502) {
      return res.status(502).json({ error: 'dispatch_send_failed', details: error.message, ...(error.details || {}) })
    }
    res.status(500).json({ error: 'Failed to send dispatch in one click' })
  }
})

app.post('/api/admin/chats/queue-marked', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const orderIds = Array.isArray(req.body?.orderIds)
      ? req.body.orderIds.map((x) => String(x || '').trim()).filter(Boolean)
      : []
    const where = {
      tenantId,
      needsInfo: true,
      ...(orderIds.length ? { id: { in: orderIds } } : {})
    }
    const markedOrders = await prisma.order.findMany({
      where,
      select: { id: true }
    })

    let created = 0
    let updated = 0
    for (const order of markedOrders) {
      const defaultAgentId = await pickDefaultAgentIdForTaskType(tenantId, 'clarification')
      const existing = await prisma.chatTask.findFirst({
        where: { tenantId, orderId: order.id, taskType: 'clarification' },
        select: { id: true }
      })
      await prisma.chatTask.upsert({
        where: { tenantId_orderId_taskType: { tenantId, orderId: order.id, taskType: 'clarification' } },
        create: {
          tenantId,
          orderId: order.id,
          taskType: 'clarification',
          state: 'missing_data_detected',
          priority: 50,
          agentConfigId: defaultAgentId
        },
        update: {
          state: 'missing_data_detected',
          priority: 50,
          ...(defaultAgentId ? { agentConfigId: defaultAgentId } : {})
        }
      })
      if (existing) updated += 1
      else created += 1
    }

    res.json({ totalMarked: markedOrders.length, created, updated })
  } catch (error) {
    console.error('Error queueing marked orders:', error)
    res.status(500).json({ error: 'Failed to queue marked orders' })
  }
})

app.post('/api/admin/chats/tasks/bulk/assign-to-me', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const actorUserId = req.user?.id || null
    if (!actorUserId) return res.status(401).json({ error: 'Actor user is not resolved' })
    const taskIds = Array.isArray(req.body?.taskIds) ? req.body.taskIds.map((id) => String(id || '').trim()).filter(Boolean) : []
    if (!taskIds.length) return res.status(400).json({ error: 'taskIds is required' })

    const result = await prisma.chatTask.updateMany({
      where: { tenantId, id: { in: taskIds } },
      data: { assignedToUserId: actorUserId }
    })
    res.json({ updated: result.count || 0 })
  } catch (error) {
    console.error('Error bulk assigning chat tasks:', error)
    res.status(500).json({ error: 'Failed to bulk assign chat tasks' })
  }
})

app.post('/api/admin/chats/tasks/bulk/transition', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const toState = String(req.body?.toState || '').trim()
    const reason = String(req.body?.reason || '').trim()
    const taskIds = Array.isArray(req.body?.taskIds) ? req.body.taskIds.map((id) => String(id || '').trim()).filter(Boolean) : []
    if (!taskIds.length) return res.status(400).json({ error: 'taskIds is required' })
    if (!toState) return res.status(400).json({ error: 'toState is required' })

    const tasks = await prisma.chatTask.findMany({
      where: { tenantId, id: { in: taskIds } },
      select: { id: true, state: true }
    })
    if (!tasks.length) return res.json({ updated: 0, skipped: taskIds.length, skippedIds: taskIds })

    let updated = 0
    const skippedIds = []
    for (const task of tasks) {
      const fromState = String(task.state || '')
      if (fromState === toState) {
        skippedIds.push(task.id)
        continue
      }
      const allowed = CHAT_STATE_TRANSITIONS[fromState] || []
      if (!allowed.includes(toState)) {
        skippedIds.push(task.id)
        continue
      }
      await prisma.chatTask.update({
        where: { id: task.id },
        data: { state: toState }
      })
      updated += 1
      await writeAuditLog({
        tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'chat_task.bulk_transition',
        resource: 'chat_task',
        resourceId: task.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: { fromState, toState, reason: reason || null }
      })
    }
    res.json({
      updated,
      skipped: tasks.length - updated,
      skippedIds
    })
  } catch (error) {
    console.error('Error bulk transitioning chat tasks:', error)
    res.status(500).json({ error: 'Failed to bulk transition chat tasks' })
  }
})

app.get('/api/admin/chats/tasks/:id', authenticateToken, resolveActorContext, requireActorContext, requireCan('orders.read', 'order'), async (req, res) => {
  try {
    const task = await prisma.chatTask.findFirst({
      where: { id: req.params.id, tenantId: req.actorContext.tenantId },
      include: {
        agentConfig: true,
        order: {
          select: {
            id: true,
            externalKey: true,
            source: true,
            sourceRow: true,
            fromPoint: true,
            toPoint: true,
            clientPrice: true,
            status: true,
            needsInfo: true,
            infoReason: true,
            comment: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })
    if (!task) return res.status(404).json({ error: 'Chat task not found' })
    let lastTrace = null
    const traceMessage = [...(task.messages || [])]
      .reverse()
      .find((m) => m.direction === 'internal' && m.source === 'system' && String(m.bodyJson || '').includes('"kind":"inbound_trace"'))
    if (traceMessage?.bodyJson) {
      const parsed = parseJsonSafe(traceMessage.bodyJson, null)
      if (parsed && parsed.kind === 'inbound_trace') {
        lastTrace = {
          ...parsed,
          messageId: traceMessage.id,
          createdAt: traceMessage.createdAt
        }
      }
    }
    let assignedOwner = null
    if (task?.assignedToUserId) {
      const owner = await prisma.user.findFirst({
        where: { id: task.assignedToUserId },
        select: { id: true, email: true }
      })
      assignedOwner = owner ? { id: owner.id, email: owner.email || null } : { id: task.assignedToUserId, email: null }
    }
    res.json({ task: { ...task, assignedOwner }, lastTrace })
  } catch (error) {
    console.error('Error loading chat task details:', error)
    res.status(500).json({ error: 'Failed to load chat task details' })
  }
})

app.post('/api/admin/chats/tasks/:id/transition', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const { toState, reason = '' } = req.body || {}
    const target = String(toState || '').trim()
    if (!target) return res.status(400).json({ error: 'toState is required' })
    const tenantId = req.actorContext.tenantId

    const task = await prisma.chatTask.findFirst({
      where: { id: req.params.id, tenantId },
      select: { id: true, state: true }
    })
    if (!task) return res.status(404).json({ error: 'Chat task not found' })
    const current = String(task.state || '')
    const allowed = CHAT_STATE_TRANSITIONS[current] || []
    if (current !== target && !allowed.includes(target)) {
      return res.status(409).json({ error: 'Transition not allowed', fromState: current, toState: target, allowedTo: allowed })
    }

    const payload = { taskId: req.params.id, fromState: current, toState: target, reason: String(reason || '') }
    ensureIdempotencyKey(req, 'admin.chat_task.transition', payload)

    const wrapped = await withIdempotency(req, 'admin.chat_task.transition', payload, async () => {
      const updated = await prisma.chatTask.update({
        where: { id: task.id },
        data: { state: target }
      })
      await writeAuditLog({
        tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'chat_task.transition',
        resource: 'chat_task',
        resourceId: task.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return updated
    })
    res.json({ task: wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error transitioning chat task:', error)
    res.status(500).json({ error: 'Failed to transition chat task' })
  }
})

app.post('/api/admin/chats/tasks/:id/assign-agent', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const taskId = String(req.params.id || '').trim()
    if (!taskId) return res.status(400).json({ error: 'Task id is required' })

    const task = await prisma.chatTask.findFirst({
      where: { id: taskId, tenantId },
      select: { id: true, agentConfigId: true }
    })
    if (!task) return res.status(404).json({ error: 'Chat task not found' })

    const rawAgentConfigId = req.body?.agentConfigId
    const nextAgentConfigId = rawAgentConfigId === undefined || rawAgentConfigId === null || String(rawAgentConfigId).trim() === ''
      ? null
      : String(rawAgentConfigId).trim()

    let targetAgent = null
    if (nextAgentConfigId) {
      targetAgent = await prisma.chatAgentConfig.findFirst({
        where: { id: nextAgentConfigId, tenantId },
        select: { id: true, code: true, name: true, isActive: true }
      })
      if (!targetAgent) return res.status(404).json({ error: 'Agent not found for this tenant' })
    }

    const updatedTask = await prisma.chatTask.update({
      where: { id: task.id },
      data: { agentConfigId: targetAgent?.id || null },
      include: { agentConfig: true }
    })

    await writeAuditLog({
      tenantId,
      actorId: req.actorContext.actorId,
      actorRole: req.actorContext.actorRole,
      action: 'chat_task.assign_agent',
      resource: 'chat_task',
      resourceId: task.id,
      traceId: req.actorContext.traceId,
      decision: 'policy_allowed',
      result: 'ok',
      context: {
        previousAgentConfigId: task.agentConfigId || null,
        nextAgentConfigId: targetAgent?.id || null
      }
    })

    res.json({ task: updatedTask, agent: updatedTask.agentConfig ? serializeAgent(updatedTask.agentConfig) : null })
  } catch (error) {
    console.error('Error assigning agent to chat task:', error)
    res.status(500).json({ error: 'Failed to assign agent to chat task' })
  }
})

app.post('/api/admin/chats/tasks/:id/build', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const task = await prisma.chatTask.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        agentConfig: true,
        order: {
          select: {
            id: true,
            externalKey: true,
            source: true,
            sourceRow: true,
            fromPoint: true,
            toPoint: true,
            clientPrice: true,
            status: true,
            needsInfo: true,
            infoReason: true,
            comment: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 12,
          select: {
            id: true,
            direction: true,
            source: true,
            channel: true,
            bodyText: true,
            createdAt: true
          }
        }
      }
    })
    if (!task) return res.status(404).json({ error: 'Chat task not found' })
    if (!task.agentConfigId || !task.agentConfig || !task.agentConfig.isActive) {
      return res.status(409).json({ error: 'No active agent configured for this task' })
    }

    const buildBody = String(req.body?.message || req.body?.bodyText || '').trim()
    const capabilityPayload = buildOpenClawEnvelope({
      tenantId,
      traceId: req.actorContext.traceId,
      idempotencyKey: req.idempotencyKey || null,
      actor: {
        id: req.actorContext.actorId || req.user?.id || null,
        role: req.actorContext.actorRole || 'staff'
      },
      capability: 'riderra.customer.message.compose',
      approval: { mode: 'human_required' },
      billing: { mode: 'track_only', unit: 'message' },
      extra: {
        task: {
          id: task.id,
          type: task.taskType,
          state: task.state,
          channel: task.channel || 'telegram'
        },
        order: {
          id: task.order?.id || null,
          external_key: task.order?.externalKey || null,
          route_from: task.order?.fromPoint || null,
          route_to: task.order?.toPoint || null,
          client_price: task.order?.clientPrice ?? null,
          status: task.order?.status || null,
          needs_info: !!task.order?.needsInfo,
          info_reason: task.order?.infoReason || null,
          comment: task.order?.comment || null
        },
        agent: {
          id: task.agentConfig.id,
          code: task.agentConfig.code,
          name: task.agentConfig.name,
          type: task.agentConfig.type || null,
          task_type: task.agentConfig.taskType || null,
          prompt: task.agentConfig.promptText || '',
          workflow: task.agentConfig.workflowJson || null,
          restrictions: parseJsonSafe(task.agentConfig.restrictionsJson || '{}', {}),
          variables: parseJsonSafe(task.agentConfig.variablesJson || '{}', {})
        },
        conversation_history: (task.messages || []).map((m) => ({
          id: m.id,
          role: m.direction === 'inbound' ? 'customer' : 'staff',
          source: m.source || null,
          channel: m.channel || null,
          text: m.bodyText || '',
          created_at: m.createdAt
        })),
        input: buildBody || null
      }
    })
    const runtimeConfig = getOpenClawRuntimeConfig()
    const runtimeResult = await callOpenClawRuntime({
      path: runtimeConfig.buildPath,
      payload: capabilityPayload,
      kind: 'build',
      traceId: req.actorContext.traceId,
      idempotencyKey: req.idempotencyKey || null
    })

    let draftText = extractTextFromOpenClawResponse(runtimeResult.data || {})
    if (!draftText) {
      const lines = ['Я помощник Riderra, работаю в тестовом режиме.']
      if (task.taskType === 'clarification') {
        lines.push('Проверяю детали заказа. Уточните, пожалуйста, недостающие данные по поездке.')
      } else {
        lines.push('Передаю подтвержденные детали вашей поездки.')
      }
      if (task.order?.infoReason) lines.push(`Нужно уточнить: ${task.order.infoReason}.`)
      if (task.order?.externalKey) lines.push(`Номер заказа: ${task.order.externalKey}.`)
      draftText = lines.join(' ')
    }

    const message = await prisma.chatMessage.create({
      data: {
        tenantId,
        chatTaskId: task.id,
        direction: 'outbound',
        source: runtimeResult.configured ? 'openclaw' : 'system',
        channel: task.channel || 'telegram',
        bodyText: draftText,
        approvalStatus: task.agentConfig.requiresApproval ? 'pending_human' : 'approved',
        traceId: req.actorContext.traceId,
        idempotencyKey: req.idempotencyKey || null,
        createdByUserId: req.user?.id || null
      }
    })

    if (task.state === 'ready_to_notify') {
      await prisma.chatTask.update({
        where: { id: task.id },
        data: { state: 'notify_draft' }
      })
    }

    await recordAiLearningEvent({
      tenantId,
      agentConfigId: task.agentConfig.id,
      chatTaskId: task.id,
      chatMessageId: message.id,
      promptKey: `agent:${task.agentConfig.code}`,
      promptVersion: 1,
      capability: 'riderra.customer.message.compose',
      intent: inferIntentFromTaskType(task.taskType),
      outcome: runtimeResult.ok ? 'draft_created' : 'fallback_draft',
      context: {
        runtime: runtimeResult.configured ? 'openclaw' : 'local_fallback',
        runtimeOk: runtimeResult.ok,
        runtimeStatus: runtimeResult.status,
        runtimeError: runtimeResult.error || null
      }
    })

    res.json({
      message,
      runtime: {
        configured: runtimeResult.configured,
        ok: runtimeResult.ok,
        status: runtimeResult.status,
        error: runtimeResult.error || null
      }
    })
  } catch (error) {
    console.error('Error building chat draft via OpenClaw:', error)
    res.status(500).json({ error: 'Failed to build chat draft' })
  }
})

app.post('/api/admin/chats/tasks/:id/messages', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const { direction = 'outbound', source = 'operator', channel = 'telegram', bodyText = '', bodyJson = null, approvalStatus = null } = req.body || {}
    if (!String(bodyText || '').trim()) return res.status(400).json({ error: 'bodyText is required' })
    const tenantId = req.actorContext.tenantId
    const task = await prisma.chatTask.findFirst({
      where: { id: req.params.id, tenantId },
      select: { id: true, taskType: true, state: true }
    })
    if (!task) return res.status(404).json({ error: 'Chat task not found' })

    const payload = {
      taskId: task.id,
      direction: String(direction),
      source: String(source),
      channel: String(channel),
      bodyText: String(bodyText),
      bodyJson: bodyJson ? JSON.stringify(bodyJson) : null,
      approvalStatus: approvalStatus || null
    }
    ensureIdempotencyKey(req, 'admin.chat_message.create', payload)

    const wrapped = await withIdempotency(req, 'admin.chat_message.create', payload, async () => {
      const created = await prisma.chatMessage.create({
        data: {
          tenantId,
          chatTaskId: task.id,
          direction: payload.direction,
          source: payload.source,
          channel: payload.channel,
          bodyText: payload.bodyText,
          bodyJson: payload.bodyJson,
          approvalStatus: payload.approvalStatus || (payload.direction === 'outbound' ? 'pending_human' : null),
          traceId: req.actorContext.traceId,
          idempotencyKey: req.idempotencyKey || null,
          createdByUserId: req.user?.id || null
        }
      })

      if (payload.direction === 'outbound' && task.state === 'ready_to_notify') {
        await prisma.chatTask.update({
          where: { id: task.id },
          data: { state: 'notify_draft' }
        })
      }

      await writeAuditLog({
        tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'chat_message.create',
        resource: 'chat_message',
        resourceId: created.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: { taskId: task.id, direction: payload.direction, channel: payload.channel }
      })
      return created
    })
    res.json({ message: wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error creating chat message:', error)
    res.status(500).json({ error: 'Failed to create chat message' })
  }
})

app.post('/api/admin/chats/messages/:id/approve', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const message = await prisma.chatMessage.findFirst({
      where: { id: req.params.id, tenantId },
      select: { id: true }
    })
    if (!message) return res.status(404).json({ error: 'Message not found' })
    const updated = await prisma.chatMessage.update({
      where: { id: message.id },
      data: { approvalStatus: 'approved' }
    })
    res.json({ message: updated })
  } catch (error) {
    console.error('Error approving chat message:', error)
    res.status(500).json({ error: 'Failed to approve chat message' })
  }
})

app.post('/api/admin/chats/messages/:id/reject', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const message = await prisma.chatMessage.findFirst({
      where: { id: req.params.id, tenantId },
      select: { id: true }
    })
    if (!message) return res.status(404).json({ error: 'Message not found' })
    const updated = await prisma.chatMessage.update({
      where: { id: message.id },
      data: { approvalStatus: 'rejected' }
    })
    res.json({ message: updated })
  } catch (error) {
    console.error('Error rejecting chat message:', error)
    res.status(500).json({ error: 'Failed to reject chat message' })
  }
})

app.post('/api/admin/chats/messages/:id/send', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const message = await prisma.chatMessage.findFirst({
      where: { id: req.params.id, tenantId },
      include: { chatTask: { include: { agentConfig: true, order: true } } }
    })
    if (!message) return res.status(404).json({ error: 'Message not found' })
    if (String(message.direction || '') !== 'outbound') {
      return res.status(409).json({ error: 'Only outbound messages can be sent' })
    }
    if (message.approvalStatus && message.approvalStatus !== 'approved' && message.approvalStatus !== 'sent') {
      return res.status(409).json({ error: 'Message must be approved before send' })
    }

    const runtimePayload = buildOpenClawEnvelope({
      tenantId,
      traceId: req.actorContext.traceId,
      idempotencyKey: req.idempotencyKey || null,
      actor: {
        id: req.actorContext.actorId || req.user?.id || null,
        role: req.actorContext.actorRole || 'staff'
      },
      capability: 'riderra.customer.message.send',
      approval: { mode: 'approved' },
      billing: { mode: 'track_only', unit: 'message' },
      extra: {
        task: {
          id: message.chatTask.id,
          type: message.chatTask.taskType,
          state: message.chatTask.state,
          channel: message.channel || message.chatTask.channel || 'telegram'
        },
        order: {
          id: message.chatTask.orderId || null,
          external_key: message.chatTask.order?.externalKey || null,
          route_from: message.chatTask.order?.fromPoint || null,
          route_to: message.chatTask.order?.toPoint || null
        },
        message: {
          id: message.id,
          channel: message.channel || message.chatTask.channel || 'telegram',
          text: message.bodyText || ''
        }
      }
    })
    const payload = { messageId: message.id, taskId: message.chatTask.id, bodyText: message.bodyText || '' }
    ensureIdempotencyKey(req, 'admin.chat_message.send', payload)

    const wrapped = await withIdempotency(req, 'admin.chat_message.send', payload, async () => {
      const runtimeConfig = getOpenClawRuntimeConfig()
      const runtimeResult = await callOpenClawRuntime({
        path: runtimeConfig.sendPath,
        payload: runtimePayload,
        kind: 'send',
        traceId: req.actorContext.traceId,
        idempotencyKey: req.idempotencyKey || null
      })
      if (runtimeResult.configured && !runtimeResult.ok) {
        const error = new Error(runtimeResult.error || 'OpenClaw send failed')
        error.statusCode = 502
        error.details = { runtimeStatus: runtimeResult.status || 0 }
        throw error
      }
      const providerMessageId = String(
        runtimeResult.data?.provider_message_id ||
        runtimeResult.data?.providerMessageId ||
        runtimeResult.data?.message_id ||
        runtimeResult.data?.id ||
        ''
      ).trim() || `manual:${Date.now()}`

      const updated = await prisma.chatMessage.update({
        where: { id: message.id },
        data: {
          approvalStatus: 'sent',
          providerMessageId: message.providerMessageId || providerMessageId,
          source: runtimeResult.configured ? 'openclaw' : message.source
        }
      })

      const nextState = message.chatTask.taskType === 'clarification' ? 'request_sent' : 'notify_sent'
      await prisma.chatTask.update({
        where: { id: message.chatTask.id },
        data: { state: nextState }
      })

      await writeAuditLog({
        tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'chat_message.send',
        resource: 'chat_message',
        resourceId: message.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: { taskId: message.chatTask.id, nextState }
      })
      await recordAiLearningEvent({
        tenantId,
        agentConfigId: message.chatTask.agentConfigId || null,
        chatTaskId: message.chatTask.id,
        chatMessageId: message.id,
        promptKey: message.chatTask.agentConfig ? `agent:${message.chatTask.agentConfig.code}` : null,
        promptVersion: 1,
        capability: 'riderra.customer.message.send',
        intent: inferIntentFromTaskType(message.chatTask.taskType),
        outcome: 'sent',
        context: {
          runtime: runtimeResult.configured ? 'openclaw' : 'manual',
          runtimeOk: runtimeResult.ok,
          runtimeStatus: runtimeResult.status,
          runtimeError: runtimeResult.error || null
        }
      })
      return { updated, nextState, runtimeResult }
    })

    res.json({
      message: wrapped.data.updated,
      taskState: wrapped.data.nextState,
      runtime: {
        configured: wrapped.data.runtimeResult.configured,
        ok: wrapped.data.runtimeResult.ok,
        status: wrapped.data.runtimeResult.status,
        error: wrapped.data.runtimeResult.error || null
      }
    })
  } catch (error) {
    console.error('Error sending chat message:', error)
    if (error.statusCode === 502) {
      return res.status(502).json({ error: 'OpenClaw send failed', details: error.message, ...(error.details || {}) })
    }
    res.status(500).json({ error: 'Failed to send chat message' })
  }
})

app.post('/api/admin/chats/tasks/:id/inbound', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.manage', 'order'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const task = await prisma.chatTask.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        agentConfig: true,
        order: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20,
          select: { id: true, direction: true, source: true, bodyText: true, createdAt: true }
        }
      }
    })
    if (!task) return res.status(404).json({ error: 'Chat task not found' })
    const bodyText = String(req.body?.bodyText || req.body?.message || '').trim()
    if (!bodyText) return res.status(400).json({ error: 'bodyText is required' })

    const payload = { taskId: task.id, bodyText, channel: task.channel || 'telegram' }
    ensureIdempotencyKey(req, 'admin.chat_task.inbound', payload)

    const wrapped = await withIdempotency(req, 'admin.chat_task.inbound', payload, async () => {
      const inboundMessage = await prisma.chatMessage.create({
        data: {
          tenantId,
          chatTaskId: task.id,
          direction: 'inbound',
          source: 'customer',
          channel: task.channel || 'telegram',
          bodyText,
          traceId: req.actorContext.traceId,
          idempotencyKey: req.idempotencyKey || null,
          createdByUserId: req.user?.id || null
        }
      })

      const runtimeConfig = getOpenClawRuntimeConfig()
      const classifyPayload = buildOpenClawEnvelope({
        tenantId,
        traceId: req.actorContext.traceId,
        idempotencyKey: req.idempotencyKey || null,
        actor: { id: req.actorContext.actorId || req.user?.id || null, role: req.actorContext.actorRole || 'staff' },
        capability: 'riderra.customer.reply.classify',
        approval: { mode: 'not_required' },
        billing: { mode: 'track_only', unit: 'classification' },
        extra: {
          task: { id: task.id, type: task.taskType, state: task.state },
          order: {
            id: task.order?.id || null,
            external_key: task.order?.externalKey || null,
            needs_info: Boolean(task.order?.needsInfo),
            info_reason: task.order?.infoReason || null
          },
          message: {
            id: inboundMessage.id,
            text: bodyText,
            channel: task.channel || 'telegram'
          },
          conversation_history: (task.messages || []).map((m) => ({
            id: m.id,
            role: m.direction === 'inbound' ? 'customer' : 'staff',
            text: m.bodyText || '',
            created_at: m.createdAt
          }))
        }
      })

      let classification = { class: 'unclassified', confidence: null, requiresHuman: false }
      let classifyRuntime = { configured: false, ok: false, status: 0, error: null }
      if (!task.agentPaused) {
        const classifyResult = await callOpenClawRuntime({
          path: runtimeConfig.classifyPath,
          payload: classifyPayload,
          kind: 'classify',
          traceId: req.actorContext.traceId,
          idempotencyKey: req.idempotencyKey || null
        })
        classifyRuntime = {
          configured: classifyResult.configured,
          ok: classifyResult.ok,
          status: classifyResult.status,
          error: classifyResult.error || null
        }
        if (classifyResult.ok) {
          classification = extractClassificationFromOpenClawResponse(classifyResult.data || {})
        }
      }

      let extraction = null
      let extractRuntime = { configured: false, ok: false, status: 0, error: null }
      if (!task.agentPaused && task.taskType === 'clarification' && classification.class === 'answer') {
        const extractPayload = buildOpenClawEnvelope({
          tenantId,
          traceId: req.actorContext.traceId,
          idempotencyKey: req.idempotencyKey || null,
          actor: { id: req.actorContext.actorId || req.user?.id || null, role: req.actorContext.actorRole || 'staff' },
          capability: 'riderra.order.field.extract_validate',
          approval: { mode: 'not_required' },
          billing: { mode: 'track_only', unit: 'extraction' },
          extra: {
            task: { id: task.id, type: task.taskType, state: task.state },
            order: {
              id: task.order?.id || null,
              external_key: task.order?.externalKey || null,
              from: task.order?.fromPoint || null,
              to: task.order?.toPoint || null,
              pickup_at: task.order?.pickupAt || null,
              info_reason: task.order?.infoReason || null
            },
            message: { id: inboundMessage.id, text: bodyText, channel: task.channel || 'telegram' }
          }
        })
        const extractResult = await callOpenClawRuntime({
          path: runtimeConfig.extractPath,
          payload: extractPayload,
          kind: 'extract',
          traceId: req.actorContext.traceId,
          idempotencyKey: req.idempotencyKey || null
        })
        extractRuntime = {
          configured: extractResult.configured,
          ok: extractResult.ok,
          status: extractResult.status,
          error: extractResult.error || null
        }
        if (extractResult.ok) {
          extraction = extractValidationFromOpenClawResponse(extractResult.data || {})
        }
      }

      let currentState = String(task.state || '')
      const toCustomerReplied = await transitionChatTaskIfAllowed(task.id, currentState, 'customer_replied')
      if (toCustomerReplied.changed) currentState = toCustomerReplied.state

      const candidateState = computeNextChatStateForInbound({
        taskType: task.taskType,
        currentState,
        classification,
        extraction,
        agentPaused: task.agentPaused
      })
      const decisionReason = explainInboundDecision({
        taskType: task.taskType,
        currentState,
        classification,
        extraction,
        agentPaused: task.agentPaused,
        candidateState
      })
      const finalTransition = await transitionChatTaskIfAllowed(task.id, currentState, candidateState)
      if (finalTransition.changed) currentState = finalTransition.state

      let orderUpdate = null
      if (task.taskType === 'clarification' && currentState === 'field_validated' && task.orderId) {
        orderUpdate = await prisma.order.update({
          where: { id: task.orderId },
          data: {
            needsInfo: false,
            infoReason: null
          },
          select: { id: true, needsInfo: true, infoReason: true, status: true }
        })
        const completeTransition = await transitionChatTaskIfAllowed(task.id, currentState, 'order_complete')
        if (completeTransition.changed) currentState = completeTransition.state
      }

      const trace = {
        kind: 'inbound_trace',
        taskType: task.taskType,
        fromState: String(task.state || ''),
        interimState: toCustomerReplied.changed ? toCustomerReplied.state : null,
        candidateState,
        finalState: currentState,
        decisionReason,
        capabilities: [
          {
            name: 'riderra.customer.reply.classify',
            runtime: classifyRuntime,
            output: classification
          },
          {
            name: 'riderra.order.field.extract_validate',
            runtime: extractRuntime,
            output: extraction
          }
        ]
      }

      await prisma.chatMessage.create({
        data: {
          tenantId,
          chatTaskId: task.id,
          direction: 'internal',
          source: 'system',
          channel: task.channel || 'telegram',
          bodyText: `TRACE: ${decisionReason} (${String(task.state || '')} -> ${currentState})`,
          bodyJson: JSON.stringify(trace),
          traceId: req.actorContext.traceId,
          idempotencyKey: null,
          createdByUserId: req.user?.id || null
        }
      })

      await writeAuditLog({
        tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'chat_task.inbound',
        resource: 'chat_task',
        resourceId: task.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: {
          inboundMessageId: inboundMessage.id,
          classification,
          extraction,
          state: currentState,
          taskType: task.taskType
        }
      })
      await recordAiLearningEvent({
        tenantId,
        agentConfigId: task.agentConfigId || null,
        chatTaskId: task.id,
        chatMessageId: inboundMessage.id,
        promptKey: task.agentConfig ? `agent:${task.agentConfig.code}` : null,
        promptVersion: 1,
        capability: 'riderra.customer.reply.classify',
        intent: inferIntentFromTaskType(task.taskType),
        outcome: 'inbound_processed',
        context: { classification, extraction, state: currentState }
      })

      return {
        message: inboundMessage,
        taskState: currentState,
        classification,
        extraction,
        trace,
        orderUpdate,
        runtime: {
          classify: classifyRuntime,
          extract: extractRuntime
        }
      }
    })

    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error processing inbound chat message:', error)
    res.status(500).json({ error: 'Failed to process inbound message' })
  }
})

app.put(
  '/api/admin/orders/:orderId/status',
  authenticateToken,
  resolveActorContext,
  requireActorContext,
  requireCan('orders.transition.request', 'order'),
  async (req, res) => {
    try {
      const { orderId } = req.params
      const { toStatus, reason } = req.body || {}
      const targetStatus = normalizeOrderStatus(toStatus)
      if (!targetStatus) return res.status(400).json({ error: 'toStatus is required' })
      const tenantId = req.actorContext.tenantId
      const riskyStatuses = ['cancelled', 'paid', 'closed', 'finance_hold', 'incident_reported']
      await ensureHumanApproval(req, {
        action: 'order.status.transition',
        resource: 'order',
        resourceId: orderId,
        payload: { toStatus: targetStatus, reason: reason || null },
        required: riskyStatuses.includes(targetStatus)
      })

      const wrapped = await withIdempotency(req, 'admin.order.status.transition', { orderId, targetStatus, reason }, async () => {
        const updated = await applyOrderStatusTransition({
          orderId,
          tenantId,
          toStatus: targetStatus,
          reason,
          actorPermissions: req.userPermissions || [],
          actorRole: req.actorContext.actorRole || null,
          actorUserId: req.user?.id || null,
          actorEmail: req.user?.email || null,
          source: 'admin_api'
        })
        await writeAuditLog({
          tenantId,
          actorId: req.actorContext.actorId,
          actorRole: req.actorContext.actorRole,
          action: 'order.status.transition',
          resource: 'order',
          resourceId: orderId,
          traceId: req.actorContext.traceId,
          decision: 'policy_allowed',
          result: 'ok',
          context: { from: updated.status, to: targetStatus, reason: reason || null }
        })
        return { success: true, order: updated }
      })

      res.json({ ...wrapped.data, idempotent: wrapped.replayed })
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.message,
          ...(error.details || {})
        })
      }
      console.error('Error changing order status:', error)
      res.status(500).json({ error: 'Failed to change order status' })
    }
  }
)

app.get(
  '/api/admin/orders/:orderId/available-status-transitions',
  authenticateToken,
  resolveActorContext,
  requireActorContext,
  requireCan('orders.read', 'order'),
  async (req, res) => {
    try {
      const { orderId } = req.params
      const order = await prisma.order.findFirst({
        where: { id: orderId, tenantId: req.actorContext.tenantId },
        select: {
          id: true,
          status: true,
          driver: { select: { userId: true } }
        }
      })
      if (!order) return res.status(404).json({ error: 'Order not found' })

      const currentStatus = normalizeOrderStatus(order.status)
      const actor = buildActorFromReq(req)
      const candidates = ORDER_STATUS_TRANSITIONS[currentStatus] || []
      const allowedTo = candidates.filter((target) =>
        can(actor, 'orders.transition', 'order', {
          tenantId: req.actorContext.tenantId,
          fromStatus: currentStatus,
          toStatus: target,
          ownerUserId: order.driver?.userId || null
        })
      )

      res.json({ orderId, currentStatus, allowedTo })
    } catch (error) {
      console.error('Error loading available status transitions:', error)
      res.status(500).json({ error: 'Failed to load available status transitions' })
    }
  }
)

app.get(
  '/api/admin/orders/:orderId/status-history',
  authenticateToken,
  resolveActorContext,
  requireActorContext,
  requireCan('orders.read', 'order'),
  async (req, res) => {
    try {
      const { orderId } = req.params
      const order = await prisma.order.findFirst({
        where: { id: orderId, tenantId: req.actorContext.tenantId },
        select: { id: true }
      })
      if (!order) return res.status(404).json({ error: 'Order not found' })

      const history = await prisma.orderStatusHistory.findMany({
        where: { orderId, tenantId: req.actorContext.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 500
      })
      res.json({ orderId, history })
    } catch (error) {
      console.error('Error loading order status history:', error)
      res.status(500).json({ error: 'Failed to load order status history' })
    }
  }
)

app.get(
  '/api/admin/orders/:orderId/card-detail',
  authenticateToken,
  resolveActorContext,
  requireActorContext,
  requireCan('orders.read', 'order'),
  async (req, res) => {
    try {
      const { orderId } = req.params
      const order = await prisma.order.findFirst({
        where: { id: orderId, tenantId: req.actorContext.tenantId },
        select: {
          id: true,
          tenantId: true,
          externalKey: true,
          pickupAt: true,
          fromPoint: true,
          toPoint: true,
          clientPrice: true,
          driverPrice: true,
          commission: true,
          comment: true,
          status: true,
          vehicleType: true,
          passengers: true,
          luggage: true,
          needsInfo: true,
          infoReason: true,
          flightNumber: true,
          flightStatus: true,
          flightProvider: true,
          flightCheckedAt: true,
          flightArrivalScheduled: true,
          flightArrivalEstimated: true,
          flightArrivalActual: true,
          flightVerificationJson: true,
          addressProvider: true,
          addressCheckedAt: true,
          fromPointNormalized: true,
          fromPointLat: true,
          fromPointLon: true,
          toPointNormalized: true,
          toPointLat: true,
          toPointLon: true,
          addressVerificationJson: true,
          lang: true,
          updatedAt: true,
          createdAt: true
        }
      })
      if (!order) return res.status(404).json({ error: 'Order not found' })

      const draft = await findLinkedOpenClawDraftForOrder(order, req.actorContext.tenantId)
      const draftPayload = draft ? parseJsonSafe(draft.payloadJson || '{}', {}) : {}
      const orderDraft = draftPayload.orderDraft || {}
      const flightCheck = order.flightVerificationJson
        ? parseJsonSafe(order.flightVerificationJson, null)
        : (draftPayload.flightCheck || null)
      const addressVerification = order.addressVerificationJson
        ? parseJsonSafe(order.addressVerificationJson, null)
        : (draftPayload.addressVerification || null)
      const qualityChecks = Array.isArray(draftPayload.qualityChecks) ? draftPayload.qualityChecks : []
      const latestSnapshot = await prisma.orderSourceSnapshot.findFirst({
        where: { orderId: order.id, tenantId: req.actorContext.tenantId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sourceRow: true,
          rawPayload: true,
          createdAt: true
        }
      })

      res.json({
        orderId: order.id,
        detail: {
          pickupAt: order.pickupAt,
          fromPoint: order.fromPoint,
          toPoint: order.toPoint,
          clientPrice: order.clientPrice,
          driverPrice: order.driverPrice,
          commission: order.commission,
          comment: order.comment,
          vehicleType: order.vehicleType,
          passengers: order.passengers,
          luggage: order.luggage,
          needsInfo: order.needsInfo,
          infoReason: order.infoReason,
          lang: order.lang,
          sourceExternalKey: order.externalKey,
          aiDraftId: draft?.id || null,
          flightNumber: order.flightNumber || orderDraft.flightNumber || null,
          flightCheck,
          addressVerification,
          qualityChecks,
          sourceType: orderDraft.sourceType || draftPayload.sourceType || null,
          customerName: orderDraft.customerName || null,
          rawText: String(draftPayload.rawText || draft?.messageText || '').trim() || null,
          latestSnapshot: latestSnapshot
            ? {
                id: latestSnapshot.id,
                sourceRow: latestSnapshot.sourceRow,
                createdAt: latestSnapshot.createdAt
              }
            : null
        }
      })
    } catch (error) {
      console.error('Error loading order card detail:', error)
      res.status(500).json({ error: 'Failed to load order card detail' })
    }
  }
)

app.post(
  '/api/admin/orders/:orderId/flight-check',
  authenticateToken,
  resolveActorContext,
  requireActorContext,
  requireCan('ops.read', 'ops'),
  async (req, res) => {
    try {
      const order = await prisma.order.findFirst({
        where: { id: req.params.orderId, tenantId: req.actorContext.tenantId },
        select: {
          id: true,
          tenantId: true,
          externalKey: true,
          pickupAt: true
        }
      })
      if (!order) return res.status(404).json({ error: 'Order not found' })

      const draft = await findLinkedOpenClawDraftForOrder(order, req.actorContext.tenantId)
      if (!draft) return res.status(404).json({ error: 'Linked AI draft not found for order' })

      const payload = parseJsonSafe(draft.payloadJson || '{}', {})
      const orderDraft = payload.orderDraft || {}
      const flightNumber = normalizeFlightNumber(orderDraft.flightNumber || req.body?.flightNumber)
      const pickupAt = orderDraft.pickupAt || order.pickupAt || req.body?.pickupAt || null
      if (!flightNumber) return res.status(400).json({ error: 'flightNumber is missing for order' })

      const flightCheck = await fetchAviationStackFlightCheck({ flightNumber, pickupAt })
      const nextPayload = mergeFlightCheckIntoPayload(payload, flightCheck)

      const flightPersistence = buildOrderFlightPersistence(nextPayload)
      const [updatedDraft] = await prisma.$transaction([
        prisma.opsEventDraft.update({
          where: { id: draft.id },
          data: { payloadJson: JSON.stringify(nextPayload) }
        }),
        prisma.order.update({
          where: { id: order.id },
          data: flightPersistence
        })
      ])

      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'order.flight_check',
        resource: 'order',
        resourceId: order.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: {
          draftId: draft.id,
          flightNumber,
          pickupAt,
          provider: 'aviationstack',
          found: flightCheck.found
        }
      })

      res.json({
        success: true,
        orderId: order.id,
        draft: {
          ...updatedDraft,
          payload: nextPayload
        },
        flightCheck
      })
    } catch (error) {
      console.error('Error checking flight for order:', error)
      res.status(error.statusCode || 500).json({ error: error.message || 'Failed to check flight' })
    }
  }
)

app.post(
  '/api/admin/orders/:orderId/address-check',
  authenticateToken,
  resolveActorContext,
  requireActorContext,
  requireCan('ops.read', 'ops'),
  async (req, res) => {
    try {
      const order = await prisma.order.findFirst({
        where: { id: req.params.orderId, tenantId: req.actorContext.tenantId },
        select: {
          id: true,
          tenantId: true,
          fromPoint: true,
          toPoint: true,
          lang: true
        }
      })
      if (!order) return res.status(404).json({ error: 'Order not found' })

      const draft = await findLinkedOpenClawDraftForOrder(order, req.actorContext.tenantId)
      const payload = draft ? parseJsonSafe(draft.payloadJson || '{}', {}) : {}
      const orderDraft = payload.orderDraft || {}
      const fromPoint = String(order.fromPoint || orderDraft.fromPoint || req.body?.fromPoint || '').trim()
      const toPoint = String(order.toPoint || orderDraft.toPoint || req.body?.toPoint || '').trim()
      if (!fromPoint && !toPoint) return res.status(400).json({ error: 'No addresses available for order' })

      const [fromGeo, toGeo] = await Promise.all([
        fromPoint ? geocodeAddress(fromPoint, { language: order.lang || orderDraft.lang || 'en' }) : Promise.resolve(null),
        toPoint ? geocodeAddress(toPoint, { language: order.lang || orderDraft.lang || 'en' }) : Promise.resolve(null)
      ])
      const verification = {
        provider: 'nominatim',
        checkedAt: new Date().toISOString(),
        fromPoint: fromGeo,
        toPoint: toGeo
      }
      const nextPayload = draft ? mergeAddressVerificationIntoPayload(payload, verification) : payload
      const addressPersistence = buildOrderAddressPersistence({ addressVerification: verification })

      const ops = [
        prisma.order.update({
          where: { id: order.id },
          data: addressPersistence
        })
      ]
      if (draft) {
        ops.unshift(prisma.opsEventDraft.update({
          where: { id: draft.id },
          data: { payloadJson: JSON.stringify(nextPayload) }
        }))
      }
      const txResult = await prisma.$transaction(ops)
      const updatedDraft = draft ? txResult[0] : null

      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'order.address_check',
        resource: 'order',
        resourceId: order.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: {
          provider: 'nominatim',
          fromFound: Boolean(fromGeo?.found),
          toFound: Boolean(toGeo?.found)
        }
      })

      res.json({
        success: true,
        orderId: order.id,
        draft: updatedDraft ? { ...updatedDraft, payload: nextPayload } : null,
        addressVerification: verification
      })
    } catch (error) {
      console.error('Error checking addresses for order:', error)
      res.status(error.statusCode || 500).json({ error: error.message || 'Failed to check addresses' })
    }
  }
)

app.get(
  '/api/admin/approvals',
  authenticateToken,
  resolveActorContext,
  requireActorContext,
  requireCan('approvals.resolve', 'approval'),
  async (req, res) => {
    try {
      const { status = 'pending_human', limit = '200' } = req.query
      const take = Math.min(parseInt(limit, 10) || 200, 500)
      const where = {
        tenantId: req.actorContext.tenantId,
        ...(status ? { status: String(status) } : {})
      }
      const rows = await prisma.humanApproval.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take
      })
      res.json({ rows })
    } catch (error) {
      console.error('Error loading approvals:', error)
      res.status(500).json({ error: 'Failed to load approvals' })
    }
  }
)

app.post(
  '/api/admin/approvals/:id/resolve',
  authenticateToken,
  resolveActorContext,
  requireActorContext,
  requireCan('approvals.resolve', 'approval'),
  async (req, res) => {
    try {
      const { id } = req.params
      const { decision, reason } = req.body || {}
      const normalized = String(decision || '').toLowerCase()
      if (!['approved', 'rejected', 'expired'].includes(normalized)) {
        return res.status(400).json({ error: 'decision must be approved|rejected|expired' })
      }
      const approval = await prisma.humanApproval.findFirst({
        where: { id, tenantId: req.actorContext.tenantId }
      })
      if (!approval) return res.status(404).json({ error: 'Approval not found' })
      if (approval.status !== 'pending_human') {
        return res.status(409).json({ error: 'Approval already resolved', status: approval.status })
      }

      const resolved = await prisma.humanApproval.update({
        where: { id: approval.id },
        data: {
          status: normalized,
          reviewerId: req.actorContext.actorId || null,
          reviewedAt: new Date(),
          payloadJson: approval.payloadJson
        }
      })

      let transitionResult = null
      if (normalized === 'approved' && approval.action === 'order.status.transition') {
        const payload = JSON.parse(approval.payloadJson || '{}')
        if (payload?.toStatus) {
          transitionResult = await applyOrderStatusTransition({
            orderId: approval.resourceId,
            tenantId: req.actorContext.tenantId,
            toStatus: payload.toStatus,
            reason: [payload.reason || null, reason || null, `[approval:${approval.id}]`].filter(Boolean).join(' | '),
            actorPermissions: ['approvals.resolve'],
            actorRole: req.actorContext.actorRole || null,
            actorUserId: req.actorContext.actorId || null,
            actorEmail: req.user?.email || null,
            source: 'approval_resolver',
            bypassPermissions: false
          })
        }
      }

      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'approval.resolve',
        resource: 'human_approval',
        resourceId: approval.id,
        traceId: req.actorContext.traceId,
        decision: normalized,
        result: 'ok',
        context: {
          approvalAction: approval.action,
          transitionOrderId: approval.resourceId,
          transitionApplied: !!transitionResult
        }
      })

      res.json({ success: true, approval: resolved, transitionResult })
    } catch (error) {
      console.error('Error resolving approval:', error)
      res.status(500).json({ error: 'Failed to resolve approval' })
    }
  }
)

app.get('/api/admin/orders-sheet-view', authenticateToken, resolveActorContext, requireActorContext, requireCan('orders.read', 'order'), async (req, res) => {
  try {
    const { sourceId = '' } = req.query
    const source = sourceId
      ? await prisma.sheetSource.findFirst({ where: { id: String(sourceId), tenantId: req.actorContext.tenantId } })
      : await prisma.sheetSource.findFirst({
          where: { isActive: true, tenantId: req.actorContext.tenantId },
          orderBy: [{ updatedAt: 'desc' }]
        })

    if (!source) {
      return res.json({ source: null, headers: [], rows: [], rawRows: [] })
    }
    const mapping = parseColumnMapping(source.columnMapping)

    const snapshots = await prisma.orderSourceSnapshot.findMany({
      where: { sheetSourceId: source.id },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            driverPrice: true,
            clientPrice: true,
            updatedAt: true,
            createdAt: true
          }
        }
      },
      orderBy: [{ sourceRow: 'asc' }, { createdAt: 'desc' }],
      take: 10000
    })

    const seenRows = new Set()
    const rows = []

    for (const snapshot of snapshots) {
      if (seenRows.has(snapshot.sourceRow)) continue
      seenRows.add(snapshot.sourceRow)

      let payload = {}
      try {
        payload = JSON.parse(snapshot.rawPayload || '{}')
      } catch (_) {
        payload = {}
      }
      const raw = payload && payload.row && typeof payload.row === 'object' ? payload.row : payload
      if (!raw || typeof raw !== 'object') continue

      const contractor = pickField(raw, aliasesWithMapping(['контрагент', 'contractor'], mapping, 'contractor')) || ''
      const orderNumber = pickField(raw, aliasesWithMapping(['номер заказа', 'order id', 'номер'], mapping, 'orderNumber')) || ''
      const date = pickField(raw, aliasesWithMapping(['дата', 'date', 'pickup datetime', 'pickup time', 'дата подачи'], mapping, 'date')) || ''
      const fromPoint = pickField(raw, aliasesWithMapping(['откуда', 'from', 'адрес подачи', 'pickup'], mapping, 'fromPoint')) || ''
      const toPoint = pickField(raw, aliasesWithMapping(['куда', 'to', 'адрес назначения', 'dropoff'], mapping, 'toPoint')) || ''
      const sum = pickField(raw, aliasesWithMapping(['сумма', 'цена', 'стоимость', 'price', 'client price'], mapping, 'sum')) || ''
      const driver = pickField(raw, aliasesWithMapping(['водитель', 'driver'], mapping, 'driver')) || ''
      const comment = pickField(raw, aliasesWithMapping(['комментарий', 'comment', 'примечание'], mapping, 'comment')) || ''
      const internalOrderNumber = pickField(raw, aliasesWithMapping(['внутренний номер заказа', 'internal order number'], mapping, 'internalOrderNumber')) || ''

      rows.push({
        id: snapshot.order?.id || '',
        source: source.name || source.monthLabel || 'google_sheet',
        sourceRow: snapshot.sourceRow,
        contractor,
        orderNumber,
        date,
        fromPoint,
        toPoint,
        sum,
        driver,
        comment,
        internalOrderNumber,
        status: snapshot.order?.status || '',
        needsInfo: Boolean(snapshot.order?.needsInfo),
        infoReason: snapshot.order?.infoReason || null,
        orderClientPrice: snapshot.order?.clientPrice ?? null,
        orderDriverPrice: snapshot.order?.driverPrice ?? null,
        orderCreatedAt: snapshot.order?.createdAt || null,
        orderUpdatedAt: snapshot.order?.updatedAt || null
      })

    }

    const existingOrderIds = new Set(rows.map((row) => String(row.id || '')).filter(Boolean))

    const approvedDrafts = await prisma.opsEventDraft.findMany({
      where: {
        tenantId: req.actorContext.tenantId,
        parsedType: 'openclaw_order_draft',
        status: 'approved'
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    })

    let syntheticSourceRow = -1
    for (const draft of approvedDrafts) {
      const payload = parseJsonSafe(draft.payloadJson || '{}', {})
      const promotedOrderId = String(payload?.promotedOrder?.orderId || '').trim()
      const preview = payload?.sheetRowPreview && typeof payload.sheetRowPreview === 'object'
        ? payload.sheetRowPreview
        : buildSheetRowPreviewFromDraft(payload?.orderDraft || {}, payload?.pricing || {})

      if (promotedOrderId && existingOrderIds.has(promotedOrderId)) continue

      const order = promotedOrderId
        ? await prisma.order.findFirst({
            where: { id: promotedOrderId, tenantId: req.actorContext.tenantId },
            select: {
              id: true,
              status: true,
              needsInfo: true,
              infoReason: true,
              driverPrice: true,
              clientPrice: true,
              updatedAt: true,
              createdAt: true
            }
          })
        : null

      rows.push({
        id: order?.id || '',
        source: 'ai_inbox',
        sourceRow: syntheticSourceRow--,
        contractor: String(preview.contractor || ''),
        orderNumber: String(preview.orderNumber || ''),
        date: String(preview.date || ''),
        fromPoint: String(preview.fromPoint || ''),
        toPoint: String(preview.toPoint || ''),
        sum: String(preview.sum || ''),
        driver: String(preview.driver || ''),
        comment: String(preview.comment || ''),
        internalOrderNumber: String(preview.internalOrderNumber || draft.id),
        status: order?.status || 'draft',
        needsInfo: Boolean(order?.needsInfo),
        infoReason: order?.infoReason || payload?.infoReason || null,
        orderClientPrice: order?.clientPrice ?? payload?.pricing?.authoritativeClientPrice ?? payload?.orderDraft?.clientPrice ?? null,
        orderDriverPrice: order?.driverPrice ?? payload?.orderDraft?.driverPrice ?? null,
        orderCreatedAt: order?.createdAt || draft.createdAt || null,
        orderUpdatedAt: order?.updatedAt || draft.updatedAt || null
      })
    }

    let headers = []
    let rawRows = []
    try {
      const detailsTabName = String(source.detailsTabName || '').trim() || 'подробности'
      const detailRows = await fetchGoogleSheetRows({
        googleSheetId: source.googleSheetId,
        tabName: detailsTabName
      })
      let detailHeaders = (detailRows[0] || []).map((h) => String(h || '').trim())
      const hasNamedHeaders = detailHeaders.some((h) => h.length > 0)
      if (!hasNamedHeaders) {
        const maxCols = detailRows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0)
        detailHeaders = Array.from({ length: maxCols }, (_, idx) => `Колонка ${idx + 1}`)
      } else {
        detailHeaders = detailHeaders.map((h, idx) => h || `Колонка ${idx + 1}`)
      }
      headers = detailHeaders
      rawRows = detailRows.slice(1).map((cells, idx) => {
        const values = {}
        detailHeaders.forEach((header, colIdx) => {
          values[header] = cells[colIdx] !== undefined ? String(cells[colIdx]).trim() : ''
        })
        return {
          id: '',
          source: `${source.name || source.monthLabel || 'google_sheet'}:${detailsTabName}`,
          sourceRow: idx + 2,
          values
        }
      })
    } catch (detailsError) {
      console.error('Error fetching details tab for sheet view:', detailsError)
      const headerSet = new Set()
      headers = []
      rawRows = []
      for (const snapshot of snapshots) {
        if (!snapshot?.rawPayload) continue
        let payload = {}
        try {
          payload = JSON.parse(snapshot.rawPayload || '{}')
        } catch (_) {
          payload = {}
        }
        const raw = payload && payload.row && typeof payload.row === 'object' ? payload.row : payload
        if (!raw || typeof raw !== 'object') continue
        for (const key of Object.keys(raw)) {
          if (!headerSet.has(key)) {
            headerSet.add(key)
            headers.push(key)
          }
        }
        rawRows.push({
          id: snapshot.order?.id || '',
          source: source.name || source.monthLabel || 'google_sheet',
          sourceRow: snapshot.sourceRow,
          values: raw
        })
      }
    }

    for (const draft of approvedDrafts) {
      const payload = parseJsonSafe(draft.payloadJson || '{}', {})
      const rawText = String(payload?.rawText || draft.messageText || '').trim()
      if (!rawText) continue
      rawRows.push({
        id: String(payload?.promotedOrder?.orderId || ''),
        source: 'ai_inbox',
        sourceRow: syntheticSourceRow--,
        values: {
          Source: 'OpenClaw email',
          MessageId: String(payload?.orderDraft?.externalMessageId || ''),
          Customer: String(payload?.orderDraft?.customerName || ''),
          Route: [payload?.orderDraft?.fromPoint, payload?.orderDraft?.toPoint].filter(Boolean).join(' -> '),
          RawText: rawText
        }
      })
      for (const key of ['Source', 'MessageId', 'Customer', 'Route', 'RawText']) {
        if (!headers.includes(key)) headers.push(key)
      }
    }

    res.json({
      source: {
        id: source.id,
        name: source.name,
        monthLabel: source.monthLabel,
        tabName: source.tabName,
        detailsTabName: source.detailsTabName || 'подробности'
      },
      headers,
      rows,
      rawRows
    })
  } catch (error) {
    console.error('Error fetching sheet view orders:', error)
    res.status(500).json({ error: 'Failed to fetch sheet view orders' })
  }
})

// API для управления отзывами
app.post('/api/reviews', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { orderId, driverId, rating, comment, clientName } = req.body
    
    // Проверяем, что заказ существует и принадлежит водителю
    const order = await prisma.order.findFirst({
      where: { 
        id: orderId, 
        driverId: driverId,
        status: 'completed' // Только для завершенных заказов
      }
    })
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found or not completed' })
    }

    const tenantId = req.actorContext.tenantId
    if (order.tenantId && order.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Tenant mismatch for order' })
    }
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId },
      select: { id: true }
    })
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found in tenant scope' })
    }
    
    // Проверяем, что отзыв еще не оставлен
    const existingReview = await prisma.review.findUnique({
      where: { orderId }
    })
    
    if (existingReview) {
      return res.status(400).json({ error: 'Review already exists for this order' })
    }
    
    // Создаем отзыв
    const review = await prisma.review.create({
      data: {
        tenantId,
        orderId,
        driverId: driver.id,
        rating: parseInt(rating),
        comment: comment || null,
        clientName: clientName || null
      }
    })
    
    // Пересчитываем рейтинг водителя
    await updateDriverRating(driver.id, tenantId)
    
    res.json(review)
  } catch (e) {
    console.error('Error creating review:', e)
    res.status(500).json({ error: 'failed' })
  }
})

app.get('/api/drivers/:driverId/reviews', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { driverId } = req.params
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    
    const reviews = await prisma.review.findMany({
      where: { driverId: driver.id, tenantId: req.actorContext.tenantId },
      include: {
        order: {
          select: {
            fromPoint: true,
            toPoint: true,
            clientPrice: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(reviews)
  } catch (e) {
    console.error('Error fetching reviews:', e)
    res.status(500).json({ error: 'failed' })
  }
})

// Функция обновления рейтинга водителя
async function updateDriverRating(driverId, tenantId = null) {
  try {
    const reviews = await prisma.review.findMany({
      where: { driverId, ...(tenantId ? { tenantId } : {}) }
    })
    
    if (reviews.length === 0) return
    
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, ...(tenantId ? { tenantId } : {}) },
      select: { id: true }
    })
    if (!driver) return

    await prisma.driver.update({
      where: { id: driver.id },
      data: { 
        avgRating: Math.round(avgRating * 10) / 10, // Округляем до 1 знака
        totalReviews: reviews.length,
        rating: Math.round(avgRating * 10) / 10 // Обновляем основной рейтинг
      }
    })
    
    console.log(`Updated rating for driver ${driverId}: ${avgRating.toFixed(1)} (${reviews.length} reviews)`)
  } catch (e) {
    console.error('Error updating driver rating:', e)
  }
}

// Админские API для управления отзывами
app.post('/api/admin/reviews', authenticateToken, resolveActorContext, requireActorContext, requireCan('drivers.manage', 'driver', () => ({
  team: ['dispatch', 'ops_control']
})), async (req, res) => {
  try {
    const { driverId, rating, comment, clientName } = req.body
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    
    // Создаем отзыв от имени админа
    const review = await prisma.review.create({
      data: {
        tenantId: req.actorContext.tenantId,
        orderId: null, // У админских отзывов нет привязки к конкретному заказу
        driverId: driver.id,
        rating: parseInt(rating),
        comment: comment || null,
        clientName: clientName || 'Администратор'
      }
    })
    
    // Пересчитываем рейтинг водителя
    await updateDriverRating(driver.id, req.actorContext.tenantId)
    
    res.json(review)
  } catch (e) {
    console.error('Error creating admin review:', e)
    res.status(500).json({ error: 'failed' })
  }
})

app.get('/api/admin/reviews', authenticateToken, resolveActorContext, requireActorContext, requireCan('drivers.read', 'driver', () => ({
  team: ['dispatch', 'ops_control', 'audit']
})), async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { tenantId: req.actorContext.tenantId },
      include: {
        driver: {
          select: {
            name: true,
            email: true
          }
        },
        order: {
          select: {
            fromPoint: true,
            toPoint: true,
            clientPrice: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(reviews)
  } catch (e) {
    console.error('Error fetching admin reviews:', e)
    res.status(500).json({ error: 'failed' })
  }
})

app.delete('/api/admin/reviews/:reviewId', authenticateToken, resolveActorContext, requireActorContext, requireCan('drivers.manage', 'driver', () => ({
  team: ['dispatch', 'ops_control']
})), async (req, res) => {
  try {
    const { reviewId } = req.params
    
    const review = await prisma.review.findFirst({
      where: { id: reviewId, tenantId: req.actorContext.tenantId }
    })
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' })
    }
    
    await prisma.review.delete({
      where: { id: review.id }
    })
    
    // Пересчитываем рейтинг водителя после удаления отзыва
    await updateDriverRating(review.driverId, req.actorContext.tenantId)
    
    res.json({ success: true })
  } catch (e) {
    console.error('Error deleting review:', e)
    res.status(500).json({ error: 'failed' })
  }
})

// API для получения детальной информации о водителе
app.get('/api/admin/drivers/:driverId', authenticateToken, resolveActorContext, requireActorContext, requireCan('drivers.read', 'driver', async (req) => {
  const row = await prisma.driver.findFirst({
    where: { id: req.params.driverId, tenantId: req.actorContext.tenantId },
    select: { country: true, city: true }
  })
  return {
    team: ['dispatch', 'ops_control', 'coordination', 'audit'],
    country: row?.country || null,
    city: row?.city || null
  }
}), async (req, res) => {
  try {
    const { driverId } = req.params
    
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId: req.actorContext.tenantId },
      include: {
        routes: {
          orderBy: { createdAt: 'desc' }
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Последние 10 заказов
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Последние 10 отзывов
        }
      }
    })
    
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }
    
    res.json(driver)
  } catch (e) {
    console.error('Error fetching driver details:', e)
    res.status(500).json({ error: 'failed' })
  }
})

// ==================== АВТОРИЗАЦИЯ ====================

// Регистрация пользователя
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role = 'driver', name, phone, country, city, commissionRate } = req.body

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role
      }
    })

    // Если это водитель, создаем запись водителя
    if (role === 'driver') {
      const { tenant } = await ensureDefaultTenantMembership(user.id, 'executor')
      await prisma.driver.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          phone,
          country: country || null,
          city,
          commissionRate: commissionRate || 15.0,
          userId: user.id
        }
      })
    } else {
      await ensureDefaultTenantMembership(user.id, role === 'admin' ? 'staff_supervisor' : 'staff')
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const acl = await getUserRolesAndPermissions(user.id)
    const { tenant, membership } = await ensureDefaultTenantMembership(
      user.id,
      role === 'driver' ? 'executor' : (role === 'admin' ? 'staff_supervisor' : 'staff')
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant: { id: tenant.id, code: tenant.code, role: membership.role },
        roles: acl.roles,
        permissions: acl.permissions
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Вход в систему
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        driver: true
      }
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Проверяем пароль
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Проверяем, активен ли пользователь
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' })
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const acl = await getUserRolesAndPermissions(user.id)
    const { tenant, membership } = await ensureDefaultTenantMembership(
      user.id,
      user.role === 'driver' ? 'executor' : (user.role === 'admin' ? 'staff_supervisor' : 'staff')
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant: { id: tenant.id, code: tenant.code, role: membership.role },
        roles: acl.roles,
        permissions: acl.permissions,
        driver: user.driver
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Получение информации о текущем пользователе
app.get('/api/auth/me', authenticateToken, resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        driver: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant: {
          id: req.actorContext.tenantId,
          code: req.actorContext.tenantCode,
          role: req.actorContext.actorRole
        },
        roles: req.userRoles || [],
        permissions: req.userPermissions || [],
        driver: user.driver
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Failed to get user info' })
  }
})

// API для получения заказов текущего водителя
app.get('/api/drivers/me/orders', authenticateToken, resolveActorContext, requireActorContext, async (req, res) => {
  try {
    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id, tenantId: req.actorContext.tenantId }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    // Получаем выполненные заказы водителя
    const orders = await prisma.order.findMany({
      where: { 
        tenantId: req.actorContext.tenantId,
        driverId: driver.id,
        status: 'completed' // Только выполненные заказы
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // Последние 20 заказов
    })

    res.json(orders)
  } catch (error) {
    console.error('Error fetching driver orders:', error)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// API для получения данных текущего водителя (полная информация)
app.get('/api/drivers/me', authenticateToken, resolveActorContext, requireActorContext, async (req, res) => {
  try {
    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id, tenantId: req.actorContext.tenantId },
      include: {
        routes: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    res.json(driver)
  } catch (error) {
    console.error('Error fetching driver data:', error)
    res.status(500).json({ error: 'Failed to fetch driver data' })
  }
})

// ==================== API ДЛЯ ПРЕДУСТАНОВЛЕННЫХ МАРШРУТОВ ====================

// Получение всех маршрутов для водителя (с его ценами)
app.get('/api/drivers/me/city-routes', authenticateToken, resolveActorContext, requireActorContext, async (req, res) => {
  try {
    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id, tenantId: req.actorContext.tenantId }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    // Получаем все активные маршруты
    const cityRoutes = await prisma.cityRoute.findMany({
      where: { isActive: true, tenantId: req.actorContext.tenantId },
      orderBy: [
        { country: 'asc' },
        { city: 'asc' },
        { fromPoint: 'asc' }
      ],
      include: {
        driverPrices: {
          where: { driverId: driver.id, tenantId: req.actorContext.tenantId },
          take: 1
        }
      }
    })

    // Формируем ответ с ценами водителя
    const routes = cityRoutes.map(route => ({
      id: route.id,
      country: route.country,
      city: route.city,
      fromPoint: route.fromPoint,
      toPoint: route.toPoint,
      vehicleType: route.vehicleType,
      passengers: route.passengers,
      distance: route.distance,
      targetFare: route.targetFare,
      currency: route.currency,
      bestPrice: route.driverPrices[0]?.bestPrice || null
    }))

    res.json(routes)
  } catch (error) {
    console.error('Error fetching city routes:', error)
    res.status(500).json({ error: 'Failed to fetch city routes' })
  }
})

// Обновление цены водителя для маршрута
app.put('/api/drivers/me/city-routes/:routeId', authenticateToken, resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { routeId } = req.params
    const { bestPrice } = req.body

    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id, tenantId: req.actorContext.tenantId }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    // Проверяем, существует ли маршрут
    const cityRoute = await prisma.cityRoute.findFirst({
      where: { id: routeId, tenantId: req.actorContext.tenantId }
    })

    if (!cityRoute) {
      return res.status(404).json({ error: 'City route not found' })
    }

    const payload = {
      driverId: driver.id,
      routeId,
      bestPrice: bestPrice ? parseFloat(bestPrice) : null
    }
    ensureIdempotencyKey(req, 'driver.city_route.upsert', payload)
    const wrapped = await withIdempotency(req, 'driver.city_route.upsert', payload, async () => {
      const driverCityRoute = await prisma.driverCityRoute.upsert({
        where: {
          driverId_cityRouteId: {
            driverId: driver.id,
            cityRouteId: routeId
          }
        },
        update: {
          tenantId: req.actorContext.tenantId,
          bestPrice: bestPrice ? parseFloat(bestPrice) : null
        },
        create: {
          tenantId: req.actorContext.tenantId,
          driverId: driver.id,
          cityRouteId: routeId,
          bestPrice: bestPrice ? parseFloat(bestPrice) : null
        }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'driver.city_route.upsert',
        resource: 'driver_city_route',
        resourceId: driverCityRoute.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return driverCityRoute
    })

    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error updating driver city route:', error)
    res.status(500).json({ error: 'Failed to update city route' })
  }
})

// ==================== АДМИНСКИЕ API ДЛЯ УПРАВЛЕНИЯ МАРШРУТАМИ ====================

// Получение всех маршрутов (для админа)
app.get('/api/admin/city-routes', authenticateToken, resolveActorContext, requireActorContext, requireCan('directions.read', 'direction'), async (req, res) => {
  try {
    const { country, city } = req.query
    
    const where = {
      isActive: true,
      tenantId: req.actorContext.tenantId,
      ...buildGeoScopeWhere(req, 'country', 'city')
    }
    if (country) where.country = country
    if (city) where.city = city

    const routes = await prisma.cityRoute.findMany({
      where,
      orderBy: [
        { country: 'asc' },
        { city: 'asc' },
        { fromPoint: 'asc' }
      ]
    })

    res.json(routes)
  } catch (error) {
    console.error('Error fetching city routes:', error)
    res.status(500).json({ error: 'Failed to fetch city routes' })
  }
})

// Получение списка стран
app.get('/api/admin/city-routes/countries', authenticateToken, resolveActorContext, requireActorContext, requireCan('directions.read', 'direction'), async (req, res) => {
  try {
    const countries = await prisma.cityRoute.findMany({
      where: {
        isActive: true,
        tenantId: req.actorContext.tenantId,
        ...buildGeoScopeWhere(req, 'country', 'city')
      },
      select: { country: true },
      distinct: ['country'],
      orderBy: { country: 'asc' }
    })

    res.json(countries.map(c => c.country))
  } catch (error) {
    console.error('Error fetching countries:', error)
    res.status(500).json({ error: 'Failed to fetch countries' })
  }
})

// ==================== GOOGLE SHEETS SOURCES ====================
app.get('/api/admin/sheet-sources', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const sources = await prisma.sheetSource.findMany({
      where: { tenantId: req.actorContext.tenantId },
      orderBy: [{ isActive: 'desc' }, { monthLabel: 'desc' }, { createdAt: 'desc' }]
    })
    res.json(sources)
  } catch (error) {
    console.error('Error fetching sheet sources:', error)
    res.status(500).json({ error: 'Failed to fetch sheet sources' })
  }
})

app.post('/api/admin/sheet-sources', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const { name, monthLabel, googleSheetId, tabName, detailsTabName, columnMapping, isActive = true, syncEnabled = true } = req.body
    const normalizedSheetId = normalizeGoogleSheetId(googleSheetId)
    if (!name || !monthLabel || !normalizedSheetId) {
      return res.status(400).json({ error: 'name, monthLabel and googleSheetId are required' })
    }

    const payload = { name, monthLabel, googleSheetId: normalizedSheetId, tabName, detailsTabName, columnMapping, isActive, syncEnabled }
    ensureIdempotencyKey(req, 'sheet_source.create', payload)
    const wrapped = await withIdempotency(req, 'sheet_source.create', payload, async () => {
      const source = await prisma.sheetSource.create({
        data: {
          tenantId: req.actorContext.tenantId,
          name,
          monthLabel,
          googleSheetId: normalizedSheetId,
          tabName: tabName || 'таблица',
          detailsTabName: detailsTabName || 'подробности',
          columnMapping: columnMapping ? JSON.stringify(columnMapping) : null,
          isActive: !!isActive,
          syncEnabled: !!syncEnabled
        }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'sheet_source.create',
        resource: 'sheet_source',
        resourceId: source.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return source
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error creating sheet source:', error)
    res.status(500).json({ error: 'Failed to create sheet source' })
  }
})

app.put('/api/admin/sheet-sources/:sourceId', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const { sourceId } = req.params
    const { name, monthLabel, googleSheetId, tabName, detailsTabName, columnMapping, isActive, syncEnabled } = req.body
    const data = {}
    if (name !== undefined) data.name = name
    if (monthLabel !== undefined) data.monthLabel = monthLabel
    if (googleSheetId !== undefined) data.googleSheetId = normalizeGoogleSheetId(googleSheetId)
    if (tabName !== undefined) data.tabName = tabName
    if (detailsTabName !== undefined) data.detailsTabName = detailsTabName
    if (columnMapping !== undefined) data.columnMapping = columnMapping ? JSON.stringify(columnMapping) : null
    if (isActive !== undefined) data.isActive = !!isActive
    if (syncEnabled !== undefined) data.syncEnabled = !!syncEnabled

    const existing = await prisma.sheetSource.findFirst({
      where: { id: sourceId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'Sheet source not found' })

    const payload = { sourceId: existing.id, data }
    ensureIdempotencyKey(req, 'sheet_source.update', payload)
    const wrapped = await withIdempotency(req, 'sheet_source.update', payload, async () => {
      const updated = await prisma.sheetSource.update({
        where: { id: existing.id },
        data
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'sheet_source.update',
        resource: 'sheet_source',
        resourceId: updated.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: data
      })
      return updated
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error updating sheet source:', error)
    res.status(500).json({ error: 'Failed to update sheet source' })
  }
})

app.post('/api/admin/sheet-sources/:sourceId/sync', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const { sourceId } = req.params
    const existing = await prisma.sheetSource.findFirst({
      where: { id: sourceId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'Sheet source not found' })
    const payload = { sourceId }
    ensureIdempotencyKey(req, 'sheet_source.sync', payload)
    const wrapped = await withIdempotency(req, 'sheet_source.sync', payload, async () => {
      const stats = await syncSheetSource(sourceId, req.actorContext.tenantId)
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'sheet_source.sync',
        resource: 'sheet_source',
        resourceId: sourceId,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: stats
      })
      return stats
    })
    res.json({ success: true, stats: wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error syncing sheet source:', error)
    await prisma.sheetSource.update({
      where: { id: req.params.sourceId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'failed',
        lastSyncError: error.message || 'Unknown error'
      }
    }).catch(() => {})
    res.status(500).json({ error: 'Failed to sync sheet source', details: error.message })
  }
})

// ==================== CRM (PRODUCTION) ====================
app.post('/api/admin/crm/promote-from-staging', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.manage', 'crm'), async (req, res) => {
  try {
    const payload = { tenantId: req.actorContext.tenantId }
    ensureIdempotencyKey(req, 'crm.promote_from_staging', payload)
    const wrapped = await withIdempotency(req, 'crm.promote_from_staging', payload, async () => {
      const stats = await promoteStagingToCustomerCrm(req.actorContext.tenantId)
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'crm.promote_from_staging',
        resource: 'crm',
        resourceId: null,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: stats
      })
      return stats
    })
    res.json({ success: true, stats: wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error promoting staging CRM:', error)
    res.status(500).json({ error: 'Failed to promote staging CRM', details: error.message })
  }
})

app.get('/api/admin/crm/companies', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.read', 'crm'), async (req, res) => {
  try {
    const { q = '', segment = '', limit = '100', offset = '0' } = req.query
    const take = Math.min(parseInt(limit, 10) || 100, 500)
    const skip = Math.max(parseInt(offset, 10) || 0, 0)

    const where = { tenantId: req.actorContext.tenantId }
    if (q) {
      where.OR = [
        { name: { contains: String(q), mode: 'insensitive' } },
        { email: { contains: String(q), mode: 'insensitive' } },
        { phone: { contains: String(q) } }
      ]
    }
    if (segment) {
      where.segments = {
        some: { segment: String(segment) }
      }
    }

    const [rows, total] = await Promise.all([
      prisma.customerCompany.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          segments: true,
          _count: { select: { links: true } }
        }
      }),
      prisma.customerCompany.count({ where })
    ])

    res.json({ total, rows })
  } catch (error) {
    console.error('Error fetching CRM companies:', error)
    res.status(500).json({ error: 'Failed to fetch CRM companies' })
  }
})

app.get('/api/admin/crm/companies/:companyId', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.read', 'crm'), async (req, res) => {
  try {
    const { companyId } = req.params
    const company = await prisma.customerCompany.findFirst({
      where: { id: companyId, tenantId: req.actorContext.tenantId },
      include: {
        segments: true,
        links: {
          include: {
            contact: {
              include: { segments: true }
            }
          }
        }
      }
    })

    if (!company) return res.status(404).json({ error: 'Company not found' })
    res.json(company)
  } catch (error) {
    console.error('Error fetching CRM company details:', error)
    res.status(500).json({ error: 'Failed to fetch CRM company details' })
  }
})

app.get('/api/admin/crm/contacts', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.read', 'crm'), async (req, res) => {
  try {
    const { q = '', segment = '', limit = '100', offset = '0' } = req.query
    const take = Math.min(parseInt(limit, 10) || 100, 500)
    const skip = Math.max(parseInt(offset, 10) || 0, 0)

    const where = { tenantId: req.actorContext.tenantId }
    if (q) {
      where.OR = [
        { fullName: { contains: String(q), mode: 'insensitive' } },
        { email: { contains: String(q), mode: 'insensitive' } },
        { phone: { contains: String(q) } }
      ]
    }
    if (segment) {
      where.segments = {
        some: { segment: String(segment) }
      }
    }

    const [rows, total] = await Promise.all([
      prisma.customerContact.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          segments: true,
          _count: { select: { links: true } }
        }
      }),
      prisma.customerContact.count({ where })
    ])

    res.json({ total, rows })
  } catch (error) {
    console.error('Error fetching CRM contacts:', error)
    res.status(500).json({ error: 'Failed to fetch CRM contacts' })
  }
})

app.get('/api/admin/crm/contacts/:contactId', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.read', 'crm'), async (req, res) => {
  try {
    const { contactId } = req.params
    const contact = await prisma.customerContact.findFirst({
      where: { id: contactId, tenantId: req.actorContext.tenantId },
      include: {
        segments: true,
        links: {
          include: {
            company: {
              include: { segments: true }
            }
          }
        }
      }
    })
    if (!contact) return res.status(404).json({ error: 'Contact not found' })
    res.json(contact)
  } catch (error) {
    console.error('Error fetching CRM contact details:', error)
    res.status(500).json({ error: 'Failed to fetch CRM contact details' })
  }
})

app.put('/api/admin/crm/companies/:companyId', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.manage', 'crm'), async (req, res) => {
  try {
    const { companyId } = req.params
    const existingCompany = await prisma.customerCompany.findFirst({
      where: { id: companyId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existingCompany) return res.status(404).json({ error: 'Company not found' })
    const data = {}
    const fields = [
      'name', 'website', 'phone', 'email', 'telegramUrl',
      'registrationCountry', 'registrationCity', 'registrationAddress',
      'presenceCountries', 'presenceCities',
      'countryPresence', 'cityPresence',
      'comment', 'ownerName', 'companyType'
    ]
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        const value = req.body[field]
        data[field] = value === '' ? null : value
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'registrationCountry') && !Object.prototype.hasOwnProperty.call(req.body, 'countryPresence')) {
      data.countryPresence = data.registrationCountry || null
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'presenceCities') && !Object.prototype.hasOwnProperty.call(req.body, 'cityPresence')) {
      data.cityPresence = data.presenceCities || null
    }
    const segments = Array.isArray(req.body.segments)
      ? [...new Set(req.body.segments.map((x) => String(x || '').trim()).filter(Boolean))]
      : null

    const payload = { companyId, data, segments }
    ensureIdempotencyKey(req, 'crm.company.update', payload)
    const wrapped = await withIdempotency(req, 'crm.company.update', payload, async () => {
      const updated = await prisma.$transaction(async (tx) => {
        const company = await tx.customerCompany.update({ where: { id: companyId }, data })
        if (segments !== null) {
          await tx.customerCompanySegment.deleteMany({ where: { companyId } })
          if (segments.length) {
            await tx.customerCompanySegment.createMany({
              data: segments.map((segment) => ({
                companyId,
                segment,
                sourceFile: 'manual_ui'
              })),
              skipDuplicates: true
            })
          }
        }
        return company
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'crm.company.update',
        resource: 'customer_company',
        resourceId: updated.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: { fields: Object.keys(data), segments }
      })
      return updated
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error updating CRM company:', error)
    res.status(500).json({ error: 'Failed to update CRM company' })
  }
})

app.put('/api/admin/crm/contacts/:contactId', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.manage', 'crm'), async (req, res) => {
  try {
    const { contactId } = req.params
    const existingContact = await prisma.customerContact.findFirst({
      where: { id: contactId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existingContact) return res.status(404).json({ error: 'Contact not found' })
    const data = {}
    const fields = [
      'fullName', 'website', 'phone', 'email', 'telegramUrl',
      'registrationCountry', 'registrationCity', 'registrationAddress',
      'presenceCountries', 'presenceCities',
      'countryPresence', 'cityPresence',
      'comment', 'position', 'ownerName'
    ]
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        const value = req.body[field]
        data[field] = value === '' ? null : value
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'registrationCountry') && !Object.prototype.hasOwnProperty.call(req.body, 'countryPresence')) {
      data.countryPresence = data.registrationCountry || null
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'presenceCities') && !Object.prototype.hasOwnProperty.call(req.body, 'cityPresence')) {
      data.cityPresence = data.presenceCities || null
    }
    const segments = Array.isArray(req.body.segments)
      ? [...new Set(req.body.segments.map((x) => String(x || '').trim()).filter(Boolean))]
      : null

    const payload = { contactId, data, segments }
    ensureIdempotencyKey(req, 'crm.contact.update', payload)
    const wrapped = await withIdempotency(req, 'crm.contact.update', payload, async () => {
      const updated = await prisma.$transaction(async (tx) => {
        const contact = await tx.customerContact.update({ where: { id: contactId }, data })
        if (segments !== null) {
          await tx.customerContactSegment.deleteMany({ where: { contactId } })
          if (segments.length) {
            await tx.customerContactSegment.createMany({
              data: segments.map((segment) => ({
                contactId,
                segment,
                sourceFile: 'manual_ui'
              })),
              skipDuplicates: true
            })
          }
        }
        return contact
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'crm.contact.update',
        resource: 'customer_contact',
        resourceId: updated.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: { fields: Object.keys(data), segments }
      })
      return updated
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error updating CRM contact:', error)
    res.status(500).json({ error: 'Failed to update CRM contact' })
  }
})

function splitPresence(raw) {
  return String(raw || '')
    .split(/[,\n;|/]+/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function parsePresenceCoverage(rawCountries, rawPresenceCities, rawFlatCities) {
  const groupedRaw = String(rawPresenceCities || '').trim()
  const pairs = []

  if (groupedRaw && groupedRaw.includes(':')) {
    const lines = groupedRaw
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)

    for (const line of lines) {
      const separator = line.indexOf(':')
      const country = (separator >= 0 ? line.slice(0, separator) : line).trim()
      const cityChunk = separator >= 0 ? line.slice(separator + 1) : ''
      const cities = splitPresence(cityChunk)

      if (cities.length) {
        for (const city of cities) {
          pairs.push({ country, city })
        }
      } else {
        pairs.push({ country, city: '' })
      }
    }
    return pairs
  }

  const countries = splitPresence(rawCountries)
  const cities = splitPresence(rawFlatCities || rawPresenceCities)

  if (!cities.length) {
    if (countries.length) return countries.map((country) => ({ country, city: '' }))
    return []
  }

  if (countries.length === 1) {
    return cities.map((city) => ({ country: countries[0], city }))
  }

  return cities.map((city) => {
    const inferredCountry = inferCountryFromCity(city)
    return {
      country: inferredCountry || '',
      city
    }
  })
}

function normalizeCountryName(raw) {
  const value = String(raw || '').trim()
  if (!value || value === '—') return ''
  const key = value.toLowerCase()
  const map = {
    'uk': 'United Kingdom',
    'u.k.': 'United Kingdom',
    'great britain': 'United Kingdom',
    'britain': 'United Kingdom',
    'united kingdom': 'United Kingdom',
    'велкобритания': 'United Kingdom',
    'великобритания': 'United Kingdom',
    'англия': 'United Kingdom',
    'uae': 'UAE',
    'u.a.e.': 'UAE',
    'united arab emirates': 'UAE',
    'эмирейтс': 'UAE',
    'оаэ': 'UAE'
  }
  return map[key] || value
}

function normalizeCityName(raw) {
  return String(raw || '').trim().toLowerCase()
}

function inferCountryFromCity(rawCity) {
  const city = normalizeCityName(rawCity)
  const map = {
    london: 'United Kingdom',
    dubai: 'UAE',
    paris: 'France',
    rome: 'Italy',
    vienna: 'Austria',
    madrid: 'Spain',
    cancun: 'Mexico'
  }
  return map[city] || ''
}

app.get('/api/admin/crm/directions-matrix', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.read', 'crm'), async (req, res) => {
  try {
    const companies = await prisma.customerCompany.findMany({
      where: { tenantId: req.actorContext.tenantId },
      include: { segments: true },
      take: 10000
    })

    const isClient = (segments) => segments.includes('client_company') || segments.includes('potential_client_company') || segments.includes('potential_client_agent')
    const isSupplier = (segments) => segments.includes('supplier_company') || segments.includes('potential_supplier')

    const matrixMap = new Map()
    const cityToKnownCountries = new Map()
    for (const company of companies) {
      const segs = (company.segments || []).map((s) => s.segment)
      const clientRole = isClient(segs)
      const supplierRole = isSupplier(segs)
      if (!clientRole && !supplierRole) continue

      const coverage = parsePresenceCoverage(
        company.presenceCountries,
        company.presenceCities,
        company.cityPresence
      )
      const safeCoverage = coverage.length ? coverage : [{ country: '', city: '' }]

      for (const entry of safeCoverage) {
        const rawCity = String(entry.city || '').trim()
        const rawCountry = String(entry.country || '').trim()
        const normalizedCity = normalizeCityName(rawCity) || '—'
        const normalizedCountry = normalizeCountryName(rawCountry || inferCountryFromCity(rawCity) || '') || '—'
        const key = `${normalizedCountry}||${normalizedCity}`
        if (!matrixMap.has(key)) {
          matrixMap.set(key, {
            country: normalizedCountry,
            city: rawCity || '—',
            clients: [],
            suppliers: []
          })
        }
        const row = matrixMap.get(key)
        if (normalizedCountry !== '—' && normalizedCity !== '—') {
          if (!cityToKnownCountries.has(normalizedCity)) cityToKnownCountries.set(normalizedCity, new Set())
          cityToKnownCountries.get(normalizedCity).add(normalizedCountry)
        }
        const item = {
          id: company.id,
          name: company.name,
          phone: company.phone || null,
          email: company.email || null
        }
        if (clientRole) {
          if (!row.clients.some((x) => x.id === company.id)) row.clients.push(item)
        }
        if (supplierRole) {
          if (!row.suppliers.some((x) => x.id === company.id)) row.suppliers.push(item)
        }
      }
    }

    const secondPassMap = new Map()
    for (const row of matrixMap.values()) {
      const normalizedCity = normalizeCityName(row.city) || '—'
      let finalCountry = row.country
      if (row.country === '—' && normalizedCity !== '—') {
        const known = cityToKnownCountries.get(normalizedCity)
        if (known && known.size === 1) finalCountry = Array.from(known)[0]
      }
      const key = `${finalCountry}||${normalizedCity}`
      if (!secondPassMap.has(key)) {
        secondPassMap.set(key, {
          country: finalCountry,
          city: row.city,
          clients: [],
          suppliers: []
        })
      }
      const target = secondPassMap.get(key)
      for (const c of row.clients) {
        if (!target.clients.some((x) => x.id === c.id)) target.clients.push(c)
      }
      for (const s of row.suppliers) {
        if (!target.suppliers.some((x) => x.id === s.id)) target.suppliers.push(s)
      }
    }

    const cityFoldMap = new Map()
    for (const row of secondPassMap.values()) {
      const cityKey = normalizeCityName(row.city) || '—'
      if (!cityFoldMap.has(cityKey)) {
        cityFoldMap.set(cityKey, {
          city: row.city,
          countrySet: new Set(),
          clients: [],
          suppliers: []
        })
      }
      const target = cityFoldMap.get(cityKey)
      if (row.country && row.country !== '—') target.countrySet.add(row.country)
      for (const c of row.clients) {
        if (!target.clients.some((x) => x.id === c.id)) target.clients.push(c)
      }
      for (const s of row.suppliers) {
        if (!target.suppliers.some((x) => x.id === s.id)) target.suppliers.push(s)
      }
    }

    const rows = Array.from(cityFoldMap.values())
      .map((row) => ({
        country: row.countrySet.size === 0 ? '—' : Array.from(row.countrySet).sort((a, b) => a.localeCompare(b, 'ru')).join(', '),
        city: row.city,
        clients: row.clients,
        suppliers: row.suppliers,
        clientsCount: row.clients.length,
        suppliersCount: row.suppliers.length
      }))
      .sort((a, b) => {
        const aUnknown = a.country === '—' && a.city === '—'
        const bUnknown = b.country === '—' && b.city === '—'
        if (aUnknown !== bUnknown) return aUnknown ? 1 : -1
        if (a.country === b.country) return a.city.localeCompare(b.city, 'ru')
        return a.country.localeCompare(b.country, 'ru')
      })

    res.json({ rows, total: rows.length })
  } catch (error) {
    console.error('Error fetching directions matrix:', error)
    res.status(500).json({ error: 'Failed to fetch directions matrix' })
  }
})

// ==================== CITY PRICING ====================
app.get('/api/admin/pricing/cities', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.read', 'pricing'), async (req, res) => {
  try {
    const { q = '', limit = '200' } = req.query
    const take = Math.min(parseInt(limit, 10) || 200, 10000)
    const where = {
      isActive: true,
      tenantId: req.actorContext.tenantId,
      ...buildGeoScopeWhere(req, 'country', 'city')
    }
    if (q) {
      where.OR = [
        { city: { contains: String(q), mode: 'insensitive' } },
        { routeFrom: { contains: String(q), mode: 'insensitive' } },
        { routeTo: { contains: String(q), mode: 'insensitive' } }
      ]
    }
    const rows = await prisma.cityPricing.findMany({
      where,
      orderBy: [{ country: 'asc' }, { city: 'asc' }, { vehicleType: 'asc' }, { routeFrom: 'asc' }, { updatedAt: 'desc' }],
      take
    })
    res.json({ rows })
  } catch (error) {
    console.error('Error fetching city pricing:', error)
    res.status(500).json({ error: 'Failed to fetch city pricing' })
  }
})

app.get('/api/admin/pricing/export-eta-template', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.read', 'pricing'), async (req, res) => {
  try {
    const rows = await prisma.cityPricing.findMany({
      where: {
        tenantId: req.actorContext.tenantId,
        isActive: true,
        fixedPrice: { not: null },
        ...buildGeoScopeWhere(req, 'country', 'city')
      },
      orderBy: [{ country: 'asc' }, { city: 'asc' }, { routeFrom: 'asc' }, { routeTo: 'asc' }],
      take: 20000
    })

    const headers = [
      'From', 'To', 'Price', 'Lux', 'MV 8 pax', 'Sprinter',
      'Electric Standard', 'Saloon', 'Estate', 'Executive', 'MPV', 'MV 6 pax', 'MV 7 pax'
    ]
    const esc = (v) => {
      const s = String(v ?? '')
      return `"${s.replace(/"/g, '""')}"`
    }

    const lines = [headers.map(esc).join(';')]
    for (const row of rows) {
      lines.push([
        row.routeFrom || '',
        row.routeTo || '',
        row.fixedPrice !== null && row.fixedPrice !== undefined ? row.fixedPrice : '',
        '', '', '', '', '', '', '', '', '', ''
      ].map(esc).join(';'))
    }

    const csv = '\uFEFF' + lines.join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="ETA_Fixed_Price_template.csv"')
    res.status(200).send(csv)
  } catch (error) {
    console.error('Error exporting ETA template:', error)
    res.status(500).json({ error: 'Failed to export ETA template' })
  }
})

app.post('/api/admin/pricing/cities', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.manage', 'pricing', (req) => ({
  country: req.body?.country || null,
  city: req.body?.city || null
})), async (req, res) => {
  try {
    const {
      country,
      city,
      routeFrom,
      routeTo,
      vehicleType,
      fixedPrice,
      pricePerKm,
      hourlyRate,
      childSeatPrice,
      currency,
      notes
    } = req.body

    const normalizedCity = String(city || '').trim() || String(routeFrom || '').trim() || String(country || '').trim() || 'General'
    if (!String(vehicleType || '').trim()) return res.status(400).json({ error: 'vehicleType is required' })

    const payload = { country, city, routeFrom, routeTo, vehicleType, fixedPrice, pricePerKm, hourlyRate, childSeatPrice, currency, notes }
    const wrapped = await withIdempotency(req, 'pricing.city.create', payload, async () => {
      const row = await prisma.cityPricing.create({
        data: {
          tenantId: req.actorContext.tenantId,
          country: country || null,
          city: normalizedCity,
          routeFrom: routeFrom || null,
          routeTo: routeTo || null,
          vehicleType: String(vehicleType).trim(),
          fixedPrice: fixedPrice !== undefined && fixedPrice !== null ? parseFloat(fixedPrice) : null,
          pricePerKm: pricePerKm !== undefined && pricePerKm !== null ? parseFloat(pricePerKm) : null,
          hourlyRate: hourlyRate !== undefined && hourlyRate !== null ? parseFloat(hourlyRate) : null,
          childSeatPrice: childSeatPrice !== undefined && childSeatPrice !== null ? parseFloat(childSeatPrice) : null,
          currency: currency || 'EUR',
          notes: notes || null
        }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'pricing.city.create',
        resource: 'city_pricing',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return row
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error creating city pricing:', error)
    res.status(500).json({ error: 'Failed to create city pricing' })
  }
})

app.put('/api/admin/pricing/cities/:id', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.manage', 'pricing', async (req) => {
  const existing = await prisma.cityPricing.findFirst({
    where: { id: req.params.id, tenantId: req.actorContext?.tenantId || '' },
    select: { country: true, city: true }
  })
  if (!existing) return {}
  return {
    country: req.body?.country !== undefined ? req.body.country : existing.country,
    city: req.body?.city !== undefined ? req.body.city : existing.city
  }
}), async (req, res) => {
  try {
    const data = {}
    const nullableFields = ['country', 'routeFrom', 'routeTo', 'notes', 'source']
    for (const f of nullableFields) {
      if (req.body[f] !== undefined) data[f] = req.body[f] || null
    }
    if (req.body.city !== undefined) data.city = String(req.body.city || '').trim()
    if (req.body.vehicleType !== undefined) {
      const vehicleType = String(req.body.vehicleType || '').trim()
      if (!vehicleType) return res.status(400).json({ error: 'vehicleType is required' })
      data.vehicleType = vehicleType
    }
    if (req.body.currency !== undefined) data.currency = String(req.body.currency || '').trim() || 'EUR'

    if (req.body.fixedPrice !== undefined) data.fixedPrice = req.body.fixedPrice === null ? null : parseFloat(req.body.fixedPrice)
    if (req.body.pricePerKm !== undefined) data.pricePerKm = req.body.pricePerKm === null ? null : parseFloat(req.body.pricePerKm)
    if (req.body.hourlyRate !== undefined) data.hourlyRate = req.body.hourlyRate === null ? null : parseFloat(req.body.hourlyRate)
    if (req.body.childSeatPrice !== undefined) data.childSeatPrice = req.body.childSeatPrice === null ? null : parseFloat(req.body.childSeatPrice)
    if (req.body.isActive !== undefined) data.isActive = !!req.body.isActive

    const existing = await prisma.cityPricing.findFirst({
      where: { id: req.params.id, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'City pricing row not found' })

    const wrapped = await withIdempotency(req, 'pricing.city.update', { id: req.params.id, data }, async () => {
      const row = await prisma.cityPricing.update({
        where: { id: req.params.id },
        data
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'pricing.city.update',
        resource: 'city_pricing',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: data
      })
      return row
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error updating city pricing:', error)
    res.status(500).json({ error: 'Failed to update city pricing' })
  }
})

app.delete('/api/admin/pricing/cities/:id', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.manage', 'pricing'), async (req, res) => {
  try {
    const existing = await prisma.cityPricing.findFirst({
      where: { id: req.params.id, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'City pricing row not found' })

    const payload = { id: req.params.id, deactivate: true }
    ensureIdempotencyKey(req, 'pricing.city.deactivate', payload)
    const wrapped = await withIdempotency(req, 'pricing.city.deactivate', payload, async () => {
      const row = await prisma.cityPricing.update({
        where: { id: existing.id },
        data: { isActive: false }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'pricing.city.deactivate',
        resource: 'city_pricing',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return { success: true }
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error deleting city pricing row:', error)
    res.status(500).json({ error: 'Failed to delete city pricing row' })
  }
})

app.get('/api/admin/pricing/counterparty-rules', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.read', 'pricing'), async (req, res) => {
  try {
    const { q = '', active = '' } = req.query
    const where = {
      tenantId: req.actorContext.tenantId,
      ...buildCityScopeWhere(req, 'city')
    }
    if (active !== '') where.isActive = String(active) === 'true'
    if (q) {
      where.OR = [
        { counterpartyName: { contains: String(q), mode: 'insensitive' } },
        { city: { contains: String(q), mode: 'insensitive' } },
        { routeFrom: { contains: String(q), mode: 'insensitive' } },
        { routeTo: { contains: String(q), mode: 'insensitive' } }
      ]
    }
    const rows = await prisma.counterpartyPriceRule.findMany({
      where,
      include: {
        customerCompany: { select: { id: true, name: true } }
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      take: 300
    })
    res.json({ rows })
  } catch (error) {
    console.error('Error fetching counterparty pricing rules:', error)
    res.status(500).json({ error: 'Failed to fetch counterparty rules' })
  }
})

app.post('/api/admin/pricing/counterparty-rules', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.manage', 'pricing', (req) => ({
  city: req.body?.city || null
})), async (req, res) => {
  try {
    const {
      customerCompanyId,
      counterpartyName,
      city,
      routeFrom,
      routeTo,
      vehicleType,
      sellPrice,
      markupPercent,
      minMarginAbs,
      currency,
      startsAt,
      endsAt,
      notes,
      isActive
    } = req.body || {}

    if (!counterpartyName) {
      return res.status(400).json({ error: 'counterpartyName is required' })
    }

    const payload = { customerCompanyId, counterpartyName, city, routeFrom, routeTo, vehicleType, sellPrice, markupPercent, minMarginAbs, currency, startsAt, endsAt, notes, isActive }
    const wrapped = await withIdempotency(req, 'pricing.counterparty.create', payload, async () => {
      const row = await prisma.counterpartyPriceRule.create({
        data: {
          tenantId: req.actorContext.tenantId,
          customerCompanyId: customerCompanyId || null,
          counterpartyName: String(counterpartyName).trim(),
          city: city || null,
          routeFrom: routeFrom || null,
          routeTo: routeTo || null,
          vehicleType: vehicleType || null,
          sellPrice: sellPrice === null || sellPrice === undefined || sellPrice === '' ? null : parseFloat(sellPrice),
          markupPercent: markupPercent === null || markupPercent === undefined || markupPercent === '' ? null : parseFloat(markupPercent),
          minMarginAbs: minMarginAbs === null || minMarginAbs === undefined || minMarginAbs === '' ? null : parseFloat(minMarginAbs),
          currency: currency || 'EUR',
          startsAt: startsAt ? new Date(startsAt) : null,
          endsAt: endsAt ? new Date(endsAt) : null,
          notes: notes || null,
          isActive: isActive === undefined ? true : !!isActive
        }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'pricing.counterparty.create',
        resource: 'counterparty_rule',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return row
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error creating counterparty pricing rule:', error)
    res.status(500).json({ error: 'Failed to create counterparty rule' })
  }
})

app.put('/api/admin/pricing/counterparty-rules/:id', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.manage', 'pricing', async (req) => {
  const existing = await prisma.counterpartyPriceRule.findFirst({
    where: { id: req.params.id, tenantId: req.actorContext?.tenantId || '' },
    select: { city: true }
  })
  if (!existing) return {}
  return {
    city: req.body?.city !== undefined ? req.body.city : existing.city
  }
}), async (req, res) => {
  try {
    const data = {}
    const nullableFields = ['customerCompanyId', 'city', 'routeFrom', 'routeTo', 'vehicleType', 'notes']
    for (const f of nullableFields) {
      if (req.body[f] !== undefined) data[f] = req.body[f] || null
    }
    if (req.body.counterpartyName !== undefined) data.counterpartyName = String(req.body.counterpartyName || '').trim()
    if (req.body.currency !== undefined) data.currency = String(req.body.currency || '').trim() || 'EUR'
    if (req.body.sellPrice !== undefined) data.sellPrice = req.body.sellPrice === null || req.body.sellPrice === '' ? null : parseFloat(req.body.sellPrice)
    if (req.body.markupPercent !== undefined) data.markupPercent = req.body.markupPercent === null || req.body.markupPercent === '' ? null : parseFloat(req.body.markupPercent)
    if (req.body.minMarginAbs !== undefined) data.minMarginAbs = req.body.minMarginAbs === null || req.body.minMarginAbs === '' ? null : parseFloat(req.body.minMarginAbs)
    if (req.body.startsAt !== undefined) data.startsAt = req.body.startsAt ? new Date(req.body.startsAt) : null
    if (req.body.endsAt !== undefined) data.endsAt = req.body.endsAt ? new Date(req.body.endsAt) : null
    if (req.body.isActive !== undefined) data.isActive = !!req.body.isActive

    const existing = await prisma.counterpartyPriceRule.findFirst({
      where: { id: req.params.id, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'Counterparty rule not found' })

    const wrapped = await withIdempotency(req, 'pricing.counterparty.update', { id: req.params.id, data }, async () => {
      const row = await prisma.counterpartyPriceRule.update({
        where: { id: req.params.id },
        data
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'pricing.counterparty.update',
        resource: 'counterparty_rule',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: data
      })
      return row
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error updating counterparty pricing rule:', error)
    res.status(500).json({ error: 'Failed to update counterparty rule' })
  }
})

async function recalculatePriceConflicts(tenantId) {
  const orders = await prisma.order.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      driverPrice: { not: null },
      clientPrice: { gt: 0 },
      status: { in: ['assigned', 'accepted', 'completed'] }
    },
    select: {
      id: true,
      tenantId: true,
      clientPrice: true,
      driverPrice: true,
      fromPoint: true,
      toPoint: true,
      status: true,
      updatedAt: true
    },
    take: 5000
  })

  const seenConflictKeys = new Set()
  let createdOrUpdated = 0

  for (const order of orders) {
    const sellPrice = Number(order.clientPrice || 0)
    const driverCost = Number(order.driverPrice || 0)
    const marginAbs = sellPrice - driverCost
    const marginPct = sellPrice > 0 ? (marginAbs / sellPrice) * 100 : 0

    let issueType = null
    let severity = null
    if (driverCost > sellPrice) {
      issueType = 'driver_gt_sell'
      severity = 'critical'
    } else if (marginPct < 10) {
      issueType = 'low_margin'
      severity = 'warning'
    }

    if (!issueType) {
      continue
    }

    const key = `${order.id}:${issueType}`
    seenConflictKeys.add(key)

    await prisma.priceConflict.upsert({
      where: { orderId_issueType: { orderId: order.id, issueType } },
      update: {
        tenantId: order.tenantId || tenantId || null,
        severity,
        status: 'open',
        sellPrice,
        driverCost,
        marginAbs,
        marginPct,
        details: `${order.fromPoint} -> ${order.toPoint}`
      },
      create: {
        tenantId: order.tenantId || tenantId || null,
        orderId: order.id,
        issueType,
        severity,
        status: 'open',
        sellPrice,
        driverCost,
        marginAbs,
        marginPct,
        details: `${order.fromPoint} -> ${order.toPoint}`
      }
    })
    createdOrUpdated++
  }

  const openRows = await prisma.priceConflict.findMany({
    where: { status: 'open', ...(tenantId ? { tenantId } : {}) },
    select: { id: true, orderId: true, issueType: true }
  })
  for (const row of openRows) {
    const key = `${row.orderId}:${row.issueType}`
    if (!seenConflictKeys.has(key)) {
      await prisma.priceConflict.update({
        where: { id: row.id },
        data: {
          status: 'resolved',
          resolvedAt: new Date()
        }
      })
    }
  }

  return { processedOrders: orders.length, createdOrUpdated }
}

app.post('/api/admin/pricing/conflicts/recalculate', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.manage', 'pricing'), async (req, res) => {
  try {
    const stats = await recalculatePriceConflicts(req.actorContext.tenantId)
    res.json({ ok: true, stats })
  } catch (error) {
    console.error('Error recalculating price conflicts:', error)
    res.status(500).json({ error: 'Failed to recalculate conflicts' })
  }
})

app.get('/api/admin/pricing/conflicts', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.read', 'pricing'), async (req, res) => {
  try {
    const { status = 'open', severity = '', limit = '200' } = req.query
    const take = Math.min(parseInt(limit, 10) || 200, 500)
    const where = { tenantId: req.actorContext.tenantId }
    if (status) where.status = String(status)
    if (severity) where.severity = String(severity)
    const rows = await prisma.priceConflict.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            source: true,
            fromPoint: true,
            toPoint: true,
            status: true,
            pickupAt: true,
            driverId: true
          }
        }
      },
      orderBy: [{ severity: 'asc' }, { updatedAt: 'desc' }],
      take
    })
    res.json({ rows })
  } catch (error) {
    console.error('Error fetching price conflicts:', error)
    res.status(500).json({ error: 'Failed to fetch price conflicts' })
  }
})

// ==================== OPS DRAFTS / AVAILABILITY ====================
async function detectDriverUnavailabilityFromText(text) {
  const pattern = /водитель\s+(.+?)\s+(?:в отпуске|недоступен)\s+с\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})\s+по\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})/i
  const match = String(text || '').match(pattern)
  if (!match) return null
  const [, driverNameRaw, start, end] = match
  const startAt = parseDateBoundary(start, 'start')
  const endAt = parseDateBoundary(end, 'end')
  if (!startAt || !endAt) return null
  return {
    type: 'driver_unavailable',
    driverNameRaw: driverNameRaw.trim(),
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    reason: 'vacation_or_unavailable'
  }
}

function isImportantMessage(text) {
  const t = String(text || '').toLowerCase()
  return t.includes('#важно') || t.startsWith('важно:') || t.includes('в отпуске') || t.includes('недоступен')
}

async function saveOpsDraftFromTelegram({ tenantId, chatId, telegramUserId, text, authorName, messageDate }) {
  const parsed = await detectDriverUnavailabilityFromText(text)
  const parsedType = parsed ? 'driver_unavailable' : 'generic_important'
  const payloadBase = {
    source: 'telegram_comment',
    authorName: authorName || null,
    messageDate: messageDate || null
  }
  const payload = parsed
    ? { ...parsed, ...payloadBase }
    : { type: 'generic_important', text: String(text || '').trim(), ...payloadBase }

  const draft = await prisma.opsEventDraft.create({
    data: {
      tenantId: tenantId || null,
      chatId: String(chatId),
      telegramUserId: String(telegramUserId),
      messageText: String(text || ''),
      parsedType,
      payloadJson: JSON.stringify(payload),
      status: 'pending'
    }
  })
  return draft
}

function formatUtcDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
}

function buildCopilotMessage(lines) {
  return [
    'Я помощник Riderra, работаю в тестовом режиме.',
    ...lines.filter(Boolean)
  ].join('\n')
}

function parseJsonSafe(raw, fallback = {}) {
  try {
    return JSON.parse(raw)
  } catch (_) {
    return fallback
  }
}

function normalizeFlightNumber(raw) {
  const value = String(raw || '').trim().toUpperCase().replace(/\s+/g, '')
  if (!value) return null
  const match = value.match(/^([A-Z0-9]{2,3})(\d{1,5})([A-Z]?)$/)
  if (!match) return value
  const [, code, num, suffix] = match
  return `${code}${num}${suffix || ''}`
}

function splitFlightNumber(raw) {
  const normalized = normalizeFlightNumber(raw)
  if (!normalized) return null
  const match = normalized.match(/^([A-Z0-9]{2,3})(\d{1,5})([A-Z]?)$/)
  if (!match) return { normalized, airlineIata: null, flightNumberOnly: null }
  return {
    normalized,
    airlineIata: match[1],
    flightNumberOnly: `${match[2]}${match[3] || ''}`
  }
}

function formatDateYmd(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDateMaybe(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function getAviationStackConfig() {
  const apiKey = String(process.env.AVIATIONSTACK_API_KEY || '').trim()
  const baseUrl = String(process.env.AVIATIONSTACK_BASE_URL || 'https://api.aviationstack.com/v1').trim()
  return {
    configured: Boolean(apiKey),
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, '')
  }
}

function getGeocodingConfig() {
  const baseUrl = String(process.env.GEOCODING_BASE_URL || 'https://nominatim.openstreetmap.org').trim()
  const userAgent = String(process.env.GEOCODING_USER_AGENT || 'Riderra/1.0 (ops@riderra.com)').trim()
  const referer = String(process.env.GEOCODING_REFERER || 'https://riderra.com').trim()
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    userAgent,
    referer
  }
}

let geocodeNextAllowedAt = 0
const geocodeCache = new Map()

async function waitForGeocodeSlot() {
  const now = Date.now()
  const waitMs = Math.max(0, geocodeNextAllowedAt - now)
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }
  geocodeNextAllowedAt = Date.now() + 1100
}

function normalizeGeocodingResult(row = {}) {
  return {
    displayName: row.display_name || null,
    lat: row.lat != null ? Number(row.lat) : null,
    lon: row.lon != null ? Number(row.lon) : null,
    type: row.type || null,
    className: row.class || null,
    importance: row.importance != null ? Number(row.importance) : null,
    address: row.address || null,
    raw: row
  }
}

async function geocodeAddress(query, options = {}) {
  const rawQuery = String(query || '').trim()
  if (!rawQuery) {
    const error = new Error('address query is required')
    error.statusCode = 400
    throw error
  }

  const cacheKey = `${rawQuery.toLowerCase()}::${String(options.language || 'en')}`
  const cached = geocodeCache.get(cacheKey)
  if (cached && (Date.now() - cached.ts) < (1000 * 60 * 60 * 12)) {
    return cached.value
  }

  const config = getGeocodingConfig()
  await waitForGeocodeSlot()

  const url = new URL(`${config.baseUrl}/search`)
  url.searchParams.set('q', rawQuery)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '5')
  if (options.language) url.searchParams.set('accept-language', options.language)

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': config.userAgent,
      'Referer': config.referer
    }
  })
  const json = await response.json().catch(() => [])
  if (!response.ok) {
    const error = new Error(`Geocoding request failed: HTTP ${response.status}`)
    error.statusCode = 502
    throw error
  }

  const rows = Array.isArray(json) ? json.map(normalizeGeocodingResult) : []
  const bestMatch = rows[0] || null
  const value = {
    provider: 'nominatim',
    checkedAt: new Date().toISOString(),
    query: rawQuery,
    found: Boolean(bestMatch),
    bestMatch,
    resultCount: rows.length
  }
  geocodeCache.set(cacheKey, { ts: Date.now(), value })
  return value
}

function mergeAddressVerificationIntoPayload(payload = {}, addressVerification = null) {
  const next = { ...payload, addressVerification }
  const qualityChecks = Array.isArray(payload.qualityChecks) ? payload.qualityChecks.filter((item) => !['fromPointGeo', 'toPointGeo'].includes(item?.key)) : []
  for (const pointKey of ['fromPoint', 'toPoint']) {
    const geo = addressVerification?.[pointKey]
    if (!geo) continue
    const label = pointKey === 'fromPoint' ? 'Откуда' : 'Куда'
    if (geo.found && geo.bestMatch) {
      qualityChecks.push({
        key: `${pointKey}Geo`,
        level: 'ok',
        message: `${label}: адрес подтверждён (${geo.bestMatch.displayName || 'match found'})`
      })
    } else {
      qualityChecks.push({
        key: `${pointKey}Geo`,
        level: 'warn',
        message: `${label}: геокодер не подтвердил адрес`
      })
    }
  }
  next.qualityChecks = qualityChecks
  next.infoReason = buildInfoReasonFromDraftChecks(qualityChecks, payload.missingFields || [])
  return next
}

function mergeAddressVerificationErrorIntoPayload(payload = {}, error) {
  const next = { ...payload }
  const qualityChecks = Array.isArray(payload.qualityChecks) ? payload.qualityChecks.filter((item) => !['fromPointGeo', 'toPointGeo'].includes(item?.key)) : []
  qualityChecks.push({
    key: 'fromPointGeo',
    level: 'warn',
    message: `Геокодинг адресов недоступен (${error?.message || 'unknown error'})`
  })
  next.qualityChecks = qualityChecks
  next.infoReason = buildInfoReasonFromDraftChecks(qualityChecks, payload.missingFields || [])
  return next
}

function normalizeAviationStackFlightRow(row = {}) {
  return {
    flightDate: row.flight_date || null,
    flightStatus: row.flight_status || null,
    airlineName: row.airline?.name || null,
    airlineIata: row.airline?.iata || null,
    flightNumber: row.flight?.number || null,
    flightIata: row.flight?.iata || null,
    departureAirport: row.departure?.airport || null,
    departureIata: row.departure?.iata || null,
    departureScheduled: row.departure?.scheduled || null,
    departureEstimated: row.departure?.estimated || null,
    departureActual: row.departure?.actual || null,
    arrivalAirport: row.arrival?.airport || null,
    arrivalIata: row.arrival?.iata || null,
    arrivalScheduled: row.arrival?.scheduled || null,
    arrivalEstimated: row.arrival?.estimated || null,
    arrivalActual: row.arrival?.actual || null,
    raw: row
  }
}

function scoreAviationStackFlightRow(row, flightRef, pickupAt = null) {
  let score = 0
  const flightIata = String(row.flightIata || '').trim().toUpperCase()
  if (flightRef?.normalized && flightIata === flightRef.normalized) score += 100
  const airlineIata = String(row.airlineIata || '').trim().toUpperCase()
  if (flightRef?.airlineIata && airlineIata === String(flightRef.airlineIata).toUpperCase()) score += 20
  const flightNumber = String(row.flightNumber || '').trim()
  if (flightRef?.flightNumberOnly && flightNumber === flightRef.flightNumberOnly) score += 30

  if (pickupAt) {
    const pickup = parseDateMaybe(pickupAt)
    const arrivalCandidates = [row.arrivalEstimated, row.arrivalScheduled, row.arrivalActual]
      .map(parseDateMaybe)
      .filter(Boolean)
    if (pickup && arrivalCandidates.length) {
      const minDiffMs = Math.min(...arrivalCandidates.map((candidate) => Math.abs(candidate.getTime() - pickup.getTime())))
      const minDiffHours = minDiffMs / (1000 * 60 * 60)
      if (minDiffHours <= 3) score += 40
      else if (minDiffHours <= 12) score += 20
      else if (minDiffHours <= 24) score += 5
    }
  }

  return score
}

async function fetchAviationStackFlightCheck({ flightNumber, pickupAt = null }) {
  const config = getAviationStackConfig()
  if (!config.configured) {
    const error = new Error('AVIATIONSTACK_API_KEY is not configured')
    error.statusCode = 503
    throw error
  }

  const flightRef = splitFlightNumber(flightNumber)
  if (!flightRef?.normalized) {
    const error = new Error('flightNumber is required')
    error.statusCode = 400
    throw error
  }

  const flightDate = formatDateYmd(pickupAt || new Date())
  const url = new URL(`${config.baseUrl}/flights`)
  url.searchParams.set('access_key', config.apiKey)
  url.searchParams.set('flight_iata', flightRef.normalized)
  if (flightDate) url.searchParams.set('flight_date', flightDate)
  url.searchParams.set('limit', '10')

  const response = await fetch(url.toString())
  const json = await response.json().catch(() => ({}))
  if (!response.ok || json?.error) {
    const details = json?.error?.message || json?.error?.info || JSON.stringify(json)
    const error = new Error(`AviationStack request failed: ${details}`)
    error.statusCode = 502
    throw error
  }

  const rawRows = Array.isArray(json?.data) ? json.data : Array.isArray(json?.results) ? json.results : []
  const rows = rawRows.map(normalizeAviationStackFlightRow)
  const sorted = rows
    .map((row) => ({ row, score: scoreAviationStackFlightRow(row, flightRef, pickupAt) }))
    .sort((a, b) => b.score - a.score)

  const best = sorted[0]?.row || null
  return {
    provider: 'aviationstack',
    checkedAt: new Date().toISOString(),
    query: {
      flightNumber: flightRef.normalized,
      flightDate
    },
    found: Boolean(best),
    bestMatch: best,
    alternatives: sorted.slice(1, 5).map((item) => item.row),
    resultCount: rows.length
  }
}

function mergeFlightCheckIntoPayload(payload = {}, flightCheck = null) {
  const next = { ...payload, flightCheck }
  const qualityChecks = Array.isArray(payload.qualityChecks) ? payload.qualityChecks.filter((item) => item?.key !== 'flightLive') : []
  if (flightCheck?.found && flightCheck?.bestMatch) {
    const match = flightCheck.bestMatch
    const arrival = match.arrivalEstimated || match.arrivalScheduled || match.arrivalActual || null
    qualityChecks.push({
      key: 'flightLive',
      level: 'ok',
      message: `AviationStack: ${match.flightStatus || 'status unknown'}${arrival ? `, прилёт ${arrival}` : ''}`
    })
  } else {
    qualityChecks.push({
      key: 'flightLive',
      level: 'warn',
      message: 'AviationStack не нашёл рейс по указанному номеру и дате'
    })
  }
  next.qualityChecks = qualityChecks
  next.infoReason = buildInfoReasonFromDraftChecks(qualityChecks, payload.missingFields || [])
  return next
}

function mergeFlightCheckErrorIntoPayload(payload = {}, error, query = {}) {
  const next = {
    ...payload,
    flightCheck: {
      provider: 'aviationstack',
      checkedAt: new Date().toISOString(),
      query,
      found: false,
      error: error?.message || 'Flight check failed'
    }
  }
  const qualityChecks = Array.isArray(payload.qualityChecks) ? payload.qualityChecks.filter((item) => item?.key !== 'flightLive') : []
  qualityChecks.push({
    key: 'flightLive',
    level: 'warn',
    message: `AviationStack: не удалось проверить рейс (${error?.message || 'unknown error'})`
  })
  next.qualityChecks = qualityChecks
  next.infoReason = buildInfoReasonFromDraftChecks(qualityChecks, payload.missingFields || [])
  return next
}

async function maybeAutoAttachFlightCheck(payload = {}) {
  const orderDraft = payload.orderDraft || {}
  const flightNumber = normalizeFlightNumber(orderDraft.flightNumber)
  const pickupAt = orderDraft.pickupAt || null
  if (!flightNumber) return payload
  if (!getAviationStackConfig().configured) return payload
  try {
    const flightCheck = await fetchAviationStackFlightCheck({ flightNumber, pickupAt })
    return mergeFlightCheckIntoPayload(payload, flightCheck)
  } catch (error) {
    console.error('Automatic AviationStack flight check failed:', error)
    return mergeFlightCheckErrorIntoPayload(payload, error, {
      flightNumber,
      flightDate: formatDateYmd(pickupAt || new Date())
    })
  }
}

async function maybeAutoAttachAddressVerification(payload = {}) {
  const orderDraft = payload.orderDraft || {}
  const fromPoint = String(orderDraft.fromPoint || '').trim()
  const toPoint = String(orderDraft.toPoint || '').trim()
  if (!fromPoint && !toPoint) return payload
  try {
    const [fromGeo, toGeo] = await Promise.all([
      fromPoint ? geocodeAddress(fromPoint, { language: orderDraft.lang || 'en' }) : Promise.resolve(null),
      toPoint ? geocodeAddress(toPoint, { language: orderDraft.lang || 'en' }) : Promise.resolve(null)
    ])
    return mergeAddressVerificationIntoPayload(payload, {
      provider: 'nominatim',
      checkedAt: new Date().toISOString(),
      fromPoint: fromGeo,
      toPoint: toGeo
    })
  } catch (error) {
    console.error('Automatic address verification failed:', error)
    return mergeAddressVerificationErrorIntoPayload(payload, error)
  }
}

function hasAirportLikePoint(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return false
  return [
    'airport',
    'аэропорт',
    'terminal',
    'терминал',
    'iata',
    'arrivals',
    'departures'
  ].some((token) => raw.includes(token))
}

function validateAddressLikePoint(value) {
  const raw = String(value || '').trim()
  if (!raw) return { level: 'error', code: 'missing', message: 'Поле не заполнено' }
  if (['tbd', 'unknown', 'n/a', '-', '?'].includes(raw.toLowerCase())) {
    return { level: 'error', code: 'placeholder', message: 'Указан временный плейсхолдер вместо адреса' }
  }
  if (raw.length < 5) {
    return { level: 'warn', code: 'too_short', message: 'Адрес выглядит слишком коротким' }
  }
  if (raw.split(/\s+/).length < 2 && !hasAirportLikePoint(raw)) {
    return { level: 'warn', code: 'low_detail', message: 'В адресе мало деталей' }
  }
  return { level: 'ok', code: 'ok', message: 'Адрес выглядит пригодным' }
}

function buildOrderDraftQualityChecks(extracted, pricing = {}) {
  const checks = []
  const pickupAtRaw = String(extracted?.pickupAt || '').trim()
  const parsedPickupAt = pickupAtRaw ? new Date(pickupAtRaw) : null
  const pickupValid = parsedPickupAt && !Number.isNaN(parsedPickupAt.getTime())

  checks.push({
    key: 'pickupAt',
    level: pickupValid ? 'ok' : 'error',
    message: pickupValid ? 'Дата и время подачи распознаны' : 'Дата и время подачи не распознаны'
  })

  const fromCheck = validateAddressLikePoint(extracted?.fromPoint)
  checks.push({
    key: 'fromPoint',
    level: fromCheck.level,
    message: `Откуда: ${fromCheck.message}`
  })

  const toCheck = validateAddressLikePoint(extracted?.toPoint)
  checks.push({
    key: 'toPoint',
    level: toCheck.level,
    message: `Куда: ${toCheck.message}`
  })

  const flightNumber = normalizeFlightNumber(extracted?.flightNumber)
  const flightRequired = hasAirportLikePoint(extracted?.fromPoint) || hasAirportLikePoint(extracted?.toPoint)
  if (flightRequired) {
    checks.push({
      key: 'flightNumber',
      level: flightNumber ? 'ok' : 'warn',
      message: flightNumber ? `Рейс указан: ${flightNumber}` : 'Похоже на аэропортовый трансфер, но номер рейса не указан'
    })
  } else if (flightNumber) {
    checks.push({
      key: 'flightNumber',
      level: 'ok',
      message: `Рейс указан: ${flightNumber}`
    })
  }

  const extractedPrice = Number.isFinite(Number(extracted?.clientPrice)) ? Number(extracted.clientPrice) : null
  const authoritativePrice = Number.isFinite(Number(pricing?.authoritativeClientPrice))
    ? Number(pricing.authoritativeClientPrice)
    : null
  if (authoritativePrice != null && extractedPrice != null) {
    checks.push({
      key: 'price',
      level: pricing?.conflict ? 'warn' : 'ok',
      message: pricing?.conflict
        ? `Цена расходится: письмо ${extractedPrice.toFixed(2)}, прайс Riderra ${authoritativePrice.toFixed(2)}`
        : `Цена совпадает с прайсом Riderra: ${authoritativePrice.toFixed(2)}`
    })
  } else if (authoritativePrice != null) {
    checks.push({
      key: 'price',
      level: 'ok',
      message: `Используется цена Riderra: ${authoritativePrice.toFixed(2)}`
    })
  } else if (extractedPrice != null) {
    checks.push({
      key: 'price',
      level: 'warn',
      message: `Цена взята только из письма: ${extractedPrice.toFixed(2)}`
    })
  } else {
    checks.push({
      key: 'price',
      level: 'error',
      message: 'Цена не определена'
    })
  }

  return checks
}

function buildSheetRowPreviewFromDraft(extracted, pricing = {}) {
  const displayDate = extracted?.pickupAt
    ? String(extracted.pickupAt).replace('T', ' ').slice(0, 16)
    : ''
  const price = pricing?.authoritativeClientPrice != null
    ? Number(pricing.authoritativeClientPrice)
    : (Number.isFinite(Number(extracted?.clientPrice)) ? Number(extracted.clientPrice) : null)
  const commentParts = [
    extracted?.comment || null,
    extracted?.flightNumber ? `рейс ${normalizeFlightNumber(extracted.flightNumber)}` : null,
    pricing?.conflict ? 'расхождение с прайсом Riderra' : null
  ].filter(Boolean)

  return {
    contractor: extracted?.customerName || '',
    orderNumber: extracted?.orderNumber || '',
    date: displayDate,
    fromPoint: extracted?.fromPoint || '',
    toPoint: extracted?.toPoint || '',
    sum: price != null ? `${price.toFixed(2)} ${pricing?.authoritativeCurrency || extracted?.currency || 'EUR'}` : '',
    driver: '',
    comment: commentParts.join('; '),
    internalOrderNumber: extracted?.externalMessageId || ''
  }
}

function buildInfoReasonFromDraftChecks(checks = [], missingFields = []) {
  const parts = []
  for (const field of missingFields || []) {
    const normalized = String(field || '').trim()
    if (normalized) parts.push(`не заполнено: ${normalized}`)
  }
  for (const check of checks || []) {
    if (check?.level === 'error' || check?.level === 'warn') {
      parts.push(String(check.message || '').trim())
    }
  }
  return [...new Set(parts.filter(Boolean))].join('; ') || null
}

function normalizeVehicleType(raw) {
  const value = String(raw || '').trim()
  if (!value) return 'sedan'
  const key = value.toLowerCase()
  const map = {
    economy: 'sedan',
    sedan: 'sedan',
    comfort: 'comfort',
    business: 'business',
    van: 'van',
    minivan: 'van',
    suv: 'suv'
  }
  return map[key] || value
}

function normalizeWebhookSignature(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  return value.startsWith('sha256=') ? value.slice(7) : value
}

function verifyOpenClawSignature(payload, signature) {
  const secret = String(process.env.OPENCLAW_WEBHOOK_SECRET || '').trim()
  if (!secret) return true
  const digest = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload || {}))
    .digest('hex')
  const normalized = normalizeWebhookSignature(signature)
  if (!normalized) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(normalized))
  } catch (_) {
    return false
  }
}

async function findAuthoritativePriceForDraft({
  tenantId,
  city = '',
  fromPoint = '',
  toPoint = '',
  vehicleType = ''
}) {
  const cityNorm = String(city || '').trim()
  const fromNorm = String(fromPoint || '').trim()
  const toNorm = String(toPoint || '').trim()
  const vehicleNorm = normalizeVehicleType(vehicleType)

  const rows = await prisma.cityPricing.findMany({
    where: {
      tenantId: tenantId || null,
      isActive: true,
      ...(cityNorm ? { city: { equals: cityNorm, mode: 'insensitive' } } : {})
    },
    orderBy: [{ updatedAt: 'desc' }],
    take: 200
  })

  const exact = rows.find((row) =>
    (!row.vehicleType || normalizeVehicleType(row.vehicleType) === vehicleNorm) &&
    (!row.routeFrom || String(row.routeFrom).trim().toLowerCase() === fromNorm.toLowerCase()) &&
    (!row.routeTo || String(row.routeTo).trim().toLowerCase() === toNorm.toLowerCase()) &&
    row.fixedPrice !== null
  )
  if (exact) return exact

  const cityOnly = rows.find((row) =>
    (!row.vehicleType || normalizeVehicleType(row.vehicleType) === vehicleNorm) &&
    !row.routeFrom &&
    !row.routeTo &&
    row.fixedPrice !== null
  )
  return cityOnly || null
}

async function buildOpenClawDraftPayload(payload, tenantId) {
  const draft = payload?.orderDraft && typeof payload.orderDraft === 'object'
    ? payload.orderDraft
    : {}

  const extracted = {
    externalMessageId: String(payload.externalMessageId || payload.messageId || draft.externalMessageId || '').trim() || null,
    sourceChannel: String(payload.sourceChannel || payload.channel || 'openclaw').trim() || 'openclaw',
    sourceChatId: String(payload.sourceChatId || payload.chatId || 'openclaw').trim() || 'openclaw',
    sourceActorId: String(payload.sourceActorId || payload.actorId || 'openclaw').trim() || 'openclaw',
    sourceType: String(payload.sourceType || 'email').trim() || 'email',
    rawText: String(payload.rawText || payload.messageText || '').trim(),
    confidence: Number.isFinite(Number(payload.confidence)) ? Number(payload.confidence) : null,
    missingFields: Array.isArray(payload.missingFields) ? payload.missingFields.map((x) => String(x || '').trim()).filter(Boolean) : [],
    proposedActions: Array.isArray(payload.proposedActions) ? payload.proposedActions : [],
    contractVersion: String(payload.contractVersion || 'v1').trim() || 'v1',
    customerName: String(draft.customerName || payload.customerName || '').trim() || null,
    orderNumber: String(draft.orderNumber || payload.orderNumber || '').trim() || null,
    city: String(draft.city || payload.city || draft.destinationCity || '').trim() || null,
    fromPoint: String(draft.fromPoint || payload.fromPoint || draft.routeFrom || '').trim() || null,
    toPoint: String(draft.toPoint || payload.toPoint || draft.routeTo || '').trim() || null,
    pickupAt: String(draft.pickupAt || payload.pickupAt || draft.serviceAt || '').trim() || null,
    flightNumber: String(draft.flightNumber || payload.flightNumber || '').trim() || null,
    vehicleType: normalizeVehicleType(draft.vehicleType || payload.vehicleType || ''),
    passengers: draft.passengers != null ? Number(draft.passengers) : null,
    luggage: draft.luggage != null ? Number(draft.luggage) : null,
    clientPrice: draft.clientPrice != null ? Number(draft.clientPrice) : null,
    driverPrice: draft.driverPrice != null ? Number(draft.driverPrice) : null,
    currency: String(draft.currency || payload.currency || 'EUR').trim() || 'EUR',
    comment: String(draft.comment || payload.comment || '').trim() || null,
    lang: String(draft.lang || payload.lang || 'ru').trim() || 'ru'
  }

  const authoritativePricing = await findAuthoritativePriceForDraft({
    tenantId,
    city: extracted.city,
    fromPoint: extracted.fromPoint,
    toPoint: extracted.toPoint,
    vehicleType: extracted.vehicleType
  })

  const authoritativeClientPrice = authoritativePricing?.fixedPrice != null
    ? Number(authoritativePricing.fixedPrice)
    : null
  const priceConflict = (
    authoritativeClientPrice != null &&
    extracted.clientPrice != null &&
    Math.abs(authoritativeClientPrice - extracted.clientPrice) > 0.009
  )
  extracted.flightNumber = normalizeFlightNumber(extracted.flightNumber)
  const qualityChecks = buildOrderDraftQualityChecks(extracted, {
    authoritativeClientPrice,
    authoritativeCurrency: authoritativePricing?.currency || extracted.currency || 'EUR',
    conflict: priceConflict
  })
  const infoReason = buildInfoReasonFromDraftChecks(qualityChecks, extracted.missingFields)
  const sheetRowPreview = buildSheetRowPreviewFromDraft(extracted, {
    authoritativeClientPrice,
    authoritativeCurrency: authoritativePricing?.currency || extracted.currency || 'EUR',
    conflict: priceConflict
  })

  return {
    type: 'openclaw_order_draft',
    source: 'openclaw',
    sourceType: extracted.sourceType,
    contractVersion: extracted.contractVersion,
    rawText: extracted.rawText,
    confidence: extracted.confidence,
    missingFields: extracted.missingFields,
    proposedActions: extracted.proposedActions,
    orderDraft: extracted,
    qualityChecks,
    sheetRowPreview,
    readyForTable: !qualityChecks.some((item) => item.level === 'error'),
    infoReason,
    pricing: {
      authoritativeClientPrice,
      authoritativeCurrency: authoritativePricing?.currency || extracted.currency || 'EUR',
      pricingRuleId: authoritativePricing?.id || null,
      pricingSource: authoritativePricing ? 'riderra_pricing' : null,
      conflict: priceConflict
    }
  }
}

async function saveOpsDraftFromOpenClaw({ tenantId, payload }) {
  const basePayload = await buildOpenClawDraftPayload(payload, tenantId)
  const withFlightPayload = await maybeAutoAttachFlightCheck(basePayload)
  const normalizedPayload = await maybeAutoAttachAddressVerification(withFlightPayload)
  const orderDraft = normalizedPayload.orderDraft || {}
  return prisma.opsEventDraft.create({
    data: {
      tenantId: tenantId || null,
      chatId: orderDraft.sourceChatId || 'openclaw',
      telegramUserId: orderDraft.sourceActorId || 'openclaw',
      messageText: normalizedPayload.rawText || JSON.stringify(payload || {}),
      parsedType: 'openclaw_order_draft',
      payloadJson: JSON.stringify(normalizedPayload),
      status: 'pending'
    }
  })
}

function buildOrderFlightPersistence(payload = {}) {
  const orderDraft = payload.orderDraft || {}
  const flightCheck = payload.flightCheck || null
  const match = flightCheck?.bestMatch || null
  return {
    flightNumber: normalizeFlightNumber(orderDraft.flightNumber) || null,
    flightStatus: match?.flightStatus || null,
    flightProvider: flightCheck?.provider || null,
    flightCheckedAt: flightCheck?.checkedAt ? new Date(flightCheck.checkedAt) : null,
    flightArrivalScheduled: match?.arrivalScheduled ? new Date(match.arrivalScheduled) : null,
    flightArrivalEstimated: match?.arrivalEstimated ? new Date(match.arrivalEstimated) : null,
    flightArrivalActual: match?.arrivalActual ? new Date(match.arrivalActual) : null,
    flightVerificationJson: flightCheck ? JSON.stringify(flightCheck) : null
  }
}

function buildOrderAddressPersistence(payload = {}) {
  const verification = payload.addressVerification || null
  const fromGeo = verification?.fromPoint?.bestMatch || null
  const toGeo = verification?.toPoint?.bestMatch || null
  return {
    addressProvider: verification?.provider || null,
    addressCheckedAt: verification?.checkedAt ? new Date(verification.checkedAt) : null,
    fromPointNormalized: fromGeo?.displayName || null,
    fromPointLat: Number.isFinite(Number(fromGeo?.lat)) ? Number(fromGeo.lat) : null,
    fromPointLon: Number.isFinite(Number(fromGeo?.lon)) ? Number(fromGeo.lon) : null,
    toPointNormalized: toGeo?.displayName || null,
    toPointLat: Number.isFinite(Number(toGeo?.lat)) ? Number(toGeo.lat) : null,
    toPointLon: Number.isFinite(Number(toGeo?.lon)) ? Number(toGeo.lon) : null,
    addressVerificationJson: verification ? JSON.stringify(verification) : null
  }
}

async function promoteOpenClawDraftToOrder({ draft, tenantId, actorContext, user, comment }) {
  const parsedPayload = parseJsonSafe(draft.payloadJson || '{}', {})
  const orderDraft = parsedPayload.orderDraft || {}
  const pricing = parsedPayload.pricing || {}
  const qualityChecks = Array.isArray(parsedPayload.qualityChecks) ? parsedPayload.qualityChecks : []

  const pickupAt = orderDraft.pickupAt ? new Date(orderDraft.pickupAt) : null
  const safePickupAt = pickupAt && !Number.isNaN(pickupAt.getTime()) ? pickupAt : null
  const externalKey = orderDraft.externalMessageId
    ? `openclaw:${orderDraft.externalMessageId}`
    : `openclaw:draft:${draft.id}`

  const existingOrder = await prisma.order.findFirst({
    where: { tenantId, externalKey }
  })

  const clientPrice = pricing.authoritativeClientPrice != null
    ? Number(pricing.authoritativeClientPrice)
    : Number(orderDraft.clientPrice || 0)
  const driverPrice = orderDraft.driverPrice != null ? Number(orderDraft.driverPrice) : null
  const commission = driverPrice != null ? clientPrice - driverPrice : null
  const infoReason = buildInfoReasonFromDraftChecks(qualityChecks, parsedPayload.missingFields || [])
  const needsInfo = Boolean(infoReason)

  const baseComment = [
    orderDraft.comment || null,
    orderDraft.flightNumber ? `Flight: ${orderDraft.flightNumber}` : null,
    pricing.conflict ? 'PRICE_CONFLICT: OpenClaw value differs from Riderra price list' : null,
    comment || null
  ].filter(Boolean).join('\n')

  const flightPersistence = buildOrderFlightPersistence(parsedPayload)
  const addressPersistence = buildOrderAddressPersistence(parsedPayload)

  if (existingOrder) {
    return {
      order: existingOrder,
      created: false,
      payload: {
        orderId: existingOrder.id,
        externalKey,
        pricingConflict: !!pricing.conflict
      }
    }
  }

  const createdOrder = await prisma.order.create({
    data: {
      tenantId,
      source: 'internal',
      externalKey,
      pickupAt: safePickupAt,
      fromPoint: orderDraft.fromPoint || 'TBD',
      toPoint: orderDraft.toPoint || 'TBD',
      clientPrice,
      driverPrice,
      commission,
      status: 'draft',
      vehicleType: normalizeVehicleType(orderDraft.vehicleType),
      passengers: Number.isFinite(Number(orderDraft.passengers)) ? Number(orderDraft.passengers) : null,
      luggage: Number.isFinite(Number(orderDraft.luggage)) ? Number(orderDraft.luggage) : null,
      needsInfo,
      infoReason,
      ...flightPersistence,
      ...addressPersistence,
      comment: baseComment || null,
      lang: orderDraft.lang || 'ru'
    }
  })

  await prisma.orderStatusHistory.create({
    data: {
      orderId: createdOrder.id,
      tenantId,
      fromStatus: 'new',
      toStatus: 'draft',
      reason: 'Created from OpenClaw AI draft after human approval',
      actorUserId: user?.id || null,
      actorEmail: user?.email || null,
      source: 'openclaw_approval'
    }
  })

  if (needsInfo) {
    const defaultAgentId = await pickDefaultAgentIdForTaskType(tenantId, 'clarification')
    await prisma.chatTask.upsert({
      where: { tenantId_orderId_taskType: { tenantId, orderId: createdOrder.id, taskType: 'clarification' } },
      create: {
        tenantId,
        orderId: createdOrder.id,
        taskType: 'clarification',
        state: 'missing_data_detected',
        priority: 50,
        agentConfigId: defaultAgentId
      },
      update: {
        state: 'missing_data_detected',
        priority: 50,
        ...(defaultAgentId ? { agentConfigId: defaultAgentId } : {})
      }
    })
  }

  return {
    order: createdOrder,
    created: true,
    payload: {
        orderId: createdOrder.id,
        externalKey,
        pricingConflict: !!pricing.conflict,
        missingFields: parsedPayload.missingFields || [],
        qualityChecks,
        sheetRowPreview: parsedPayload.sheetRowPreview || null,
        infoReason
      }
    }
  }

async function findLinkedOpenClawDraftForOrder(order, tenantId) {
  if (!order?.id) return null

  const externalKey = String(order.externalKey || '').trim()
  if (externalKey.startsWith('openclaw:draft:')) {
    const draftId = externalKey.slice('openclaw:draft:'.length).trim()
    if (!draftId) return null
    return prisma.opsEventDraft.findFirst({
      where: {
        id: draftId,
        tenantId,
        parsedType: 'openclaw_order_draft'
      }
    })
  }

  const drafts = await prisma.opsEventDraft.findMany({
    where: {
      tenantId,
      parsedType: 'openclaw_order_draft',
      status: 'approved'
    },
    orderBy: { createdAt: 'desc' },
    take: 1000
  })

  for (const draft of drafts) {
    const payload = parseJsonSafe(draft.payloadJson || '{}', {})
    const promotedOrderId = String(payload?.promotedOrder?.orderId || '').trim()
    if (promotedOrderId && promotedOrderId === String(order.id)) return draft

    const draftExternalKey = String(payload?.promotedOrder?.externalKey || '').trim()
    if (draftExternalKey && externalKey && draftExternalKey === externalKey) return draft
  }

  return null
}

function sourceLabel(source) {
  const raw = String(source || '').trim().toLowerCase()
  if (!raw) return 'не указан'
  if (raw === 'manual') return 'прайс-лист Riderra (ручной ввод)'
  if (raw === 'sheet' || raw === 'google_sheet') return 'Google Sheet'
  if (raw === 'dispatch' || raw === 'easytaxi') return 'диспетчерская'
  if (raw === 'smoke_test') return 'тестовые данные'
  return raw
}

function localDateShort(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toISOString().slice(0, 10)
}

async function createOpsTask({
  tenantId = null,
  userId,
  title,
  details = null,
  type = 'general',
  priority = 'normal',
  source = 'telegram_private',
  sourceRef = null,
  dueAt = null,
  payload = null
}) {
  return prisma.opsTask.create({
    data: {
      tenantId,
      assignedUserId: userId,
      title,
      details,
      type,
      priority,
      source,
      sourceRef,
      dueAt,
      payloadJson: payload ? JSON.stringify(payload) : null
    }
  })
}

async function getOpenOpsTasksForUser(userId, tenantId = null, limit = 10) {
  return prisma.opsTask.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      assignedUserId: userId,
      status: { in: ['open', 'in_progress'] }
    },
    orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    take: limit
  })
}

function formatOpsTasks(tasks) {
  if (!tasks.length) {
    return 'Открытых задач нет.'
  }
  return tasks.map((t, idx) => (
    `${idx + 1}. [${t.id}] ${t.title}\n` +
    `Статус: ${t.status}, приоритет: ${t.priority}, дедлайн: ${localDateShort(t.dueAt)}\n` +
    `Тип: ${t.type}, источник: ${sourceLabel(t.source)}`
  )).join('\n\n')
}

async function buildLosAngelesFinanceSummary(tenantId = null) {
  const rows = await prisma.order.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      OR: [
        { fromPoint: { contains: 'Los Angeles', mode: 'insensitive' } },
        { toPoint: { contains: 'Los Angeles', mode: 'insensitive' } }
      ],
      status: { in: ['assigned', 'accepted', 'completed'] }
    },
    select: {
      id: true,
      pickupAt: true,
      fromPoint: true,
      toPoint: true,
      clientPrice: true,
      driverPrice: true,
      commission: true,
      status: true
    },
    take: 200
  })

  const totalClient = rows.reduce((s, r) => s + Number(r.clientPrice || 0), 0)
  const totalDriver = rows.reduce((s, r) => s + Number(r.driverPrice || 0), 0)
  const totalCommission = rows.reduce((s, r) => s + Number(r.commission || 0), 0)

  return {
    count: rows.length,
    totalClient,
    totalDriver,
    totalCommission
  }
}

async function findAvailabilityConflicts(unavailability, tenantId = null) {
  if (!unavailability.driverId) return []
  return prisma.order.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      driverId: unavailability.driverId,
      pickupAt: {
        gte: unavailability.startAt,
        lte: unavailability.endAt
      },
      status: { notIn: ['cancelled', 'completed'] }
    },
    orderBy: { pickupAt: 'asc' },
    select: {
      id: true,
      externalKey: true,
      pickupAt: true,
      fromPoint: true,
      toPoint: true,
      status: true
    }
  })
}

app.post('/api/webhooks/openclaw/order-draft', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const signature = req.headers['x-openclaw-signature'] || req.headers['x-signature'] || ''
    if (!verifyOpenClawSignature(req.body || {}, signature)) {
      return res.status(401).json({ error: 'Invalid OpenClaw signature' })
    }

    const payload = req.body || {}
    const fingerprintPayload = {
      externalMessageId: payload.externalMessageId || payload.messageId || null,
      sourceChatId: payload.sourceChatId || payload.chatId || null,
      sourceType: payload.sourceType || null
    }
    ensureIdempotencyKey(req, 'openclaw.order_draft.ingest', fingerprintPayload)

    const wrapped = await withIdempotency(req, 'openclaw.order_draft.ingest', fingerprintPayload, async () => {
      const draft = await saveOpsDraftFromOpenClaw({
        tenantId: req.actorContext.tenantId,
        payload
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: null,
        actorRole: 'system',
        action: 'openclaw.order_draft.ingest',
        resource: 'ops_draft',
        resourceId: draft.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: fingerprintPayload
      })
      return {
        success: true,
        draftId: draft.id,
        status: draft.status
      }
    })

    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error ingesting OpenClaw order draft:', error)
    res.status(500).json({ error: 'Failed to ingest OpenClaw order draft' })
  }
})

app.get('/api/admin/ops/drafts', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.read', 'ops'), async (req, res) => {
  try {
    const { status = 'pending', parsedType = '', limit = '100' } = req.query
    const take = Math.min(parseInt(limit, 10) || 100, 300)
    const rows = await prisma.opsEventDraft.findMany({
      where: {
        tenantId: req.actorContext.tenantId,
        ...(status ? { status: String(status) } : {}),
        ...(parsedType ? { parsedType: String(parsedType) } : {})
      },
      orderBy: { createdAt: 'desc' },
      take
    })
    res.json({ rows })
  } catch (error) {
    console.error('Error fetching ops drafts:', error)
    res.status(500).json({ error: 'Failed to fetch ops drafts' })
  }
})

app.get('/api/admin/ops/drafts/:draftId', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.read', 'ops'), async (req, res) => {
  try {
    const { draftId } = req.params
    const row = await prisma.opsEventDraft.findFirst({
      where: {
        id: draftId,
        tenantId: req.actorContext.tenantId
      }
    })
    if (!row) return res.status(404).json({ error: 'Draft not found' })
    res.json({
      ...row,
      payload: parseJsonSafe(row.payloadJson || '{}', {})
    })
  } catch (error) {
    console.error('Error fetching ops draft detail:', error)
    res.status(500).json({ error: 'Failed to fetch ops draft detail' })
  }
})

app.post('/api/admin/ops/drafts/:draftId/flight-check', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.read', 'ops'), async (req, res) => {
  try {
    const row = await prisma.opsEventDraft.findFirst({
      where: {
        id: req.params.draftId,
        tenantId: req.actorContext.tenantId
      }
    })
    if (!row) return res.status(404).json({ error: 'Draft not found' })

    const payload = parseJsonSafe(row.payloadJson || '{}', {})
    const orderDraft = payload.orderDraft || {}
    const flightNumber = normalizeFlightNumber(orderDraft.flightNumber || req.body?.flightNumber)
    const pickupAt = orderDraft.pickupAt || req.body?.pickupAt || null
    if (!flightNumber) return res.status(400).json({ error: 'flightNumber is missing in draft' })

    const flightCheck = await fetchAviationStackFlightCheck({ flightNumber, pickupAt })
    const nextPayload = mergeFlightCheckIntoPayload(payload, flightCheck)

    const updated = await prisma.opsEventDraft.update({
      where: { id: row.id },
      data: { payloadJson: JSON.stringify(nextPayload) }
    })

    await writeAuditLog({
      tenantId: req.actorContext.tenantId,
      actorId: req.actorContext.actorId,
      actorRole: req.actorContext.actorRole,
      action: 'ops.draft.flight_check',
      resource: 'ops_draft',
      resourceId: row.id,
      traceId: req.actorContext.traceId,
      decision: 'policy_allowed',
      result: 'ok',
      context: {
        flightNumber,
        pickupAt,
        provider: 'aviationstack',
        found: flightCheck.found
      }
    })

    res.json({
      success: true,
      draft: {
        ...updated,
        payload: nextPayload
      },
      flightCheck
    })
  } catch (error) {
    console.error('Error checking flight for draft:', error)
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to check flight' })
  }
})

app.post('/api/admin/ops/drafts/:draftId/reject', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.drafts.resolve', 'ops_draft', async (req) => {
  const row = await prisma.opsEventDraft.findFirst({
    where: { id: req.params.draftId, tenantId: req.actorContext.tenantId },
    select: { status: true }
  })
  if (!row) return {}
  return {
    businessHours: { enabled: true, startHour: 6, endHour: 23 },
    currentStatus: row?.status || null,
    allowedCurrentStatuses: ['pending']
  }
}), async (req, res) => {
  try {
    const { draftId } = req.params
    const { comment } = req.body || {}
    const existing = await prisma.opsEventDraft.findFirst({
      where: { id: draftId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'Draft not found' })
    const payload = { draftId, comment: comment || null }
    ensureIdempotencyKey(req, 'ops.draft.reject', payload)
    const wrapped = await withIdempotency(req, 'ops.draft.reject', payload, async () => {
      const draft = await prisma.opsEventDraft.update({
        where: { id: existing.id },
        data: {
          status: 'rejected',
          reviewerUserId: req.user.id,
          reviewerEmail: req.user.email,
          reviewedAt: new Date(),
          reviewComment: comment || null
        }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'ops.draft.reject',
        resource: 'ops_draft',
        resourceId: draft.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return draft
    })
    res.json({ success: true, draft: wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error rejecting ops draft:', error)
    res.status(500).json({ error: 'Failed to reject draft' })
  }
})

app.post('/api/admin/ops/drafts/:draftId/approve', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.drafts.resolve', 'ops_draft', async (req) => {
  const row = await prisma.opsEventDraft.findFirst({
    where: { id: req.params.draftId, tenantId: req.actorContext.tenantId },
    select: { status: true }
  })
  if (!row) return {}
  return {
    businessHours: { enabled: true, startHour: 6, endHour: 23 },
    currentStatus: row?.status || null,
    allowedCurrentStatuses: ['pending']
  }
}), async (req, res) => {
  try {
    const { draftId } = req.params
    const { comment } = req.body || {}
    const draft = await prisma.opsEventDraft.findFirst({
      where: { id: draftId, tenantId: req.actorContext.tenantId }
    })
    if (!draft) return res.status(404).json({ error: 'Draft not found' })
    if (draft.status !== 'pending') return res.status(400).json({ error: 'Draft is not pending' })
    const payload = { draftId, comment: comment || null }
    ensureIdempotencyKey(req, 'ops.draft.approve', payload)
    const wrapped = await withIdempotency(req, 'ops.draft.approve', payload, async () => {
      const parsedPayload = JSON.parse(draft.payloadJson || '{}')
      const event = await prisma.opsEvent.create({
        data: {
          tenantId: req.actorContext.tenantId,
          type: draft.parsedType,
          payloadJson: draft.payloadJson,
          sourceDraftId: draft.id
        }
      })

      let unavailability = null
      let conflicts = []
      let promotedOrder = null
      let draftPayloadForSave = parsedPayload
      if (draft.parsedType === 'driver_unavailable') {
        const name = String(parsedPayload.driverNameRaw || '').trim()
        const driver = name
          ? await prisma.driver.findFirst({
              where: {
                tenantId: req.actorContext.tenantId,
                name: { contains: name, mode: 'insensitive' }
              },
              orderBy: { createdAt: 'asc' }
            })
          : null

        unavailability = await prisma.driverUnavailability.create({
          data: {
            tenantId: req.actorContext.tenantId,
            driverId: driver?.id || null,
            driverNameRaw: name || 'unknown',
            startAt: new Date(parsedPayload.startAt),
            endAt: new Date(parsedPayload.endAt),
            reason: parsedPayload.reason || 'unavailable',
            sourceDraftId: draft.id
          }
        })
        conflicts = await findAvailabilityConflicts(unavailability, req.actorContext.tenantId)
      } else if (draft.parsedType === 'openclaw_order_draft') {
        const promoted = await promoteOpenClawDraftToOrder({
          draft,
          tenantId: req.actorContext.tenantId,
          actorContext: req.actorContext,
          user: req.user,
          comment
        })
        promotedOrder = promoted.order
        const eventPayload = parseJsonSafe(event.payloadJson || '{}', {})
        draftPayloadForSave = {
          ...parsedPayload,
          promotedOrder: promoted.payload
        }
        await prisma.opsEvent.update({
          where: { id: event.id },
          data: {
            payloadJson: JSON.stringify({
              ...eventPayload,
              promotedOrder: promoted.payload
            })
          }
        })
      }

      const updatedDraft = await prisma.opsEventDraft.update({
        where: { id: draft.id },
        data: {
          status: 'approved',
          reviewerUserId: req.user.id,
          reviewerEmail: req.user.email,
          reviewedAt: new Date(),
          reviewComment: comment || null,
          promotedEventId: event.id,
          promotedUnavailabilityId: unavailability?.id || null,
          payloadJson: JSON.stringify(draftPayloadForSave)
        }
      })

      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'ops.draft.approve',
        resource: 'ops_draft',
        resourceId: draft.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: {
          draftId,
          comment: comment || null,
          promotedEventId: event.id,
          promotedUnavailabilityId: unavailability?.id || null
        }
      })

      return {
        draft: updatedDraft,
        event,
        order: promotedOrder,
        unavailability,
        conflicts
      }
    })

    res.json({
      success: true,
      ...wrapped.data,
      idempotent: wrapped.replayed
    })
  } catch (error) {
    console.error('Error approving ops draft:', error)
    res.status(500).json({ error: 'Failed to approve draft', details: error.message })
  }
})

app.get('/api/admin/ops/unavailability', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.read', 'ops'), async (req, res) => {
  try {
    const rows = await prisma.driverUnavailability.findMany({
      where: { tenantId: req.actorContext.tenantId, status: 'active' },
      include: { driver: { select: { id: true, name: true, email: true } } },
      orderBy: { startAt: 'asc' }
    })
    res.json({ rows })
  } catch (error) {
    console.error('Error fetching unavailability:', error)
    res.status(500).json({ error: 'Failed to fetch unavailability' })
  }
})

app.get('/api/admin/ops/unavailability/:id/conflicts', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.read', 'ops'), async (req, res) => {
  try {
    const row = await prisma.driverUnavailability.findFirst({
      where: { id: req.params.id, tenantId: req.actorContext.tenantId }
    })
    if (!row) return res.status(404).json({ error: 'Unavailability not found' })
    const conflicts = await findAvailabilityConflicts(row, req.actorContext.tenantId)
    res.json({ conflicts })
  } catch (error) {
    console.error('Error fetching availability conflicts:', error)
    res.status(500).json({ error: 'Failed to fetch conflicts' })
  }
})

// ==================== TELEGRAM CRM LOOKUP ====================
async function telegramSendMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  })
  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Telegram sendMessage failed: ${details}`)
  }
}

function formatCompanyResult(rows) {
  if (!rows.length) return 'Ничего не найдено по компании.'
  return rows
    .map((r, idx) => {
      const segments = (r.segments || []).map((s) => s.segment).slice(0, 4).join(', ')
      return `${idx + 1}. ${r.name}\nID: ${r.id}\nEmail: ${r.email || '-'}\nТелефон: ${r.phone || '-'}\nСегменты: ${segments || '-'}`
    })
    .join('\n\n')
}

function formatContactResult(rows) {
  if (!rows.length) return 'Ничего не найдено по клиенту.'
  return rows
    .map((r, idx) => {
      const segments = (r.segments || []).map((s) => s.segment).slice(0, 4).join(', ')
      return `${idx + 1}. ${r.fullName}\nID: ${r.id}\nEmail: ${r.email || '-'}\nТелефон: ${r.phone || '-'}\nСегменты: ${segments || '-'}`
    })
    .join('\n\n')
}

function formatPricingResult(rows, askChildSeat = false) {
  if (!rows.length) {
    return buildCopilotMessage([
      'Вижу такую информацию: данных по прайсу в этом городе нет.',
      'Источник: прайс-лист Riderra.',
      'Статус: подтверждённых записей не найдено.'
    ])
  }
  return rows
    .map((r, i) => {
      const priceText = [
        r.fixedPrice !== null && r.fixedPrice !== undefined ? `фикс: ${r.fixedPrice} ${r.currency}` : null,
        r.pricePerKm !== null && r.pricePerKm !== undefined ? `км: ${r.pricePerKm} ${r.currency}` : null,
        r.hourlyRate !== null && r.hourlyRate !== undefined ? `час: ${r.hourlyRate} ${r.currency}` : null,
        r.childSeatPrice !== null && r.childSeatPrice !== undefined ? `кресло: ${r.childSeatPrice} ${r.currency}` : null
      ].filter(Boolean).join(', ')
      if (askChildSeat && r.childSeatPrice === null) {
        return `${i + 1}. ${r.city}: данных по креслу нет`
      }
      return `${i + 1}. ${r.city}${r.routeFrom && r.routeTo ? ` (${r.routeFrom} -> ${r.routeTo})` : ''}: ${priceText || 'цена не заполнена'}`
    })
    .join('\n')
}

app.post('/api/admin/telegram-links', authenticateToken, resolveActorContext, requireActorContext, requireCan('telegram.links.manage', 'telegram_link'), async (req, res) => {
  try {
    const { email, telegramUserId, telegramChatId } = req.body
    if (!email || !telegramUserId) {
      return res.status(400).json({ error: 'email and telegramUserId are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const payload = { email, telegramUserId: String(telegramUserId), telegramChatId: telegramChatId ? String(telegramChatId) : null }
    ensureIdempotencyKey(req, 'telegram.link.upsert', payload)
    const wrapped = await withIdempotency(req, 'telegram.link.upsert', payload, async () => {
      const link = await prisma.telegramLink.upsert({
        where: { telegramUserId: String(telegramUserId) },
        update: {
          userId: user.id,
          tenantId: req.actorContext.tenantId,
          telegramChatId: telegramChatId ? String(telegramChatId) : null
        },
        create: {
          tenantId: req.actorContext.tenantId,
          userId: user.id,
          telegramUserId: String(telegramUserId),
          telegramChatId: telegramChatId ? String(telegramChatId) : null
        }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'telegram.link.upsert',
        resource: 'telegram_link',
        resourceId: link.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return link
    })

    res.json({ success: true, link: wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error creating telegram link:', error)
    res.status(500).json({ error: 'Failed to create telegram link' })
  }
})

app.get('/api/admin/telegram-links', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const rows = await prisma.telegramLink.findMany({
      where: { tenantId: req.actorContext.tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    })
    res.json({ rows })
  } catch (error) {
    console.error('Error fetching telegram links:', error)
    res.status(500).json({ error: 'Failed to fetch telegram links' })
  }
})

app.get('/api/admin/staff-users', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { not: 'driver' },
        memberships: {
          some: {
            tenantId: req.actorContext.tenantId,
            isActive: true
          }
        }
      },
      include: {
        roleLinks: {
          include: {
            role: {
              select: { code: true, name: true }
            }
          }
        },
        telegramLinks: {
          where: { tenantId: req.actorContext.tenantId },
          select: {
            telegramUserId: true,
            telegramChatId: true
          }
        }
      },
      orderBy: { email: 'asc' },
      take: 500
    })

    const rows = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      roles: u.roleLinks.map((x) => x.role.code),
      telegramLinks: u.telegramLinks,
      abacCountries: parseScopeList(u.abacCountries),
      abacCities: parseScopeList(u.abacCities),
      abacTeams: sanitizeTeamScopes(u.abacTeams)
    }))

    res.json({ rows })
  } catch (error) {
    console.error('Error fetching staff users:', error)
    res.status(500).json({ error: 'Failed to fetch staff users' })
  }
})

app.put('/api/admin/staff-users/:userId/abac', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const userId = String(req.params.userId || '').trim()
    if (!userId) return res.status(400).json({ error: 'Invalid user id' })

    const membership = await prisma.tenantMembership.findFirst({
      where: {
        userId,
        tenantId: req.actorContext.tenantId,
        isActive: true
      },
      select: { id: true }
    })
    if (!membership) return res.status(404).json({ error: 'User is not active in tenant' })

    const countries = parseScopeList(req.body?.countries)
    const cities = parseScopeList(req.body?.cities)
    const teams = sanitizeTeamScopes(req.body?.teams)

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        abacCountries: countries.join(','),
        abacCities: cities.join(','),
        abacTeams: teams.join(',')
      },
      select: {
        id: true,
        email: true,
        abacCountries: true,
        abacCities: true,
        abacTeams: true
      }
    })

    await writeAuditLog({
      tenantId: req.actorContext.tenantId,
      actorId: req.actorContext.actorId,
      actorRole: req.actorContext.actorRole,
      action: 'settings.staff_abac.update',
      resource: 'user',
      resourceId: updated.id,
      traceId: req.actorContext.traceId,
      decision: 'policy_allowed',
      result: 'ok',
      context: {
        countries,
        cities,
        teams
      }
    })

    res.json({
      user: {
        id: updated.id,
        email: updated.email,
        abacCountries: parseScopeList(updated.abacCountries),
        abacCities: parseScopeList(updated.abacCities),
        abacTeams: sanitizeTeamScopes(updated.abacTeams)
      }
    })
  } catch (error) {
    console.error('Error updating staff ABAC:', error)
    res.status(500).json({ error: 'Failed to update staff ABAC' })
  }
})

app.get('/api/admin/vpn/profile', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const row = await prisma.vpnProfile.findUnique({
      where: { tenantId }
    })
    const profile = row || buildDefaultVpnProfile(tenantId)
    res.json({ profile })
  } catch (error) {
    console.error('Error loading vpn profile:', error)
    res.status(500).json({ error: 'Failed to load VPN profile' })
  }
})

app.put('/api/admin/vpn/profile', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const payload = sanitizeVpnProfileInput(req.body || {}, tenantId)
    if (!payload.serverHost || !payload.publicKey || !payload.shortId || !payload.serverName) {
      return res.status(400).json({ error: 'serverHost, publicKey, shortId and serverName are required' })
    }

    ensureIdempotencyKey(req, 'vpn.profile.upsert', payload)
    const wrapped = await withIdempotency(req, 'vpn.profile.upsert', payload, async () => {
      const profile = await prisma.vpnProfile.upsert({
        where: { tenantId },
        update: payload,
        create: payload
      })
      await writeAuditLog({
        tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'vpn.profile.upsert',
        resource: 'vpn_profile',
        resourceId: profile.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: {
          serverHost: profile.serverHost,
          serverPort: profile.serverPort,
          protocol: profile.protocol
        }
      })
      return profile
    })

    res.json({ success: true, profile: wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error saving vpn profile:', error)
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to save VPN profile' })
  }
})

app.get('/api/admin/vpn/access', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const q = String(req.query.q || '').trim()
    const status = normalizeVpnStatus(req.query.status || '')
    const where = {
      tenantId,
      ...(String(req.query.status || '').trim() ? { status } : {}),
      ...(q
        ? {
            OR: [
              { employeeName: { contains: q, mode: 'insensitive' } },
              { employeeEmail: { contains: q, mode: 'insensitive' } },
              { employeeLogin: { contains: q, mode: 'insensitive' } },
              { deviceName: { contains: q, mode: 'insensitive' } },
              { uuid: { contains: q, mode: 'insensitive' } }
            ]
          }
        : {})
    }

    const [profile, rows] = await Promise.all([
      prisma.vpnProfile.findUnique({ where: { tenantId } }),
      prisma.vpnAccessGrant.findMany({
        where,
        include: { profile: true },
        orderBy: [{ updatedAt: 'desc' }],
        take: 500
      })
    ])

    const effectiveProfile = profile || buildDefaultVpnProfile(tenantId)
    res.json({
      profile: effectiveProfile,
      rows: rows.map((row) => ({
        ...row,
        connection: buildVpnConnectionBundle(row.profile || effectiveProfile, row)
      }))
    })
  } catch (error) {
    console.error('Error loading vpn access list:', error)
    res.status(500).json({ error: 'Failed to load VPN access list' })
  }
})

app.post('/api/admin/vpn/access', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const profile = await prisma.vpnProfile.findUnique({ where: { tenantId } })
    const payload = sanitizeVpnGrantInput(req.body || {}, profile)
    if (!payload.employeeName || !payload.deviceName || !payload.uuid) {
      return res.status(400).json({ error: 'employeeName, deviceName and uuid are required' })
    }

    ensureIdempotencyKey(req, 'vpn.access.create', payload)
    const wrapped = await withIdempotency(req, 'vpn.access.create', payload, async () => {
      const row = await prisma.vpnAccessGrant.create({
        data: {
          tenantId,
          ...payload
        },
        include: { profile: true }
      })
      await writeAuditLog({
        tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'vpn.access.create',
        resource: 'vpn_access',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: {
          employeeEmail: row.employeeEmail,
          deviceName: row.deviceName,
          status: row.status
        }
      })
      return row
    })

    res.json({
      success: true,
      row: {
        ...wrapped.data,
        connection: buildVpnConnectionBundle(wrapped.data.profile || profile || buildDefaultVpnProfile(tenantId), wrapped.data)
      },
      idempotent: wrapped.replayed
    })
  } catch (error) {
    console.error('Error creating vpn access:', error)
    res.status(error.code === 'P2002' ? 409 : (error.statusCode || 500)).json({ error: error.message || 'Failed to create VPN access' })
  }
})

app.put('/api/admin/vpn/access/:grantId', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const existing = await prisma.vpnAccessGrant.findFirst({
      where: { id: req.params.grantId, tenantId },
      include: { profile: true }
    })
    if (!existing) return res.status(404).json({ error: 'VPN access not found' })

    const payload = sanitizeVpnGrantInput({ ...existing, ...(req.body || {}), uuid: req.body?.uuid || existing.uuid }, existing.profile)
    ensureIdempotencyKey(req, 'vpn.access.update', { grantId: existing.id, ...payload })
    const wrapped = await withIdempotency(req, 'vpn.access.update', { grantId: existing.id, ...payload }, async () => {
      const row = await prisma.vpnAccessGrant.update({
        where: { id: existing.id },
        data: {
          employeeName: payload.employeeName,
          employeeEmail: payload.employeeEmail,
          employeeLogin: payload.employeeLogin,
          deviceName: payload.deviceName,
          uuid: payload.uuid,
          status: payload.status,
          comment: payload.comment,
          connectionLabel: payload.connectionLabel,
          syncState: payload.syncState,
          disabledAt: payload.status === 'disabled' ? (existing.disabledAt || new Date()) : null,
          appliedAt: payload.syncState === 'applied' ? (existing.appliedAt || new Date()) : null,
          lastSyncError: payload.lastSyncError,
          profileId: payload.profileId
        },
        include: { profile: true }
      })
      await writeAuditLog({
        tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'vpn.access.update',
        resource: 'vpn_access',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: { status: row.status, deviceName: row.deviceName }
      })
      return row
    })

    res.json({
      success: true,
      row: {
        ...wrapped.data,
        connection: buildVpnConnectionBundle(wrapped.data.profile || buildDefaultVpnProfile(tenantId), wrapped.data)
      },
      idempotent: wrapped.replayed
    })
  } catch (error) {
    console.error('Error updating vpn access:', error)
    res.status(error.code === 'P2002' ? 409 : (error.statusCode || 500)).json({ error: error.message || 'Failed to update VPN access' })
  }
})

app.post('/api/admin/vpn/access/:grantId/rotate', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const row = await prisma.vpnAccessGrant.findFirst({
      where: { id: req.params.grantId, tenantId },
      include: { profile: true }
    })
    if (!row) return res.status(404).json({ error: 'VPN access not found' })

    const payload = { grantId: row.id, nextUuid: crypto.randomUUID() }
    ensureIdempotencyKey(req, 'vpn.access.rotate', payload)
    const wrapped = await withIdempotency(req, 'vpn.access.rotate', payload, async () => {
      const updated = await prisma.vpnAccessGrant.update({
        where: { id: row.id },
        data: {
          uuid: payload.nextUuid,
          rotatedAt: new Date(),
          syncState: 'pending',
          appliedAt: null,
          lastSyncError: null,
          status: row.status === 'disabled' ? 'pending' : row.status,
          disabledAt: null
        },
        include: { profile: true }
      })
      await writeAuditLog({
        tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'vpn.access.rotate',
        resource: 'vpn_access',
        resourceId: updated.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: { previousUuid: row.uuid, nextUuid: updated.uuid }
      })
      return updated
    })

    res.json({
      success: true,
      row: {
        ...wrapped.data,
        connection: buildVpnConnectionBundle(wrapped.data.profile || buildDefaultVpnProfile(tenantId), wrapped.data)
      },
      idempotent: wrapped.replayed
    })
  } catch (error) {
    console.error('Error rotating vpn access:', error)
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to rotate VPN access' })
  }
})

app.post('/api/admin/vpn/access/:grantId/disable', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const row = await prisma.vpnAccessGrant.findFirst({
      where: { id: req.params.grantId, tenantId },
      include: { profile: true }
    })
    if (!row) return res.status(404).json({ error: 'VPN access not found' })
    const payload = { grantId: row.id }
    ensureIdempotencyKey(req, 'vpn.access.disable', payload)
    const wrapped = await withIdempotency(req, 'vpn.access.disable', payload, async () => {
      const updated = await prisma.vpnAccessGrant.update({
        where: { id: row.id },
        data: {
          status: 'disabled',
          disabledAt: new Date(),
          syncState: 'pending',
          appliedAt: null
        },
        include: { profile: true }
      })
      await writeAuditLog({
        tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'vpn.access.disable',
        resource: 'vpn_access',
        resourceId: updated.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: { uuid: updated.uuid }
      })
      return updated
    })
    res.json({
      success: true,
      row: {
        ...wrapped.data,
        connection: buildVpnConnectionBundle(wrapped.data.profile || buildDefaultVpnProfile(tenantId), wrapped.data)
      },
      idempotent: wrapped.replayed
    })
  } catch (error) {
    console.error('Error disabling vpn access:', error)
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to disable VPN access' })
  }
})

app.post('/api/admin/vpn/access/:grantId/activate', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const row = await prisma.vpnAccessGrant.findFirst({
      where: { id: req.params.grantId, tenantId },
      include: { profile: true }
    })
    if (!row) return res.status(404).json({ error: 'VPN access not found' })
    const payload = { grantId: row.id }
    ensureIdempotencyKey(req, 'vpn.access.activate', payload)
    const wrapped = await withIdempotency(req, 'vpn.access.activate', payload, async () => {
      const updated = await prisma.vpnAccessGrant.update({
        where: { id: row.id },
        data: {
          status: 'active',
          disabledAt: null,
          syncState: 'pending',
          appliedAt: null,
          lastSyncError: null
        },
        include: { profile: true }
      })
      await writeAuditLog({
        tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'vpn.access.activate',
        resource: 'vpn_access',
        resourceId: updated.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: { uuid: updated.uuid }
      })
      return updated
    })
    res.json({
      success: true,
      row: {
        ...wrapped.data,
        connection: buildVpnConnectionBundle(wrapped.data.profile || buildDefaultVpnProfile(tenantId), wrapped.data)
      },
      idempotent: wrapped.replayed
    })
  } catch (error) {
    console.error('Error activating vpn access:', error)
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to activate VPN access' })
  }
})

app.get('/api/admin/vpn/access/:grantId/instruction', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const tenantId = req.actorContext.tenantId
    const row = await prisma.vpnAccessGrant.findFirst({
      where: { id: req.params.grantId, tenantId },
      include: { profile: true }
    })
    if (!row) return res.status(404).json({ error: 'VPN access not found' })
    const profile = row.profile || await prisma.vpnProfile.findUnique({ where: { tenantId } }) || buildDefaultVpnProfile(tenantId)
    res.json({
      row,
      profile,
      instruction: buildVpnConnectionBundle(profile, row)
    })
  } catch (error) {
    console.error('Error building vpn instruction:', error)
    res.status(500).json({ error: 'Failed to build VPN instruction' })
  }
})

app.post('/api/telegram/webhook', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (webhookSecret) {
      const receivedSecret = req.headers['x-telegram-bot-api-secret-token']
      if (receivedSecret !== webhookSecret) {
        return res.status(403).json({ error: 'Invalid telegram webhook secret' })
      }
    }

    const update = req.body || {}
    const message = update.message || update.edited_message
    if (!message || !message.text) return res.json({ ok: true })

    const telegramUserId = String(message.from?.id || '')
    const telegramChatId = String(message.chat?.id || '')
    if (!telegramUserId || !telegramChatId) return res.json({ ok: true })
    const tenantId = req.actorContext.tenantId
    const text = String(message.text || '').trim()
    const chatType = String(message.chat?.type || '')
    const isGroupChat = chatType === 'group' || chatType === 'supergroup'

    // Group chat mode: bot listens and can answer queries from shared knowledge.
    if (isGroupChat) {
      const allowedGroupId = process.env.TELEGRAM_GROUP_CHAT_ID
      if (text === '/chatid') {
        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Текущий chat_id: ${telegramChatId}`,
            'Источник: Telegram metadata.',
            'Статус: сервисная информация.'
          ])
        )
        return res.json({ ok: true })
      }
      if (allowedGroupId && allowedGroupId !== telegramChatId) {
        return res.json({ ok: true })
      }

      if (isImportantMessage(text)) {
        const authorName = [
          String(message.from?.first_name || '').trim(),
          String(message.from?.last_name || '').trim()
        ].filter(Boolean).join(' ') || String(message.from?.username || '').trim() || telegramUserId
        const messageDate = message.date ? new Date(Number(message.date) * 1000).toISOString() : null
        const draft = await saveOpsDraftFromTelegram({
          tenantId,
          chatId: telegramChatId,
          telegramUserId,
          text,
          authorName,
          messageDate
        })
        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Сохранил важное сообщение как черновик #${draft.id}.`,
            `Источник: комментарий сотрудника "${authorName}", ${formatUtcDateTime(messageDate)}.`,
            'Статус: не аппрувнуто в постоянную базу. После проверки можно утвердить в Riderra.'
          ])
        )
      }

      const pricingQuery = text.match(/(?:цена|стоимость|прайс)\s+в\s+([A-Za-zА-Яа-яЁё\-\s]+)/i)
      const childSeatQuery = text.match(/(?:кресл|детск).*?\s+в\s+([A-Za-zА-Яа-яЁё\-\s]+)/i)

      if (pricingQuery || childSeatQuery || text.startsWith('/price ') || text.startsWith('/childseat ')) {
        const cityCandidate = pricingQuery?.[1] ||
          childSeatQuery?.[1] ||
          text.replace('/price', '').replace('/childseat', '').trim()

        const city = String(cityCandidate || '').trim()
        if (!city) {
          await telegramSendMessage(telegramChatId, 'Укажи город: /price <город> или /childseat <город>')
          return res.json({ ok: true })
        }

        const rows = await prisma.cityPricing.findMany({
          where: {
            tenantId,
            isActive: true,
            city: { contains: city, mode: 'insensitive' }
          },
          take: 5,
          orderBy: { updatedAt: 'desc' }
        })
        const answer = formatPricingResult(
          rows,
          Boolean(childSeatQuery || text.startsWith('/childseat '))
        )
        if (answer.startsWith('Я помощник Riderra')) {
          await telegramSendMessage(telegramChatId, answer)
          return res.json({ ok: true })
        }
        const sourceLines = rows.map((r, idx) =>
          `${idx + 1}) ${r.city}${r.routeFrom && r.routeTo ? ` (${r.routeFrom} -> ${r.routeTo})` : ''} | источник: ${sourceLabel(r.source)} | обновлено: ${formatUtcDateTime(r.updatedAt)}`
        ).join('\n')
        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Вижу такую информацию:\n${answer}`,
            `Источник:\n${sourceLines || 'прайс-лист Riderra'}`,
            'Статус: данные из подтверждённого прайс-листа.'
          ])
        )
        return res.json({ ok: true })
      }

      if (text.startsWith('/help')) {
        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            'Команды: /price <город>, /childseat <город>, /customer <запрос>, /company <запрос>.',
            'Важные сообщения: #важно ... или "водитель ... в отпуске/недоступен с ... по ...".',
            'В ответах показываю источник и статус (подтверждено/не аппрувнуто).'
          ])
        )
      }

      return res.json({ ok: true })
    }

    const link = await prisma.telegramLink.findUnique({
      where: { telegramUserId },
      include: { user: true }
    })
    if (!link) {
      await telegramSendMessage(telegramChatId, 'Этот Telegram аккаунт не привязан к Riderra. Обратитесь к администратору.')
      return res.json({ ok: true })
    }
    const linkTenantId = link.tenantId || tenantId

    const acl = await getUserRolesAndPermissions(link.userId)
    const actor = {
      role: link.user.role,
      actorRole: link.user.role,
      permissions: acl.permissions || [],
      tenantId: linkTenantId
    }
    const canReadCrm = can(actor, 'permission.check', 'permission', {
      permissionCode: 'crm.read',
      tenantId: linkTenantId
    })
    const canUseOpsCopilot = can(actor, 'permission.check', 'permission', {
      anyOf: [
        'ops.read',
        'ops.manage',
        'orders.create_draft',
        'orders.validate',
        'orders.assign',
        'orders.reassign',
        'orders.confirmation.manage',
        'incidents.manage',
        'claims.compose'
      ],
      tenantId: linkTenantId
    })
    const canUseFinanceReports = can(actor, 'permission.check', 'permission', {
      anyOf: ['finance.report.export', 'reconciliation.run'],
      tenantId: linkTenantId
    })

    if (canUseOpsCopilot) {
      const lowerText = text.toLowerCase()

      if (text.startsWith('/tasks')) {
        const tasks = await getOpenOpsTasksForUser(link.userId, linkTenantId)
        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Вижу такие задачи:\n${formatOpsTasks(tasks)}`,
            'Источник: оперативные задачи Riderra.',
            'Статус: актуально на текущий момент.'
          ])
        )
        return res.json({ ok: true })
      }

      if (text.startsWith('/task-done ')) {
        const taskId = text.replace('/task-done', '').trim()
        if (!taskId) {
          await telegramSendMessage(telegramChatId, buildCopilotMessage(['Формат: /task-done <task_id>']))
          return res.json({ ok: true })
        }
        const task = await prisma.opsTask.findFirst({
          where: { id: taskId, assignedUserId: link.userId, tenantId: linkTenantId }
        })
        if (!task) {
          await telegramSendMessage(telegramChatId, buildCopilotMessage([`Задача ${taskId} не найдена у вас.`]))
          return res.json({ ok: true })
        }
        await prisma.opsTask.update({
          where: { id: taskId },
          data: { status: 'done' }
        })
        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Отметил задачу ${taskId} как выполненную.`,
            'Источник: ваш запрос в личном чате.',
            'Статус: сохранено в базе задач.'
          ])
        )
        return res.json({ ok: true })
      }

      if (text.startsWith('/report la') || lowerText.includes('отч') && lowerText.includes('лос') && lowerText.includes('анджел')) {
        if (!canUseFinanceReports) {
          await telegramSendMessage(
            telegramChatId,
            buildCopilotMessage(['Недостаточно прав для финансового отчёта. Нужна роль financial/owner.'])
          )
          return res.json({ ok: true })
        }
        const report = await buildLosAngelesFinanceSummary(linkTenantId)
        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Вижу такую информацию по поездкам Los Angeles:`,
            `Количество поездок: ${report.count}`,
            `Сумма клиент: ${report.totalClient.toFixed(2)}`,
            `Сумма водитель: ${report.totalDriver.toFixed(2)}`,
            `Комиссия: ${report.totalCommission.toFixed(2)}`,
            'Источник: таблица заказов Riderra.',
            'Статус: оперативная сверка, проверьте финальные выплаты в бухгалтерии.'
          ])
        )
        return res.json({ ok: true })
      }

      if (lowerText.includes('нераспредел') && lowerText.includes('заказ') && lowerText.includes('хельсинки')) {
        const tomorrowStart = new Date()
        tomorrowStart.setDate(tomorrowStart.getDate() + 1)
        tomorrowStart.setHours(0, 0, 0, 0)
        const tomorrowEnd = new Date(tomorrowStart)
        tomorrowEnd.setHours(23, 59, 59, 999)

        const order = await prisma.order.findFirst({
          where: {
            tenantId: linkTenantId,
            driverId: null,
            pickupAt: { gte: tomorrowStart, lte: tomorrowEnd },
            OR: [
              { fromPoint: { contains: 'Helsinki', mode: 'insensitive' } },
              { toPoint: { contains: 'Helsinki', mode: 'insensitive' } }
            ]
          },
          orderBy: { pickupAt: 'asc' }
        })

        const task = await createOpsTask({
          tenantId: linkTenantId,
          userId: link.userId,
          type: 'assign_driver',
          priority: 'high',
          title: 'Назначить водителя на нераспределённый заказ в Helsinki',
          details: order ? `Заказ ${order.id} на ${formatUtcDateTime(order.pickupAt)}` : 'Проверить очередь нераспределённых заказов на завтра',
          dueAt: tomorrowStart,
          source: 'rule',
          payload: order ? { orderId: order.id } : null
        })

        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Создал задачу: ${task.title} [${task.id}]`,
            `Источник: правило Riderra (нераспределённые заказы на завтра, Helsinki).`,
            'Статус: задача открыта.'
          ])
        )
        return res.json({ ok: true })
      }

      if ((lowerText.includes('новый заказ') && lowerText.includes('показать детали')) || text.startsWith('/new-order-check')) {
        const order = await prisma.order.findFirst({
          where: { tenantId: linkTenantId, status: { in: ['pending', 'assigned', 'accepted'] } },
          orderBy: { createdAt: 'desc' }
        })

        if (!order) {
          await telegramSendMessage(
            telegramChatId,
            buildCopilotMessage([
              'Новых заказов для показа не нашёл.',
              'Источник: таблица заказов Riderra.',
              'Статус: пусто.'
            ])
          )
          return res.json({ ok: true })
        }

        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Показать детали заказа?`,
            `ID: ${order.id}, подача: ${formatUtcDateTime(order.pickupAt)}`,
            `Маршрут: ${order.fromPoint} -> ${order.toPoint}`,
            `Цена клиент: ${order.clientPrice}, статус: ${order.status}`,
            `Источник: ${sourceLabel(order.source)}.`,
            'Статус: данные заказа подтверждены в Riderra.'
          ])
        )
        return res.json({ ok: true })
      }

      if ((lowerText.includes('отправили заказ') && lowerText.includes('не назначили') && lowerText.includes('easytaxi')) || text.startsWith('/easytaxi-reminder')) {
        const task = await createOpsTask({
          tenantId: linkTenantId,
          userId: link.userId,
          type: 'easytaxi_sync',
          priority: 'high',
          title: 'Проверить назначение заказа в EasyTaxi',
          details: 'Вы отправили заказ, но назначение в EasyTaxi не подтверждено.',
          source: 'rule'
        })

        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Создал напоминание: ${task.title} [${task.id}]`,
            'Источник: правило Riderra (контроль синхронизации с EasyTaxi).',
            'Статус: задача открыта.'
          ])
        )
        return res.json({ ok: true })
      }
    }

    if (!canReadCrm && !canUseOpsCopilot) {
      await telegramSendMessage(telegramChatId, buildCopilotMessage(['Недостаточно прав для команд в личном чате.']))
      return res.json({ ok: true })
    }

    if (text.startsWith('/company')) {
      const query = text.replace('/company', '').trim()
      if (!query) {
        await telegramSendMessage(telegramChatId, 'Использование: /company <название|email|телефон>')
        return res.json({ ok: true })
      }
      const rows = await prisma.customerCompany.findMany({
        where: {
          tenantId: linkTenantId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } }
          ]
        },
        include: { segments: true },
        take: 5
      })
      await telegramSendMessage(telegramChatId, formatCompanyResult(rows))
      return res.json({ ok: true })
    }

    if (text.startsWith('/customer')) {
      const query = text.replace('/customer', '').trim()
      if (!query) {
        await telegramSendMessage(telegramChatId, 'Использование: /customer <имя|email|телефон>')
        return res.json({ ok: true })
      }
      const rows = await prisma.customerContact.findMany({
        where: {
          tenantId: linkTenantId,
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } }
          ]
        },
        include: { segments: true },
        take: 5
      })
      await telegramSendMessage(telegramChatId, formatContactResult(rows))
      return res.json({ ok: true })
    }

    if (text.startsWith('/help')) {
      await telegramSendMessage(
        telegramChatId,
        buildCopilotMessage([
          'Команды: /customer <запрос>, /company <запрос>, /tasks, /task-done <id>, /report la, /new-order-check, /easytaxi-reminder',
          'Источник: системные команды Riderra.',
          'Статус: доступно в личном чате.'
        ])
      )
      return res.json({ ok: true })
    }

    return res.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return res.json({ ok: true })
  }
})

// Получение списка городов по стране
app.get('/api/admin/city-routes/cities', authenticateToken, resolveActorContext, requireActorContext, requireCan('directions.read', 'direction', (req) => ({
  country: req.query?.country || null
})), async (req, res) => {
  try {
    const { country } = req.query
    
    if (!country) {
      return res.status(400).json({ error: 'Country parameter is required' })
    }

    const cities = await prisma.cityRoute.findMany({
      where: { 
        tenantId: req.actorContext.tenantId,
        isActive: true,
        country: country
      },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' }
    })

    res.json(cities.map(c => c.city))
  } catch (error) {
    console.error('Error fetching cities:', error)
    res.status(500).json({ error: 'Failed to fetch cities' })
  }
})

// Создание нового маршрута
app.post('/api/admin/city-routes', authenticateToken, resolveActorContext, requireActorContext, requireCan('directions.manage', 'direction', (req) => ({
  country: req.body?.country || null,
  city: req.body?.city || null
})), async (req, res) => {
  try {
    const { country, city, fromPoint, toPoint, vehicleType, passengers, distance, targetFare, currency } = req.body
    const payload = { country, city, fromPoint, toPoint, vehicleType, passengers, distance, targetFare, currency }
    ensureIdempotencyKey(req, 'city_route.create', payload)
    const wrapped = await withIdempotency(req, 'city_route.create', payload, async () => {
      const route = await prisma.cityRoute.create({
        data: {
          tenantId: req.actorContext.tenantId,
          country,
          city,
          fromPoint,
          toPoint,
          vehicleType,
          passengers: parseInt(passengers),
          distance: parseFloat(distance),
          targetFare: parseFloat(targetFare),
          currency: currency || 'EUR'
        }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'city_route.create',
        resource: 'city_route',
        resourceId: route.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return route
    })

    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error creating city route:', error)
    res.status(500).json({ error: 'Failed to create city route' })
  }
})

// Обновление маршрута
app.put('/api/admin/city-routes/:routeId', authenticateToken, resolveActorContext, requireActorContext, requireCan('directions.manage', 'direction', async (req) => {
  const row = await prisma.cityRoute.findFirst({
    where: { id: req.params.routeId, tenantId: req.actorContext.tenantId },
    select: { country: true, city: true }
  })
  return { country: req.body?.country || row?.country || null, city: req.body?.city || row?.city || null }
}), async (req, res) => {
  try {
    const { routeId } = req.params
    const { country, city, fromPoint, toPoint, vehicleType, passengers, distance, targetFare, currency, isActive } = req.body

    const updateData = {}
    if (country !== undefined) updateData.country = country
    if (city !== undefined) updateData.city = city
    if (fromPoint !== undefined) updateData.fromPoint = fromPoint
    if (toPoint !== undefined) updateData.toPoint = toPoint
    if (vehicleType !== undefined) updateData.vehicleType = vehicleType
    if (passengers !== undefined) updateData.passengers = parseInt(passengers)
    if (distance !== undefined) updateData.distance = parseFloat(distance)
    if (targetFare !== undefined) updateData.targetFare = parseFloat(targetFare)
    if (currency !== undefined) updateData.currency = currency
    if (isActive !== undefined) updateData.isActive = isActive

    const existingRoute = await prisma.cityRoute.findFirst({
      where: { id: routeId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existingRoute) return res.status(404).json({ error: 'Route not found' })

    const payload = { routeId: existingRoute.id, updateData }
    ensureIdempotencyKey(req, 'city_route.update', payload)
    const wrapped = await withIdempotency(req, 'city_route.update', payload, async () => {
      const route = await prisma.cityRoute.update({
        where: { id: existingRoute.id },
        data: updateData
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'city_route.update',
        resource: 'city_route',
        resourceId: route.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: updateData
      })
      return route
    })

    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error updating city route:', error)
    res.status(500).json({ error: 'Failed to update city route' })
  }
})

// Удаление маршрута (мягкое удаление)
app.delete('/api/admin/city-routes/:routeId', authenticateToken, resolveActorContext, requireActorContext, requireCan('directions.manage', 'direction', async (req) => {
  const row = await prisma.cityRoute.findFirst({
    where: { id: req.params.routeId, tenantId: req.actorContext.tenantId },
    select: { country: true, city: true }
  })
  return { country: row?.country || null, city: row?.city || null }
}), async (req, res) => {
  try {
    const { routeId } = req.params

    const existingRoute = await prisma.cityRoute.findFirst({
      where: { id: routeId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existingRoute) return res.status(404).json({ error: 'Route not found' })

    const payload = { routeId: existingRoute.id }
    ensureIdempotencyKey(req, 'city_route.deactivate', payload)
    const wrapped = await withIdempotency(req, 'city_route.deactivate', payload, async () => {
      await prisma.cityRoute.update({
        where: { id: existingRoute.id },
        data: { isActive: false }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'city_route.deactivate',
        resource: 'city_route',
        resourceId: existingRoute.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return { success: true }
    })

    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error deleting city route:', error)
    res.status(500).json({ error: 'Failed to delete city route' })
  }
})

// Массовая загрузка маршрутов из CSV
app.post('/api/admin/city-routes/bulk-import', authenticateToken, resolveActorContext, requireActorContext, requireCan('directions.manage', 'direction'), async (req, res) => {
  try {
    const { routes } = req.body // Массив маршрутов из CSV

    if (!Array.isArray(routes) || routes.length === 0) {
      return res.status(400).json({ error: 'Invalid routes data' })
    }

    const payload = { routesCount: routes.length }
    ensureIdempotencyKey(req, 'city_route.bulk_import', payload)
    const wrapped = await withIdempotency(req, 'city_route.bulk_import', payload, async () => {
      const results = {
        added: 0,
        skipped: 0,
        errors: []
      }

      for (let i = 0; i < routes.length; i++) {
        const route = routes[i]
        try {
          if (!route.country || !route.city || !route.fromPoint || !route.toPoint ||
              !route.vehicleType || !route.passengers || !route.distance || !route.targetFare) {
            results.errors.push({
              row: i + 1,
              error: 'Missing required fields'
            })
            results.skipped++
            continue
          }

          const existing = await prisma.cityRoute.findFirst({
            where: {
              tenantId: req.actorContext.tenantId,
              country: route.country,
              city: route.city,
              fromPoint: route.fromPoint,
              toPoint: route.toPoint,
              vehicleType: route.vehicleType,
              isActive: true
            }
          })

          if (existing) {
            results.skipped++
            continue
          }

          await prisma.cityRoute.create({
            data: {
              tenantId: req.actorContext.tenantId,
              country: route.country.trim(),
              city: route.city.trim(),
              fromPoint: route.fromPoint.trim(),
              toPoint: route.toPoint.trim(),
              vehicleType: route.vehicleType.trim(),
              passengers: parseInt(route.passengers) || 1,
              distance: parseFloat(route.distance) || 0,
              targetFare: parseFloat(route.targetFare) || 0,
              currency: (route.currency || 'EUR').trim().toUpperCase()
            }
          })

          results.added++
        } catch (error) {
          results.errors.push({
            row: i + 1,
            error: error.message || 'Unknown error'
          })
          results.skipped++
        }
      }

      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'city_route.bulk_import',
        resource: 'city_route',
        resourceId: null,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: { routesCount: routes.length, ...results }
      })
      return results
    })

    res.json({
      success: true,
      results: wrapped.data,
      idempotent: wrapped.replayed
    })
  } catch (error) {
    console.error('Error bulk importing routes:', error)
    res.status(500).json({ error: 'Failed to import routes' })
  }
})

// Создание админа (только для разработки)
app.post('/api/auth/create-admin', async (req, res) => {
  try {
    const { email, password } = req.body
    const setupKey = req.headers['x-setup-key'] || req.body.setupKey

    if (!process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ error: 'Admin bootstrap is disabled' })
    }

    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ error: 'Invalid setup key' })
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Проверяем, существует ли админ
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    })

    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin already exists' })
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // Создаем админа
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'admin'
      }
    })

    res.json({
      message: 'Admin created successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role
      }
    })
  } catch (error) {
    console.error('Create admin error:', error)
    res.status(500).json({ error: 'Failed to create admin' })
  }
})
