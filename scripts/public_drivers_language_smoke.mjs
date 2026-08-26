import fs from 'node:fs'
import vm from 'node:vm'

const source = fs
  .readFileSync(new URL('../utils/driversCopy.js', import.meta.url), 'utf8')
  .replace('export default driversCopy', 'driversCopy')
const copy = vm.runInNewContext(source, {}, { filename: 'utils/driversCopy.js' })

const languages = ['ru', 'en', 'es', 'de', 'fr', 'el', 'th', 'ar', 'ha']
const required = [
  'eyebrow', 'title', 'lead', 'startButton', 'loginButton', 'applicationTitle',
  'companySection', 'ratesSection', 'detailsSection', 'submit', 'error'
]
const missing = []
const englishLeaks = []

for (const lang of languages) {
  const values = copy[lang]
  if (!values) {
    missing.push(`${lang}: locale is missing`)
    continue
  }
  for (const key of required) {
    if (typeof values[key] !== 'string' || !values[key].trim()) missing.push(`${lang}.${key}`)
  }
  if (!Array.isArray(values.steps) || values.steps.length !== 3) missing.push(`${lang}.steps`)
  if (lang !== 'en') {
    for (const key of ['eyebrow', 'title', 'lead', 'startButton', 'applicationTitle', 'submit']) {
      if (values[key] === copy.en[key]) englishLeaks.push(`${lang}.${key}`)
    }
  }
}

if (missing.length || englishLeaks.length) {
  missing.forEach((item) => console.error(`Missing drivers translation: ${item}`))
  englishLeaks.forEach((item) => console.error(`English fallback leaked into drivers translation: ${item}`))
  process.exit(1)
}

console.log(`Drivers language smoke passed for ${languages.join(', ')}`)
