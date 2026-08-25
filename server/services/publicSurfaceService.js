const {
  RIDERRA_BASE_URL,
  RIDERRA_CONTACT_EMAIL
} = require('../config/constants')
const { escapeHtml } = require('../utils/helpers')

const YANDEX_METRIKA_ID = 108482177

const RIDERRA_SEO_TRANSFERS = (() => {
  try {
    return require('./seo_transfers.json')
  } catch (_error) {
    return { countries: [], airports: [], routePages: [] }
  }
})()
const RIDERRA_PUBLIC_PAGES = [
  { path: '/', title: 'Riderra', priority: '1.0' },
  { path: '/ai', title: 'AI agent guide', priority: '0.9' },
  { path: '/ru/ai', title: 'Riderra для AI-агентов', priority: '0.8' },
  { path: '/about', title: 'About Riderra', priority: '0.8' },
  { path: '/ru/about', title: 'О Riderra', priority: '0.7' },
  { path: '/services', title: 'Transfer services', priority: '0.9' },
  { path: '/transfers', title: 'Airport transfers by country', priority: '0.9' },
  { path: '/ru/services', title: 'Услуги трансфера', priority: '0.8' },
  { path: '/services/airport-transfer', title: 'Airport transfers', priority: '0.8' },
  { path: '/services/city-transfer', title: 'City transfers', priority: '0.8' },
  { path: '/docs', title: 'Riderra documentation', priority: '0.7' },
  { path: '/ru/docs', title: 'Документация Riderra', priority: '0.7' },
  { path: '/prices', title: 'Prices', priority: '0.8' },
  { path: '/ru/prices', title: 'Цены', priority: '0.7' },
  { path: '/contact', title: 'Contact', priority: '0.8' },
  { path: '/ru/contact', title: 'Контакты', priority: '0.7' },
  { path: '/faq', title: 'FAQ', priority: '0.8' },
  { path: '/ru/faq', title: 'Вопросы и ответы', priority: '0.7' },
  { path: '/sources', title: 'Public sources of truth', priority: '0.6' },
  { path: '/drivers', title: 'Drivers', priority: '0.5' },
  { path: '/vendor-wiki', title: 'Vendor Wiki', priority: '0.7' },
  { path: '/privacy-policy/en', title: 'Privacy Policy', priority: '0.3' },
  { path: '/terms/en', title: 'Terms and Conditions', priority: '0.3' }
]

const RIDERRA_SERVICES = [
  {
    slug: 'airport-transfer',
    name: 'Airport transfer',
    description: 'Pre-booked private airport pickup and drop-off with flight details, meet-and-greet support, luggage help, and local driver assignment.',
    url: `${RIDERRA_BASE_URL}/services/airport-transfer`
  },
  {
    slug: 'city-transfer',
    name: 'City transfer',
    description: 'Private point-to-point rides, hotel transfers, port transfers, station transfers, business trips, family travel, and group transportation.',
    url: `${RIDERRA_BASE_URL}/services/city-transfer`
  }
]

const RIDERRA_PUBLIC_SOURCES = [
  {
    name: 'Riderra website',
    url: `${RIDERRA_BASE_URL}/`,
    type: 'owned_website',
    status: 'authoritative',
    expectedName: 'Riderra',
    expectedWebsite: RIDERRA_BASE_URL,
    expectedEmail: RIDERRA_CONTACT_EMAIL,
    notes: 'Primary public source for Riderra.'
  },
  {
    name: 'Riderra llms.txt',
    url: `${RIDERRA_BASE_URL}/llms.txt`,
    type: 'owned_machine_readable',
    status: 'authoritative',
    expectedName: 'Riderra',
    expectedWebsite: RIDERRA_BASE_URL,
    expectedEmail: RIDERRA_CONTACT_EMAIL,
    notes: 'Machine-readable public guide for AI agents and search systems.'
  },
  {
    name: 'Riderra OpenAPI',
    url: `${RIDERRA_BASE_URL}/api/public/openapi.json`,
    type: 'owned_machine_readable',
    status: 'authoritative',
    expectedName: 'Riderra',
    expectedWebsite: RIDERRA_BASE_URL,
    expectedEmail: RIDERRA_CONTACT_EMAIL,
    notes: 'Public API contract for draft transfer requests.'
  },
  {
    name: 'Riderra public agent manifest',
    url: `${RIDERRA_BASE_URL}/api/public/agent-manifest`,
    type: 'owned_machine_readable',
    status: 'authoritative',
    expectedName: 'Riderra',
    expectedWebsite: RIDERRA_BASE_URL,
    expectedEmail: RIDERRA_CONTACT_EMAIL,
    notes: 'Public capability and safety boundary manifest for AI agents.'
  },
  {
    name: 'Riderra LinkedIn',
    url: 'https://ee.linkedin.com/company/riderracs',
    type: 'external_profile',
    status: 'web_verified',
    expectedName: 'Riderra',
    expectedWebsite: RIDERRA_BASE_URL,
    expectedEmail: null,
    notes: 'Public LinkedIn profile found with website riderra.com.'
  },
  {
    name: 'Riderra VK',
    url: 'https://vk.com/riderra',
    type: 'external_profile',
    status: 'declared_owned',
    expectedName: 'Riderra',
    expectedWebsite: RIDERRA_BASE_URL,
    expectedEmail: null,
    notes: 'Declared sameAs profile; should be periodically checked against public source data.'
  },
  {
    name: 'Riderra Facebook',
    url: 'https://www.facebook.com/profile.php?id=61564219065685',
    type: 'external_profile',
    status: 'declared_owned',
    expectedName: 'Riderra',
    expectedWebsite: RIDERRA_BASE_URL,
    expectedEmail: null,
    notes: 'Declared sameAs profile; should be periodically checked against public source data.'
  }
]

const RIDERRA_FAQ = [
  {
    question: 'What is Riderra?',
    answer: 'Riderra is a global transfer booking network and passenger transportation organizer operating through its own team and partner fleets.'
  },
  {
    question: 'Where does Riderra operate?',
    answer: 'Riderra organizes transfers in more than 250 cities across 50 countries, subject to route, vehicle class, timing, and local availability.'
  },
  {
    question: 'Can an AI agent create a booking?',
    answer: 'An AI agent can submit a structured draft request. Riderra reviews availability and confirms the final price before execution.'
  },
  {
    question: 'Are prices published as a full price list?',
    answer: 'No. Final prices are confirmed after route, vehicle class, pickup time, extras, and availability are checked.'
  },
  {
    question: 'How do customers contact Riderra?',
    answer: `Customers and AI agents can contact Riderra at ${RIDERRA_CONTACT_EMAIL} or submit a structured request through the public order request endpoint.`
  }
]

const RIDERRA_FAQ_RU = [
  {
    question: 'Что такое Riderra?',
    answer: 'Riderra - глобальная сеть бронирования трансферов и организатор пассажирских перевозок через собственную команду и партнерские автопарки.'
  },
  {
    question: 'Где работает Riderra?',
    answer: 'Riderra организует трансферы более чем в 250 городах и 50 странах, если маршрут, класс автомобиля, время и локальная доступность подтверждены.'
  },
  {
    question: 'Может ли AI-агент создать заказ?',
    answer: 'AI-агент может отправить структурированную заявку-драфт. Riderra проверяет доступность и подтверждает финальную цену до выполнения поездки.'
  },
  {
    question: 'Публикует ли Riderra полный прайс?',
    answer: 'Нет. Финальная цена подтверждается после проверки маршрута, класса автомобиля, времени подачи, дополнительных услуг и доступности.'
  },
  {
    question: 'Как связаться с Riderra?',
    answer: `Клиенты и AI-агенты могут написать на ${RIDERRA_CONTACT_EMAIL} или отправить структурированную заявку через публичный endpoint.`
  }
]

function riderraAbsoluteUrl(pagePath = '/') {
  if (!pagePath || pagePath === '/') return `${RIDERRA_BASE_URL}/`
  return `${RIDERRA_BASE_URL}${pagePath}`
}

function jsonLdScript(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
}

function yandexMetrikaHead() {
  return `<script>
      window.dataLayer = window.dataLayer || [];
      window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
      window.ym.l = window.ym.l || Number(new Date());
      window.ym(${YANDEX_METRIKA_ID}, 'init', {
        webvisor: true,
        clickmap: true,
        ecommerce: 'dataLayer',
        referrer: document.referrer,
        url: window.location.href,
        accurateTrackBounce: true,
        trackLinks: true
      });
      (function () {
        var script = document.createElement('script');
        script.async = true;
        script.src = 'https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_ID}';
        document.head.appendChild(script);
      })();
    </script>`
}

function yandexMetrikaNoScript() {
  return `<noscript><div><img src="https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>`
}

function publicPageLanguagePath(pagePath, isRu) {
  if (isRu) return pagePath.replace(/^\/ru/, '') || '/'
  if (pagePath === '/') return '/ru'
  return `/ru${pagePath}`
}

function preferredLanguageFromRequest(req) {
  const queryLang = String(req.query?.lang || '').toLowerCase()
  if (queryLang) return queryLang
  const cookie = String(req.headers?.cookie || '')
    .split(';')
    .map((item) => item.trim().split('='))
    .find(([name]) => name === 'riderra_lang')
  return cookie ? String(cookie[1] || '').toLowerCase() : ''
}

function withLangQuery(pagePath, lang) {
  return `${pagePath}${pagePath.includes('?') ? '&' : '?'}lang=${lang}`
}

function publicPageEyebrow(pagePath, isRu) {
  if (pagePath === '/prices' || pagePath === '/ru/prices') return isRu ? 'Политика цен Riderra' : 'Riderra pricing policy'
  if (pagePath === '/docs' || pagePath === '/ru/docs') return isRu ? 'Документация' : 'Documentation'
  if (pagePath === '/contact' || pagePath === '/ru/contact') return isRu ? 'Связаться с Riderra' : 'Contact Riderra'
  if (pagePath === '/services' || pagePath === '/ru/services') return isRu ? 'Услуги Riderra' : 'Riderra services'
  if (pagePath === '/about' || pagePath === '/ru/about') return isRu ? 'О компании' : 'About Riderra'
  if (pagePath === '/faq' || pagePath === '/ru/faq') return isRu ? 'Вопросы и ответы' : 'FAQ'
  return isRu ? 'Riderra' : 'Riderra'
}

