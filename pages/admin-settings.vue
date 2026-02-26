<template>
  <div>
    <navigation></navigation>
    <div class="page-background"><div class="page-background__gradient"></div><div class="page-background__overlay"></div></div>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <h1 class="h2">{{ t.title }}</h1>
        <admin-tabs />

        <div class="card">
          <h3>{{ t.sheetSources }}</h3>
          <div v-if="sheetNotice.text" class="notice" :class="sheetNotice.type === 'error' ? 'notice--error' : 'notice--ok'">
            {{ sheetNotice.text }}
          </div>
          <div class="toolbar">
            <input v-model="sheetForm.name" class="input" :placeholder="t.sheetName" />
            <input v-model="sheetForm.monthLabel" class="input" :placeholder="t.sheetMonth" />
            <input v-model="sheetForm.googleSheetId" class="input" :placeholder="t.sheetId" />
            <input v-model="sheetForm.tabName" class="input" :placeholder="t.sheetTab" />
            <input v-model="sheetForm.detailsTabName" class="input" :placeholder="t.detailsTab" />
            <button class="btn btn--primary" @click="createSheetSource">{{ t.add }}</button>
          </div>

          <div class="table-wrap">
            <div class="grid-head seven-cols">
              <div>{{ t.name }}</div><div>{{ t.month }}</div><div>Sheet ID</div><div>Tab</div><div>{{ t.detailsTab }}</div><div>{{ t.status }}</div><div>{{ t.actions }}</div>
            </div>
            <div v-for="s in sheets" :key="s.id" class="grid-row seven-cols">
              <div>{{ s.name }}</div>
              <div>{{ s.monthLabel }}</div>
              <div class="cell-wrap" :title="s.googleSheetId">{{ shortSheetId(s.googleSheetId) }}</div>
              <div>{{ s.tabName }}</div>
              <div>{{ s.detailsTabName || 'подробности' }}</div>
              <div>
                <div>{{ s.isActive ? 'active' : 'off' }}</div>
                <div class="muted" v-if="s.lastSyncStatus">{{ s.lastSyncStatus }}</div>
                <div class="muted muted--error" v-if="s.lastSyncError">{{ s.lastSyncError }}</div>
              </div>
              <div class="row-actions">
                <button
                  class="btn btn--small btn--primary"
                  :disabled="syncingSheetId === s.id"
                  @click="syncSheet(s.id)"
                >
                  {{ syncingSheetId === s.id ? t.syncing : t.sync }}
                </button>
                <button class="btn btn--small" @click="openMapping(s)">{{ t.mapping }}</button>
                <button class="btn btn--small" @click="toggleSheet(s)">{{ s.isActive ? t.deactivate : t.activate }}</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>{{ t.staffTelegram }}</h3>
          <div v-if="staffNotice.text" class="notice" :class="staffNotice.type === 'error' ? 'notice--error' : 'notice--ok'">
            {{ staffNotice.text }}
          </div>
          <div class="table-wrap">
            <div class="grid-head seven-staff-cols">
              <div>{{ t.email }}</div>
              <div>{{ t.roles }}</div>
              <div>{{ t.telegramId }}</div>
              <div>{{ t.abacCountries }}</div>
              <div>{{ t.abacCities }}</div>
              <div>{{ t.abacTeams }}</div>
              <div>{{ t.actions }}</div>
            </div>
            <div v-for="u in staff" :key="u.id" class="grid-row seven-staff-cols">
              <div>{{ u.email }}</div>
              <div>{{ (u.roles || []).join(', ') || '-' }}</div>
              <div>
                <input
                  v-model="staffDrafts[u.id]"
                  class="input"
                  :placeholder="t.telegramId"
                />
              </div>
              <div>
                <input
                  v-model="abacDrafts[u.id].countries"
                  class="input"
                  :placeholder="t.abacCountriesPlaceholder"
                />
              </div>
              <div>
                <input
                  v-model="abacDrafts[u.id].cities"
                  class="input"
                  :placeholder="t.abacCitiesPlaceholder"
                />
              </div>
              <div>
                <input
                  v-model="abacDrafts[u.id].teams"
                  class="input"
                  :placeholder="t.abacTeamsPlaceholder"
                />
              </div>
              <div class="row-actions">
                <button class="btn btn--small btn--primary" @click="saveStaffLink(u)">{{ t.save }}</button>
                <button class="btn btn--small" @click="saveStaffAbac(u)">{{ t.saveScopes }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="mappingModal.open" class="modal-overlay" @click="closeMapping">
      <div class="modal" @click.stop>
        <h3>{{ t.mappingTitle }}: {{ mappingModal.sourceName }}</h3>
        <div class="map-grid">
          <div class="map-row" v-for="f in mappingFields" :key="f.key">
            <div class="map-label">{{ f.label }}</div>
            <input v-model="mapDraft[f.key]" class="input" :placeholder="f.placeholder" />
          </div>
        </div>
        <div class="row-actions">
          <button class="btn btn--primary" @click="saveMapping">{{ t.save }}</button>
          <button class="btn" @click="closeMapping">{{ t.close }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import navigation from '~/components/partials/nav.vue'
import adminTabs from '~/components/partials/adminTabs.vue'

export default {
  middleware: 'staff',
  components: { navigation, adminTabs },
  data: () => ({
    sheets: [],
    staff: [],
    sheetForm: { name: '', monthLabel: '', googleSheetId: '', tabName: 'таблица', detailsTabName: 'подробности' },
    staffDrafts: {},
    abacDrafts: {},
    syncingSheetId: null,
    sheetNotice: { type: 'ok', text: '' },
    staffNotice: { type: 'ok', text: '' },
    mappingModal: { open: false, sourceId: '', sourceName: '' },
    mapDraft: {
      contractor: '', orderNumber: '', date: '', fromPoint: '', toPoint: '',
      sum: '', driver: '', comment: '', internalOrderNumber: '', vehicleType: '',
      status: '', passengers: '', luggage: '', lang: ''
    }
  }),
  computed: {
    mappingFields () {
      return [
        { key: 'contractor', label: 'Контрагент', placeholder: 'Контрагент' },
        { key: 'orderNumber', label: 'Номер заказа', placeholder: 'Номер заказа' },
        { key: 'date', label: 'Дата', placeholder: 'Дата' },
        { key: 'fromPoint', label: 'Откуда', placeholder: 'Откуда' },
        { key: 'toPoint', label: 'Куда', placeholder: 'Куда' },
        { key: 'sum', label: 'Сумма', placeholder: 'Сумма' },
        { key: 'driver', label: 'Водитель', placeholder: 'Водитель' },
        { key: 'comment', label: 'Комментарий', placeholder: 'Комментарий' },
        { key: 'internalOrderNumber', label: 'Внутренний номер заказа', placeholder: 'Внутренний номер заказа' },
        { key: 'vehicleType', label: 'Тип авто', placeholder: 'Тип авто / Класс' },
        { key: 'status', label: 'Статус', placeholder: 'Статус' },
        { key: 'passengers', label: 'Пассажиры', placeholder: 'Пассажиры' },
        { key: 'luggage', label: 'Багаж', placeholder: 'Багаж' },
        { key: 'lang', label: 'Язык', placeholder: 'Язык' }
      ]
    },
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'Настройки интеграций',
            sheetSources: 'Google Sheets (месяц)',
            staffTelegram: 'Привязка Telegram сотрудников',
            name: 'Название',
            month: 'Месяц',
            status: 'Статус',
            actions: 'Действия',
            email: 'Email сотрудника',
            telegramId: 'Telegram User ID',
            syncing: 'Синхронизация...',
            save: 'Сохранить',
            roles: 'Роли',
            abacCountries: 'Страны доступа',
            abacCities: 'Города доступа',
            abacTeams: 'Команды доступа',
            abacCountriesPlaceholder: 'например: uk, uae',
            abacCitiesPlaceholder: 'например: london, dubai',
            abacTeamsPlaceholder: 'например: dispatch, ops',
            saveScopes: 'Сохранить scope',
            telegramLinks: 'Связки Telegram',
            sheetName: 'Имя источника',
            sheetMonth: 'Метка месяца (например 2025-01)',
            sheetId: 'Google Sheet ID',
            sheetTab: 'Имя вкладки (таблица)',
            detailsTab: 'Имя вкладки (подробности)',
            add: 'Добавить',
            sync: 'Синхронизировать',
            mapping: 'Маппинг',
            mappingTitle: 'Маппинг колонок',
            activate: 'Активировать',
            deactivate: 'Выключить',
            close: 'Закрыть'
          }
        : {
            title: 'Integration Settings',
            sheetSources: 'Google Sheets',
            staffTelegram: 'Staff Telegram links',
            name: 'Name',
            month: 'Month',
            status: 'Status',
            actions: 'Actions',
            email: 'Staff email',
            telegramId: 'Telegram User ID',
            syncing: 'Syncing...',
            save: 'Save',
            roles: 'Roles',
            abacCountries: 'Allowed countries',
            abacCities: 'Allowed cities',
            abacTeams: 'Allowed teams',
            abacCountriesPlaceholder: 'e.g. uk, uae',
            abacCitiesPlaceholder: 'e.g. london, dubai',
            abacTeamsPlaceholder: 'e.g. dispatch, ops',
            saveScopes: 'Save scope',
            telegramLinks: 'Telegram links',
            sheetName: 'Source name',
            sheetMonth: 'Month label (e.g. 2025-01)',
            sheetId: 'Google Sheet ID',
            sheetTab: 'Tab name',
            detailsTab: 'Details tab name',
            add: 'Add',
            sync: 'Sync now',
            mapping: 'Mapping',
            mappingTitle: 'Column Mapping',
            activate: 'Activate',
            deactivate: 'Disable',
            close: 'Close'
          }
    }
  },
  mounted () { this.load() },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
    shortSheetId (value) {
      const raw = String(value || '').trim()
      const m = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
      if (m && m[1]) return m[1]
      return raw
    },
    async jsonRequest (url, options = {}) {
      const response = await fetch(url, options)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.details || body.error || `HTTP ${response.status}`)
      }
      return body
    },
    async load () {
      const [sheets, staff] = await Promise.all([
        this.jsonRequest('/api/admin/sheet-sources', { headers: this.headers() }),
        this.jsonRequest('/api/admin/staff-users', { headers: this.headers() })
      ])
      this.sheets = Array.isArray(sheets) ? sheets : []
      this.staff = staff.rows || []
      this.staffDrafts = this.staff.reduce((acc, user) => {
        acc[user.id] = (user.telegramLinks && user.telegramLinks[0] && user.telegramLinks[0].telegramUserId) || ''
        return acc
      }, {})
      this.abacDrafts = this.staff.reduce((acc, user) => {
        acc[user.id] = {
          countries: (user.abacCountries || []).join(', '),
          cities: (user.abacCities || []).join(', '),
          teams: (user.abacTeams || []).join(', ')
        }
        return acc
      }, {})
    },
    async createSheetSource () {
      this.sheetNotice = { type: 'ok', text: '' }
      try {
        const payload = { ...this.sheetForm, googleSheetId: this.shortSheetId(this.sheetForm.googleSheetId) }
        await this.jsonRequest('/api/admin/sheet-sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...this.headers() },
          body: JSON.stringify(payload)
        })
        this.sheetForm = { name: '', monthLabel: '', googleSheetId: '', tabName: 'таблица', detailsTabName: 'подробности' }
        await this.load()
        this.sheetNotice = { type: 'ok', text: 'Источник добавлен.' }
      } catch (error) {
        this.sheetNotice = { type: 'error', text: `Ошибка добавления: ${error.message}` }
      }
    },
    async syncSheet (id) {
      this.sheetNotice = { type: 'ok', text: '' }
      this.syncingSheetId = id
      try {
        const data = await this.jsonRequest(`/api/admin/sheet-sources/${id}/sync`, {
          method: 'POST',
          headers: this.headers()
        })
        await this.load()
        const stats = data.stats || {}
        this.sheetNotice = {
          type: 'ok',
          text: `Синхронизировано: total=${stats.total || 0}, created=${stats.created || 0}, updated=${stats.updated || 0}, errors=${stats.errors || 0}`
        }
      } catch (error) {
        this.sheetNotice = { type: 'error', text: `Ошибка синхронизации: ${error.message}` }
      } finally {
        this.syncingSheetId = null
      }
    },
    async toggleSheet (sheet) {
      this.sheetNotice = { type: 'ok', text: '' }
      try {
        await this.jsonRequest(`/api/admin/sheet-sources/${sheet.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...this.headers() },
          body: JSON.stringify({ isActive: !sheet.isActive })
        })
        await this.load()
      } catch (error) {
        this.sheetNotice = { type: 'error', text: `Ошибка изменения статуса: ${error.message}` }
      }
    },
    parseMapping (raw) {
      if (!raw) return {}
      try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch (_) {
        return {}
      }
    },
    openMapping (sheet) {
      const parsed = this.parseMapping(sheet.columnMapping)
      this.mapDraft = {
        contractor: parsed.contractor || '',
        orderNumber: parsed.orderNumber || '',
        date: parsed.date || '',
        fromPoint: parsed.fromPoint || '',
        toPoint: parsed.toPoint || '',
        sum: parsed.sum || '',
        driver: parsed.driver || '',
        comment: parsed.comment || '',
        internalOrderNumber: parsed.internalOrderNumber || '',
        vehicleType: parsed.vehicleType || '',
        status: parsed.status || '',
        passengers: parsed.passengers || '',
        luggage: parsed.luggage || '',
        lang: parsed.lang || ''
      }
      this.mappingModal = { open: true, sourceId: sheet.id, sourceName: sheet.name || sheet.monthLabel || sheet.id }
    },
    closeMapping () {
      this.mappingModal = { open: false, sourceId: '', sourceName: '' }
    },
    async saveMapping () {
      this.sheetNotice = { type: 'ok', text: '' }
      try {
        await this.jsonRequest(`/api/admin/sheet-sources/${this.mappingModal.sourceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...this.headers() },
          body: JSON.stringify({ columnMapping: this.mapDraft })
        })
        await this.load()
        this.closeMapping()
        this.sheetNotice = { type: 'ok', text: 'Маппинг сохранён.' }
      } catch (error) {
        this.sheetNotice = { type: 'error', text: `Ошибка сохранения маппинга: ${error.message}` }
      }
    },
    async saveStaffLink (user) {
      this.staffNotice = { type: 'ok', text: '' }
      const telegramUserId = String(this.staffDrafts[user.id] || '').trim()
      if (!telegramUserId) {
        this.staffNotice = { type: 'error', text: `Для ${user.email} заполните Telegram User ID.` }
        return
      }
      try {
        await this.jsonRequest('/api/admin/telegram-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...this.headers() },
          body: JSON.stringify({ email: user.email, telegramUserId })
        })
        await this.load()
        this.staffNotice = { type: 'ok', text: `Сохранено для ${user.email}.` }
      } catch (error) {
        this.staffNotice = { type: 'error', text: `Ошибка сохранения: ${error.message}` }
      }
    },
    async saveStaffAbac (user) {
      this.staffNotice = { type: 'ok', text: '' }
      const draft = this.abacDrafts[user.id] || { countries: '', cities: '', teams: '' }
      try {
        await this.jsonRequest(`/api/admin/staff-users/${user.id}/abac`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...this.headers() },
          body: JSON.stringify({
            countries: draft.countries,
            cities: draft.cities,
            teams: draft.teams
          })
        })
        await this.load()
        this.staffNotice = { type: 'ok', text: `Scope сохранён для ${user.email}.` }
      } catch (error) {
        this.staffNotice = { type: 'error', text: `Ошибка сохранения scope: ${error.message}` }
      }
    }
  }
}
</script>

