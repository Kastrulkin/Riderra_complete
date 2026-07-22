<template>
  <div>
    <div class="page-background"><div class="page-background__gradient"></div><div class="page-background__overlay"></div></div>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <admin-tabs />
        <dashboard-header :loading="loading" @refresh="load" />

        <div class="filter-bar">
          <div class="period-tabs" role="group" aria-label="Период">
            <button v-for="item in periods" :key="item.key" type="button" :class="{ active: period === item.key }" @click="period = item.key">
              {{ item.label }}
            </button>
          </div>
          <label class="compare-toggle">
            <input v-model="comparePrevious" type="checkbox" />
            <span>Сравнить с прошлым периодом</span>
          </label>
          <input v-model="q" class="input search-input" placeholder="Поиск: клиент, исполнитель, месяц, Google Sheet" />
          <select v-model="year" class="input year-filter">
            <option value="">Все годы</option>
            <option v-for="item in years" :key="item" :value="item">{{ item }}</option>
          </select>
        </div>

        <div v-if="loading" class="skeleton-grid">
          <div v-for="item in 10" :key="item" class="skeleton-card"></div>
        </div>

        <div v-else>
          <div v-if="error" class="hint hint--error">{{ error }}</div>

          <kpi-grid :cards="kpiCards" @select="selectKpi" />

          <div class="dashboard-grid dashboard-grid--charts">
            <archive-trend-chart
              title="Поездки по времени"
              subtitle="Клик по точке открывает месяц."
              :months="visibleMonths"
              primary-key="total"
              primary-label="Поездки"
              secondary-key="completed"
              secondary-label="Выполнено"
              @month="openMonth"
            />
            <revenue-chart :months="visibleMonths" />
          </div>

          <div class="dashboard-grid dashboard-grid--charts">
            <archive-trend-chart
              title="Выполнено vs отменено"
              subtitle="Отмены видны отдельно, без смешивания со статусами ожидания."
              :months="visibleMonths"
              primary-key="completed"
              primary-label="Выполнено"
              secondary-key="cancelled"
              secondary-label="Отменено"
              @month="openMonth"
            />
            <archive-trend-chart
              title="Жалобы и риски"
              subtitle="Качество месяца: жалобы и все флаги риска."
              :months="visibleMonths"
              primary-key="complaints"
              primary-label="Жалобы"
              secondary-key="issueCount"
              secondary-label="Риски"
              @month="openMonth"
            />
          </div>

          <div class="leaderboard-toolbar">
            <div>
              <h2>Заказчики и исполнители</h2>
              <p>Негативные рейтинги показывают только участников с {{ minimumVolume }}+ поездками, чтобы разовые случаи не искажали картину.</p>
            </div>
            <div class="period-tabs period-tabs--compact" role="group" aria-label="Режим рейтинга">
              <button type="button" :class="{ active: rankingMode === 'absolute' }" @click="rankingMode = 'absolute'">Absolute</button>
              <button type="button" :class="{ active: rankingMode === 'rate' }" @click="rankingMode = 'rate'">Rate</button>
            </div>
          </div>

          <div class="dashboard-grid dashboard-grid--leaders">
            <performance-leaderboard
              title="Лучшие заказчики"
              hint="По выполненным поездкам и выручке."
              :rows="leaderboards.topClients"
              :mode="rankingMode"
              toggle
              @mode="rankingMode = $event"
              @select="openEntity($event, 'client')"
            />
            <performance-leaderboard
              title="Лучшие исполнители"
              hint="Кто сделал больше всего выполненных поездок."
              :rows="leaderboards.topDrivers"
              :mode="rankingMode"
              @select="openEntity($event, 'driver')"
            />
            <performance-leaderboard
              title="Проблемные заказчики"
              hint="Complaint, cancellation и risk rate."
              :rows="leaderboards.problemClients"
              :mode="rankingMode"
              problem
              @select="openEntity($event, 'client')"
            />
            <performance-leaderboard
              title="Проблемные исполнители"
              hint="Инциденты и риски с учетом объема."
              :rows="leaderboards.problemDrivers"
              :mode="rankingMode"
              problem
              @select="openEntity($event, 'driver')"
            />
          </div>

          <month-archive-table
            :rows="archiveRows"
            @open-month="openMonth"
            @open-trips="openTrips"
            @open-analytics="openAnalytics"
          />
        </div>
      </div>
    </section>
    <entity-detail-drawer :entity="selectedEntity" :type="selectedEntityType" @close="selectedEntity = null" @filter-trips="jumpToEntityTrips" />
  </div>