function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'TravelAgency'],
    '@id': `${RIDERRA_BASE_URL}/#organization`,
    name: 'Riderra',
    url: RIDERRA_BASE_URL,
    email: RIDERRA_CONTACT_EMAIL,
    logo: `${RIDERRA_BASE_URL}/img/logo.svg`,
    sameAs: [
      'https://ee.linkedin.com/company/riderracs',
      'https://vk.com/riderra',
      'https://www.facebook.com/profile.php?id=61564219065685'
    ],
    areaServed: {
      '@type': 'Place',
      name: 'Worldwide: 250+ cities in 50 countries'
    },
    knowsAbout: [
      'airport transfers',
      'private transfers',
      'chauffeur service',
      'port transfers',
      'group transportation'
    ],
    contactPoint: [{
      '@type': 'ContactPoint',
      email: RIDERRA_CONTACT_EMAIL,
      contactType: 'customer support',
      availableLanguage: ['English', 'Russian'],
      areaServed: 'Worldwide'
    }]
  }
}

function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${RIDERRA_BASE_URL}/#website`,
    name: 'Riderra',
    url: RIDERRA_BASE_URL,
    publisher: { '@id': `${RIDERRA_BASE_URL}/#organization` }
  }
}

function serviceJsonLd(service = null) {
  const services = service ? [service] : RIDERRA_SERVICES
  return services.map((item) => ({
    '@context': 'https://schema.org',
    '@type': ['Service', 'TaxiService'],
    '@id': `${item.url}#service`,
    name: item.name,
    description: item.description,
    url: item.url,
    provider: { '@id': `${RIDERRA_BASE_URL}/#organization` },
    areaServed: 'Worldwide: 250+ cities in 50 countries',
    offers: {
      '@type': 'Offer',
      priceSpecification: {
        '@type': 'PriceSpecification',
        description: 'Final price is confirmed after route, vehicle class, pickup time, extras, and availability are checked.'
      },
      availability: 'https://schema.org/InStock'
    }
  }))
}

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${RIDERRA_BASE_URL}/faq#faq`,
    mainEntity: RIDERRA_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  }
}

function faqRuJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${RIDERRA_BASE_URL}/ru/faq#faq`,
    inLanguage: 'ru',
    mainEntity: RIDERRA_FAQ_RU.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  }
}

function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: riderraAbsoluteUrl(item.path)
    }))
  }
}

function isCrawlerRequest(req) {
  const ua = String(req.headers['user-agent'] || '').toLowerCase()
  return [
    'googlebot',
    'bingbot',
    'yandex',
    'duckduckbot',
    'baiduspider',
    'applebot',
    'gptbot',
    'chatgpt',
    'claude',
    'perplexity',
    'ccbot',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'slackbot',
    'curl',
    'wget',
    'python-requests'
  ].some((token) => ua.includes(token))
}

