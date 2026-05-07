<template>
  <div>
    <navigation />
    <div class="page-background"><div class="page-background__gradient"></div><div class="page-background__overlay"></div></div>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <admin-tabs />

        <div class="section-actions">
          <button class="btn btn--primary" :disabled="loading" @click="load">
            {{ loading ? t.loading : t.refresh }}
          </button>
        </div>

        <div class="overview-strip">
          <div v-for="card in overviewCards" :key="card.key" class="overview-card" :class="`overview-card--${card.tone}`">
            <div class="overview-card__value">{{ card.value }}</div>
            <div class="overview-card__label">{{ card.label }}</div>
            <div class="overview-card__hint">{{ card.hint }}</div>
          </div>
        </div>

        <div class="toolbar">
          <input v-model="q" class="input toolbar-search" :placeholder="t.search" @input="applyFilter" />
          <select v-model="year" class="input month-filter" @change="load">
            <option value="">{{ t.allYears }}</option>
            <option v-for="item in years" :key="item" :value="item">{{ item }}</option>
          </select>
        </div>

        <div v-if="error" class="hint hint--error">{{ error }}</div>

        <div class="table-wrap">
          <div class="table-head archive-grid">
            <div>{{ t.month }}</div>
            <div>{{ t.source }}</div>
            <div>{{ t.trips }}</div>
            <div>{{ t.quality }}</div>
            <div>{{ t.money }}</div>
            <div>{{ t.updated }}</div>
            <div>{{ t.actions }}</div>
          </div>
          <div v-for="m in filteredMonths" :key="m.monthLabel" class="table-row archive-grid">
            <div class="route-cell">
              <div class="route-cell__title">{{ m.displayName || m.monthLabel }}</div>
              <div class="route-cell__sub">{{ m.monthLabel }}</div>
            </div>
            <div class="cell-wrap">
              <strong>{{ m.sourceSheetName || '-' }}</strong>
              <span class="muted">{{ m.sourceSheetId || '-' }}</span>
            </div>
            <div>
              <strong>{{ m.total || 0 }}</strong>
              <div class="muted">{{ t.completed }} {{ m.completed || 0 }} · {{ t.cancelled }} {{ m.cancelled || 0 }}</div>
            </div>
            <div>
              <strong>{{ t.complaints }} {{ m.complaints || 0 }}</strong>
              <div class="muted">{{ t.issues }} {{ m.issueCount || 0 }}</div>
            </div>
            <div>
              <strong>{{ moneyMap(m.grossByCurrency) }}</strong>
              <div class="muted">{{ t.profit }} {{ moneyMap(m.profitByCurrency) }}</div>
            </div>
            <div>
              <strong>{{ formatDate(m.lastSyncedAt) }}</strong>
              <div class="muted">{{ t.closed }} {{ formatDate(m.closedAt) }}</div>
            </div>
            <div class="row-actions">
              <button class="btn btn--small btn--primary" @click="$router.push(`/admin-order-archive/${m.monthLabel}`)">
                {{ t.open }}
              </button>
              <a v-if="m.sourceSheetUrl" class="btn btn--small" :href="m.sourceSheetUrl" target="_blank" rel="noopener">
                Google Sheet
              </a>
            </div>
          </div>
          <div v-if="!filteredMonths.length" class="empty-state">{{ t.empty }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import navigation from '~/components/partials/nav.vue'
import adminTabs from '~/components/partials/adminTabs.vue'

export default {
  middleware: 'staff',
  components: { navigation, adminTabs },
  data: () => ({
    months: [],
    filteredMonths: [],
    q: '',
    year: '',
    loading: false,
    error: ''
  }),
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            refresh: 'Обновить',
            loading: 'Загружаю...',
            search: 'Поиск по месяцу или источнику',
            allYears: 'Все годы',
            month: 'Месяц',
            source: 'Источник',
            trips: 'Поездки',
            quality: 'Качество',
            money: 'Деньги',
            updated: 'Обновление',
            actions: 'Действия',
            completed: 'выполнено',
            cancelled: 'отмен',
            complaints: 'жалоб',
            issues: 'рисков',
            profit: 'прибыль',
            closed: 'закрыт',
            open: 'Открыть',
            empty: 'Архивных месяцев пока нет',
            months: 'Месяцев',
            totalTrips: 'Поездок',
            totalGross: 'Выручка',
            totalComplaints: 'Жалоб'
          }
        : {
            refresh: 'Refresh',
            loading: 'Loading...',
            search: 'Search by month or source',
            allYears: 'All years',
            month: 'Month',
            source: 'Source',
            trips: 'Trips',
            quality: 'Quality',
            money: 'Money',
            updated: 'Updated',
            actions: 'Actions',
            completed: 'completed',
            cancelled: 'cancelled',
            complaints: 'complaints',
            issues: 'risks',
            profit: 'profit',
            closed: 'closed',
            open: 'Open',
            empty: 'No archived months yet',
            months: 'Months',
            totalTrips: 'Trips',
            totalGross: 'Gross',
            totalComplaints: 'Complaints'
          }
    },
    years () {
      return [...new Set(this.months.map((m) => String(m.monthLabel || '').slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a))
    },
    overviewCards () {
      const totals = this.months.reduce((acc, m) => {
        acc.trips += Number(m.total || 0)
        acc.complaints += Number(m.complaints || 0)
        for (const [currency, amount] of Object.entries(m.grossByCurrency || {})) {
          acc.gross[currency] = Number(((acc.gross[currency] || 0) + Number(amount || 0)).toFixed(2))
        }
        return acc
      }, { trips: 0, complaints: 0, gross: {} })
      return [
        { key: 'months', value: this.months.length, label: this.t.months, hint: this.t.allYears, tone: 'neutral' },
        { key: 'trips', value: totals.trips, label: this.t.totalTrips, hint: this.t.completed, tone: 'info' },
        { key: 'gross', value: this.moneyMap(totals.gross), label: this.t.totalGross, hint: this.t.money, tone: 'ok' },
        { key: 'complaints', value: totals.complaints, label: this.t.totalComplaints, hint: this.t.quality, tone: totals.complaints ? 'warn' : 'ok' }
      ]
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
    async load () {
      this.loading = true
      this.error = ''
      try {
        const params = new URLSearchParams()
        if (this.year) params.set('year', this.year)
        params.set('lang', this.$store.state.language || 'ru')
        const res = await fetch(`/api/admin/economics/order-archive/months?${params.toString()}`, { headers: this.headers() })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        this.months = data.months || []
        this.applyFilter()
      } catch (error) {
        this.months = []
        this.filteredMonths = []
        this.error = error?.message || 'Failed to load archive'
      } finally {
        this.loading = false
      }
    },
    applyFilter () {
      const q = this.q.trim().toLowerCase()
      this.filteredMonths = this.months.filter((m) => {
        if (!q) return true
        return [m.monthLabel, m.displayName, m.sourceSheetName, m.sourceSheetId].join(' ').toLowerCase().includes(q)
      })
    },
    moneyMap (value) {
      const entries = Object.entries(value || {}).filter(([, amount]) => Number(amount || 0) !== 0)
      if (!entries.length) return '-'
      return entries.map(([currency, amount]) => `${currency} ${Number(amount).toLocaleString('ru-RU')}`).join(' · ')
    },
    formatDate (value) {
      if (!value) return '-'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString()
    }
  }
}
</script>

