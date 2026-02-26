<template>
  <div>
    <navigation></navigation>
    <div class="page-background"><div class="page-background__gradient"></div><div class="page-background__overlay"></div></div>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <h1 class="h2">{{ t.title }}</h1>
        <admin-tabs />

        <div class="subtabs">
          <button class="btn btn--small" :class="{active: tab==='base'}" @click="tab='base'">{{ t.base }}</button>
          <button class="btn btn--small" :class="{active: tab==='counterparty'}" @click="tab='counterparty'">{{ t.counterparty }}</button>
          <button class="btn btn--small" :class="{active: tab==='driver'}" @click="tab='driver'">{{ t.driver }}</button>
          <button class="btn btn--small" :class="{active: tab==='conflicts'}" @click="tab='conflicts'">{{ t.conflicts }}</button>
        </div>

        <div class="toolbar">
          <button class="btn btn--primary" @click="reloadAll">{{ t.refresh }}</button>
          <button class="btn" @click="downloadEtaTemplate">{{ t.etaTemplate }}</button>
          <button v-if="tab==='conflicts'" class="btn btn--danger" @click="recalc">{{ t.recalc }}</button>
        </div>

        <div v-if="tab==='base'" class="panel">
          <h3>{{ t.base }}</h3>
          <div class="grid-head"><div>{{ t.city }}</div><div>{{ t.route }}</div><div>{{ t.sale }}</div><div>{{ t.perKm }}</div><div>{{ t.hourly }}</div><div>{{ t.childSeat }}</div><div>{{ t.source }}</div></div>
          <div v-for="r in baseRows" :key="r.id" class="grid-row">
            <div>{{ r.city }}</div><div>{{ r.routeFrom || '-' }} -> {{ r.routeTo || '-' }}</div><div>{{ r.fixedPrice || '-' }} {{ r.currency }}</div><div>{{ r.pricePerKm || '-' }}</div><div>{{ r.hourlyRate || '-' }}</div><div>{{ r.childSeatPrice || '-' }}</div><div>{{ r.source }}</div>
          </div>
        </div>

        <div v-if="tab==='counterparty'" class="panel">
          <h3>{{ t.counterparty }}</h3>
          <div class="grid-head"><div>{{ t.counterpartyName }}</div><div>{{ t.city }}</div><div>{{ t.route }}</div><div>{{ t.sale }}</div><div>{{ t.markup }}</div><div>{{ t.status }}</div></div>
          <div v-for="r in cpRows" :key="r.id" class="grid-row">
            <div>{{ r.counterpartyName }}</div><div>{{ r.city || '-' }}</div><div>{{ r.routeFrom || '-' }} -> {{ r.routeTo || '-' }}</div><div>{{ r.sellPrice || '-' }} {{ r.currency }}</div><div>{{ r.markupPercent || '-' }}%</div><div>{{ r.isActive ? 'active' : 'off' }}</div>
          </div>
        </div>

        <div v-if="tab==='driver'" class="panel">
          <h3>{{ t.driver }}</h3>
          <div class="grid-head"><div>{{ t.name }}</div><div>{{ t.country }}</div><div>{{ t.city }}</div><div>{{ t.perKm }}</div><div>{{ t.hourly }}</div><div>{{ t.childSeat }}</div><div>{{ t.comment }}</div></div>
          <div v-for="d in driverRows" :key="d.id" class="grid-row">
            <div>{{ d.name }}</div><div>{{ d.country || '-' }}</div><div>{{ d.city || '-' }}</div><div>{{ d.kmRate || '-' }}</div><div>{{ d.hourlyRate || '-' }}</div><div>{{ d.childSeatPrice || '-' }}</div><div>{{ d.comment || '-' }}</div>
          </div>
        </div>

        <div v-if="tab==='conflicts'" class="panel">
          <h3>{{ t.conflicts }}</h3>
          <div class="grid-head"><div>{{ t.issue }}</div><div>ID</div><div>{{ t.route }}</div><div>{{ t.sale }}</div><div>{{ t.driverCost }}</div><div>{{ t.margin }}</div><div>{{ t.severity }}</div></div>
          <div v-for="c in conflictRows" :key="c.id" class="grid-row">
            <div>{{ c.issueType }}</div><div>{{ c.orderId || '-' }}</div><div>{{ c.order ? (c.order.fromPoint + ' -> ' + c.order.toPoint) : '-' }}</div><div>{{ c.sellPrice }}</div><div>{{ c.driverCost }}</div><div>{{ c.marginAbs }} ({{ c.marginPct.toFixed(1) }}%)</div><div>{{ c.severity }}</div>
          </div>
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
  data: () => ({ tab: 'base', baseRows: [], cpRows: [], conflictRows: [], driverRows: [] }),
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'Прайс и контроль маржи', base: 'Продажа (базовый)', counterparty: 'Контрагенты', driver: 'Цены водителей', conflicts: 'Риски/расхождения', refresh: 'Обновить', etaTemplate: 'Шаблон для ETA', recalc: 'Пересчитать риски', city: 'Город', route: 'Маршрут', sale: 'Цена продажи', perKm: 'За км', hourly: 'Почасовая', childSeat: 'Детское кресло', source: 'Источник', counterpartyName: 'Контрагент', markup: 'Наценка', status: 'Статус', name: 'Водитель', country: 'Страна', comment: 'Комментарий', issue: 'Проблема', driverCost: 'Цена водителя', margin: 'Маржа', severity: 'Критичность'
          }
        : {
            title: 'Pricing & Margin Control', base: 'Base Sell', counterparty: 'Counterparty', driver: 'Driver Prices', conflicts: 'Conflicts', refresh: 'Refresh', etaTemplate: 'ETA Template', recalc: 'Recalculate', city: 'City', route: 'Route', sale: 'Sell price', perKm: 'Per km', hourly: 'Hourly', childSeat: 'Child seat', source: 'Source', counterpartyName: 'Counterparty', markup: 'Markup', status: 'Status', name: 'Driver', country: 'Country', comment: 'Comment', issue: 'Issue', driverCost: 'Driver cost', margin: 'Margin', severity: 'Severity'
          }
    }
  },
  mounted () { this.reloadAll() },
  methods: {
    headers () { const token = localStorage.getItem('authToken'); return { Authorization: token ? `Bearer ${token}` : '' } },
    async reloadAll () {
      const [base, cp, cf, dr] = await Promise.all([
        fetch('/api/admin/pricing/cities?limit=500', { headers: this.headers() }).then(r => r.json()),
        fetch('/api/admin/pricing/counterparty-rules', { headers: this.headers() }).then(r => r.json()),
        fetch('/api/admin/pricing/conflicts?status=open&limit=500', { headers: this.headers() }).then(r => r.json()),
        fetch('/api/admin/drivers', { headers: this.headers() }).then(r => r.json())
      ])
      this.baseRows = base.rows || []
      this.cpRows = cp.rows || []
      this.conflictRows = cf.rows || []
      this.driverRows = Array.isArray(dr) ? dr : []
    },
    async recalc () {
      await fetch('/api/admin/pricing/conflicts/recalculate', { method: 'POST', headers: this.headers() })
      await this.reloadAll()
    },
    async downloadEtaTemplate () {
      const response = await fetch('/api/admin/pricing/export-eta-template', { headers: this.headers() })
      if (!response.ok) return
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ETA_Fixed_Price_template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }
}
</script>

<style scoped>
.admin-section{padding-top:150px;color:#fff}.subtabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.btn.active{background:#0ea5e9;color:#fff}.toolbar{display:flex;gap:10px;margin-bottom:12px}.panel{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:12px}.grid-head,.grid-row{display:grid;grid-template-columns:1fr 1.2fr 1fr .8fr .8fr .9fr .9fr;gap:10px;min-width:1100px;padding:9px 6px}.grid-head{font-weight:700;border-bottom:1px solid rgba(255,255,255,.2)}.grid-row{border-bottom:1px solid rgba(255,255,255,.08)}
</style>
