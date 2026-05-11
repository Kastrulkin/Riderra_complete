<template>
  <div>
    <navigation />
    <div class="page-background"><div class="page-background__gradient"></div><div class="page-background__overlay"></div></div>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <admin-tabs />

        <div class="section-actions">
          <button class="btn btn--primary" :disabled="loading" @click="load">{{ loading ? t.loading : t.refresh }}</button>
        </div>

        <div class="toolbar">
          <input v-model="fromMonth" class="input" placeholder="2025-01" />
          <input v-model="toMonth" class="input" placeholder="2026-04" />
          <select v-model="status" class="input">
            <option value="archived">{{ t.archivedOnly }}</option>
            <option value="all">{{ t.allMonths }}</option>
          </select>
          <button class="btn" @click="load">{{ t.apply }}</button>
        </div>

        <div class="overview-strip">
          <div v-for="card in overviewCards" :key="card.key" class="overview-card" :class="`overview-card--${card.tone}`">
            <div class="overview-card__value">{{ card.value }}</div>
            <div class="overview-card__label">{{ card.label }}</div>
            <div class="overview-card__hint">{{ card.hint }}</div>
          </div>
        </div>

        <div v-if="error" class="hint hint--error">{{ error }}</div>

        <div class="subtabs">
          <button class="subtab" :class="{ 'subtab--active': tab === 'months' }" @click="tab = 'months'">{{ t.months }}</button>
          <button class="subtab" :class="{ 'subtab--active': tab === 'drivers' }" @click="tab = 'drivers'">{{ t.drivers }}</button>
          <button class="subtab" :class="{ 'subtab--active': tab === 'counterparties' }" @click="tab = 'counterparties'">{{ t.counterparties }}</button>
          <button class="subtab" :class="{ 'subtab--active': tab === 'rankings' }" @click="tab = 'rankings'">{{ t.rankings }}</button>
          <button class="subtab" :class="{ 'subtab--active': tab === 'signals' }" @click="tab = 'signals'">{{ t.signals }}</button>
        </div>

        <div v-if="tab === 'months'" class="table-wrap">
          <div class="table-head month-grid">
            <div>{{ t.month }}</div><div>{{ t.trips }}</div><div>{{ t.quality }}</div><div>{{ t.gross }}</div><div>{{ t.profit }}</div><div>ROI</div>
          </div>
          <div v-for="row in months" :key="row.monthLabel" class="table-row month-grid">
            <div><strong>{{ row.displayName || row.monthLabel }}</strong><span class="muted">{{ row.monthLabel }}</span></div>
            <div><strong>{{ row.total || 0 }}</strong><span class="muted">{{ t.completed }} {{ row.completed || 0 }}</span></div>
            <div><strong>{{ t.complaints }} {{ row.complaints || 0 }}</strong><span class="muted">{{ t.issues }} {{ row.issueCount || 0 }}</span></div>
            <div><strong>{{ moneyMap(row.grossByCurrency) }}</strong></div>
            <div><strong>{{ moneyMap(row.profitByCurrency) }}</strong></div>
            <div><strong>{{ roiMap(row.roiByCurrency) }}</strong></div>
          </div>
        </div>

        <div v-if="tab === 'drivers'" class="table-wrap">
          <stats-table :rows="drivers" name-key="driver" :t="t" :money-map="moneyMap" />
        </div>

        <div v-if="tab === 'counterparties'" class="table-wrap">
          <stats-table :rows="counterparties" name-key="counterparty" :t="t" :money-map="moneyMap" />
        </div>

        <div v-if="tab === 'rankings'" class="ranking-layout">
          <ranking-table :title="t.topDrivers" :rows="rankings.topDriversByTrips" name-key="driver" :t="t" :money-map="moneyMap" />
          <ranking-table :title="t.lowVolumeDrivers" :rows="rankings.lowVolumeDrivers" name-key="driver" :t="t" :money-map="moneyMap" />
          <ranking-table :title="t.driversByIssues" :rows="rankings.driversByIssues" name-key="driver" :t="t" :money-map="moneyMap" />
          <ranking-table :title="t.topClientsByGross" :rows="rankings.topClientsByGross" name-key="counterparty" :t="t" :money-map="moneyMap" />
          <ranking-table :title="t.topClientsByProfit" :rows="rankings.topClientsByProfit" name-key="counterparty" :t="t" :money-map="moneyMap" />
          <ranking-table :title="t.clientsByIssues" :rows="rankings.clientsByIssues" name-key="counterparty" :t="t" :money-map="moneyMap" />
        </div>

        <div v-if="tab === 'signals'" class="signals-layout">
          <div class="table-wrap">
            <div class="table-head signal-grid"><div>{{ t.signal }}</div><div>{{ t.count }}</div></div>
            <div v-for="row in signals.byType" :key="row.type" class="table-row signal-grid">
              <div><strong>{{ signalLabel(row.type) }}</strong><span class="muted">{{ row.type }}</span></div>
              <div><strong>{{ row.count }}</strong></div>
            </div>
          </div>
          <div class="table-wrap">
            <div class="table-head comment-grid"><div>{{ t.comment }}</div><div>{{ t.route }}</div><div>{{ t.driver }}</div><div>{{ t.counterparty }}</div></div>
            <div v-for="row in signals.comments" :key="`${row.pickupAt}-${row.driver}-${row.comment}`" class="table-row comment-grid">
              <div><strong>{{ row.comment }}</strong><span class="muted">{{ (row.issueFlags || []).map(signalLabel).join(', ') || '-' }}</span></div>
              <div>{{ row.route || '-' }}</div>
              <div>{{ row.driver || '-' }}</div>
              <div>{{ row.counterparty || '-' }}</div>
            </div>
          </div>
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
      <div class="table-head stats-grid" style="display:grid;grid-template-columns:minmax(250px,1.5fr) minmax(180px,1fr) minmax(180px,1fr) minmax(220px,1.2fr) minmax(220px,1.2fr);gap:14px;align-items:center;min-width:1080px;padding:12px 16px;background:#f8fafc;border-bottom:1px solid #d8d8e6;font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;">
        <div>{{ t.name }}</div><div>{{ t.trips }}</div><div>{{ t.quality }}</div><div>{{ t.gross }}</div><div>{{ t.profit }}</div>
      </div>
      <div v-for="row in rows" :key="row[nameKey]" class="table-row stats-grid" style="display:grid;grid-template-columns:minmax(250px,1.5fr) minmax(180px,1fr) minmax(180px,1fr) minmax(220px,1.2fr) minmax(220px,1.2fr);gap:14px;align-items:center;min-width:1080px;padding:14px 16px;border-bottom:1px solid #eef2f7;color:#1f2b46;">
        <div><strong>{{ row[nameKey] }}</strong></div>
        <div><strong>{{ row.total || 0 }}</strong><span style="display:block;margin-top:4px;color:#64748b;font-size:12px;">{{ t.completed }} {{ row.completed || 0 }}</span></div>
        <div><strong>{{ t.complaints }} {{ row.complaints || 0 }}</strong><span style="display:block;margin-top:4px;color:#64748b;font-size:12px;">{{ t.issueRate }} {{ Math.round((row.issueRate || 0) * 100) }}%</span><span style="display:block;margin-top:4px;color:#64748b;font-size:12px;">{{ (row.topSignals || []).map((item) => item.type + ' x' + item.count).join(', ') }}</span></div>
        <div><strong>{{ moneyMap(row.grossByCurrency) }}</strong></div>
        <div><strong>{{ moneyMap(row.profitByCurrency) }}</strong></div>
      </div>
    </div>
  `
}

const RankingTable = {
  props: ['title', 'rows', 'nameKey', 't', 'moneyMap'],
  template: `
    <div class="table-wrap ranking-card">
      <div class="ranking-title">{{ title }}</div>
      <div class="table-head ranking-grid"><div>{{ t.name }}</div><div>{{ t.trips }}</div><div>{{ t.quality }}</div><div>{{ t.gross }}</div><div>{{ t.profit }}</div></div>
      <div v-for="row in rows" :key="title + '-' + row[nameKey]" class="table-row ranking-grid">
        <div><strong>{{ row[nameKey] }}</strong></div>
        <div><strong>{{ row.completed || 0 }}</strong><span class="muted">{{ t.total }} {{ row.total || 0 }}</span></div>
        <div><strong>{{ row.complaints || 0 }} / {{ row.issueCount || 0 }}</strong><span class="muted">{{ t.issueRate }} {{ Math.round((row.issueRate || 0) * 100) }}%</span></div>
        <div><strong>{{ moneyMap(row.grossByCurrency) }}</strong></div>
        <div><strong>{{ moneyMap(row.profitByCurrency) }}</strong></div>
      </div>
      <div v-if="!rows || !rows.length" class="hint">{{ t.empty }}</div>
    </div>
  `
}

export default {
  middleware: 'staff',
  components: { navigation, adminTabs, StatsTable, RankingTable },
  data: () => ({
    months: [],
    drivers: [],
    counterparties: [],
    rankings: {},
    signals: {},
    summary: {},
    tab: 'months',
    fromMonth: '',
    toMonth: '',
    status: 'archived',
    loading: false,
    error: ''
  }),
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            refresh: 'Обновить',
            loading: 'Загружаю...',
            apply: 'Применить',
            archivedOnly: 'Только архив',
            allMonths: 'Все месяцы',
            months: 'Месяцы',
            drivers: 'Водители',
            counterparties: 'Контрагенты',
            rankings: 'Рейтинги',
            signals: 'Проблемы',
            month: 'Месяц',
            trips: 'Поездки',
            quality: 'Качество',
            gross: 'Выручка',
            profit: 'Прибыль',
            signal: 'Сигнал',
            count: 'Количество',
            comment: 'Комментарий',
            complaints: 'жалоб',
            issues: 'рисков',
            completed: 'выполнено',
            total: 'всего',
            name: 'Название',
            issueRate: 'проблемность',
            topDrivers: 'Кто сделал больше всего',
            lowVolumeDrivers: 'Кто сделал меньше всего',
            driversByIssues: 'Водители с косяками',
            topClientsByGross: 'Клиенты по выручке',
            topClientsByProfit: 'Клиенты по прибыли',
            clientsByIssues: 'Клиенты с проблемными поездками',
            empty: 'Данных нет'
          }
        : {
            refresh: 'Refresh',
            loading: 'Loading...',
            apply: 'Apply',
            archivedOnly: 'Archived only',
            allMonths: 'All months',
            months: 'Months',
            drivers: 'Drivers',
            counterparties: 'Counterparties',
            rankings: 'Rankings',
            signals: 'Issues',
            month: 'Month',
            trips: 'Trips',
            quality: 'Quality',
            gross: 'Gross',
            profit: 'Profit',
            signal: 'Signal',
            count: 'Count',
            comment: 'Comment',
            complaints: 'complaints',
            issues: 'risks',
            completed: 'completed',
            total: 'total',
            name: 'Name',
            issueRate: 'issue rate',
            topDrivers: 'Most trips by driver',
            lowVolumeDrivers: 'Least trips by driver',
            driversByIssues: 'Drivers with issues',
            topClientsByGross: 'Clients by gross',
            topClientsByProfit: 'Clients by profit',
            clientsByIssues: 'Clients with issue rows',
            empty: 'No data'
          }
    },
    overviewCards () {
      return [
        { key: 'months', value: this.months.length, label: this.t.months, hint: this.status, tone: 'neutral' },
        { key: 'trips', value: this.summary.total || 0, label: this.t.trips, hint: this.t.completed + ' ' + (this.summary.completed || 0), tone: 'info' },
        { key: 'gross', value: this.moneyMap(this.summary.grossByCurrency), label: this.t.gross, hint: this.t.months, tone: 'ok' },
        { key: 'risks', value: this.summary.issueCount || 0, label: this.t.quality, hint: this.t.complaints + ' ' + (this.summary.complaints || 0), tone: this.summary.issueCount ? 'warn' : 'ok' }
      ]
    }
  },
  mounted () { this.load() },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
    async load () {
      this.loading = true
      this.error = ''
      try {
        const params = new URLSearchParams({ status: this.status, lang: this.$store.state.language || 'ru' })
        if (this.fromMonth) params.set('fromMonth', this.fromMonth)
        if (this.toMonth) params.set('toMonth', this.toMonth)
        const res = await fetch(`/api/admin/economics/analytics/overview?${params.toString()}`, { headers: this.headers() })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        this.months = data.months || []
        this.drivers = data.drivers || []
        this.counterparties = data.counterparties || []
        this.rankings = data.rankings || {}
        this.signals = data.signals || {}
        this.summary = data.summary || {}
      } catch (error) {
        this.error = error?.message || 'Failed to load analytics'
      } finally {
        this.loading = false
      }
    },
    moneyMap (value) {
      const entries = Object.entries(value || {}).filter(([, amount]) => Number(amount || 0) !== 0)
      if (!entries.length) return '-'
      return entries.map(([currency, amount]) => `${currency} ${Number(amount || 0).toLocaleString('ru-RU')}`).join(' · ')
    },
    roiMap (value) {
      const entries = Object.entries(value || {}).filter(([, amount]) => amount !== null && amount !== undefined)
      if (!entries.length) return '-'
      return entries.map(([currency, amount]) => `${currency} ${Math.round(Number(amount || 0) * 100)}%`).join(' · ')
    },
    signalLabel (value) {
      const labels = {
        complaint: this.$store.state.language === 'ru' ? 'Жалоба' : 'Complaint',
        cancelled: this.$store.state.language === 'ru' ? 'Отмена' : 'Cancelled',
        cancelled_signal: this.$store.state.language === 'ru' ? 'Отмена в комментарии' : 'Cancellation note',
        missing_price: this.$store.state.language === 'ru' ? 'Нет цены' : 'Missing price',
        flight_info: this.$store.state.language === 'ru' ? 'Информация по рейсу' : 'Flight info',
        child_seat: this.$store.state.language === 'ru' ? 'Детское кресло' : 'Child seat',
        paid_after_cancel: this.$store.state.language === 'ru' ? 'Оплата после отмены' : 'Paid after cancel',
        wrong_address: this.$store.state.language === 'ru' ? 'Адрес требует внимания' : 'Address issue',
        no_show: 'No-show',
        non_positive_price: this.$store.state.language === 'ru' ? 'Нулевая/минусовая цена' : 'Non-positive price',
        penalty: this.$store.state.language === 'ru' ? 'Штраф' : 'Penalty',
        late: this.$store.state.language === 'ru' ? 'Опоздание' : 'Late',
        extra_waiting: this.$store.state.language === 'ru' ? 'Ожидание' : 'Waiting'
      }
      return labels[value] || value || '-'
    }
  }
}
</script>

<style scoped>
.toolbar { display: grid; grid-template-columns: 160px 160px 190px auto; gap: 12px; align-items: center; margin-bottom: 16px; }
.input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #c8ccdc; background: #fff; color: #1f2b46; }
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
.table-wrap { background: #fff; border: 1px solid #d8d8e6; border-radius: 8px; overflow: auto; margin-bottom: 16px; }
.table-head, .table-row { display: grid; gap: 14px; align-items: center; min-width: 1080px; }
.table-head { padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #d8d8e6; font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; }
.table-row { padding: 14px 16px; border-bottom: 1px solid #eef2f7; color: #1f2b46; }
.month-grid { grid-template-columns: minmax(170px, 1fr) minmax(150px, .8fr) minmax(160px, .8fr) minmax(210px, 1.2fr) minmax(210px, 1.2fr) minmax(120px, .7fr); }
.stats-grid { grid-template-columns: minmax(250px, 1.5fr) minmax(180px, 1fr) minmax(180px, 1fr) minmax(220px, 1.2fr) minmax(220px, 1.2fr); }
.ranking-layout { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.ranking-card { min-width: 0; }
.ranking-title { padding: 14px 16px; border-bottom: 1px solid #eef2f7; font-weight: 800; color: #17233d; }
.ranking-grid { grid-template-columns: minmax(180px, 1.4fr) minmax(120px, .8fr) minmax(140px, .8fr) minmax(170px, 1fr) minmax(170px, 1fr); min-width: 820px; }
.signals-layout { display: grid; grid-template-columns: minmax(360px, .7fr) minmax(0, 1.3fr); gap: 14px; }
.signal-grid { grid-template-columns: minmax(220px, 1fr) 120px; min-width: 360px; }
.comment-grid { grid-template-columns: minmax(300px, 1.5fr) minmax(260px, 1fr) minmax(160px, .8fr) minmax(170px, .8fr); min-width: 980px; }
.muted { display: block; margin-top: 4px; color: #64748b; font-size: 12px; }
.hint { padding: 14px 16px; color: #64748b; }
.hint--error { color: #b91c1c; }
@media (max-width: 900px) {
  .toolbar, .overview-strip, .ranking-layout, .signals-layout { grid-template-columns: 1fr; }
}
</style>