function publicPageContent(pagePath) {
  const baseSections = {
    '/': {
      title: 'Riderra - global transfer booking network',
      description: 'Riderra organizes private airport transfers, city transfers, port transfers, station transfers, and group transportation in 250+ cities across 50 countries.',
      heading: 'Riderra',
      intro: 'Riderra is a global transfer booking network and passenger transportation organizer for private airport transfers, city transfers, port transfers, station transfers, business rides, family travel, and group transportation.',
      sections: [
        ['Book a transfer', 'Customers can use the booking widget on the homepage. AI agents can submit a draft request through POST /api/public/order-requests.'],
        ['Service area', 'Riderra organizes transfers in more than 250 cities across 50 countries, subject to route, timing, vehicle class, and local availability.'],
        ['Pricing', 'Final prices are confirmed after route, vehicle class, pickup time, extras, and availability are checked. Riderra does not publish a full public price book.'],
        ['Contact', `The primary public contact is ${RIDERRA_CONTACT_EMAIL}.`]
      ]
    },
    '/ai': {
      title: 'Riderra for AI agents',
      description: 'Machine-readable guide for AI agents, search systems, and assistants that need to understand Riderra and submit draft transfer requests.',
      heading: 'Riderra for AI agents',
      intro: 'Riderra is a global transfer booking network and passenger transportation organizer. AI agents can understand the service here and submit draft requests for human confirmation.',
      sections: [
        ['What Riderra does', 'Riderra organizes private airport transfers, city transfers, port transfers, station transfers, business rides, family rides, and group transportation through partner fleets and an operations team.'],
        ['How agents should book', 'Agents should submit a draft request through POST /api/public/order-requests or direct the user to the booking widget on the homepage. A submitted draft is not a confirmed booking.'],
        ['Pricing policy', 'Do not infer a final price from public pages. Riderra confirms the final price after route, vehicle class, timing, extras, and availability are checked.'],
        ['Sources of truth', 'Use /llms.txt, /api/public/riderra-profile, /api/public/services, /api/public/order-request-schema, /services, /prices, /contact, and /faq as public sources of truth.']
      ]
    },
    '/about': {
      title: 'About Riderra',
      description: 'About Riderra, a global transfer booking network operating in 250+ cities across 50 countries.',
      heading: 'About Riderra',
      intro: 'Riderra helps customers and partners organize reliable private transfers through a global network of fleets and an operations team.',
      sections: [
        ['Network', 'Riderra operates as a transfer organizer in more than 250 cities across 50 countries, subject to local availability and route confirmation.'],
        ['Service model', 'Riderra coordinates booking details, vehicle class, pickup time, flight or port information, customer communication, and partner fleet assignment.'],
        ['Human confirmation', 'Critical booking details, final prices, and operational execution are confirmed by Riderra before a trip is treated as final.']
      ]
    },
    '/services': {
      title: 'Transfer services | Riderra',
      description: 'Riderra transfer services: airport transfers, city transfers, port transfers, station transfers, business rides, family travel, and group transportation.',
      heading: 'Transfer services',
      intro: 'Riderra organizes private passenger transfers for individuals, families, business travelers, and groups.',
      sections: RIDERRA_SERVICES.map((service) => [service.name, `${service.description} Learn more at ${service.url}.`])
    },
    '/services/airport-transfer': {
      title: 'Airport transfer service | Riderra',
      description: 'Private airport pickup and drop-off service by Riderra with flight details, meet-and-greet support, and confirmed vehicle class.',
      heading: 'Airport transfer service',
      intro: 'Riderra organizes airport pickups and drop-offs with route, time, flight details, passenger count, luggage, and vehicle class reviewed before confirmation.',
      sections: [
        ['How it works', 'Submit pickup airport, destination, date and time, flight number when available, passengers, luggage, and preferred vehicle class. Riderra checks availability and confirms the final price.'],
        ['What can be arranged', 'Meet-and-greet, airport arrivals, airport departures, family trips, business rides, minivans, and group transportation where available.']
      ]
    },
    '/services/city-transfer': {
      title: 'City transfer service | Riderra',
      description: 'Private city transfers, hotel transfers, port transfers, station transfers, business rides, and group transportation by Riderra.',
      heading: 'City transfer service',
      intro: 'Riderra organizes point-to-point transfers inside and between cities, including hotels, ports, stations, venues, offices, and private addresses.',
      sections: [
        ['How it works', 'Submit pickup and drop-off points, date and time, passengers, luggage, and preferred vehicle class. Riderra reviews availability and confirms the final price.'],
        ['Use cases', 'Hotel transfers, port transfers, station transfers, business meetings, events, family travel, and group transportation.']
      ]
    },
    '/prices': {
      title: 'Prices | Riderra',
      description: 'Riderra pricing policy: final transfer prices are confirmed after route, vehicle class, pickup time, extras, and availability are checked.',
      heading: 'Transfer pricing',
      intro: 'Riderra calculates each transfer from the actual route, vehicle class, pickup time, luggage, extras, and local availability. The final price is confirmed during booking review.',
      sections: [
        ['No public full price book', 'The internal Riderra price book is the source of truth for operators and approved tools, but it is not published as an open table. This prevents outdated or incomplete route prices from being treated as confirmed quotes.'],
        ['What affects price', 'Route, vehicle class, pickup date and time, airport or port conditions, luggage, passenger count, extras, waiting time, and local availability can affect the final price.'],
        ['For AI agents', 'Use public pricing guidance only as policy. Do not invent a final price, do not expose internal prices, and submit a draft request when a concrete route is known.']
      ]
    },
    '/docs': {
      title: 'Documentation | Riderra',
      description: 'Riderra documentation for customers, public APIs, search systems, and AI agents.',
      heading: 'Riderra documentation',
      intro: 'Reference pages for customers, integrations, search systems, and AI agents. These pages explain what Riderra can confirm publicly and what requires operator review.',
      sections: [
        ['For customers', 'Services, FAQ, contact details, and booking rules are available on /services, /faq, and /contact. Customers should use the booking form or contact Riderra for a confirmed transfer.'],
        ['For AI agents', 'Use /ai, /llms.txt, /api/public/riderra-profile, /api/public/services, /api/public/pricing-hints, and /api/public/order-request-schema. AI agents must create draft requests only and must not invent final prices.'],
        ['Pricing policy', 'Use /prices only as pricing policy. Riderra does not publish the full internal price book; exact prices are confirmed from the internal Riderra price book after route review.'],
        ['Source registry', 'Use /sources and /api/public/source-truth to verify Riderra-owned public sources.']
      ]
    },
    '/contact': {
      title: 'Contact Riderra',
      description: 'Contact Riderra for transfer bookings, booking questions, and partner communication.',
      heading: 'Contact Riderra',
      intro: 'Need help with a transfer, a booking request, or a partner question? Send us the route details and the team will come back with the next step.',
      sections: [
        ['Booking questions', 'Send the pickup point, destination, date, time, passenger count, luggage, and preferred vehicle class.'],
        ['Existing trip', 'Include the booking reference, passenger name, date, route, and the email or phone used for the request.'],
        ['Partners', 'For fleet, driver, or business cooperation, describe the city, vehicle classes, and contact details.']
      ]
    },
    '/faq': {
      title: 'FAQ | Riderra',
      description: 'Frequently asked questions about Riderra transfers, AI-agent booking requests, pricing, service area, and contact options.',
      heading: 'Frequently asked questions',
      intro: 'Key answers for customers, search systems, and AI agents.',
      sections: RIDERRA_FAQ.map((item) => [item.question, item.answer])
    },
    '/sources': {
      title: 'Public sources of truth | Riderra',
      description: 'Riderra public sources of truth for AI agents, search systems, and external profile consistency checks.',
      heading: 'Public sources of truth',
      intro: 'These are the Riderra-owned and declared public sources that AI agents and search systems should use when understanding Riderra.',
      sections: [
        ['Authoritative sources', 'Use the Riderra website, llms.txt, OpenAPI document, public profile endpoint, services endpoint, pricing hints endpoint, contact page, FAQ page, and sources endpoint as public sources of truth.'],
        ['External profiles', 'External profiles are useful for discovery and consistency checks, but Riderra-owned pages remain the source of truth for booking policy, pricing policy, contact email, and AI-agent request flow.'],
        ['Data policy', 'Do not infer final prices or confirmed bookings from external profiles. Draft requests require Riderra review before availability and final price are confirmed.'],
        ['Machine-readable source list', `Use GET ${RIDERRA_BASE_URL}/api/public/source-truth for the current source registry.`]
      ]
    },
    '/ru/ai': {
      title: 'Riderra для AI-агентов',
      description: 'Машиночитаемый справочник для AI-агентов, поисковых систем и ассистентов, которым нужно понять Riderra и отправить заявку-драфт.',
      heading: 'Riderra для AI-агентов',
      intro: 'Riderra - глобальная сеть бронирования трансферов и организатор пассажирских перевозок. AI-агенты могут понять услуги и отправить заявку-драфт на ручное подтверждение.',
      sections: [
        ['Что делает Riderra', 'Riderra организует частные трансферы из аэропортов, городские трансферы, поездки из портов и вокзалов, деловые поездки, семейные поездки и групповые перевозки через партнерские автопарки и операционную команду.'],
        ['Как AI-агенту оформить заявку', 'AI-агент должен отправить заявку-драфт через POST /api/public/order-requests или направить пользователя к форме бронирования на главной странице. Отправленная заявка не является подтвержденным заказом.'],
        ['Цены', 'Не выводите финальную цену из публичных страниц. Riderra подтверждает финальную цену после проверки маршрута, класса автомобиля, времени, дополнительных услуг и доступности.'],
        ['Источники истины', 'Используйте /llms.txt, /api/public/riderra-profile, /api/public/services, /api/public/order-request-schema, /services, /prices, /contact и /faq как публичные источники истины.']
      ]
    },
    '/ru/about': {
      title: 'О Riderra',
      description: 'О Riderra: глобальная сеть бронирования трансферов в 250+ городах и 50 странах.',
      heading: 'О Riderra',
      intro: 'Riderra помогает клиентам и партнерам организовывать надежные частные трансферы через глобальную сеть автопарков и операционную команду.',
      sections: [
        ['Сеть', 'Riderra работает как организатор трансферов более чем в 250 городах и 50 странах, при условии локальной доступности и подтверждения маршрута.'],
        ['Модель сервиса', 'Riderra координирует детали бронирования, класс автомобиля, время подачи, данные рейса или порта, коммуникацию с клиентом и назначение партнерского автопарка.'],
        ['Ручное подтверждение', 'Критичные детали бронирования, финальная цена и выполнение поездки подтверждаются Riderra до того, как поездка считается финальной.']
      ]
    },
    '/ru/services': {
      title: 'Услуги трансфера | Riderra',
      description: 'Услуги Riderra: трансферы из аэропорта, городские трансферы, трансферы из портов и вокзалов, деловые поездки, семейные поездки и групповые перевозки.',
      heading: 'Услуги трансфера',
      intro: 'Riderra организует частные пассажирские трансферы для индивидуальных клиентов, семей, деловых путешественников и групп.',
      sections: [
        ['Трансфер из аэропорта', 'Заранее заказанная встреча или поездка в аэропорт с учетом данных рейса, встречей с табличкой, помощью с багажом и назначением локального водителя.'],
        ['Городской трансфер', 'Частные поездки из точки в точку, трансферы из отеля, порта или вокзала, деловые поездки, семейные поездки и групповые перевозки.']
      ]
    },
    '/ru/prices': {
      title: 'Цены | Riderra',
      description: 'Политика цен Riderra: финальная цена трансфера подтверждается после проверки маршрута, класса автомобиля, времени подачи, дополнительных услуг и доступности.',
      heading: 'Цены на трансферы',
      intro: 'Riderra рассчитывает стоимость под конкретный маршрут, класс автомобиля, время подачи, багаж, дополнительные услуги и локальную доступность. Финальная цена подтверждается во время проверки заявки.',
      sections: [
        ['Полный прайс не публикуется', 'Внутренний прайс Riderra остается источником истины для операторов и одобренных инструментов, но не выводится наружу открытой таблицей. Так мы не превращаем устаревшие или неполные данные в публичное обещание цены.'],
        ['Что влияет на цену', 'Маршрут, класс автомобиля, дата и время подачи, условия аэропорта или порта, багаж, количество пассажиров, дополнительные услуги, ожидание и локальная доступность могут влиять на финальную цену.'],
        ['Для AI-агентов', 'Публичные данные о ценах - это только политика расчета. Не придумывайте финальную цену, не раскрывайте внутренний прайс и отправляйте заявку-драфт, когда известен конкретный маршрут.']
      ]
    },
    '/ru/docs': {
      title: 'Документация | Riderra',
      description: 'Документация Riderra для пользователей, публичных API, поисковых систем и AI-агентов.',
      heading: 'Документация Riderra',
      intro: 'Справочные страницы для клиентов, интеграций, поисковых систем и AI-агентов. Здесь описано, что Riderra подтверждает публично, а что требует проверки оператором.',
      sections: [
        ['Для клиентов', 'Услуги, FAQ, контакты и правила бронирования доступны на /ru/services, /ru/faq и /ru/contact. Для подтвержденного трансфера клиенту нужно использовать форму бронирования или связаться с Riderra.'],
        ['Для AI-агентов', 'Используйте /ru/ai, /llms.txt, /api/public/riderra-profile, /api/public/services, /api/public/pricing-hints и /api/public/order-request-schema. AI-агенты создают только заявки-драфты и не должны придумывать финальные цены.'],
        ['Политика цен', 'Страница /ru/prices нужна только как описание политики расчета. Riderra не публикует полный внутренний прайс; точная цена подтверждается из внутреннего прайс-листа после проверки маршрута.'],
        ['Реестр источников', 'Используйте /sources и /api/public/source-truth, чтобы проверять публичные источники Riderra.']
      ]
    },
    '/ru/contact': {
      title: 'Контакты Riderra',
      description: 'Контакты Riderra для бронирований, вопросов по поездкам и партнерской коммуникации.',
      heading: 'Контакты Riderra',
      intro: 'Нужна помощь с трансфером, заявкой или партнерским вопросом? Пришлите детали маршрута, и команда Riderra подскажет следующий шаг.',
      sections: [
        ['Вопрос по бронированию', 'Укажите точку подачи, адрес назначения, дату, время, количество пассажиров, багаж и желаемый класс автомобиля.'],
        ['Действующая поездка', 'Добавьте номер заявки, имя пассажира, дату, маршрут и email или телефон, которые использовались при бронировании.'],
        ['Партнерство', 'Для автопарков, водителей и делового сотрудничества укажите город, классы автомобилей и контакты для связи.']
      ]
    },
    '/ru/faq': {
      title: 'Вопросы и ответы | Riderra',
      description: 'Частые вопросы о трансферах Riderra, заявках AI-агентов, ценах, географии работы и контактах.',
      heading: 'Вопросы и ответы',
      intro: 'Ключевые ответы для клиентов, поисковых систем и AI-агентов.',
      sections: RIDERRA_FAQ_RU.map((item) => [item.question, item.answer])
    }
  }
  return baseSections[pagePath] || baseSections['/ai']
}