<style scoped>
.overview-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.overview-card { padding: 14px 16px; border-radius: 8px; border: 1px solid #d8e0ef; background: #fff; box-shadow: 0 12px 28px rgba(16, 30, 67, 0.06); }
.overview-card__value { font-size: 24px; font-weight: 800; color: #17233d; }
.overview-card__label { margin-top: 4px; font-size: 14px; font-weight: 700; color: #223356; }
.overview-card__hint { margin-top: 6px; font-size: 12px; color: #6b7280; }
.overview-card--warn { border-color: #fde68a; background: #fffdf4; }
.overview-card--ok { border-color: #bbf7d0; background: #f7fff9; }
.overview-card--info { border-color: #bfdbfe; background: #f7fbff; }
.toolbar { display: grid; grid-template-columns: minmax(280px, 1fr) 180px; gap: 12px; align-items: center; margin-bottom: 14px; }
.input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #c8ccdc; background: #fff; color: #1f2b46; }
.table-wrap { background: #fff; border: 1px solid #d8d8e6; border-radius: 8px; overflow: auto; }
.archive-grid { display: grid; grid-template-columns: minmax(150px, 1.1fr) minmax(220px, 1.3fr) minmax(150px, 1fr) minmax(130px, 0.9fr) minmax(180px, 1.2fr) minmax(150px, 1fr) minmax(180px, 1fr); min-width: 1180px; gap: 14px; align-items: center; }
.table-head { padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #d8d8e6; font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; }
.table-row { padding: 14px 16px; border-bottom: 1px solid #eef2f7; color: #1f2b46; }
.route-cell__title { font-weight: 800; color: #17233d; }
.route-cell__sub, .muted { display: block; margin-top: 4px; color: #64748b; font-size: 12px; }
.cell-wrap { min-width: 0; overflow-wrap: anywhere; }
.row-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.empty-state, .hint { padding: 14px 16px; color: #64748b; }
.hint--error { color: #b91c1c; }
@media (max-width: 900px) {
  .overview-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .toolbar { grid-template-columns: 1fr; }
}
</style>
