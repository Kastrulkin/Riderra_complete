<template>
  <div>
    <navigation></navigation>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <h1 class="h2">{{ t.title }}</h1>
        <admin-tabs />

        <div class="subtabs">
          <button class="subtab" :class="{ 'subtab--active': mode === 'table' }" @click="mode = 'table'">{{ t.tableTab }}</button>
          <button class="subtab" :class="{ 'subtab--active': mode === 'raw' }" @click="mode = 'raw'">{{ t.rawTab }}</button>
        </div>

        <div class="toolbar">
          <input v-model="q" class="input" :placeholder="t.search" @input="applyFilter" />
          <button class="btn btn--primary" @click="load">{{ t.refresh }}</button>
        </div>

        <div v-if="mode === 'table'" class="table-wrap">
          <div class="table-head main-grid">
            <div class="tech">id</div>
            <div class="tech">{{ t.source }}</div>
            <div>{{ t.contractor }}</div>
            <div>{{ t.orderNumber }}</div>
            <div>{{ t.date }}</div>
            <div>{{ t.from }}</div>
            <div>{{ t.to }}</div>
            <div>{{ t.sum }}</div>
            <div>{{ t.driver }}</div>
            <div>{{ t.comment }}</div>
            <div>{{ t.internalOrderNumber }}</div>
          </div>
          <div v-for="o in filteredRows" :key="`${o.sourceRow}-${o.id}`" class="table-row main-grid">
            <div class="tech cell-ellipsis" :title="o.id">{{ o.id || '-' }}</div>
            <div class="tech">{{ o.source || '-' }}</div>
            <div>{{ o.contractor || '-' }}</div>
            <div>
              <button
                v-if="o.orderNumber"
                class="order-link"
                type="button"
                @click="openOrderDetails(o.orderNumber)"
              >
                {{ o.orderNumber }}
              </button>
              <span v-else>-</span>
            </div>
            <div>{{ o.date || '-' }}</div>
            <div>{{ o.fromPoint || '-' }}</div>
            <div>{{ o.toPoint || '-' }}</div>
            <div>{{ o.sum || '-' }}</div>
            <div>{{ o.driver || '-' }}</div>
            <div>{{ o.comment || '-' }}</div>
            <div>{{ o.internalOrderNumber || '-' }}</div>
          </div>
        </div>

        <div v-else class="table-wrap">
          <div class="table-head raw-grid" :style="rawGridStyle">
            <div class="tech">id</div>
            <div class="tech">{{ t.sourceRow }}</div>
            <div v-for="h in rawHeaders" :key="h">{{ h }}</div>
          </div>
          <div
            v-for="r in filteredRawRows"
            :key="`${r.sourceRow}-${r.id}`"
            class="table-row raw-grid"
            :class="{ 'table-row--matched': isRawMatch(r) }"
            :style="rawGridStyle"
          >
            <div class="tech cell-ellipsis" :title="r.id">{{ r.id || '-' }}</div>
            <div class="tech">{{ r.sourceRow }}</div>
            <div v-for="h in rawHeaders" :key="`${r.sourceRow}-${h}`">{{ (r.values && r.values[h]) || '-' }}</div>
          </div>
        </div>

        <div v-if="drilldownNotice" class="hint">{{ drilldownNotice }}</div>
        <div class="hint">{{ t.total }}: {{ mode === 'table' ? filteredRows.length : filteredRawRows.length }}</div>
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
    mode: 'table',
    q: '',
    rows: [],
    rawRows: [],
    rawHeaders: [],
    filteredRows: [],
    filteredRawRows: [],
    drilldownToken: '',
    drilldownNotice: ''
  }),
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'Таблица заказов',
            tableTab: 'Таблица',
            rawTab: 'Подробности',
            search: 'Поиск по заказам',
            refresh: 'Обновить',
            source: 'Источник',
            sourceRow: 'Строка',
            contractor: 'Контрагент',
            orderNumber: 'Номер заказа',
            date: 'Дата',
            from: 'Откуда',
            to: 'Куда',
            sum: 'Сумма',
            driver: 'Водитель',
            comment: 'Комментарий',
            internalOrderNumber: 'Внутренний номер заказа',
            total: 'Всего',
            matchedInDetails: 'Найдено в Подробностях',
            notFoundInDetails: 'В Подробностях не найдено'
          }
        : {
            title: 'Orders Table',
            tableTab: 'Table',
            rawTab: 'Details',
            search: 'Search',
            refresh: 'Refresh',
            source: 'Source',
            sourceRow: 'Row',
            contractor: 'Contractor',
            orderNumber: 'Order Number',
            date: 'Date',
            from: 'From',
            to: 'To',
            sum: 'Sum',
            driver: 'Driver',
            comment: 'Comment',
            internalOrderNumber: 'Internal Order Number',
            total: 'Total',
            matchedInDetails: 'Found in details',
            notFoundInDetails: 'Not found in details'
          }
    },
    rawGridStyle () {
      const cols = Math.max(this.rawHeaders.length, 1)
      return { gridTemplateColumns: `120px 80px repeat(${cols}, minmax(180px, 1fr))` }
    }
  },
  mounted () { this.load() },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
    async load () {
      const response = await fetch('/api/admin/orders-sheet-view', { headers: this.headers() })
      const data = await response.json()
      this.rows = data.rows || []
      this.rawRows = data.rawRows || []
      this.rawHeaders = data.headers || []
      this.drilldownNotice = ''
      this.drilldownToken = ''
      this.applyFilter()
    },
    normalizeToken (value) {
      return String(value || '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9а-яё_-]/gi, '')
    },
    rowText (row) {
      const values = row.values || {}
      return `${row.id || ''} ${row.sourceRow || ''} ${Object.values(values).join(' ')}`
    },
    applyFilter () {
      const q = this.q.trim().toLowerCase()
      if (!q) {
        this.filteredRows = this.rows
        this.filteredRawRows = this.rawRows
        return
      }

      this.filteredRows = this.rows.filter((row) =>
        [
          row.id,
          row.contractor,
          row.orderNumber,
          row.date,
          row.fromPoint,
          row.toPoint,
          row.sum,
          row.driver,
          row.comment,
          row.internalOrderNumber
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )

      this.filteredRawRows = this.rawRows.filter((row) => this.rowText(row).toLowerCase().includes(q))
    },
    openOrderDetails (orderNumber) {
      const rawToken = String(orderNumber || '').trim()
      if (!rawToken) return
      const normalizedToken = this.normalizeToken(rawToken)
      this.mode = 'raw'
      this.q = rawToken
      this.drilldownToken = normalizedToken
      this.applyFilter()

      const exactMatches = this.filteredRawRows.filter((row) => {
        const normalizedRow = this.normalizeToken(this.rowText(row))
        return normalizedRow.includes(normalizedToken)
      })
      const count = exactMatches.length
      this.drilldownNotice = count > 0
        ? `${this.t.matchedInDetails}: ${count}`
        : this.t.notFoundInDetails
    },
    isRawMatch (row) {
      if (!this.drilldownToken) return false
      return this.normalizeToken(this.rowText(row)).includes(this.drilldownToken)
    }
  }
}
</script>