function renderPublicSourceHtml(pagePath) {
  const content = publicPageContent(pagePath)
  const canonical = riderraAbsoluteUrl(pagePath)
  const service = RIDERRA_SERVICES.find((item) => item.url === canonical)
  const isRu = pagePath.startsWith('/ru/')
  const isPricesPage = pagePath === '/prices' || pagePath === '/ru/prices'
  const isContactPage = pagePath === '/contact' || pagePath === '/ru/contact'
  const isServicesPage = pagePath === '/services' || pagePath === '/ru/services'
  const crumbs = [
    { name: 'Riderra', path: '/' },
    ...(pagePath === '/' ? [] : [{ name: content.heading, path: pagePath }])
  ]
  const jsonLd = [
    organizationJsonLd(),
    websiteJsonLd(),
    breadcrumbJsonLd(crumbs),
    ...(pagePath === '/faq' ? [faqJsonLd()] : []),
    ...(pagePath === '/ru/faq' ? [faqRuJsonLd()] : []),
    ...(pagePath === '/services' ? serviceJsonLd() : []),
    ...(service ? serviceJsonLd(service) : [])
  ]
  return `<!doctype html>
<html lang="${isRu ? 'ru' : 'en'}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(content.title)}</title>
    <meta name="description" content="${escapeHtml(content.description)}">
    <link rel="canonical" href="${canonical}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Montserrat:300,400,500,700,800&subset=cyrillic-ext">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Riderra">
    <meta property="og:title" content="${escapeHtml(content.title)}">
    <meta property="og:description" content="${escapeHtml(content.description)}">
    <meta property="og:url" content="${canonical}">
    ${jsonLd.map(jsonLdScript).join('\n    ')}
    ${yandexMetrikaHead()}
    <style>
      :root { color-scheme: light; --ink: #17223f; --muted: #66738d; --line: #dbe3f2; --soft: #f5f7fb; --navy: #161d4d; --blue: #3152ff; --pink: #d51b7c; --green: #2f7d62; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: 'Montserrat', sans-serif; color: var(--ink); background: #f7f9fd; }
      ${staticSiteHeaderCss()}
      .wrap { max-width: 1180px; margin: 0 auto; padding: 48px 24px 80px; }
      .hero { padding: 54px 0 36px; }
      .eyebrow { color: var(--pink); font-size: 14px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; margin: 0 0 14px; }
      h1 { margin: 0; max-width: 860px; font-size: clamp(38px, 6vw, 72px); line-height: .98; letter-spacing: 0; }
      .lead { max-width: 760px; margin: 22px 0 0; font-size: 20px; line-height: 1.65; color: var(--muted); }
      .card { background: #fff; border: 1px solid var(--line); border-radius: 22px; padding: 36px; box-shadow: 0 22px 70px rgba(29,42,87,.08); }
      .sections { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: 28px; }
      .section-card { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 24px; }
      h2 { margin: 0 0 12px; font-size: 22px; line-height: 1.2; }
      p { font-size: 17px; line-height: 1.7; color: var(--muted); margin: 0; }
      code { background: #eef2ff; padding: 2px 6px; border-radius: 6px; }
      .price-layout { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(320px, .8fr); gap: 24px; align-items: stretch; margin-top: 30px; }
      .policy-panel { background: #fff; border: 1px solid var(--line); border-radius: 22px; padding: 30px; box-shadow: 0 18px 60px rgba(29,42,87,.08); }
      .factors { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 22px; }
      .factor { border: 1px solid var(--line); border-radius: 14px; padding: 16px; background: var(--soft); font-weight: 800; color: #263352; }
      .quote-card { background: linear-gradient(135deg, var(--navy), #0b1022); color: #fff; border-radius: 22px; padding: 30px; display: flex; flex-direction: column; justify-content: space-between; min-height: 360px; box-shadow: 0 24px 80px rgba(22,29,77,.22); }
      .quote-card p { color: rgba(255,255,255,.78); }
      .quote-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 26px; }
      .button { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 18px; border-radius: 12px; text-decoration: none; font-weight: 900; }
      .button-primary { background: #fff; color: var(--navy); }
      .button-secondary { border: 1px solid rgba(255,255,255,.36); color: #fff; }
      .agent-note { margin-top: 24px; border-left: 4px solid var(--green); padding: 14px 0 14px 18px; color: var(--muted); }
      .contact-layout { display: grid; grid-template-columns: minmax(0, .95fr) minmax(0, 1.05fr); gap: 24px; align-items: stretch; margin-top: 30px; }
      .contact-primary { background: linear-gradient(135deg, var(--navy), #0b1022); color: #fff; border-radius: 22px; padding: 34px; box-shadow: 0 24px 80px rgba(22,29,77,.22); }
      .contact-primary h2 { font-size: 32px; margin-bottom: 18px; }
      .contact-primary p { color: rgba(255,255,255,.78); }
      .contact-email { display: inline-flex; margin-top: 22px; color: #fff; font-size: 24px; font-weight: 900; text-decoration: none; word-break: break-word; }
      .contact-email:hover, .contact-email:focus-visible { text-decoration: underline; outline: none; }
      .contact-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
      .contact-grid { display: grid; gap: 16px; }
      .contact-card { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 24px; }
      .contact-card h2 { font-size: 20px; }
      .plain-article { background: #fff; border: 1px solid var(--line); border-radius: 22px; padding: 36px; box-shadow: 0 18px 60px rgba(20,35,90,.1); }
      .plain-article section + section { margin-top: 26px; }
      .transfer-catalog { margin-top: 30px; }
      .transfer-catalog__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
      .transfer-catalog__head h2 { font-size: 34px; margin: 0 0 8px; }
      .transfer-catalog__head p { max-width: 760px; }
      .transfer-catalog__all { color: var(--blue); font-weight: 900; text-decoration: none; white-space: nowrap; }
      .transfer-catalog__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
      .country-card { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 24px; box-shadow: 0 18px 60px rgba(20,35,90,.08); }
      .country-card__top { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 14px; }
      .country-card h3 { margin: 0; font-size: 24px; line-height: 1.2; }
      .country-card h3 a { color: var(--ink); text-decoration: none; }
      .country-card h3 a:hover, .country-card h3 a:focus-visible { color: var(--blue); outline: none; }
      .country-card__price { color: var(--pink); font-weight: 900; white-space: nowrap; }
      .country-card__meta { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0 18px; }
      .country-card__meta span { background: var(--soft); color: #263352; border: 1px solid var(--line); border-radius: 999px; padding: 6px 10px; font-size: 14px; font-weight: 800; }
      .airport-links { display: flex; flex-wrap: wrap; gap: 10px; }
      .airport-links a { display: inline-flex; min-height: 34px; align-items: center; border: 1px solid var(--line); border-radius: 999px; padding: 0 12px; color: #2549d8; background: #fff; text-decoration: none; font-weight: 800; font-size: 14px; }
      .airport-links a:hover, .airport-links a:focus-visible { background: #eef2ff; outline: none; }
      @media (max-width: 900px) { .topbar-inner { align-items: flex-start; flex-direction: column; } .nav { justify-content: flex-start; } .sections, .price-layout, .factors, .contact-layout, .transfer-catalog__grid { grid-template-columns: 1fr; } .transfer-catalog__head { align-items: flex-start; flex-direction: column; } }
      @media (max-width: 767px) { .wrap { padding: 34px 18px 56px; } .hero { padding-top: 28px; } .plain-article, .policy-panel, .quote-card, .contact-primary { padding: 24px; } .brand { font-size: 30px; } .nav { gap: 14px; } .nav a { font-size: 14px; } .contact-email { font-size: 20px; } }
    </style>
  </head>
  <body>
    ${yandexMetrikaNoScript()}
    ${renderStaticSiteHeader(isRu, pagePath)}
    <main class="wrap">
      <section class="hero">
        <p class="eyebrow">${escapeHtml(publicPageEyebrow(pagePath, isRu))}</p>
        <h1>${escapeHtml(content.heading)}</h1>
        <p class="lead">${escapeHtml(content.intro)}</p>
      </section>
      ${isPricesPage ? renderPublicPricesBody(content, isRu) : isContactPage ? renderPublicContactBody(content, isRu) : isServicesPage ? renderPublicServicesBody(content, isRu) : `
      <article class="plain-article">
        ${content.sections.map(([title, body]) => `<section><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></section>`).join('\n        ')}
      </article>`}
    </main>
  </body>
</html>`
}

function renderPublicServicesBody(content, isRu) {
  return `
      <article class="plain-article">
        ${content.sections.map(([title, body]) => `<section><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></section>`).join('\n        ')}
      </article>
      ${renderServicesTransferCatalog(isRu)}`
}

function renderServicesTransferCatalog(isRu) {
  const countries = RIDERRA_SEO_TRANSFERS.countries || []
  if (!countries.length) return ''
  return `
      <section class="transfer-catalog" aria-label="${isRu ? 'Направления трансферов' : 'Transfer destinations'}">
        <div class="transfer-catalog__head">
          <div>
            <h2>${isRu ? 'Направления трансферов' : 'Transfer destinations'}</h2>
            <p>${isRu
              ? 'Каталог аэропортов и популярных маршрутов из прайс-листа Riderra. На страницах направлений доступны цены от, классы машин и варианты трансфера.'
              : 'Browse Riderra airport transfer destinations from the internal price book, with starting prices, airports, vehicle classes, and popular routes.'}</p>
          </div>
          <a class="transfer-catalog__all" href="${isRu ? '/ru/transfers' : '/transfers'}">${isRu ? 'Открыть весь каталог' : 'Open full catalog'}</a>
        </div>
        <div class="transfer-catalog__grid">
          ${countries.map((country) => renderServicesTransferCountry(country, isRu)).join('\n          ')}
        </div>
      </section>`
}

function renderServicesTransferCountry(country, isRu) {
  const airportLinks = (country.airports || []).slice(0, 6)
  return `<article class="country-card">
            <div class="country-card__top">
              <h3><a href="${escapeHtml(localizedTransferPath(country.path, isRu))}">${escapeHtml(isRu ? countryLabelRu(country.countryName) : country.countryName)}</a></h3>
              <span class="country-card__price">${isRu ? 'от' : 'from'} ${escapeHtml(country.minPriceText)}</span>
            </div>
            <div class="country-card__meta">
              <span>${escapeHtml(country.airportCount)} ${isRu ? 'аэропортов' : 'airports'}</span>
              <span>${escapeHtml(country.routeCount)} ${isRu ? 'маршрутов' : 'routes'}</span>
            </div>
            <div class="airport-links">
              ${airportLinks.map((airport) => `<a href="${escapeHtml(localizedTransferPath(airport.path, isRu))}">${escapeHtml(airport.airportName)}</a>`).join('\n              ')}
            </div>
          </article>`
}

function countryLabelRu(countryName) {
  return {
    Argentina: 'Аргентина',
    Armenia: 'Армения',
    Austria: 'Австрия',
    Azerbaijan: 'Азербайджан',
    Belarus: 'Беларусь',
    Bulgaria: 'Болгария',
    Canada: 'Канада',
    China: 'Китай',
    Cyprus: 'Кипр',
    Denmark: 'Дания',
    Egypt: 'Египет',
    Estonia: 'Эстония',
    Finland: 'Финляндия',
    France: 'Франция',
    Georgia: 'Грузия',
    Germany: 'Германия',
    Indonesia: 'Индонезия',
    Italy: 'Италия',
    Japan: 'Япония',
    Jordan: 'Иордания',
    Kazakhstan: 'Казахстан',
    Kirgizstan: 'Киргизстан',
    Latvia: 'Латвия',
    Lithuania: 'Литва',
    Morocco: 'Марокко',
    Netherlands: 'Нидерланды',
    Norway: 'Норвегия',
    Pakistan: 'Пакистан',
    Portugal: 'Португалия',
    Russia: 'Россия',
    Seychelles: 'Сейшелы',
    Singapore: 'Сингапур',
    'South Africa': 'ЮАР',
    'South Korea': 'Южная Корея',
    Spain: 'Испания',
    'Sri-Lanka': 'Шри-Ланка',
    Sweden: 'Швеция',
    Switzerland: 'Швейцария',
    Taiwan: 'Тайвань',
    Tajikistan: 'Таджикистан',
    Tanzania: 'Танзания',
    Thailand: 'Таиланд',
    Turkey: 'Турция',
    Turkmenistan: 'Туркменистан',
    Uganda: 'Уганда',
    Ukraine: 'Украина',
    UAE: 'ОАЭ',
    'United Arab Emirates': 'ОАЭ',
    'United Kingdom': 'Великобритания',
    'United States': 'США',
    USA: 'США',
    Uzbekistan: 'Узбекистан',
    Zambia: 'Замбия'
  }[countryName] || countryName
}

