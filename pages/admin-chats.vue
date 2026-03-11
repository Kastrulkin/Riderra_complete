<template>
  <div>
    <navigation></navigation>
    <section class="site-section site-section--pf chat-section">
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="h2">Чаты</h1>
            <p class="hint">Список заказов с пометкой «нужна доп. информация». Сначала координатор выясняет и потом отправляет рассылку.</p>
          </div>
          <button class="btn btn--primary" @click="load">Обновить</button>
        </div>

        <admin-tabs />

        <div class="table-wrap">
          <div class="table-head">
            <div>Создан</div>
            <div>Номер</div>
            <div>Маршрут</div>
            <div>Цена</div>
            <div>Статус</div>
            <div>Причина</div>
          </div>
          <div v-for="row in rows" :key="row.id" class="table-row">
            <div>{{ formatDate(row.createdAt) }}</div>
            <div>{{ row.orderNumber || row.externalKey }}</div>
            <div>{{ routeLabel(row) }}</div>
            <div>{{ formatMoney(row.clientPrice) }}</div>
            <div><span class="status-pill">{{ row.status }}</span></div>
            <div>{{ row.infoReason || 'без комментария' }}</div>
          </div>
          <div v-if="!rows.length" class="empty">Ничего не помечено</div>
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
    rows: []
  }),
  mounted() {
    this.load()
  },
  methods: {
    headers() {
      const token = localStorage.getItem('authToken')
      return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    },
    async load() {
      const res = await fetch('/api/admin/chats?limit=200', { headers: this.headers() })
      const data = await res.json()
      this.rows = data.rows || []
    },
    formatDate(value) {
      if (!value) return '-'
      const date = new Date(value)
      return date.toLocaleString()
    },
    routeLabel(row) {
      const parts = []
      if (row.fromPoint) parts.push(row.fromPoint)
      if (row.toPoint) parts.push(row.toPoint)
      return parts.length ? parts.join(' → ') : '—'
    },
    formatMoney(value) {
      if (value == null) return '-'
      const n = Number(value)
      return Number.isFinite(n) ? `${n.toFixed(2)} EUR` : '-'
    }
  }
}
</script>

<style scoped>
.chat-section { padding-top: 140px; padding-bottom: 40px; }
.page-head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:16px; }
.toolbar { display:flex; gap:10px; margin-bottom:12px; }
.table-wrap { background:#fff; border:1px solid #d8d9e6; border-radius:12px; overflow:auto; }
.table-head, .table-row { display:grid; grid-template-columns: 180px 160px 1.5fr 150px 120px 1fr; gap:12px; padding:10px 14px; min-width:1100px; }
.table-head { font-weight:700; border-bottom:1px solid #e6e9f0; }
.table-row { border-bottom:1px solid #f3f5f9; }
.empty { padding:18px; color:#64748b; }
.status-pill { padding:4px 8px; border-radius:999px; background:#f1f5f9; font-size:12px; font-weight:600; }
.hint { color:#64748b; }
.btn--primary { margin-left:auto; }
</style>