<style scoped>
.admin-section { padding-top: 150px; color: #17233d; }
.card { background: #fff; border: 1px solid #d8d8e6; border-radius: 12px; padding: 12px; margin-bottom: 14px; box-shadow: 0 8px 20px rgba(16, 24, 40, 0.06); }
.toolbar { display: flex; gap: 8px; margin: 8px 0 12px; flex-wrap: wrap; }
.notice { border-radius: 8px; padding: 8px 10px; margin: 8px 0; font-weight: 600; }
.notice--ok { background: #ebf7ef; border: 1px solid #a5d6b4; color: #1f6b32; }
.notice--error { background: #fff1f0; border: 1px solid #f4b8b2; color: #9f2f26; }
.input {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #c8ccdc;
  background: #fff;
  color: #1f2b46;
}
.input::placeholder { color: #7a8197; }
.input:focus { outline: none; border-color: #2f80ed; box-shadow: 0 0 0 3px rgba(47, 128, 237, 0.15); }
.table-wrap { overflow-x: auto; }
.grid-head, .grid-row { gap: 10px; padding: 8px; min-width: 980px; align-items: center; }
.three-cols { display: grid; grid-template-columns: 1.4fr 1.2fr 1.4fr; }
.four-cols { display: grid; grid-template-columns: 1.3fr 1fr 1fr .7fr; }
.seven-staff-cols { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr 1fr .9fr; }
.seven-cols { display: grid; grid-template-columns: 1fr .8fr 1.5fr .6fr .8fr 1fr 1fr; }
.grid-head { font-weight: 700; border-bottom: 1px solid #e4e7f0; color: #1d2c4a; }
.grid-row { border-bottom: 1px solid #f0f2f7; color: #2f3e60; }
.row-actions { display: flex; gap: 6px; align-items: center; }
.cell-wrap { word-break: break-all; }
.muted { font-size: 12px; color: #647191; }
.muted--error { color: #a13a31; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, .45); display: flex; align-items: center; justify-content: center; z-index: 1200; }
.modal { width: min(920px, 92vw); max-height: 86vh; overflow: auto; background: #fff; border-radius: 12px; padding: 16px; }
.map-grid { display: grid; grid-template-columns: 1fr; gap: 8px; margin: 12px 0; }
.map-row { display: grid; grid-template-columns: 240px 1fr; gap: 10px; align-items: center; }
.map-label { font-weight: 600; color: #243550; }
</style>