function renderPublicPricesBody(content, isRu) {
  const factors = isRu
    ? ['Маршрут', 'Класс автомобиля', 'Время подачи', 'Багаж и пассажиры', 'Аэропорт/порт', 'Локальная доступность']
    : ['Route', 'Vehicle class', 'Pickup time', 'Luggage and passengers', 'Airport/port conditions', 'Local availability']
  return `
      <div class="price-layout">
        <article class="policy-panel">
          <div class="sections">
            ${content.sections.map(([title, body]) => `<section class="section-card"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></section>`).join('\n            ')}
          </div>
          <div class="factors" aria-label="${isRu ? 'Факторы цены' : 'Pricing factors'}">
            ${factors.map((item) => `<div class="factor">${escapeHtml(item)}</div>`).join('\n            ')}
          </div>
          <p class="agent-note">${isRu
            ? 'Для AI-агентов правильный сценарий: собрать маршрут и детали поездки, создать заявку-драфт и дождаться подтверждения Riderra. Полная таблица из внутренней базы не нужна публично и не должна использоваться как открытый источник цены.'
            : 'For AI agents, the correct flow is to collect route and trip details, create a draft request, and wait for Riderra confirmation. The full internal database price table is not needed publicly and should not be treated as an open pricing source.'}</p>
        </article>
        <aside class="quote-card">
          <div>
            <h2>${isRu ? 'Нужна точная цена?' : 'Need an exact price?'}</h2>
            <p>${isRu
              ? 'Укажите маршрут, дату, время, пассажиров, багаж и желаемый класс автомобиля. Команда Riderra проверит доступность и подтвердит финальную стоимость.'
              : 'Send the route, date, time, passengers, luggage, and preferred vehicle class. Riderra will review availability and confirm the final price.'}</p>
          </div>
          <div class="quote-actions">
            <a class="button button-primary" href="${isRu ? '/ru' : '/'}">${isRu ? 'Запросить расчет' : 'Request a quote'}</a>
            <a class="button button-secondary" href="${isRu ? '/ru/contact' : '/contact'}">${isRu ? 'Связаться' : 'Contact us'}</a>
          </div>
        </aside>
      </div>`
}

function renderPublicContactBody(content, isRu) {
  return `
      <div class="contact-layout">
        <aside class="contact-primary">
          <h2>${isRu ? 'Напишите нам' : 'Write to us'}</h2>
          <p>${isRu
            ? 'Самый надежный способ связаться с Riderra - отправить письмо с деталями поездки или вопроса. Мы ответим с учетом маршрута, времени и доступности.'
            : 'The best way to reach Riderra is to send an email with trip or support details. We will reply based on the route, timing, and availability.'}</p>
          <a class="contact-email" href="mailto:${RIDERRA_CONTACT_EMAIL}">${RIDERRA_CONTACT_EMAIL}</a>
          <div class="contact-actions">
            <a class="button button-primary" href="${isRu ? '/ru' : '/'}">${isRu ? 'Оформить заявку' : 'Start a booking'}</a>
            <a class="button button-secondary" href="${isRu ? '/ru/faq' : '/faq'}">${isRu ? 'Открыть FAQ' : 'Open FAQ'}</a>
          </div>
        </aside>
        <section class="contact-grid" aria-label="${isRu ? 'Как подготовить обращение' : 'How to prepare a message'}">
          ${content.sections.map(([title, body]) => `<article class="contact-card"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></article>`).join('\n          ')}
        </section>
      </div>`
}

function renderStaticSiteHeader(isRu = false, pagePath = '/') {
  const links = isRu
    ? [
      ['/#howWorks', 'Как мы работаем'],
      ['/#park', 'Классы машин'],
      ['/ru/services', 'Услуги'],
      ['/ru/docs', 'Документация'],
      ['/ru/contact', 'Контакты'],
      ['/drivers', 'Перевозчикам']
    ]
    : [
      ['/#howWorks', 'How we work'],
      ['/#park', 'Cars'],
      ['/services', 'Services'],
      ['/docs', 'Docs'],
      ['/contact', 'Contact'],
      ['/drivers', 'Drivers']
    ]
  const languagePath = (shortcut) => {
    if (shortcut === 'ru') {
      if (pagePath.startsWith('/ru/')) return withLangQuery(pagePath, 'ru')
      if (pagePath.startsWith('/transfers')) return withLangQuery(`/ru${pagePath}`, 'ru')
      return withLangQuery(`/ru${pagePath === '/' ? '' : pagePath}`, 'ru')
    }
    if (shortcut === 'en') {
      if (pagePath.startsWith('/ru/')) return withLangQuery(pagePath.replace(/^\/ru/, '') || '/', 'en')
      return withLangQuery(pagePath, 'en')
    }
    return `/?lang=${shortcut}`
  }
  const languages = [
    ['ru', '🇷🇺', 'Русский'],
    ['en', '🇬🇧', 'English'],
    ['es', '🇪🇸', 'Español'],
    ['de', '🇩🇪', 'Deutsch'],
    ['fr', '🇫🇷', 'Français'],
    ['el', '🇬🇷', 'Ελληνικά'],
    ['th', '🇹🇭', 'ไทย'],
    ['ar', '🇸🇦', 'العربية'],
    ['ha', '🇳🇬', 'Hausa']
  ]
  const currentLanguage = isRu ? languages[0] : languages[1]
  return `
    <header class="header active">
      <div class="header__container container">
        <div class="logo">
          <a class="logo__link" href="/"><img class="logo__img--main" src="/img/logo.svg" alt="riderra"></a>
        </div>
        <div class="lang-select">
          <button class="lang-select__current" type="button" aria-haspopup="true" aria-expanded="false">
            <span class="lang-select__flag">${currentLanguage[1]}</span>
            <span class="lang-select__name">${escapeHtml(currentLanguage[2])}</span>
            <span class="lang-select__arrow" aria-hidden="true">⌄</span>
          </button>
          <div class="lang-select__list" role="menu">
            ${languages.map(([shortcut, flag, name]) => `<a class="lang-select__list-item${shortcut === currentLanguage[0] ? ' active' : ''}" href="${escapeHtml(languagePath(shortcut))}" role="menuitem"><span class="lang-select__list-flag">${flag}</span><span class="lang-select__list-name">${escapeHtml(name)}</span>${shortcut === currentLanguage[0] ? '<span class="lang-select__check">✓</span>' : ''}</a>`).join('\n            ')}
          </div>
        </div>
        <nav class="nav-list" aria-label="${isRu ? 'Навигация' : 'Navigation'}">
          ${links.map(([href, label]) => `<a href="${href}" class="nav-list__item">${escapeHtml(label)}</a>`).join('\n          ')}
        </nav>
        <div class="header__right">
          <a href="/login" class="header__signin">${isRu ? 'Войти' : 'Sign in'}</a>
        </div>
      </div>
    </header>`
}

function staticSiteHeaderCss() {
  return `
      body { padding-top: 72px; }
      .container { margin-right: auto; margin-left: auto; padding-left: 15px; padding-right: 15px; }
      @media (min-width: 992px) { .container { width: 93%; } }
      @media (min-width: 1200px) { .container { width: 1190px; } }
      @media (max-width: 991px) and (min-width: 768px) { .container { width: 90%; padding-right: 0; padding-left: 0; } }
      .header { display: block !important; visibility: visible !important; opacity: 1 !important; transform: translate3d(0, 0, 0) !important; position: fixed !important; z-index: 1000 !important; top: 0 !important; left: 0 !important; right: 0 !important; color: #fff !important; font-weight: 300; padding: 20px 15px; background: linear-gradient(135deg, #1a237e 0%, #0d1421 50%, #000000 100%) !important; transition: 400ms all ease 400ms; will-change: transform, opacity; }
      .header__container { display: flex; align-items: center; margin: 0 auto; }
      .logo__link { display: inline-flex; align-items: center; flex: 0 0 auto; }
      .logo__img--main { display: block; height: auto; }
      .lang-select { margin-left: 25px; position: relative; cursor: pointer; }
      .lang-select__current { appearance: none; border: 0; background: transparent; color: #fff; display: flex; align-items: center; gap: 6px; padding: 0; font: inherit; cursor: pointer; white-space: nowrap; }
      .lang-select__flag { font-size: 18px; margin-right: 6px; line-height: 1; }
      .lang-select__list-flag { font-size: 18px; line-height: 1; }
      .lang-select__arrow { margin-left: 4px; font-size: 13px; line-height: 1; transition: all 250ms ease; }
      .lang-select__list { position: absolute; top: 100%; left: 100%; min-width: 168px; padding: 10px; background: #fff; border-radius: 0 0 5px 5px; color: #000; box-shadow: 0 5px 12px rgba(0,0,0,.4); opacity: 0; pointer-events: none; transform: translateY(4px); transition: 150ms all ease; z-index: 1002; }
      .lang-select:hover .lang-select__list, .lang-select:focus-within .lang-select__list { opacity: 1; pointer-events: auto; transform: translateY(0); }
      .lang-select:hover .lang-select__arrow, .lang-select:focus-within .lang-select__arrow { transform: rotateX(180deg); }
      .lang-select__list-item { display: flex; align-items: center; line-height: 40px; white-space: nowrap; transition: 150ms all ease; padding: 0 10px; border-radius: 5px; gap: 8px; color: #000; text-decoration: none; }
      .lang-select__list-item:hover, .lang-select__list-item:focus-visible { background: #2F80ED; color: #fff; outline: none; }
      .lang-select__list-item.active { background: rgba(47,128,237,.1); }
      .lang-select__list-name { flex: 1; }
      .lang-select__check { color: #FF6B35; font-weight: 800; font-size: 16px; }
      .nav-list { display: flex; margin-left: 16%; align-items: center; flex-wrap: nowrap; }
      .nav-list__item { color: #fff; text-decoration: none; font-size: 16px; line-height: 1.2; font-weight: 300; position: relative; white-space: normal; margin-right: 42px; }
      .nav-list__item:after { content: ''; display: block; height: 1px; background: #fff; width: 0; bottom: -7px; position: absolute; transition: 250ms width; }
      .nav-list__item:hover:after, .nav-list__item:focus-visible:after { width: 100%; }
      .header__right { margin-left: auto; display: flex; align-items: center; flex-shrink: 0; }
      .header__signin { display: inline-block; line-height: 40px; color: #fff; text-decoration: none; font-size: 14px; font-weight: 500; padding: 8px 16px; border: 1px solid rgba(255,255,255,.3); border-radius: 6px; transition: all .2s ease; white-space: nowrap; }
      .header__signin:hover, .header__signin:focus-visible { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.5); color: #fff; outline: none; }
      @media (max-width: 1180px) { .nav-list { margin-left: 8%; } .nav-list__item { margin-right: 24px; font-size: 15px; } }
      @media (max-width: 1024px) { body { padding-top: 84px; } .header { padding-top: 30px; padding-bottom: 30px; } .nav-list { display: none; } }
      @media (max-width: 767px) { body { padding-top: 73px; } .header { padding-top: 25px; padding-bottom: 25px; padding-left: 0; padding-right: 0; } .logo__img--main { max-width: 96px; } .header__right { display: none; } .lang-select { display: none; } }`
}