<style scoped>
.admin-section { padding-top: 150px; color: #17233d; }
.subtabs { display: flex; gap: 8px; margin-bottom: 12px; }
.subtab {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  border-radius: 8px;
  padding: 8px 14px;
  font-weight: 600;
}
.subtab--active {
  background: #0ea5e9;
  border-color: #0ea5e9;
  color: #fff;
}
.toolbar { display: flex; gap: 10px; margin-bottom: 14px; }
.input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #c8ccdc; background: #fff; color: #1f2b46; }
.table-wrap { background: #fff; border: 1px solid #d8d8e6; border-radius: 12px; overflow: auto; }
.table-head, .table-row { gap: 10px; min-width: 1900px; padding: 10px 12px; }
.table-head { font-weight: 700; border-bottom: 1px solid #e4e7f0; }
.table-row { border-top: 1px solid #f0f2f7; color: #2f3e60; }
.table-row--matched { background: #fff8dd; }
.main-grid { display: grid; grid-template-columns: 120px 120px 180px 130px 140px 220px 220px 110px 150px 260px 170px; }
.raw-grid { display: grid; }
.tech { font-size: 12px; color: #67748f; }
.cell-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hint { margin-top: 10px; color: #637191; }
.order-link {
  border: none;
  background: transparent;
  color: #0b63c8;
  padding: 0;
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
}
.order-link:hover { color: #084a95; }
</style>
