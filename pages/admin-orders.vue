<template>
  <div>
    <navigation></navigation>
    <div class="page-background"><div class="page-background__gradient"></div><div class="page-background__overlay"></div></div>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <h1 class="h2">{{ t.title }}</h1>
        <admin-tabs />
        <div class="toolbar">
          <input v-model="q" class="input" :placeholder="t.search" @input="applyFilter" />
          <button class="btn btn--primary" @click="load">{{ t.refresh }}</button>
        </div>
        <div class="table-wrap">
          <div class="table-head">
            <div>ID</div><div>{{ t.source }}</div><div>{{ t.pickupAt }}</div><div>{{ t.from }}</div><div>{{ t.to }}</div><div>{{ t.client }}</div><div>{{ t.driver }}</div><div>{{ t.status }}</div>
          </div>
          <div v-for="o in filtered" :key="o.id" class="table-row">
            <div>{{ o.id }}</div><div>{{ o.source }}</div><div>{{ fmt(o.pickupAt || o.createdAt) }}</div><div>{{ o.fromPoint }}</div><div>{{ o.toPoint }}</div><div>{{ o.clientPrice }}</div><div>{{ o.driverPrice || '-' }}</div><div>{{ o.status }}</div>
          </div>
        </div>
        <div class="hint">{{ t.total }}: {{ filtered.length }}</div>
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
  data: () => ({ rows: [], filtered: [], q: '' }),
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? { title: 'Таблица заказов', search: 'Поиск по маршруту/ID', refresh: 'Обновить', source: 'Источник', pickupAt: 'Подача', from: 'Откуда', to: 'Куда', client: 'Цена клиента', driver: 'Цена водителя', status: 'Статус', total: 'Всего' }
        : { title: 'Orders Table', search: 'Search by route/ID', refresh: 'Refresh', source: 'Source', pickupAt: 'Pickup', from: 'From', to: 'To', client: 'Client price', driver: 'Driver price', status: 'Status', total: 'Total' }
    }
  },
  mounted () { this.load() },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
    fmt (v) {
      if (!v) return '-'
      const d = new Date(v)
      if (Number.isNaN(d.getTime())) return '-'
      return d.toLocaleString(this.$store.state.language === 'ru' ? 'ru-RU' : 'en-US')
    },
    async load () {
      const r = await fetch('/api/admin/orders', { headers: this.headers() })
      this.rows = await r.json()
      this.applyFilter()
    },
    applyFilter () {
      const q = this.q.trim().toLowerCase()
      if (!q) {
        this.filtered = this.rows
        return
      }
      this.filtered = this.rows.filter((o) =>
        [o.id, o.fromPoint, o.toPoint, o.externalKey]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    }
  }
}
</script>

<style scoped>
.admin-section { padding-top: 150px; color: #17233d; }
.toolbar { display: flex; gap: 10px; margin-bottom: 14px; }
.input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #c8ccdc; background: #fff; color: #1f2b46; }
.table-wrap { background: #fff; border: 1px solid #d8d8e6; border-radius: 12px; overflow: auto; }
.table-head, .table-row { display: grid; grid-template-columns: 1.2fr .8fr 1fr 1.2fr 1.2fr .8fr .8fr .7fr; gap: 10px; min-width: 1100px; padding: 10px 12px; }
.table-head { font-weight: 700; border-bottom: 1px solid #e4e7f0; }
.table-row { border-top: 1px solid #f0f2f7; color: #2f3e60; }
.hint { margin-top: 10px; color: #637191; }
</style>