function seoTransferUrl(pagePath) {
  return riderraAbsoluteUrl(pagePath)
}

function seoTransferByPath(pagePath) {
  pagePath = normalizedTransferPath(pagePath)
  if (pagePath === '/transfers') return { kind: 'index' }
  const country = RIDERRA_SEO_TRANSFERS.countries.find((item) => item.path === pagePath)
  if (country) return { kind: 'country', item: country }
  const airport = RIDERRA_SEO_TRANSFERS.airports.find((item) => item.path === pagePath)
  if (airport) return { kind: 'airport', item: airport }
  const route = RIDERRA_SEO_TRANSFERS.routePages.find((item) => item.path === pagePath)
  if (route) return { kind: 'route', item: route }
  return null
}

function normalizedTransferPath(pagePath = '/transfers') {
  return String(pagePath || '/transfers').replace(/^\/ru(?=\/transfers(?:\/|$))/, '') || '/transfers'
}

function localizedTransferPath(pagePath, isRu = false) {
  const normalized = normalizedTransferPath(pagePath)
  return isRu && normalized.startsWith('/transfers') ? `/ru${normalized}` : normalized
}

function renderSeoTransferRows(routes, { includeAirport = false, limit = 40, isRu = false } = {}) {
  return routes.slice(0, limit).map((route) => `
            <tr>
              ${includeAirport ? `<td><a href="${escapeHtml(localizedTransferPath(route.airportPath, isRu))}">${escapeHtml(route.airportName)}</a></td>` : ''}
              <td>${escapeHtml(route.destination)}</td>
              <td>${escapeHtml(route.minPriceText)}</td>
              <td>${escapeHtml((route.vehicles || []).slice(0, 4).map((item) => item.label || item.vehicleType).join(', ') || 'Private transfer')}</td>
            </tr>`).join('')
}

function seoTransferFaq(page) {
  if (page.kind === 'route') {
    const item = page.item
    return [
      [`How much is a transfer from ${item.airportName} to ${item.destination}?`, `Prices start from ${item.minPriceText}. The final price depends on vehicle class, pickup time, passenger count, luggage, extras, and local availability.`],
      [`How do I meet the driver at ${item.airportName}?`, item.meeting],
      ['Can I book the return transfer?', `Yes. Riderra can arrange the return route from ${item.destination} to ${item.airportName}, subject to availability.`]
    ]
  }
  const label = page.kind === 'airport' ? page.item.airportName : page.kind === 'country' ? page.item.countryName : 'Riderra'
  return [
    [`Are Riderra ${label} transfer prices fixed?`, 'The route price is fixed after Riderra confirms route details, vehicle class, pickup time, passenger count, luggage, extras, and availability.'],
    ['What vehicle classes are available?', 'Availability depends on the route. Common options include standard cars, MPVs, business cars, minivans, minibuses, SUVs, and coaches where available.'],
    ['How does airport pickup work?', page.item?.meeting || 'Riderra sends pickup instructions before the ride and confirms the exact meeting point.']
  ]
}

function seoTransferJsonLd(page, crumbs, faq) {
  const canonical = seoTransferUrl(page.item?.path || '/transfers')
  const serviceName = page.kind === 'route'
    ? `${page.item.airportName} to ${page.item.destination} transfer`
    : page.kind === 'airport'
      ? `${page.item.airportName} transfers`
      : page.kind === 'country'
        ? `Airport transfers in ${page.item.countryName}`
        : 'Riderra airport transfers'
  const description = page.item?.description || 'Private airport transfers with Riderra.'
  const offer = page.item?.minPrice ? {
    '@type': 'Offer',
    price: String(Math.round(page.item.minPrice)),
    priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock',
    url: canonical
  } : {
    '@type': 'Offer',
    availability: 'https://schema.org/InStock',
    url: canonical
  }
  return [
    organizationJsonLd(),
    websiteJsonLd(),
    breadcrumbJsonLd(crumbs),
    {
      '@context': 'https://schema.org',
      '@type': ['Service', 'TaxiService'],
      '@id': `${canonical}#service`,
      name: serviceName,
      description,
      url: canonical,
      provider: { '@id': `${RIDERRA_BASE_URL}/#organization` },
      areaServed: page.item?.countryName || 'Worldwide',
      offers: offer
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: faq.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer }
      }))
    }
  ]
}

function renderSeoTransferPage(pagePath, isRu = false) {
  const normalizedPath = normalizedTransferPath(pagePath)
  const page = seoTransferByPath(normalizedPath)
  if (!page) return null
  const title = page.kind === 'index'
    ? 'Airport transfers by country | Riderra'
    : `${page.item.title} | Riderra`
  const description = page.kind === 'index'
    ? 'Browse Riderra airport transfer pages by country, airport, and popular route. Compare fixed route prices and vehicle classes.'
    : page.item.description
  const heading = page.kind === 'index'
    ? 'Airport transfers by country'
    : page.item.title
  const lead = page.kind === 'route'
    ? `Private transfer from ${page.item.airportName} to ${page.item.destination}, with fixed route pricing from ${page.item.minPriceText} and vehicle options for solo travelers, families, business trips, and groups.`
    : page.kind === 'airport'
      ? `Book private transfers from ${page.item.airportName}. Compare popular destinations, vehicle classes, pickup instructions, and fixed prices from ${page.item.minPriceText}.`
      : page.kind === 'country'
        ? `Browse Riderra airport transfers in ${page.item.countryName}. Compare airports, popular destinations, vehicle classes, and prices from ${page.item.minPriceText}.`
        : 'Browse priority Riderra airport transfer pages grouped by country and airport.'
  const canonical = seoTransferUrl(localizedTransferPath(normalizedPath, isRu))
  const faq = seoTransferFaq(page)
  const crumbs = [
    { name: 'Riderra', path: '/' },
    { name: isRu ? 'Трансферы' : 'Transfers', path: localizedTransferPath('/transfers', isRu) },
    ...(page.kind === 'country' ? [{ name: page.item.countryName, path: localizedTransferPath(page.item.path, isRu) }] : []),
    ...(page.kind === 'airport' ? [
      { name: page.item.countryName, path: localizedTransferPath(`/transfers/${page.item.countrySlug}`, isRu) },
      { name: page.item.airportName, path: localizedTransferPath(page.item.path, isRu) }
    ] : []),
    ...(page.kind === 'route' ? [
      { name: page.item.countryName, path: localizedTransferPath(`/transfers/${page.item.countrySlug}`, isRu) },
      { name: page.item.airportName, path: localizedTransferPath(page.item.airportPath, isRu) },
      { name: page.item.destination, path: localizedTransferPath(page.item.path, isRu) }
    ] : [])
  ]
  const jsonLd = seoTransferJsonLd(page, crumbs, faq)

  const body = page.kind === 'index'
    ? renderSeoTransferIndexBody(isRu)
    : page.kind === 'country'
      ? renderSeoTransferCountryBody(page.item, isRu)
      : page.kind === 'airport'
        ? renderSeoTransferAirportBody(page.item, isRu)
        : renderSeoTransferRouteBody(page.item, isRu)

  return `<!doctype html>
<html lang="${isRu ? 'ru' : 'en'}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${canonical}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Montserrat:300,400,500,700,800&subset=cyrillic-ext">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Riderra">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${canonical}">
    ${jsonLd.map(jsonLdScript).join('\n    ')}
    ${yandexMetrikaHead()}
    <style>
      :root { color-scheme: light; --ink: #17223f; --muted: #65728a; --line: #dbe3f2; --soft: #f5f7fb; --navy: #161d4d; --pink: #d51b7c; --green: #2f7d62; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: 'Montserrat', sans-serif; color: var(--ink); background: #f7f9fd; }
      a { color: #2549d8; }
      ${staticSiteHeaderCss()}
      .wrap { max-width: 1180px; margin: 0 auto; padding: 48px 24px 80px; }
      .hero { padding: 44px 0 30px; }
      .eyebrow { color: var(--pink); font-size: 14px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; margin: 0 0 14px; }
      h1 { margin: 0; max-width: 940px; font-size: clamp(38px, 6vw, 70px); line-height: 1; letter-spacing: 0; }
      .lead { max-width: 820px; margin: 22px 0 0; font-size: 20px; line-height: 1.65; color: var(--muted); }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin: 28px 0; }
      .card, .panel { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 24px; box-shadow: 0 18px 60px rgba(20,35,90,.08); }
      .card h2, .panel h2 { margin: 0 0 12px; font-size: 22px; }
      p { font-size: 16px; line-height: 1.7; color: var(--muted); margin: 0; }
      .metric { display: block; margin-top: 12px; color: var(--ink); font-size: 26px; font-weight: 900; }
      table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
      th, td { padding: 14px 16px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; font-size: 15px; }
      th { background: var(--soft); color: #243253; font-weight: 900; }
      tr:last-child td { border-bottom: 0; }
      .two-col { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(280px, .7fr); gap: 22px; margin-top: 28px; }
      .vehicle-list { display: grid; gap: 10px; margin-top: 14px; }
      .vehicle { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); }
      .cta { margin-top: 28px; background: linear-gradient(135deg, var(--navy), #0b1022); color: #fff; border-radius: 8px; padding: 28px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
      .cta p { color: rgba(255,255,255,.78); }
      .button { display: inline-flex; min-height: 48px; align-items: center; justify-content: center; padding: 0 18px; border-radius: 8px; background: #fff; color: var(--navy); text-decoration: none; font-weight: 900; white-space: nowrap; }
      .faq { display: grid; gap: 14px; margin-top: 28px; }
      .faq article { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 20px; }
      .faq h2, .faq h3 { margin: 0 0 10px; font-size: 20px; }
      .breadcrumbs { color: var(--muted); margin-bottom: 20px; font-size: 14px; }
      .breadcrumbs a { color: var(--muted); text-decoration: none; }
      @media (max-width: 900px) { .topbar-inner { flex-direction: column; align-items: flex-start; } .nav { justify-content: flex-start; } .grid, .two-col { grid-template-columns: 1fr; } .cta { align-items: flex-start; flex-direction: column; } }
      @media (max-width: 767px) { .wrap { padding: 34px 18px 56px; } th, td { padding: 12px 10px; font-size: 14px; } .brand { font-size: 30px; } .nav { gap: 14px; } }
    </style>
  </head>
  <body>
    ${yandexMetrikaNoScript()}
    ${renderStaticSiteHeader(isRu, localizedTransferPath(normalizedPath, isRu))}
    <main class="wrap">
      <nav class="breadcrumbs" aria-label="Breadcrumb">${crumbs.map((crumb, index) => index === crumbs.length - 1 ? escapeHtml(crumb.name) : `<a href="${escapeHtml(crumb.path)}">${escapeHtml(crumb.name)}</a> / `).join('')}</nav>
      <section class="hero">
        <p class="eyebrow">${isRu ? 'Трансферы Riderra' : 'Riderra airport transfers'}</p>
        <h1>${escapeHtml(heading)}</h1>
        <p class="lead">${escapeHtml(lead)}</p>
      </section>
      ${body}
      <section class="faq" aria-label="FAQ">
        ${faq.map(([question, answer]) => `<article><h2>${escapeHtml(question)}</h2><p>${escapeHtml(answer)}</p></article>`).join('\n        ')}
      </section>
      <section class="cta">
        <div><h2>${isRu ? 'Нужен подтвержденный трансфер?' : 'Need a confirmed transfer?'}</h2><p>${isRu ? 'Отправьте маршрут, время подачи, пассажиров, багаж и желаемый класс машины. Riderra проверит доступность и подтвердит финальную цену.' : 'Send route, pickup time, passengers, luggage, and preferred vehicle class. Riderra checks availability and confirms the final price.'}</p></div>
        <a class="button" href="${isRu ? '/ru' : '/'}">${isRu ? 'Запросить расчет' : 'Request a quote'}</a>
      </section>
    </main>
  </body>
</html>`
}

