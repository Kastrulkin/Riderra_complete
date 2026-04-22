<template>
  <div>
    <navigation></navigation>
    <div class="page-background"><div class="page-background__gradient"></div><div class="page-background__overlay"></div></div>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="h2">{{ t.title }}</h1>
            <p class="page-subtitle">{{ t.subtitle }}</p>
          </div>
        </div>
        <admin-tabs />

        <div class="settings-overview">
          <div v-for="card in overviewCards" :key="card.key" class="overview-card" :class="`overview-card--${card.tone}`">
            <div class="overview-card__value">{{ card.value }}</div>
            <div class="overview-card__label">{{ card.label }}</div>
            <div class="overview-card__hint">{{ card.hint }}</div>
          </div>
        </div>

        <div class="section-switch">
          <button
            v-for="section in sections"
            :key="section.key"
            type="button"
            class="section-pill"
            :class="{ 'section-pill--active': activeSection === section.key }"
            @click="activeSection = section.key"
          >
            <span>{{ section.label }}</span>
            <small>{{ section.hint }}</small>
          </button>
        </div>

        <div v-if="activeSection === 'sources'" class="settings-card">
          <div class="card-head">
            <div>
              <h3>{{ t.sheetSources }}</h3>
              <p class="card-hint">{{ t.sheetSourcesHint }}</p>
            </div>
          </div>
          <div v-if="sheetNotice.text" class="notice" :class="sheetNotice.type === 'error' ? 'notice--error' : 'notice--ok'">
            {{ sheetNotice.text }}
          </div>
          <div class="form-grid">
            <input v-model="sheetForm.name" class="input" :placeholder="t.sheetName" />
            <input v-model="sheetForm.monthLabel" class="input" :placeholder="t.sheetMonth" />
            <input v-model="sheetForm.googleSheetId" class="input form-grid__wide" :placeholder="t.sheetId" />
            <input v-model="sheetForm.tabName" class="input" :placeholder="t.sheetTab" />
            <input v-model="sheetForm.detailsTabName" class="input" :placeholder="t.detailsTab" />
          </div>
          <div class="inline-actions">
            <button class="btn btn--primary" @click="createSheetSource">{{ t.add }}</button>
          </div>

          <div class="ops-table">
            <div class="ops-table__head ops-table__head--sources">
              <div>{{ t.name }}</div><div>{{ t.month }}</div><div>Sheet ID</div><div>Tab</div><div>{{ t.detailsTab }}</div><div>{{ t.status }}</div><div>{{ t.actions }}</div>
            </div>
            <div v-for="s in sheets" :key="s.id" class="ops-table__row ops-table__row--sources">
              <div class="entity-stack">
                <strong>{{ s.name }}</strong>
                <span class="muted">{{ shortSheetId(s.googleSheetId) }}</span>
              </div>
              <div>{{ s.monthLabel }}</div>
              <div class="cell-wrap" :title="s.googleSheetId">{{ shortSheetId(s.googleSheetId) }}</div>
              <div>{{ s.tabName }}</div>
              <div>{{ s.detailsTabName || 'подробности' }}</div>
              <div class="entity-stack">
                <strong>{{ s.isActive ? 'active' : 'off' }}</strong>
                <span class="muted" v-if="s.lastSyncStatus">{{ s.lastSyncStatus }}</span>
                <span class="muted muted--error" v-if="s.lastSyncError">{{ s.lastSyncError }}</span>
              </div>
              <div class="row-actions">
                <button class="btn btn--small btn--primary" :disabled="syncingSheetId === s.id" @click="syncSheet(s.id)">
                  {{ syncingSheetId === s.id ? t.syncing : t.sync }}
                </button>
                <button class="btn btn--small" @click="openMapping(s)">{{ t.mapping }}</button>
                <button class="btn btn--small" @click="toggleSheet(s)">{{ s.isActive ? t.deactivate : t.activate }}</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeSection === 'staff'" class="settings-card">
          <div class="card-head">
            <div>
              <h3>{{ t.staffTelegram }}</h3>
              <p class="card-hint">{{ t.staffTelegramHint }}</p>
            </div>
          </div>
          <div v-if="staffNotice.text" class="notice" :class="staffNotice.type === 'error' ? 'notice--error' : 'notice--ok'">
            {{ staffNotice.text }}
          </div>
          <div class="ops-table">
            <div class="ops-table__head ops-table__head--staff">
              <div>{{ t.staffMember }}</div>
              <div>{{ t.roles }}</div>
              <div>{{ t.telegramId }}</div>
              <div>{{ t.actions }}</div>
            </div>
            <div v-for="u in staff" :key="u.id" class="ops-table__row ops-table__row--staff">
              <div class="staff-identity">
                <strong>{{ u.displayName || u.email }}</strong>
                <span class="muted">{{ u.email }}</span>
              </div>
              <div>{{ (u.roles || []).join(', ') || '-' }}</div>
              <div>
                <input v-model="staffDrafts[u.id]" class="input" :placeholder="t.telegramId" />
              </div>
              <div class="row-actions row-actions--stack row-actions--stack-tight">
                <button class="btn btn--small btn--primary" @click="saveStaffLink(u)">{{ t.save }}</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeSection === 'access'" class="settings-card">
          <div class="card-head">
            <div>
              <h3>{{ t.accessScopes }}</h3>
              <p class="card-hint">{{ t.accessScopesHint }}</p>
            </div>
          </div>
          <div v-if="staffNotice.text" class="notice" :class="staffNotice.type === 'error' ? 'notice--error' : 'notice--ok'">
            {{ staffNotice.text }}
          </div>
          <div class="ops-table">
            <div class="ops-table__head ops-table__head--access">
              <div>{{ t.staffMember }}</div>
              <div>{{ t.geoScope }}</div>
              <div>{{ t.abacTeams }}</div>
              <div>{{ t.actions }}</div>
            </div>
            <div v-for="u in staff" :key="`${u.id}-access`" class="ops-table__row ops-table__row--access">
              <div class="staff-identity">
                <strong>{{ u.displayName || u.email }}</strong>
                <span class="muted">{{ u.email }}</span>
              </div>
              <div>
                <span class="scope-pill">{{ t.globalScope }}</span>
              </div>
              <div>
                <select v-model="abacDrafts[u.id].team" class="input select-input">
                  <option v-for="opt in teamOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="row-actions row-actions--stack row-actions--stack-tight">
                <button class="btn btn--small btn--primary" @click="saveStaffAbac(u)">{{ t.saveScopes }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="mappingModal.open" class="modal-overlay" @click="closeMapping">
      <div class="modal" @click.stop>
        <h3>{{ t.mappingTitle }}: {{ mappingModal.sourceName }}</h3>
        <p class="card-hint">{{ t.mappingHint }}</p>
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
    activeSection: 'sources',
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
    sections () {
      return this.$store.state.language === 'ru'
        ? [
            { key: 'sources', label: 'Источники', hint: 'Google Sheets и маппинг' },
            { key: 'staff', label: 'Сотрудники и Telegram', hint: 'Привязка людей' },
            { key: 'access', label: 'Права доступа', hint: 'Команды и scope' }
          ]
        : [
            { key: 'sources', label: 'Sources', hint: 'Google Sheets and mapping' },
            { key: 'staff', label: 'Staff and Telegram', hint: 'Link people' },
            { key: 'access', label: 'Access', hint: 'Teams and scope' }
          ]
    },
    overviewCards () {
      const activeSheets = this.sheets.filter((sheet) => sheet.isActive).length
      const mappedSheets = this.sheets.filter((sheet) => String(sheet.columnMapping || '').trim()).length
      const telegramLinked = this.staff.filter((user) => String((user.telegramLinks && user.telegramLinks[0] && user.telegramLinks[0].telegramUserId) || '').trim()).length
      const teamScoped = this.staff.filter((user) => {
        const teams = Array.isArray(user.abacTeams) ? user.abacTeams : []
        return teams.length && teams[0] !== 'all'
      }).length
      return this.$store.state.language === 'ru'
        ? [
            { key: 'sheets', value: this.sheets.length, label: 'Источников', hint: 'Подключённые месячные таблицы', tone: 'neutral' },
            { key: 'active', value: activeSheets, label: 'Активных', hint: 'Сейчас участвуют в синхронизации', tone: activeSheets ? 'ok' : 'warn' },
            { key: 'mapped', value: mappedSheets, label: 'С маппингом', hint: 'Колонки связаны с Riderra', tone: mappedSheets ? 'info' : 'warn' },
            { key: 'staff', value: this.staff.length, label: 'Сотрудников', hint: 'Стартовый roster кабинета', tone: 'neutral' },
            { key: 'telegram', value: telegramLinked, label: 'С Telegram ID', hint: 'Готовы к командам и уведомлениям', tone: telegramLinked ? 'ok' : 'warn' },
            { key: 'scoped', value: teamScoped, label: 'С особыми scope', hint: 'Не все команды, а точечный доступ', tone: teamScoped ? 'info' : 'neutral' }
          ]
        : [
            { key: 'sheets', value: this.sheets.length, label: 'Sources', hint: 'Connected monthly sheets', tone: 'neutral' },
            { key: 'active', value: activeSheets, label: 'Active', hint: 'Currently syncing', tone: activeSheets ? 'ok' : 'warn' },
            { key: 'mapped', value: mappedSheets, label: 'Mapped', hint: 'Columns linked to Riderra', tone: mappedSheets ? 'info' : 'warn' },
            { key: 'staff', value: this.staff.length, label: 'Staff', hint: 'Current portal roster', tone: 'neutral' },
            { key: 'telegram', value: telegramLinked, label: 'With Telegram ID', hint: 'Ready for commands and alerts', tone: telegramLinked ? 'ok' : 'warn' },
            { key: 'scoped', value: teamScoped, label: 'Scoped', hint: 'Team-specific access', tone: teamScoped ? 'info' : 'neutral' }
          ]
    },
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
            subtitle: 'Здесь собраны только служебные настройки: откуда брать данные, кого связали с Telegram и кому какие команды доступны.',
            sheetSources: 'Источники заказов',
            sheetSourcesHint: 'Подключение месячных Google Sheets, синхронизация и маппинг колонок для таблицы заказов Riderra.',
            staffTelegram: 'Сотрудники и Telegram',
            staffTelegramHint: 'Привязка Telegram User ID к сотрудникам, чтобы команды и уведомления попадали нужным людям.',
            accessScopes: 'Права доступа',
            accessScopesHint: 'Уточняем командный доступ. Гео пока глобальный для всех, а команды можно ограничивать точечно.',
            name: 'Название',
            month: 'Месяц',
            status: 'Статус',
            actions: 'Действия',
            staffMember: 'Сотрудник',
            telegramId: 'Telegram User ID',
            syncing: 'Синхронизация...',
            save: 'Сохранить',
            roles: 'Роли',
            geoScope: 'Гео-доступ',
            globalScope: 'Globe - все города',
            abacTeams: 'Команды доступа',
            saveScopes: 'Сохранить scope',
            sheetName: 'Имя источника',
            sheetMonth: 'Метка месяца (например 2025-01)',
            sheetId: 'Google Sheet ID',
            sheetTab: 'Имя вкладки (таблица)',
            detailsTab: 'Имя вкладки (подробности)',
            add: 'Добавить',
            sync: 'Синхронизировать',
            mapping: 'Маппинг',
            mappingTitle: 'Маппинг колонок',
            mappingHint: 'Если структура таблицы меняется, здесь можно без кода указать, какая колонка Google Sheet во что должна попадать.',
            activate: 'Активировать',
            deactivate: 'Выключить',
            close: 'Закрыть'
          }
        : {
            title: 'Integration Settings',
            subtitle: 'Operational settings only: data sources, Telegram links, and access scopes.',
            sheetSources: 'Order sources',
            sheetSourcesHint: 'Monthly Google Sheets, sync control, and order column mapping.',
            staffTelegram: 'Staff and Telegram',
            staffTelegramHint: 'Link Telegram User IDs so commands and alerts reach the right staff members.',
            accessScopes: 'Access scopes',
            accessScopesHint: 'Team-level access only; geo stays global for now.',
            name: 'Name',
            month: 'Month',
            status: 'Status',
            actions: 'Actions',
            staffMember: 'Staff member',
            telegramId: 'Telegram User ID',
            syncing: 'Syncing...',
            save: 'Save',
            roles: 'Roles',
            geoScope: 'Geo scope',
            globalScope: 'Globe - all cities',
            abacTeams: 'Allowed teams',
            saveScopes: 'Save scope',
            sheetName: 'Source name',
            sheetMonth: 'Month label (e.g. 2025-01)',
            sheetId: 'Google Sheet ID',
            sheetTab: 'Tab name',
            detailsTab: 'Details tab name',
            add: 'Add',
            sync: 'Sync now',
            mapping: 'Mapping',
            mappingTitle: 'Column Mapping',
            mappingHint: 'Use this when the Google Sheet structure changes and Riderra fields need a new column mapping.',
            activate: 'Activate',
            deactivate: 'Disable',
            close: 'Close'
          }
    },
    teamOptions () {
      const isRu = this.$store.state.language === 'ru'
      return [
        { value: 'all', label: isRu ? 'Все команды' : 'All teams' },
        { value: 'coordination', label: isRu ? 'Координация' : 'Coordination' },
        { value: 'dispatch', label: isRu ? 'Диспетчеризация' : 'Dispatch' },
        { value: 'ops_control', label: isRu ? 'Операционный контроль' : 'Ops control' },
        { value: 'finance', label: isRu ? 'Финансы' : 'Finance' },
        { value: 'pricing', label: isRu ? 'Прайсинг' : 'Pricing' },
        { value: 'sales', label: isRu ? 'Продажи' : 'Sales' },
        { value: 'audit', label: isRu ? 'Аудит' : 'Audit' }
      ]
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
        const teams = Array.isArray(user.abacTeams) ? user.abacTeams : []
        acc[user.id] = {
          team: teams[0] || 'all'
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
      const draft = this.abacDrafts[user.id] || { team: 'all' }
      try {
        await this.jsonRequest(`/api/admin/staff-users/${user.id}/abac`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...this.headers() },
          body: JSON.stringify({
            countries: 'all',
            cities: 'all',
            teams: draft.team || 'all'
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
.page-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:18px; }
.page-subtitle { margin:6px 0 0; max-width:820px; color:#60708f; font-size:15px; line-height:1.55; }
.settings-overview { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:12px; margin-bottom:18px; }
.overview-card { padding:14px 16px; border-radius:16px; border:1px solid #d8e0ef; background:linear-gradient(180deg,#fff 0%,#f8fbff 100%); box-shadow:0 12px 28px rgba(16,30,67,.06); }
.overview-card__value { font-size:28px; font-weight:800; color:#17233d; }
.overview-card__label { margin-top:4px; font-size:14px; font-weight:700; color:#223356; }
.overview-card__hint { margin-top:6px; font-size:12px; line-height:1.4; color:#6b7280; }
.overview-card--warn { border-color:#fde68a; background:linear-gradient(180deg,#fffdf4 0%,#fff8dc 100%); }
.overview-card--critical { border-color:#fecaca; background:linear-gradient(180deg,#fff8f8 0%,#ffefef 100%); }
.overview-card--ok { border-color:#bbf7d0; background:linear-gradient(180deg,#f7fff9 0%,#edfff3 100%); }
.overview-card--info { border-color:#bfdbfe; background:linear-gradient(180deg,#f7fbff 0%,#ecf5ff 100%); }
.section-switch { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:14px; }
.section-pill { display:grid; gap:4px; text-align:left; padding:12px 14px; border-radius:16px; border:1px solid #d6deee; background:#fff; color:#223356; }
.section-pill small { color:#6b7280; font-size:12px; }
.section-pill--active { background:linear-gradient(135deg,#ff017a 0%,#702283 100%); border-color:transparent; color:#fff; box-shadow:0 18px 34px rgba(112,34,131,.24); }
.section-pill--active small { color:rgba(255,255,255,.78); }
.settings-card { background:#fff; border:1px solid #d8d8e6; border-radius:16px; padding:16px; margin-bottom:14px; box-shadow:0 8px 20px rgba(16,24,40,.06); }
.card-head { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; margin-bottom:12px; }
.card-hint { margin:6px 0 0; color:#64748b; line-height:1.5; }
.notice { border-radius:10px; padding:10px 12px; margin:10px 0 14px; font-weight:600; }
.notice--ok { background:#ebf7ef; border:1px solid #a5d6b4; color:#1f6b32; }
.notice--error { background:#fff1f0; border:1px solid #f4b8b2; color:#9f2f26; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }
.form-grid__wide { grid-column:1 / -1; }
.inline-actions { display:flex; gap:10px; margin-bottom:14px; }
.input { width:100%; min-height:44px; padding:10px 12px; border-radius:10px; border:1px solid #c8ccdc; background:#fff; color:#1f2b46; }
.input::placeholder { color:#7a8197; }
.input:focus { outline:none; border-color:#702283; box-shadow:0 0 0 3px rgba(112,34,131,.14); }
.ops-table { overflow-x:auto; border:1px solid #e6ebf5; border-radius:12px; }
.ops-table__head, .ops-table__row { gap:12px; padding:10px 12px; min-width:980px; align-items:center; }
.ops-table__head { font-weight:700; border-bottom:1px solid #e4e7f0; color:#1d2c4a; }
.ops-table__row { border-bottom:1px solid #f0f2f7; color:#2f3e60; }
.ops-table__head--sources, .ops-table__row--sources { display:grid; grid-template-columns:minmax(180px,1.1fr) minmax(120px,.8fr) minmax(180px,1fr) minmax(110px,.7fr) minmax(140px,.8fr) minmax(180px,1fr) minmax(220px,1.1fr); }
.ops-table__head--staff, .ops-table__row--staff { display:grid; grid-template-columns:minmax(240px,1.2fr) minmax(180px,1fr) minmax(220px,1fr) minmax(160px,.7fr); }
.ops-table__head--access, .ops-table__row--access { display:grid; grid-template-columns:minmax(240px,1.2fr) minmax(180px,.8fr) minmax(220px,1fr) minmax(160px,.7fr); }
.entity-stack { display:flex; flex-direction:column; gap:4px; align-items:flex-start; }
.row-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.row-actions--stack { flex-direction:column; align-items:stretch; justify-content:center; }
.row-actions--stack-tight .btn { width:100%; min-width:130px; }
.select-input { min-height:44px; }
.scope-pill { display:inline-block; border:1px solid #b8d1ff; background:#f1f7ff; color:#1f4d96; border-radius:999px; padding:6px 12px; font-size:13px; font-weight:600; }
.staff-identity { display:flex; flex-direction:column; gap:4px; align-items:flex-start; }
.staff-identity strong { color:#1d2c4a; font-size:14px; }
.cell-wrap { word-break:break-all; }
.muted { font-size:12px; color:#647191; }
.muted--error { color:#a13a31; }
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1200; }
.modal { width:min(920px,92vw); max-height:86vh; overflow:auto; background:#fff; border-radius:12px; padding:16px; }
.map-grid { display:grid; grid-template-columns:1fr; gap:8px; margin:12px 0; }
.map-row { display:grid; grid-template-columns:240px 1fr; gap:10px; align-items:center; }
.map-label { font-weight:600; color:#243550; }
@media (max-width: 1100px) {
  .settings-overview { grid-template-columns:repeat(3,minmax(0,1fr)); }
}
@media (max-width: 900px) {
  .page-head { flex-direction:column; }
  .settings-overview { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .form-grid { grid-template-columns:1fr; }
  .form-grid__wide { grid-column:auto; }
}
@media (max-width: 640px) {
  .settings-overview { grid-template-columns:1fr; }
  .section-switch {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .section-pill {
    flex: 0 0 220px;
  }
  .inline-actions,
  .row-actions {
    width: 100%;
  }
  .inline-actions .btn,
  .row-actions .btn,
  .row-actions .action-select {
    width: 100%;
  }
  .map-row {
    grid-template-columns:1fr;
  }
  .modal {
    width:min(100vw - 16px, 920px);
    padding:14px;
  }
}
</style>
