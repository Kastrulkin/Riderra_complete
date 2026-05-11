<template>
  <div>
    <navigation />
    <div class="page-background"><div class="page-background__gradient"></div><div class="page-background__overlay"></div></div>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <admin-tabs />

        <div class="section-actions">
          <button class="btn" @click="$router.push('/admin-order-archive')">{{ t.back }}</button>
          <a v-if="primarySourceUrl" class="btn" :href="primarySourceUrl" target="_blank" rel="noopener">Google Sheet</a>
          <button class="btn btn--primary" :disabled="loading" @click="loadAll">{{ loading ? t.loading : t.refresh }}</button>
        </div>

        <div class="month-head">
          <div>
            <p class="month-head__eyebrow">{{ t.archive }}</p>
            <h2>{{ month.displayName || monthLabel }}</h2>
            <p>{{ sourceLine }}</p>
          </div>
          <span class="status-pill">{{ month.status || 'archived' }}</span>
        </div>

        <div class="overview-strip">
          <div v-for="card in overviewCards" :key="card.key" class="overview-card" :class="`overview-card--${card.tone}`">
            <div class="overview-card__value">{{ card.value }}</div>
            <div class="overview-card__label">{{ card.label }}</div>
            <div class="overview-card__hint">{{ card.hint }}</div>
          </div>
        </div>

        <div class="subtabs">
          <button v-for="item in tabs" :key="item.key" class="subtab" :class="{ 'subtab--active': tab === item.key }" @click="tab = item.key">
            {{ item.label }}
          </button>
        </div>

        <div class="toolbar">
          <input v-model="q" class="input toolbar-search" :placeholder="t.search" @input="applyTripsFilter" />
          <input v-model="counterpartyFilter" class="input month-filter" :placeholder="t.counterparty" @change="loadTrips" @keyup.enter="loadTrips" />
          <input v-model="driverFilter" class="input month-filter" :placeholder="t.driver" @change="loadTrips" @keyup.enter="loadTrips" />
          <select v-model="status" class="input month-filter" @change="loadTrips">
            <option value="">{{ t.allStatuses }}</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
            <option value="pending">pending</option>
          </select>
        </div>

        <div v-if="error" class="hint hint--error">{{ error }}</div>

        <div v-if="tab === 'trips'" class="table-wrap">
          <div class="table-head trips-grid">
            <div>{{ t.date }}</div>
            <div>{{ t.route }}</div>
            <div>{{ t.counterparty }}</div>
            <div>{{ t.driver }}</div>
            <div>{{ t.status }}</div>
            <div>{{ t.money }}</div>
            <div>{{ t.risks }}</div>
            <div>{{ t.comment }}</div>
          </div>
          <div v-for="row in filteredTrips" :key="`${row.sourceId}-${row.sourceRow}`" class="table-row trips-grid" :class="{ 'table-row--risk': row.hasComplaint || row.issueCount }">
            <div>
              <strong>{{ formatDate(row.pickupAt) }}</strong>
              <span class="muted">#{{ row.orderNumber || row.internalOrderNumber || row.sourceRow }}</span>
            </div>
            <div class="route-cell">
              <div class="route-cell__title">{{ row.fromPoint || '-' }}</div>
              <div class="route-cell__sub">{{ row.toPoint || '-' }}</div>
            </div>
            <div>{{ row.counterparty || '-' }}</div>
            <div>{{ row.driver || '-' }}</div>
            <div><span class="status-pill">{{ row.status || '-' }}</span></div>
            <div>
              <strong>{{ money(row.clientPrice, row.currency) }}</strong>
              <span class="muted">{{ t.profit }} {{ row.profit === null ? '-' : money(row.profit, row.currency) }}</span>
            </div>
            <div>
              <strong>{{ row.hasComplaint ? t.complaint : '-' }}</strong>
              <span class="muted">{{ row.issueFlags && row.issueFlags.length ? row.issueFlags.join(', ') : '-' }}</span>
            </div>
            <div class="comment-cell">{{ row.comment || '-' }}</div>
          </div>
          <div v-if="!filteredTrips.length" class="empty-state">{{ t.empty }}</div>
        </div>

        <div v-if="tab === 'drivers'" class="table-wrap">
          <stats-table :rows="drivers" name-key="driver" :t="t" :money-map="moneyMap" />
        </div>

        <div v-if="tab === 'counterparties'" class="table-wrap">
          <stats-table :rows="counterparties" name-key="counterparty" :t="t" :money-map="moneyMap" />
        </div>

        <div v-if="tab === 'finance'" class="table-wrap">
          <div class="finance-grid">
            <div class="finance-row"><span>{{ t.gross }}</span><strong>{{ moneyMap(finance.grossByCurrency) }}</strong></div>
            <div class="finance-row"><span>{{ t.driverCost }}</span><strong>{{ moneyMap(finance.driverCostByCurrency) }}</strong></div>
            <div class="finance-row"><span>{{ t.profit }}</span><strong>{{ moneyMap(finance.profitByCurrency) }}</strong></div>
            <div class="finance-row"><span>ROI</span><strong>{{ roiMap(finance.roiByCurrency) }}</strong></div>
          </div>
        </div>

        <div v-if="tab === 'risks'" class="table-wrap">
          <div class="table-head risk-grid">
            <div>{{ t.risk }}</div>
            <div>{{ t.route }}</div>
            <div>{{ t.counterparty }}</div>
            <div>{{ t.driver }}</div>
            <div>{{ t.money }}</div>
          </div>
          <div v-for="row in risks" :key="`${row.sourceId}-${row.sourceRow}`" class="table-row risk-grid table-row--risk">
            <div>
              <strong>{{ riskLabel(row.riskType) }}</strong>
              <span class="muted">{{ row.issueFlags && row.issueFlags.length ? row.issueFlags.join(', ') : row.status }}</span>
            </div>
            <div class="route-cell">
              <div class="route-cell__title">{{ row.fromPoint || '-' }}</div>
              <div class="route-cell__sub">{{ row.toPoint || '-' }}</div>
            </div>
            <div>{{ row.counterparty || '-' }}</div>
            <div>{{ row.driver || '-' }}</div>
            <div>{{ money(row.clientPrice, row.currency) }}</div>
          </div>
          <div v-if="!risks.length" class="empty-state">{{ t.noRisks }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import navigation from '~/components/partials/nav.vue'
import adminTabs from '~/components/partials/adminTabs.vue'

const StatsTable = {
  props: ['rows', 'nameKey', 't', 'moneyMap'],
  template: `
    <div>
      <div class="table-head stats-grid" style="display:grid;grid-template-columns:minmax(240px,1.5fr) minmax(180px,1fr) minmax(180px,1fr) minmax(190px,1.1fr) minmax(190px,1.1fr);gap:14px;align-items:center;min-width:1120px;padding:12px 16px;background:#f8fafc;border-bottom:1px solid #d8d8e6;font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;">
        <div>{{ t.name }}</div><div>{{ t.trips }}</div><div>{{ t.quality }}</div><div>{{ t.money }}</div><div>{{ t.profit }}</div>
      </div>
      <div v-for="row in rows" :key="row[nameKey]" class="table-row stats-grid" style="display:grid;grid-template-columns:minmax(240px,1.5fr) minmax(180px,1fr) minmax(180px,1fr) minmax(190px,1.1fr) minmax(190px,1.1fr);gap:14px;align-items:center;min-width:1120px;padding:14px 16px;border-bottom:1px solid #eef2f7;color:#1f2b46;">
        <div><strong>{{ row[nameKey] }}</strong></div>
        <div><strong>{{ row.total || 0 }}</strong><span style="display:block;margin-top:4px;color:#64748b;font-size:12px;">{{ t.completed }} {{ row.completed || 0 }} · {{ t.cancelled }} {{ row.cancelled || 0 }}</span></div>
        <div><strong>{{ t.complaints }} {{ row.complaints || 0 }}</strong><span style="display:block;margin-top:4px;color:#64748b;font-size:12px;">{{ t.issueRate }} {{ Math.round((row.issueRate || 0) * 100) }}%</span></div>
        <div><strong>{{ moneyMap(row.grossByCurrency) }}</strong></div>
        <div><strong>{{ moneyMap(row.profitByCurrency) }}</strong></div>
      </div>
      <div v-if="!rows.length" style="padding:14px 16px;color:#64748b;">{{ t.empty }}</div>
    </div>
  `
}

export default {
  middleware: 'staff',
  components: { navigation, adminTabs, StatsTable },
  data: () => ({
    month: {},
    sources: [],
    trips: [],
    filteredTrips: [],
    drivers: [],
    counterparties: [],
    finance: {},
    risks: [],
    tab: 'trips',
    q: '',
    status: '',
    counterpartyFilter: '',
    driverFilter: '',
    loading: false,
    error: ''
  }),
  computed: {
    monthLabel () { return this.$route.params.month },
    primarySourceUrl () { return this.sources[0]?.googleSheetUrl || '' },
    sourceLine () {
      const source = this.sources[0]
      if (!source) return this.monthLabel
      return [source.name, source.monthLabel, this.formatDate(source.lastSyncAt)].filter(Boolean).join(' · ')
    },
    t () {
      return this.$store.state.language === 'ru'
        ? {
            archive: 'Архив заказов',
            back: 'Назад',
            refresh: 'Обновить',
            loading: 'Загружаю...',
            search: 'Поиск по строкам месяца',
            allStatuses: 'Все статусы',
            tripsTab: 'Поездки',
            driversTab: 'Водители',
            counterpartiesTab: 'Контрагенты',
            financeTab: 'Финансы',
            risksTab: 'Риски',
            date: 'Дата',
            route: 'Маршрут',
            counterparty: 'Контрагент',
            driver: 'Водитель',
            status: 'Статус',
            money: 'Деньги',
            risks: 'Риски',
            comment: 'Комментарий',
            risk: 'Риск',
            profit: 'прибыль',
            gross: 'Выручка',
            driverCost: 'Выплаты водителям',
            complaint: 'Жалоба',
            complaints: 'жалоб',
            completed: 'выполнено',
            cancelled: 'отмен',
            quality: 'Качество',
            name: 'Название',
            issueRate: 'проблемность',
            empty: 'Данных нет',
            noRisks: 'Рисковых строк нет'
          }
        : {
            archive: 'Order archive',
            back: 'Back',
            refresh: 'Refresh',
            loading: 'Loading...',
            search: 'Search month rows',
            allStatuses: 'All statuses',
            tripsTab: 'Trips',
            driversTab: 'Drivers',
            counterpartiesTab: 'Counterparties',
            financeTab: 'Finance',
            risksTab: 'Risks',
            date: 'Date',
            route: 'Route',
            counterparty: 'Counterparty',
            driver: 'Driver',
            status: 'Status',
            money: 'Money',
            risks: 'Risks',
            comment: 'Comment',
            risk: 'Risk',
            profit: 'profit',
            gross: 'Gross',
            driverCost: 'Driver payouts',
            complaint: 'Complaint',
            complaints: 'complaints',
            completed: 'completed',
            cancelled: 'cancelled',
            quality: 'Quality',
            name: 'Name',
            issueRate: 'issue rate',
            empty: 'No data',
            noRisks: 'No risk rows'
          }
    },
    tabs () {
      return [
        { key: 'trips', label: this.t.tripsTab },
        { key: 'drivers', label: this.t.driversTab },
        { key: 'counterparties', label: this.t.counterpartiesTab },
        { key: 'finance', label: this.t.financeTab },
        { key: 'risks', label: this.t.risksTab }
      ]
    },
    overviewCards () {
      return [
        { key: 'total', value: this.month.total || 0, label: this.t.tripsTab, hint: this.t.completed + ' ' + (this.month.completed || 0), tone: 'info' },
        { key: 'gross', value: this.moneyMap(this.month.grossByCurrency), label: this.t.gross, hint: this.t.money, tone: 'ok' },
        { key: 'profit', value: this.moneyMap(this.month.profitByCurrency), label: this.t.profit, hint: 'ROI ' + this.roiMap(this.month.roiByCurrency), tone: 'neutral' },
        { key: 'risks', value: this.month.issueCount || 0, label: this.t.risks, hint: this.t.complaints + ' ' + (this.month.complaints || 0), tone: this.month.issueCount ? 'warn' : 'ok' }
      ]
    }
  },
  mounted () {
    this.loadAll()
  },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
    async fetchJson (url) {
      const res = await fetch(url, { headers: this.headers() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      return data
    },
    async loadAll () {
      this.loading = true
      this.error = ''
      try {
        const lang = this.$store.state.language || 'ru'
        const [head, trips, drivers, counterparties, finance, risks] = await Promise.all([
          this.fetchJson(`/api/admin/economics/order-archive/${this.monthLabel}?lang=${lang}`),
          this.fetchJson(`/api/admin/economics/order-archive/${this.monthLabel}/trips`),
          this.fetchJson(`/api/admin/economics/order-archive/${this.monthLabel}/drivers`),
          this.fetchJson(`/api/admin/economics/order-archive/${this.monthLabel}/counterparties`),
          this.fetchJson(`/api/admin/economics/order-archive/${this.monthLabel}/finance`),
          this.fetchJson(`/api/admin/economics/order-archive/${this.monthLabel}/risks`)
        ])
        this.month = head.month || {}
        this.sources = head.sources || []
        this.trips = trips.rows || []
        this.drivers = drivers.rows || []
        this.counterparties = counterparties.rows || []
        this.finance = finance.summary || {}
        this.risks = risks.rows || []
        this.applyTripsFilter()
      } catch (error) {
        this.error = error?.message || 'Failed to load month'
      } finally {
        this.loading = false
      }
    },
    async loadTrips () {
      const params = new URLSearchParams()
      if (this.status) params.set('status', this.status)
      if (this.counterpartyFilter.trim()) params.set('counterparty', this.counterpartyFilter.trim())
      if (this.driverFilter.trim()) params.set('driver', this.driverFilter.trim())
      const body = await this.fetchJson(`/api/admin/economics/order-archive/${this.monthLabel}/trips?${params.toString()}`)
      this.trips = body.rows || []
      this.applyTripsFilter()
    },
    applyTripsFilter () {
      const q = this.q.trim().toLowerCase()
      this.filteredTrips = this.trips.filter((row) => {
        if (!q) return true
        return [row.orderNumber, row.internalOrderNumber, row.fromPoint, row.toPoint, row.counterparty, row.driver, row.comment, row.vehicleType].join(' ').toLowerCase().includes(q)
      })
    },
    money (value, currency = 'EUR') {
      if (value === null || value === undefined || value === '') return '-'
      return `${currency || 'EUR'} ${Number(value || 0).toLocaleString('ru-RU')}`
    },
    moneyMap (value) {
      const entries = Object.entries(value || {}).filter(([, amount]) => Number(amount || 0) !== 0)
      if (!entries.length) return '-'
      return entries.map(([currency, amount]) => this.money(amount, currency)).join(' · ')
    },
    roiMap (value) {
      const entries = Object.entries(value || {}).filter(([, amount]) => amount !== null && amount !== undefined)
      if (!entries.length) return '-'
      return entries.map(([currency, amount]) => `${currency} ${Math.round(Number(amount || 0) * 100)}%`).join(' · ')
    },
    formatDate (value) {
      if (!value) return '-'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString()
    },
    riskLabel (value) {
      const labels = {
        complaint: this.t.complaint,
        cancellation: 'Cancellation',
        missing_driver: 'No driver',
        low_margin: 'Low margin',
        incomplete_data: 'Incomplete data'
      }
      return labels[value] || value || '-'
    }
  }
}
</script>

<style scoped>
.month-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; padding: 16px; border: 1px solid #d8e0ef; border-radius: 8px; background: #fff; }
.month-head h2 { margin: 2px 0 6px; color: #17233d; }
.month-head p { margin: 0; color: #64748b; }
.month-head__eyebrow { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #702283; }
.overview-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.overview-card { padding: 14px 16px; border-radius: 8px; border: 1px solid #d8e0ef; background: #fff; box-shadow: 0 12px 28px rgba(16, 30, 67, 0.06); }
.overview-card__value { font-size: 22px; font-weight: 800; color: #17233d; }
.overview-card__label { margin-top: 4px; font-size: 14px; font-weight: 700; color: #223356; }
.overview-card__hint { margin-top: 6px; font-size: 12px; color: #6b7280; }
.overview-card--warn { border-color: #fde68a; background: #fffdf4; }
.overview-card--ok { border-color: #bbf7d0; background: #f7fff9; }
.overview-card--info { border-color: #bfdbfe; background: #f7fbff; }
.subtabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.subtab { border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; border-radius: 8px; padding: 8px 14px; font-weight: 700; cursor: pointer; }
.subtab--active { background: linear-gradient(135deg, #1a237e 0%, #0d1421 100%); border-color: transparent; color: #fff; }
.toolbar { display: grid; grid-template-columns: minmax(280px, 1fr) 180px 180px 190px; gap: 12px; align-items: center; margin-bottom: 14px; }
.input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #c8ccdc; background: #fff; color: #1f2b46; }
.table-wrap { background: #fff; border: 1px solid #d8d8e6; border-radius: 8px; overflow: auto; margin-bottom: 16px; }
.table-head, .table-row { display: grid; gap: 14px; align-items: center; min-width: 1120px; }
.table-head { padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #d8d8e6; font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; }
.table-row { padding: 14px 16px; border-bottom: 1px solid #eef2f7; color: #1f2b46; }
.trips-grid { grid-template-columns: minmax(130px, .8fr) minmax(260px, 1.6fr) minmax(160px, 1fr) minmax(160px, 1fr) minmax(110px, .7fr) minmax(160px, 1fr) minmax(190px, 1.1fr) minmax(240px, 1.4fr); }
.stats-grid { grid-template-columns: minmax(240px, 1.5fr) minmax(180px, 1fr) minmax(180px, 1fr) minmax(190px, 1.1fr) minmax(190px, 1.1fr); }
.risk-grid { grid-template-columns: minmax(180px, 1fr) minmax(300px, 1.8fr) minmax(180px, 1fr) minmax(180px, 1fr) minmax(160px, .8fr); }
.finance-grid { display: grid; grid-template-columns: repeat(4, minmax(180px, 1fr)); gap: 0; min-width: 900px; }
.finance-row { padding: 16px; border-right: 1px solid #eef2f7; display: grid; gap: 8px; }
.finance-row span, .muted { display: block; margin-top: 4px; color: #64748b; font-size: 12px; }
.route-cell__title { font-weight: 800; color: #17233d; }
.route-cell__sub { color: #64748b; font-size: 12px; margin-top: 4px; }
.comment-cell { color: #475569; font-size: 13px; line-height: 1.45; }
.status-pill { display: inline-flex; align-items: center; justify-content: center; padding: 5px 10px; border-radius: 999px; background: #eef2ff; color: #223356; font-size: 12px; font-weight: 800; }
.table-row--risk { background: #fffdf4; }
.empty-state, .hint { padding: 14px 16px; color: #64748b; }
.hint--error { color: #b91c1c; }
@media (max-width: 900px) {
  .overview-strip, .finance-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .toolbar, .month-head { grid-template-columns: 1fr; display: grid; }
}
</style>