function renderSeoTransferIndexBody(isRu = false) {
  return `
      <section class="grid">
        ${RIDERRA_SEO_TRANSFERS.countries.map((country) => `<article class="card"><h2><a href="${escapeHtml(localizedTransferPath(country.path, isRu))}">${escapeHtml(isRu ? countryLabelRu(country.countryName) : country.countryName)}</a></h2><p>${escapeHtml(country.airportCount)} ${isRu ? 'аэропортов и' : 'airports and'} ${escapeHtml(country.routeCount)} ${isRu ? 'маршрутов с ценами' : 'priced routes'}.</p><span class="metric">${isRu ? 'от' : 'from'} ${escapeHtml(country.minPriceText)}</span></article>`).join('\n        ')}
      </section>`
}

function renderSeoTransferCountryBody(country, isRu = false) {
  return `
      <section class="grid">
        <article class="card"><h2>Airports</h2><p>Priority airport transfer pages in ${escapeHtml(country.countryName)}.</p><span class="metric">${escapeHtml(country.airportCount)}</span></article>
        <article class="card"><h2>Priced routes</h2><p>Grouped airport-to-destination routes from Riderra's internal price book.</p><span class="metric">${escapeHtml(country.routeCount)}</span></article>
        <article class="card"><h2>Pickup</h2><p>${escapeHtml(country.meeting)}</p></article>
      </section>
      <div class="two-col">
        <section class="panel"><h2>${escapeHtml(isRu ? countryLabelRu(country.countryName) : country.countryName)} airports</h2><table><thead><tr><th>Airport</th><th>Routes</th><th>Prices</th></tr></thead><tbody>${country.airports.map((airport) => `<tr><td><a href="${escapeHtml(localizedTransferPath(airport.path, isRu))}">${escapeHtml(airport.airportName)}</a></td><td>${escapeHtml(airport.routeCount)}</td><td>from ${escapeHtml(airport.minPriceText)}</td></tr>`).join('')}</tbody></table></section>
        <aside class="panel"><h2>Popular routes</h2><table><thead><tr><th>Airport</th><th>Destination</th><th>From</th></tr></thead><tbody>${country.popularRoutes.map((route) => `<tr><td><a href="${escapeHtml(localizedTransferPath(route.airportPath, isRu))}">${escapeHtml(route.airportCode)}</a></td><td>${escapeHtml(route.destination)}</td><td>${escapeHtml(route.minPriceText)}</td></tr>`).join('')}</tbody></table></aside>
      </div>`
}

function renderSeoTransferAirportBody(airport, isRu = false) {
  return `
      <section class="grid">
        <article class="card"><h2>Destinations</h2><p>Priced routes from ${escapeHtml(airport.airportName)}.</p><span class="metric">${escapeHtml(airport.routeCount)}</span></article>
        <article class="card"><h2>Starting price</h2><p>Lowest available route price in the current price book.</p><span class="metric">${escapeHtml(airport.minPriceText)}</span></article>
        <article class="card"><h2>Airport pickup</h2><p>${escapeHtml(airport.meeting)}</p></article>
      </section>
      <div class="two-col">
        <section class="panel"><h2>Popular destinations</h2><table><thead><tr><th>Destination</th><th>From</th><th>Vehicle options</th></tr></thead><tbody>${renderSeoTransferRows(airport.popularRoutes, { limit: 12, isRu })}</tbody></table></section>
        <aside class="panel"><h2>Vehicle classes</h2><div class="vehicle-list">${compactVehicleSummary(airport.routes).map((item) => `<div class="vehicle"><span>${escapeHtml(item.label)}</span><strong>from ${escapeHtml(item.priceText)}</strong></div>`).join('')}</div></aside>
      </div>
      <section class="panel"><h2>All priced routes from ${escapeHtml(airport.airportName)}</h2><table><thead><tr><th>Destination</th><th>From</th><th>Vehicle options</th></tr></thead><tbody>${renderSeoTransferRows(airport.routes, { limit: 80, isRu })}</tbody></table></section>`
}

function compactVehicleSummary(routes) {
  const best = new Map()
  for (const route of routes) {
    for (const vehicle of route.vehicles || []) {
      const current = best.get(vehicle.label)
      if (!current || vehicle.price < current.price) best.set(vehicle.label, vehicle)
    }
  }
  return Array.from(best.values()).sort((a, b) => a.price - b.price).slice(0, 10)
}

function renderSeoTransferRouteBody(route, isRu = false) {
  return `
      <section class="grid">
        <article class="card"><h2>Route price</h2><p>Current starting price from Riderra's internal price book.</p><span class="metric">${escapeHtml(route.minPriceText)}</span></article>
        <article class="card"><h2>Pickup</h2><p>${escapeHtml(route.meeting)}</p></article>
        <article class="card"><h2>Return transfer</h2><p>Riderra can arrange ${escapeHtml(route.destination)} to ${escapeHtml(route.airportName)} as a return transfer after route review.</p></article>
      </section>
      <div class="two-col">
        <section class="panel"><h2>Vehicle options</h2><div class="vehicle-list">${route.vehicles.map((item) => `<div class="vehicle"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.priceText)}</strong></div>`).join('')}</div></section>
        <aside class="panel"><h2>Related routes</h2><table><thead><tr><th>Destination</th><th>From</th></tr></thead><tbody>${route.relatedRoutes.map((item) => `<tr><td><a href="${escapeHtml(localizedTransferPath(item.path, isRu))}">${escapeHtml(item.destination)}</a></td><td>${escapeHtml(item.minPriceText)}</td></tr>`).join('')}</tbody></table></aside>
      </div>`
}

function publicRiderraProfile() {
  return {
    name: 'Riderra',
    url: RIDERRA_BASE_URL,
    email: RIDERRA_CONTACT_EMAIL,
    type: 'global transfer booking network',
    description: 'Riderra organizes private passenger transfers through a global network of fleets and an operations team.',
    areaServed: 'Worldwide: 250+ cities in 50 countries',
    services: RIDERRA_SERVICES,
    pricingPolicy: 'Final price is confirmed after route, vehicle class, pickup time, extras, and availability are checked.',
    bookingPolicy: 'Public AI-agent requests create draft requests only. Riderra reviews and confirms availability and final price before execution.',
    sourcesOfTruth: RIDERRA_PUBLIC_PAGES.map((page) => riderraAbsoluteUrl(page.path))
  }
}

