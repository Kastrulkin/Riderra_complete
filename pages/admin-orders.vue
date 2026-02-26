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
            <div>{{ t.status }}</div>
            <div>{{ t.card }}</div>
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
            <div>
              <span class="status-pill" :class="statusPillClass(o.status)">{{ statusLabel(o.status) }}</span>
            </div>
            <div>
              <button class="card-link" type="button" :disabled="!o.id" @click="openOrderCard(o)">
                {{ t.openCard }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="table-wrap">
          <div class="table-head raw-grid" :style="rawGridStyle">
            <div class="tech">{{ t.orderBlock }}</div>
            <div class="tech">id</div>
            <div class="tech">{{ t.sourceRow }}</div>
            <div v-for="h in rawHeaders" :key="h">{{ h }}</div>
          </div>
          <div
            v-for="r in filteredRawRows"
            :key="`${r.sourceRow}-${r.id}`"
            class="table-row raw-grid"
            :class="{ 'table-row--matched': isRawMatch(r), 'table-row--group-start': r._groupStart }"
            :style="rawGridStyle"
          >
            <div class="tech order-block">{{ orderKeyDisplay(r) }}</div>
            <div class="tech cell-ellipsis" :title="r.id">{{ r.id || '-' }}</div>
            <div class="tech">{{ r.sourceRow }}</div>
            <div v-for="h in rawHeaders" :key="`${r.sourceRow}-${h}`">{{ (r.values && r.values[h]) || '-' }}</div>
          </div>
        </div>

        <div v-if="drilldownNotice" class="hint">{{ drilldownNotice }}</div>
        <div class="hint">{{ t.total }}: {{ mode === 'table' ? filteredRows.length : filteredRawRows.length }}</div>
      </div>
    </section>

    <div v-if="selectedOrder" class="modal-backdrop" @click.self="closeOrderCard">
      <div class="modal-card">
        <div class="modal-head">
          <h3>{{ t.orderCard }}</h3>
          <button class="modal-close" type="button" @click="closeOrderCard">×</button>
        </div>
        <div class="meta-grid">
          <div><strong>ID:</strong> {{ selectedOrder.id || '-' }}</div>
          <div>
            <strong>{{ t.status }}:</strong>
            <span class="status-pill" :class="statusPillClass(selectedOrder.status)">{{ statusLabel(selectedOrder.status) }}</span>
          </div>
          <div><strong>{{ t.orderNumber }}:</strong> {{ selectedOrder.orderNumber || '-' }}</div>
          <div><strong>{{ t.internalOrderNumber }}:</strong> {{ selectedOrder.internalOrderNumber || '-' }}</div>
          <div><strong>{{ t.contractor }}:</strong> {{ selectedOrder.contractor || '-' }}</div>
          <div><strong>{{ t.driver }}:</strong> {{ selectedOrder.driver || '-' }}</div>
          <div><strong>{{ t.sum }}:</strong> {{ selectedOrder.sum || '-' }}</div>
          <div><strong>{{ t.driverPrice }}:</strong> {{ formatMoney(selectedOrder.orderDriverPrice) }}</div>
          <div><strong>{{ t.clientPrice }}:</strong> {{ formatMoney(selectedOrder.orderClientPrice) }}</div>
          <div><strong>{{ t.updatedAt }}:</strong> {{ formatDateTime(selectedOrder.orderUpdatedAt) }}</div>
        </div>

        <div class="modal-actions">
          <button class="btn btn--primary" type="button" @click="openRawFromCard">{{ t.findInDetails }}</button>
        </div>

        <div class="status-change">
          <h4>{{ t.changeStatus }}</h4>
          <div class="status-change-row">
            <select v-model="selectedToStatus" class="input status-select">
              <option value="">{{ t.selectStatus }}</option>
              <option v-for="s in availableStatuses" :key="s" :value="s">{{ statusLabel(s) }}</option>
            </select>
            <input v-model="statusReason" class="input" :placeholder="t.reasonPlaceholder" />
            <button class="btn btn--primary" type="button" :disabled="statusSaving || !selectedToStatus" @click="applyStatusChange">
              {{ statusSaving ? t.saving : t.applyStatus }}
            </button>
          </div>
          <div v-if="transitionsError" class="hint hint--error">{{ transitionsError }}</div>
          <div v-else-if="!availableStatuses.length" class="hint">{{ t.noAllowedTransitions }}</div>
        </div>

        <div class="status-history">
          <h4>{{ t.statusHistory }}</h4>
          <div v-if="historyLoading" class="hint">{{ t.loadingHistory }}</div>
          <div v-else-if="historyError" class="hint hint--error">{{ historyError }}</div>
          <div v-else-if="!statusHistory.length" class="hint">{{ t.noHistory }}</div>
          <div v-else class="history-list">
            <div v-for="h in statusHistory" :key="h.id" class="history-item">
              <div class="history-main">
                <span class="history-status" :class="statusPillClass(h.fromStatus)">{{ statusLabel(h.fromStatus) }}</span>
                <span>→</span>
                <span class="history-status" :class="statusPillClass(h.toStatus)">{{ statusLabel(h.toStatus) }}</span>
              </div>
              <div class="history-meta">
                <span>{{ formatDateTime(h.createdAt) }}</span>
                <span>{{ historySourceLabel(h.source) }}</span>
                <span>{{ h.actorEmail || '-' }}</span>
              </div>
              <div v-if="h.reason" class="history-reason">{{ h.reason }}</div>
            </div>
          </div>
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
    mode: 'table',
    q: '',
    rows: [],
    rawRows: [],
    rawHeaders: [],
    filteredRows: [],
    filteredRawRows: [],
    drilldownToken: '',
    drilldownNotice: '',
    selectedOrder: null,
    statusHistory: [],
    historyLoading: false,
    historyError: '',
    availableStatuses: [],
    selectedToStatus: '',
    statusReason: '',
    statusSaving: false,
    transitionsError: ''
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
            orderBlock: 'Блок заказа',
            contractor: 'Контрагент',
            orderNumber: 'Номер заказа',
            date: 'Дата',
            from: 'Откуда',
            to: 'Куда',
            sum: 'Сумма',
            driver: 'Водитель',
            comment: 'Комментарий',
            internalOrderNumber: 'Внутренний номер заказа',
            card: 'Карточка',
            openCard: 'Открыть',
            orderCard: 'Карточка заказа',
            status: 'Статус',
            statusHistory: 'История статусов',
            loadingHistory: 'Загрузка истории...',
            noHistory: 'История статусов пока пуста',
            findInDetails: 'Найти в Подробностях',
            updatedAt: 'Обновлено',
            driverPrice: 'Цена водителя',
            clientPrice: 'Цена клиенту',
            changeStatus: 'Сменить статус',
            selectStatus: 'Выберите статус',
            reasonPlaceholder: 'Причина (необязательно)',
            applyStatus: 'Применить',
            saving: 'Сохраняю...',
            noAllowedTransitions: 'Нет доступных переходов для вашей роли',
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
            orderBlock: 'Order Block',
            contractor: 'Contractor',
            orderNumber: 'Order Number',
            date: 'Date',
            from: 'From',
            to: 'To',
            sum: 'Sum',
            driver: 'Driver',
            comment: 'Comment',
            internalOrderNumber: 'Internal Order Number',
            card: 'Card',
            openCard: 'Open',
            orderCard: 'Order card',
            status: 'Status',
            statusHistory: 'Status history',
            loadingHistory: 'Loading history...',
            noHistory: 'No status history yet',
            findInDetails: 'Find in details',
            updatedAt: 'Updated at',
            driverPrice: 'Driver price',
            clientPrice: 'Client price',
            changeStatus: 'Change status',
            selectStatus: 'Select status',
            reasonPlaceholder: 'Reason (optional)',
            applyStatus: 'Apply',
            saving: 'Saving...',
            noAllowedTransitions: 'No transitions available for your role',
            total: 'Total',
            matchedInDetails: 'Found in details',
            notFoundInDetails: 'Not found in details'
          }
    },
    rawGridStyle () {
      const cols = Math.max(this.rawHeaders.length, 1)
      return { gridTemplateColumns: `170px 120px 80px repeat(${cols}, minmax(180px, 1fr))` }
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
    formatDateTime (value) {
      if (!value) return '-'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '-'
      return date.toLocaleString()
    },
    formatMoney (value) {
      if (value === null || value === undefined || value === '') return '-'
      const number = Number(value)
      if (!Number.isFinite(number)) return '-'
      return number.toFixed(2)
    },
    historySourceLabel (source) {
      const map = {
        admin_api: 'Admin API',
        google_sheet_sync: 'Google Sheet Sync',
        easytaxi_webhook: 'EasyTaxi Webhook',
        system: 'System'
      }
      return map[String(source || '').toLowerCase()] || source || 'System'
    },
    statusLabel (status) {
      const code = String(status || '').toLowerCase()
      const ru = {
        draft: 'Черновик',
        waiting_info: 'Ожидает данных',
        validated: 'Проверен',
        pending_dispatch: 'Ожидает распределения',
        dispatch_risk: 'Риск распределения',
        assigned: 'Назначен',
        accepted: 'Принят',
        pending_ops_control: 'Ожидает контроля',
        confirmed: 'Подтвержден',
        in_progress: 'В работе',
        incident_open: 'Инцидент открыт',
        incident_reported: 'Инцидент оформлен',
        completed: 'Завершен',
        ready_finance: 'Готов в финансы',
        finance_hold: 'Фин. пауза',
        paid: 'Оплачен',
        closed: 'Закрыт',
        pending: 'Новый',
        cancelled: 'Отменен'
      }
      const en = {
        draft: 'Draft',
        waiting_info: 'Waiting info',
        validated: 'Validated',
        pending_dispatch: 'Pending dispatch',
        dispatch_risk: 'Dispatch risk',
        assigned: 'Assigned',
        accepted: 'Accepted',
        pending_ops_control: 'Pending ops control',
        confirmed: 'Confirmed',
        in_progress: 'In progress',
        incident_open: 'Incident open',
        incident_reported: 'Incident reported',
        completed: 'Completed',
        ready_finance: 'Ready for finance',
        finance_hold: 'Finance hold',
        paid: 'Paid',
        closed: 'Closed',
        pending: 'Pending',
        cancelled: 'Cancelled'
      }
      const dictionary = this.$store.state.language === 'ru' ? ru : en
      return dictionary[code] || status || '-'
    },
    statusPillClass (status) {
      const code = String(status || '').toLowerCase()
      const palette = {
        draft: 'status-pill--neutral',
        waiting_info: 'status-pill--warning',
        validated: 'status-pill--info',
        pending_dispatch: 'status-pill--warning',
        dispatch_risk: 'status-pill--critical',
        assigned: 'status-pill--info',
        accepted: 'status-pill--info',
        pending_ops_control: 'status-pill--warning',
        confirmed: 'status-pill--ok',
        in_progress: 'status-pill--ok',
        incident_open: 'status-pill--critical',
        incident_reported: 'status-pill--critical',
        completed: 'status-pill--ok',
        ready_finance: 'status-pill--finance',
        finance_hold: 'status-pill--critical',
        paid: 'status-pill--paid',
        closed: 'status-pill--closed',
        pending: 'status-pill--warning',
        cancelled: 'status-pill--critical'
      }
      return palette[code] || 'status-pill--neutral'
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
    extractOrderKey (row) {
      const values = row.values || {}
      const flat = Object.values(values).map((v) => String(v || '')).join(' | ')
      const col1 = String(values['Колонка 1'] || '')
      const col2 = String(values['Колонка 2'] || '')
      const col3 = String(values['Колонка 3'] || '')

      const bookingRefWithValue = flat.match(/booking\s*ref\.?\s*:?\s*([A-Z0-9_-]+)/i)
      if (bookingRefWithValue && bookingRefWithValue[1]) return bookingRefWithValue[1].toUpperCase()

      if (/booking\s*ref\.?/i.test(col2)) {
        const maybeRef = (col3 || '').trim()
        if (maybeRef) return maybeRef.toUpperCase()
      }

      const refInBracket = col1.match(/^([A-Z0-9_/-]+)\s*\(/i)
      if (refInBracket && refInBracket[1]) return refInBracket[1].toUpperCase()

      const fallbackRef = flat.match(/\b([A-Z]{2,}[A-Z0-9_/-]{4,})\b/)
      if (fallbackRef && fallbackRef[1]) return fallbackRef[1].toUpperCase()
      return ''
    },
    decorateRawRows (rows) {
      let currentKey = ''
      let previousKey = ''
      return rows.map((row, index) => {
        const foundKey = this.extractOrderKey(row)
        if (foundKey) currentKey = foundKey
        const effectiveKey = currentKey || `row-${index + 1}`
        const isStart = index === 0 || effectiveKey !== previousKey
        previousKey = effectiveKey
        return {
          ...row,
          _groupKey: effectiveKey,
          _groupStart: isStart
        }
      })
    },
    orderKeyDisplay (row) {
      const key = String(row._groupKey || '')
      return key.startsWith('row-') ? '-' : key
    },
    applyFilter () {
      const q = this.q.trim().toLowerCase()
      if (!q) {
        this.filteredRows = this.rows
        this.filteredRawRows = this.decorateRawRows(this.rawRows)
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

      const raw = this.rawRows.filter((row) => this.rowText(row).toLowerCase().includes(q))
      this.filteredRawRows = this.decorateRawRows(raw)
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
    async openOrderCard (order) {
      if (!order || !order.id) return
      this.selectedOrder = order
      this.statusHistory = []
      this.historyLoading = true
      this.historyError = ''
      this.availableStatuses = []
      this.selectedToStatus = ''
      this.statusReason = ''
      this.transitionsError = ''
      await this.loadOrderCardData(order.id)
    },
    async loadOrderCardData (orderId) {
      this.historyLoading = true
      this.historyError = ''
      this.transitionsError = ''
      try {
        const [historyResponse, transitionsResponse] = await Promise.all([
          fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status-history`, { headers: this.headers() }),
          fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/available-status-transitions`, { headers: this.headers() })
        ])

        if (historyResponse.ok) {
          const historyData = await historyResponse.json()
          this.statusHistory = Array.isArray(historyData.history) ? historyData.history : []
        } else {
          this.historyError = this.$store.state.language === 'ru'
            ? 'Не удалось загрузить историю статусов'
            : 'Failed to load status history'
        }

        if (transitionsResponse.ok) {
          const transitionsData = await transitionsResponse.json()
          this.availableStatuses = Array.isArray(transitionsData.allowedTo) ? transitionsData.allowedTo : []
        } else {
          this.transitionsError = this.$store.state.language === 'ru'
            ? 'Не удалось загрузить доступные переходы'
            : 'Failed to load available transitions'
        }
      } catch (_) {
        this.historyError = this.$store.state.language === 'ru'
          ? 'Не удалось загрузить историю статусов'
          : 'Failed to load status history'
        this.transitionsError = this.$store.state.language === 'ru'
          ? 'Не удалось загрузить доступные переходы'
          : 'Failed to load available transitions'
      } finally {
        this.historyLoading = false
      }
    },
    async applyStatusChange () {
      if (!this.selectedOrder || !this.selectedOrder.id || !this.selectedToStatus || this.statusSaving) return
      this.statusSaving = true
      this.transitionsError = ''
      try {
        const response = await fetch(`/api/admin/orders/${encodeURIComponent(this.selectedOrder.id)}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `order-status-${this.selectedOrder.id}-${Date.now()}`,
            ...this.headers()
          },
          body: JSON.stringify({
            toStatus: this.selectedToStatus,
            reason: this.statusReason ? this.statusReason.trim() : ''
          })
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data && data.error ? data.error : 'failed')
        }

        const updatedStatus = data?.order?.status || this.selectedToStatus
        this.selectedOrder = {
          ...this.selectedOrder,
          status: updatedStatus,
          orderUpdatedAt: new Date().toISOString()
        }
        this.rows = this.rows.map((row) => (
          row.id === this.selectedOrder.id
            ? { ...row, status: updatedStatus, orderUpdatedAt: new Date().toISOString() }
            : row
        ))
        this.applyFilter()
        this.statusReason = ''
        this.selectedToStatus = ''
        await this.loadOrderCardData(this.selectedOrder.id)
      } catch (error) {
        this.transitionsError = error.message || (this.$store.state.language === 'ru'
          ? 'Не удалось сменить статус'
          : 'Failed to change status')
      } finally {
        this.statusSaving = false
      }
    },
    closeOrderCard () {
      this.selectedOrder = null
      this.statusHistory = []
      this.historyLoading = false
      this.historyError = ''
      this.availableStatuses = []
      this.selectedToStatus = ''
      this.statusReason = ''
      this.statusSaving = false
      this.transitionsError = ''
    },
    openRawFromCard () {
      const selected = this.selectedOrder
      this.closeOrderCard()
      if (selected && selected.orderNumber) this.openOrderDetails(selected.orderNumber)
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
.table-row--group-start { border-top: 2px solid #8ea2c9; }
.table-row--matched { background: #fff8dd; }
.main-grid { display: grid; grid-template-columns: 90px 90px 160px 120px 130px 190px 190px 100px 140px 220px 150px 120px 110px; }
.raw-grid { display: grid; }
.tech { font-size: 12px; color: #67748f; }
.cell-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hint { margin-top: 10px; color: #637191; }
.hint--error { color: #9f1239; }
.order-block { font-weight: 700; color: #335388; }
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
.card-link {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #1e3a8a;
  padding: 4px 10px;
  border-radius: 8px;
  font-weight: 600;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
  white-space: nowrap;
}
.status-pill--neutral { background: #eef2ff; color: #3730a3; border-color: #c7d2fe; }
.status-pill--info { background: #e0f2fe; color: #0c4a6e; border-color: #bae6fd; }
.status-pill--warning { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.status-pill--critical { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.status-pill--ok { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.status-pill--finance { background: #ede9fe; color: #5b21b6; border-color: #ddd6fe; }
.status-pill--paid { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
.status-pill--closed { background: #e5e7eb; color: #374151; border-color: #d1d5db; }
.card-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-card {
  width: min(980px, 100%);
  max-height: 85vh;
  overflow: auto;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #d8d8e6;
  padding: 18px;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.modal-close {
  border: none;
  background: transparent;
  font-size: 28px;
  line-height: 1;
  color: #334155;
}
.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: 8px 16px;
  color: #334155;
}
.modal-actions { margin: 14px 0; }
.status-change { margin: 8px 0 16px; }
.status-change h4 { margin: 6px 0 10px; color: #17233d; }
.status-change-row {
  display: grid;
  grid-template-columns: 220px 1fr 160px;
  gap: 10px;
}
.status-select { min-width: 180px; }
.status-history h4 { margin: 6px 0 10px; color: #17233d; }
.history-list { display: flex; flex-direction: column; gap: 10px; }
.history-item {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
  background: #f8fafc;
}
.history-main {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: #0f172a;
}
.history-status {
  background: #e2e8f0;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
}
.history-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}
.history-reason {
  margin-top: 6px;
  color: #334155;
}
@media (max-width: 900px) {
  .meta-grid { grid-template-columns: 1fr; }
  .status-change-row { grid-template-columns: 1fr; }
}
</style>
