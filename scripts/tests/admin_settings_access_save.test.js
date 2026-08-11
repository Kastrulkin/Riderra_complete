const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

function loadSaveStaffAbacMethod () {
  const pagePath = path.resolve(__dirname, '../../pages/admin-settings.vue')
  const source = fs.readFileSync(pagePath, 'utf8')
  const match = source.match(/    async saveStaffAbac \(user\) \{[\s\S]*?\n    \},\n    isAccessAreaSelected/)

  assert.ok(match, 'saveStaffAbac method must remain discoverable in admin-settings.vue')

  const methodSource = match[0].replace(/,\n    isAccessAreaSelected$/, '')
  return Function(`"use strict"; return ({${methodSource}}).saveStaffAbac`)()
}

test('saving one employee keeps unsaved access selections for other employees', async () => {
  const saveStaffAbac = loadSaveStaffAbacMethod()
  const persisted = {
    employeeOne: ['all'],
    employeeTwo: ['all']
  }
  const context = {
    $store: { state: { language: 'ru' } },
    staffNotice: { type: 'ok', text: '' },
    savingAccessId: null,
    abacDrafts: {
      employeeOne: { teams: ['finance'] },
      employeeTwo: { teams: ['sales', 'audit'] }
    },
    headers: () => ({ Authorization: 'Bearer test' }),
    async jsonRequest (url, options) {
      const userId = url.split('/').at(-2)
      persisted[userId] = JSON.parse(options.body).teams
      return { user: { id: userId, abacTeams: [...persisted[userId]] } }
    },
    async load () {
      this.abacDrafts = Object.fromEntries(
        Object.entries(persisted).map(([userId, teams]) => [userId, { teams: [...teams] }])
      )
    }
  }

  await saveStaffAbac.call(context, { id: 'employeeOne', email: 'one@example.com' })

  assert.deepEqual(context.abacDrafts.employeeOne.teams, ['finance'])
  assert.deepEqual(
    context.abacDrafts.employeeTwo.teams,
    ['sales', 'audit'],
    'the second employee draft must survive saving the first employee'
  )
})