function publicSourceTruth() {
  return {
    name: 'Riderra',
    canonicalWebsite: `${RIDERRA_BASE_URL}/`,
    contactEmail: RIDERRA_CONTACT_EMAIL,
    policy: 'Riderra-owned pages and public API endpoints are the authoritative sources for booking policy, pricing policy, contact details, and AI-agent request flow.',
    lastReviewedAt: '2026-05-27',
    sourceTypes: {
      authoritative: 'Owned Riderra web/API source.',
      web_verified: 'External profile found publicly and matching Riderra website/name signals.',
      declared_owned: 'External profile declared by Riderra source metadata; should be periodically checked.'
    },
    sources: RIDERRA_PUBLIC_SOURCES
  }
}

function publicPricingHints() {
  return {
    policy: 'Riderra does not publish the full internal price book. Final price is confirmed by Riderra after review.',
    safeForAgents: [
      'Tell users that price depends on route, vehicle class, pickup time, extras, passenger/luggage count, waiting conditions, and availability.',
      'Submit a draft request through /api/public/order-requests when a concrete route is known.',
      'Do not invent a final price and do not promise availability.'
    ],
    factors: [
      'route',
      'vehicleClass',
      'pickupAt',
      'passengers',
      'luggage',
      'flightOrPortDetails',
      'meetAndGreet',
      'waitingTime',
      'childSeats',
      'localAvailability'
    ],
    prohibited: [
      'full public price book',
      'final quote without Riderra confirmation',
      'confirmed booking without human/operator approval'
    ],
    nextStep: 'Use POST /api/public/order-requests to create a draft request for Riderra review.'
  }
}

function publicAgentManifest() {
  return {
    name: 'Riderra Public AI Agent Manifest',
    version: '1.0.0',
    canonicalWebsite: RIDERRA_BASE_URL,
    contactEmail: RIDERRA_CONTACT_EMAIL,
    purpose: 'Help external AI agents understand Riderra and submit draft transfer requests without bypassing Riderra operator review.',
    sourceOfTruth: {
      publicProfile: `${RIDERRA_BASE_URL}/api/public/riderra-profile`,
      services: `${RIDERRA_BASE_URL}/api/public/services`,
      pricingHints: `${RIDERRA_BASE_URL}/api/public/pricing-hints`,
      sourceTruth: `${RIDERRA_BASE_URL}/api/public/source-truth`,
      orderRequestSchema: `${RIDERRA_BASE_URL}/api/public/order-request-schema`,
      openapi: `${RIDERRA_BASE_URL}/api/public/openapi.json`,
      llms: `${RIDERRA_BASE_URL}/llms.txt`
    },
    executionPolicy: {
      publicRequestsCreateDraftsOnly: true,
      confirmedBookingRequiresRiderraReview: true,
      finalPriceRequiresRiderraReview: true,
      noAutonomousOutboundCommunication: true,
      noPublicFullPriceBook: true
    },
    publicCapabilities: [
      {
        capability: 'riderra.public.order_request.validate',
        method: 'POST',
        endpoint: '/api/public/order-requests/validate',
        sideEffect: false,
        approval: 'not_required',
        result: 'Validates a draft request payload without creating a booking.'
      },
      {
        capability: 'riderra.public.order_request.create_draft',
        method: 'POST',
        endpoint: '/api/public/order-requests',
        sideEffect: true,
        approval: 'operator_review_before_booking',
        result: 'Creates a draft request for Riderra review. It is not a confirmed booking.'
      },
      {
        capability: 'riderra.public.order_request.status',
        method: 'GET',
        endpoint: '/api/public/order-requests/{requestId}/status?email={email}',
        sideEffect: false,
        approval: 'contact_verification_required',
        result: 'Returns draft request status after contact verification.'
      }
    ],
    prohibitedForPublicAgents: [
      'quote_final_price',
      'confirm_booking',
      'change_or_cancel_order',
      'send_customer_or_driver_message',
      'access_internal_price_book',
      'access_admin_api',
      'perform_payment_or_billing_action'
    ],
    recommendedFlow: [
      'Read /llms.txt and /api/public/agent-manifest.',
      'Collect route, pickup time, passenger, luggage, vehicle, and flight details.',
      'Validate the payload with POST /api/public/order-requests/validate.',
      'Submit one draft with POST /api/public/order-requests and a stable Idempotency-Key.',
      'Tell the user Riderra will review availability and final price.'
    ]
  }
}

function orderRequestSchema() {
  return {
    endpoint: `${RIDERRA_BASE_URL}/api/public/order-requests`,
    validateEndpoint: `${RIDERRA_BASE_URL}/api/public/order-requests/validate`,
    statusEndpoint: `${RIDERRA_BASE_URL}/api/public/order-requests/{requestId}/status?email={email}`,
    method: 'POST',
    statusCreated: 'draft_received',
    note: 'This endpoint creates a draft request, not a confirmed booking.',
    idempotency: {
      header: 'Idempotency-Key',
      recommendation: 'Send a stable unique key per intended draft request. Replays return the original requestId and idempotent=true.'
    },
    required: ['name', 'email', 'phone', 'fromPoint', 'toPoint', 'pickupAt'],
    optional: ['passengers', 'luggage', 'vehicleClass', 'flightNumber', 'comment', 'agentName', 'agentContact', 'sourceUrl'],
    fields: {
      name: 'Customer or passenger name',
      email: 'Customer or responsible contact email',
      phone: 'Customer or responsible contact phone',
      fromPoint: 'Pickup address, airport, port, station, hotel, or city point',
      toPoint: 'Drop-off address, airport, port, station, hotel, or city point',
      pickupAt: 'ISO 8601 pickup date/time. Include timezone when possible.',
      passengers: 'Number of passengers',
      luggage: 'Number of luggage items',
      vehicleClass: 'Preferred vehicle class',
      flightNumber: 'Flight, train, or ship number if relevant',
      comment: 'Operational notes',
      agentName: 'Name of the AI agent or integration submitting the draft',
      agentContact: 'Contact for the submitting agent or operator',
      sourceUrl: 'URL where the request context came from'
    }
  }
}

function publicOpenApiSpec() {
  const schemaProperties = Object.entries(orderRequestSchema().fields).reduce((acc, [key, description]) => {
    acc[key] = {
      type: ['passengers', 'luggage'].includes(key) ? 'integer' : 'string',
      description
    }
    return acc
  }, {})
  return {
    openapi: '3.0.3',
    info: {
      title: 'Riderra Public AI Agent API',
      version: '1.0.0',
      description: 'Public machine-readable API for understanding Riderra and submitting draft transfer requests. Draft requests are not confirmed bookings.'
    },
    servers: [{ url: RIDERRA_BASE_URL }],
    paths: {
      '/api/public/riderra-profile': {
        get: {
          summary: 'Get Riderra public profile',
          responses: { 200: { description: 'Riderra public profile' } }
        }
      },
      '/api/public/services': {
        get: {
          summary: 'List public transfer services',
          responses: { 200: { description: 'Public services and booking policy' } }
        }
      },
      '/api/public/pricing-hints': {
        get: {
          summary: 'Get non-disclosing pricing guidance',
          responses: { 200: { description: 'Pricing policy and safe agent guidance' } }
        }
      },
      '/api/public/source-truth': {
        get: {
          summary: 'Get Riderra public source registry',
          responses: { 200: { description: 'Owned and declared public sources of truth' } }
        }
      },
      '/api/public/agent-manifest': {
        get: {
          summary: 'Get public AI agent capability and safety manifest',
          responses: { 200: { description: 'Public AI agent manifest' } }
        }
      },
      '/api/public/order-request-schema': {
        get: {
          summary: 'Get order request field schema',
          responses: { 200: { description: 'Draft request schema' } }
        }
      },
      '/api/public/order-requests/validate': {
        post: {
          summary: 'Validate a draft request without creating it',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/PublicOrderRequestInput' }
              }
            }
          },
          responses: {
            200: { description: 'Payload is valid' },
            400: { description: 'Payload is invalid' }
          }
        }
      },
      '/api/public/order-requests': {
        post: {
          summary: 'Create a draft transfer request',
          description: 'Creates a Request draft only. Riderra reviews availability and final price before execution.',
          parameters: [{
            in: 'header',
            name: 'Idempotency-Key',
            schema: { type: 'string' },
            required: false,
            description: 'Stable unique key per intended draft request. Replays return the original requestId.'
          }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/PublicOrderRequestInput' }
              }
            }
          },
          responses: {
            201: { description: 'Draft request created' },
            200: { description: 'Idempotent replay of an existing draft request' },
            400: { description: 'Invalid request' }
          }
        }
      },
      '/api/public/order-requests/{requestId}/status': {
        get: {
          summary: 'Check draft request status',
          parameters: [
            { in: 'path', name: 'requestId', required: true, schema: { type: 'string' } },
            { in: 'query', name: 'email', required: false, schema: { type: 'string' } },
            { in: 'query', name: 'phone', required: false, schema: { type: 'string' } }
          ],
          responses: {
            200: { description: 'Draft status' },
            400: { description: 'Missing contact verification' },
            404: { description: 'Request not found' }
          }
        }
      }
    },
    components: {
      schemas: {
        PublicOrderRequestInput: {
          type: 'object',
          required: orderRequestSchema().required,
          properties: schemaProperties,
          additionalProperties: false
        }
      }
    }
  }
}

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
          ${isEn ? '<a href="/privacy-policy/ru">RU</a><span>EN</span>' : '<span>RU</span><a href="/privacy-policy/en">EN</a>'}
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

module.exports = {
  isCrawlerRequest,
  orderRequestSchema,
  preferredLanguageFromRequest,
  publicAgentManifest,
  publicOpenApiSpec,
  publicPricingHints,
  publicRiderraProfile,
  publicSourceTruth,
  renderDataDeletionHtml,
  renderPrivacyPolicyHtml,
  renderPublicSourceHtml,
  renderSeoTransferPage,
  renderTermsHtml,
  RIDERRA_PUBLIC_PAGES,
  RIDERRA_SEO_TRANSFERS,
  RIDERRA_SERVICES,
  riderraAbsoluteUrl
}