</template>

<script>
import adminTabs from '~/components/partials/adminTabs.vue'
import DashboardHeader from '~/components/admin/orderArchive/DashboardHeader.vue'
import KpiGrid from '~/components/admin/orderArchive/KPIGrid.vue'
import ArchiveTrendChart from '~/components/admin/orderArchive/ArchiveTrendChart.vue'
import RevenueChart from '~/components/admin/orderArchive/RevenueChart.vue'
import PerformanceLeaderboard from '~/components/admin/orderArchive/PerformanceLeaderboard.vue'
import MonthArchiveTable from '~/components/admin/orderArchive/MonthArchiveTable.vue'
import EntityDetailDrawer from '~/components/admin/orderArchive/EntityDetailDrawer.vue'

const archiveUtils = require('~/utils/orderArchiveDashboard')
const ARCHIVE_OVERVIEW_LIMIT_MONTHS = 24
const ARCHIVE_OVERVIEW_TIMEOUT_MS = 15000

export default {
  layout: 'admin',
  middleware: 'staff',
  components: {
    adminTabs,
    DashboardHeader,
    KpiGrid,
    ArchiveTrendChart,
    RevenueChart,
    PerformanceLeaderboard,
    MonthArchiveTable,
    EntityDetailDrawer
  },
  data: () => ({
    months: [],
    drivers: [],
    counterparties: [],
    summary: {},
    q: '',
    year: '',
    period: '12m',
    comparePrevious: true,
    rankingMode: 'absolute',
    loading: false,
    error: '',
    selectedEntity: null,
    selectedEntityType: 'client',
    minimumVolume: archiveUtils.MIN_NEGATIVE_RANKING_VOLUME
  }),
  computed: {
    periods () {
      return [
        { key: '1m', label: '1м' },
        { key: '3m', label: '3м' },
        { key: '6m', label: '6м' },
        { key: '12m', label: '12м' },
        { key: 'ytd', label: 'YTD' },
        { key: 'all', label: 'Все' }
      ]
    },
    years () {
      return [...new Set(this.months.map((m) => String(m.monthLabel || '').slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a))
    },
    periodParts () {
      return archiveUtils.splitCurrentAndPrevious(this.months, this.period)
    },
    visibleMonths () {
      return this.periodParts.current
    },
    currentSummary () {
      return archiveUtils.buildPeriodSummary(this.visibleMonths)
    },
    previousSummary () {
      return archiveUtils.buildPeriodSummary(this.periodParts.previous)
    },
    kpiCards () {
      const summary = this.currentSummary
      const previous = this.previousSummary
      const delta = (key) => this.comparePrevious ? archiveUtils.metricDelta(summary, previous, key) : 0
      const spark = (key) => this.visibleMonths.map((m) => Number(m[key] || 0))
      return [
        { key: 'total', label: 'Поездки', value: summary.total, delta: delta('total'), sparkline: spark('total'), description: 'Все поездки выбранного периода.' },
        { key: 'completed', label: 'Выполнено', value: summary.completed, delta: delta('completed'), sparkline: spark('completed'), description: 'Количество выполненных поездок.' },
        { key: 'completedRate', label: 'Доля выполненных', value: archiveUtils.formatRate(summary.completedRate), delta: delta('completedRate'), sparkline: this.visibleMonths.map((m) => archiveUtils.toNumber(m.completed) / Math.max(archiveUtils.toNumber(m.total), 1)), description: 'Выполненные поездки / все поездки.' },
        { key: 'cancelled', label: 'Отмены', value: summary.cancelled, delta: delta('cancelled'), sparkline: spark('cancelled'), description: 'Все отмененные поездки.' },
        { key: 'cancellationRate', label: 'Доля отмен', value: archiveUtils.formatRate(summary.cancellationRate), delta: delta('cancellationRate'), sparkline: this.visibleMonths.map((m) => archiveUtils.toNumber(m.cancelled) / Math.max(archiveUtils.toNumber(m.total), 1)), description: 'Отмены / все поездки.' },
        { key: 'grossByCurrency', label: 'Выручка', value: archiveUtils.formatEur(archiveUtils.totalEur(summary.grossByCurrency)), delta: delta('grossByCurrency'), sparkline: this.visibleMonths.map((m) => archiveUtils.totalEur(m.grossByCurrency)), description: 'Все валюты приведены к EUR по аналитическому курсу.' },
        { key: 'complaints', label: 'Жалобы', value: summary.complaints, delta: delta('complaints'), sparkline: spark('complaints'), description: 'Количество поездок с жалобой.' },
        { key: 'complaintRate', label: 'Доля жалоб', value: archiveUtils.formatRate(summary.complaintRate), delta: delta('complaintRate'), sparkline: this.visibleMonths.map((m) => archiveUtils.toNumber(m.complaints) / Math.max(archiveUtils.toNumber(m.total), 1)), description: 'Жалобы / все поездки.' },
        { key: 'issueCount', label: 'Риски', value: summary.issueCount, delta: delta('issueCount'), sparkline: spark('issueCount'), description: 'Все зафиксированные флаги риска.' },
        { key: 'profitByCurrency', label: 'Прибыль', value: archiveUtils.formatEur(archiveUtils.totalEur(summary.profitByCurrency)), delta: delta('profitByCurrency'), sparkline: this.visibleMonths.map((m) => archiveUtils.totalEur(m.profitByCurrency)), description: 'Прибыль доступна там, где есть цена водителя; валюты приведены к EUR.' }
      ]
    },
    leaderboards () {
      return archiveUtils.buildLeaderboards({
        drivers: this.filteredEntities(this.drivers, 'driver'),
        counterparties: this.filteredEntities(this.counterparties, 'counterparty'),
        mode: this.rankingMode,
        minimumVolume: this.minimumVolume
      })
    },
    archiveRows () {
      return archiveUtils.filterArchiveRows(this.months, this.q, this.year)
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
        const params = new URLSearchParams({
          status: 'archived',
          lang: this.$store.state.language || 'ru',
          limitMonths: String(ARCHIVE_OVERVIEW_LIMIT_MONTHS)
        })
        const res = await this.fetchWithTimeout(`/api/admin/economics/analytics/overview?${params.toString()}`, { headers: this.headers() })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        this.months = data.months || []
        this.drivers = data.drivers || []
        this.counterparties = data.counterparties || []
        this.summary = data.summary || {}
      } catch (error) {
        this.error = error?.message === 'Request timeout'
          ? 'Архив загружается слишком долго. Обновите страницу или сузьте период.'
          : (error?.message || 'Failed to load archive dashboard')
      } finally {
        this.loading = false
      }
    },
    fetchWithTimeout (url, options = {}) {
      if (typeof AbortController === 'undefined') {
        return Promise.race([
          fetch(url, options),
          new Promise((resolve, reject) => window.setTimeout(() => reject(new Error('Request timeout')), ARCHIVE_OVERVIEW_TIMEOUT_MS))
        ])
      }
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), ARCHIVE_OVERVIEW_TIMEOUT_MS)
      return fetch(url, { ...options, signal: controller.signal })
        .catch((error) => {
          if (error?.name === 'AbortError') throw new Error('Request timeout')
          throw error
        })
        .finally(() => window.clearTimeout(timeout))
    },
    filteredEntities (rows, key) {
      const q = this.q.trim().toLowerCase()
      if (!q) return rows
      return rows.filter((row) => String(row[key] || '').toLowerCase().includes(q))
    },
    selectKpi (card) {
      if (card.key === 'grossByCurrency' || card.key === 'profitByCurrency') this.$router.push('/admin-order-analytics')
    },
    monthLabelFromPayload (month) {
      return typeof month === 'string' ? month : String(month?.monthLabel || '').trim()
    },
    openMonth (month) {
      const monthLabel = this.monthLabelFromPayload(month)
      if (monthLabel) this.$router.push({ path: `/admin-order-archive/${encodeURIComponent(monthLabel)}` })
    },
    openTrips (month) {
      this.openMonth(month)
    },
    openAnalytics (month) {
      const monthLabel = this.monthLabelFromPayload(month)
      const query = monthLabel ? { fromMonth: monthLabel, toMonth: monthLabel } : {}
      this.$router.push({ path: '/admin-order-analytics', query })
    },
    openEntity (entity, type) {
      this.selectedEntity = entity
      this.selectedEntityType = type
    },
    jumpToEntityTrips () {
      const firstMonth = this.visibleMonths[this.visibleMonths.length - 1]
      if (!firstMonth) return
      this.$router.push(`/admin-order-archive/${firstMonth.monthLabel}`)
    }
  }
}
</script>

