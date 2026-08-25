const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SOURCE_DIRS = ['pages', 'components', 'layouts', 'server/services']
const SOURCE_EXTENSIONS = new Set(['.vue', '.js'])
const LEGACY_PATTERNS = [
  ['legacy purple', /#702283/i],
  ['legacy pink', /#e5006d/i],
  ['Bootstrap primary blue', /#007bff/i],
  ['Bootstrap primary hover', /#0056b3/i],
  ['unapproved bright blue', /#3152ff/i],
  ['legacy logo asset', /logo_n\.svg/i]
]

function sourceFiles (directory) {
  const absolute = path.join(ROOT, directory)
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(relative)
    return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [relative] : []
  })
}

const files = SOURCE_DIRS.flatMap(sourceFiles)
const violations = []

for (const file of files) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8')
  for (const [label, pattern] of LEGACY_PATTERNS) {
    if (pattern.test(text)) violations.push(`${file}: ${label}`)
  }
}

const globalStyles = fs.readFileSync(path.join(ROOT, 'assets/css/main.scss'), 'utf8')
for (const token of ['--riderra-gradient', '--riderra-cta', '--riderra-blue', '--riderra-radius-surface']) {
  if (!globalStyles.includes(token)) violations.push(`assets/css/main.scss: missing ${token}`)
}

for (const file of ['server/services/partnerHubService.js', 'server/services/vendorWikiService.js']) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8')
  if (!text.includes('/img/logo.svg')) violations.push(`${file}: missing primary Riderra logo`)
  if (!text.includes("font-family:'Montserrat'")) violations.push(`${file}: missing Montserrat`)
}

if (violations.length) {
  console.error(violations.join('\n'))
  process.exit(1)
}

console.log(`OK Riderra design system (${files.length} interface source files checked)`)
