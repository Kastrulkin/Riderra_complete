import fs from 'node:fs'
import vm from 'node:vm'

const source = fs
  .readFileSync(new URL('../static/lang.js', import.meta.url), 'utf8')
  .replace('export const data =', 'const data =')
const data = vm.runInNewContext(`${source}\ndata`, {}, { filename: 'static/lang.js' })

const languagesInSwitcher = ['ru', 'en', 'es', 'de', 'fr', 'el', 'th', 'ar', 'ha']
const requiredPaths = [
  'main.title',
  'main.titleAccent',
  'main.badge',
  'main.description',
  'main.orderButton',
  'gallery.title',
  'whyWe.title',
  'reviews.title',
  'partners.title',
  'questions.title',
  'questions.description',
  'orderTitle',
  'howwework',
  'park',
  'publicLinks.services',
  'publicLinks.prices',
  'publicLinks.docs',
  'publicLinks.contact',
  'publicLinks.drivers',
  'publicLinks.choose',
  'fleetCars.standard.title',
  'fleetCars.standard.desc',
  'fleetCars.bus.title',
  'fleetCars.bus.desc',
  'fleetCars.electric_standard.title',
  'fleetCars.electric_standard.desc',
  'bookingTabs.route',
  'bookingTabs.transport',
  'cars.economy.title',
  'cars.bus.description'
]

const readPath = (source, path) => path.split('.').reduce((value, key) => value && value[key], source)
const missing = []
const englishLeaks = []

for (const lang of languagesInSwitcher) {
  const langData = data[lang]
  if (!langData) {
    missing.push(`${lang}: language data is missing`)
    continue
  }

  for (const path of requiredPaths) {
    const value = readPath(langData, path)
    if (typeof value !== 'string' || !value.trim()) {
      missing.push(`${lang}.${path}`)
    }
  }

  if (lang !== 'en') {
    for (const path of ['main.title', 'main.titleAccent', 'main.badge', 'orderTitle', 'publicLinks.services', 'publicLinks.choose', 'fleetCars.standard.desc', 'bookingTabs.route']) {
      if (readPath(langData, path) === readPath(data.en, path)) {
        englishLeaks.push(`${lang}.${path}`)
      }
    }
  }
}

if (missing.length || englishLeaks.length) {
  if (missing.length) {
    console.error('Missing public language fields:')
    missing.forEach((item) => console.error(`- ${item}`))
  }

  if (englishLeaks.length) {
    console.error('Fields still equal English in non-English locales:')
    englishLeaks.forEach((item) => console.error(`- ${item}`))
  }

  process.exit(1)
}

console.log(`Public language smoke passed for ${languagesInSwitcher.join(', ')}`)
