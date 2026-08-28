const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../server/index.js'), 'utf8')
const start = source.indexOf('async function syncOrderContactsFromDetailsTab')
const end = source.indexOf('\nasync function syncSheetSource', start)

assert.ok(start >= 0 && end > start, 'Order details contact sync function must exist')

const contactSync = source.slice(start, end)

assert.match(
  contactSync,
  /prisma\.order\.update/,
  'The details-tab sync must update the order contact'
)

assert.match(
  contactSync,
  /chatTask\.updateMany/,
  'BUG: a contact imported after chat creation is saved on the order but is not propagated to eligible unsent chat tasks'
)

assert.match(
  contactSync,
  /recipientSource[^\n]*(?:null|order)|(?:null|order)[^\n]*recipientSource/,
  'Contact sync must preserve manually selected and test recipients'
)

assert.match(
  contactSync,
  /approvalStatus[^\n]*sent|sent[^\n]*approvalStatus/,
  'Contact sync must not change the recipient after an outbound message was sent'
)

console.log('Order details contact-to-chat synchronization guard passed')