<style scoped>
.admin-section {
  padding-top: 150px;
  color: #17233d;
}
.filter-bar {
  position: sticky;
  top: 78px;
  z-index: 65;
  display: grid;
  grid-template-columns: auto auto minmax(220px, 1fr) 150px;
  gap: 12px;
  align-items: center;
  margin-bottom: 18px;
  padding: 12px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: rgba(255, 255, 255, .95);
  box-shadow: 0 12px 26px rgba(15, 23, 42, .06);
  backdrop-filter: blur(10px);
}
.period-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #f8fafc;
}
.period-tabs button {
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #53627c;
  font-weight: 800;
  cursor: pointer;
  padding: 8px 10px;
}
.period-tabs button.active {
  background: #17233d;
  color: #fff;
}
.period-tabs--compact button {
  padding: 7px 10px;
}
.compare-toggle {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: #53627c;
  font-size: 12px;
  font-weight: 800;
}
.input {
  width: 100%;
  min-height: 40px;
  padding: 9px 11px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #17233d;
}
.dashboard-grid {
  display: grid;
  gap: 14px;
  margin-bottom: 18px;
}
.dashboard-grid--charts,
.dashboard-grid--leaders {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.leaderboard-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  margin: 8px 0 14px;
}
.leaderboard-toolbar h2 {
  margin: 0;
  color: #17233d;
  font-size: 20px;
}
.leaderboard-toolbar p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.skeleton-card {
  min-height: 138px;
  border-radius: 8px;
  background: linear-gradient(90deg, #edf2f7 0%, #f8fafc 45%, #edf2f7 90%);
  background-size: 240% 100%;
  animation: shimmer 1.25s linear infinite;
}
.hint {
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  color: #64748b;
}
.hint--error {
  border-color: #fecaca;
  color: #b91c1c;
}
@keyframes shimmer {
  to { background-position: -240% 0; }
}
@media (max-width: 1100px) {
  .filter-bar { grid-template-columns: 1fr 1fr; }
  .dashboard-grid--charts,
  .dashboard-grid--leaders,
  .skeleton-grid { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .filter-bar {
    position: static;
    grid-template-columns: 1fr;
  }
  .period-tabs { overflow-x: auto; }
  .leaderboard-toolbar { display: grid; }
}
</style>
