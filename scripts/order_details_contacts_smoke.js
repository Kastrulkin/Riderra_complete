const assert = require('assert')
const { extractOrderDetailsContacts } = require('../server/utils/orderDetailsContacts')

const rows = [
  ['MQMNVX-1 (Los Angeles SUV A)', 'Name:Haja Sourbah'],
  ['', 'Phone number:+447415353038'],
  ['24.07.26 18:33', 'Journey code:MQMNVX-1'],
  ['NEXT-1 (HEL PT A)', 'Booking ID:', 'NEXT-1'],
  ['', 'Passenger'],
  ['', 'Name:', 'Next Passenger'],
  ['', 'Mobile number:', '491234567890'],
  ['860799954 (HEL PT A)', 'Booking ID:', '860799954'],
  ['', 'Category:', 'Standard'],
  ['', 'Passenger'],
  ['', 'Name:', 'Ronald Olson'],
  ['', 'Mobile number:', '13602807143']
]

const contacts = extractOrderDetailsContacts(rows, ['MQMNVX-1', '860799954', 'NEXT-1'])
assert.deepStrictEqual(contacts.get('MQMNVX-1'), { customerName: 'Haja Sourbah', customerPhone: '+447415353038', sourceRow: 1 })
assert.deepStrictEqual(contacts.get('NEXT-1'), { customerName: 'Next Passenger', customerPhone: '+491234567890', sourceRow: 4 })
assert.deepStrictEqual(contacts.get('860799954'), { customerName: 'Ronald Olson', customerPhone: '+13602807143', sourceRow: 8 })
console.log('Order details contact parser smoke passed')
