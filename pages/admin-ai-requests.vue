<template>
  <div>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf ai-requests-section">
      <div class="container">
        <admin-tabs />

        <div class="section-actions">
          <button class="btn btn--primary" :disabled="loading" @click="load">
            {{ loading ? t.loading : t.refresh }}
          </button>
        </div>

        <div class="ops-rail">
          <div>
            <strong>{{ t.title }}</strong>
            <p class="hint">{{ t.subtitle }}</p>
          </div>
        </div>

        <div class="overview-grid">
          <div class="overview-card">
            <span>{{ t.total }}</span>
            <strong>{{ summary.total || 0 }}</strong>
          </div>
          <div class="overview-card">
            <span>{{ t.draftReceived }}</span>
            <strong>{{ summary.draft_received || 0 }}</strong>
          </div>
          <div class="overview-card">
            <span>{{ t.needsClarification }}</span>
            <strong>{{ summary.needs_clarification || 0 }}</strong>
          </div>
          <div class="overview-card">
            <span>{{ t.converted }}</span>
            <strong>{{ summary.draft_order_created || 0 }}</strong>
          </div>
        </div>

        <div class="toolbar">
          <select v-model="status" class="input" @change="load">
            <option value="">{{ t.allStatuses }}</option>
            <option value="draft_received">{{ t.draftReceived }}</option>
            <option value="needs_clarification">{{ t.needsClarification }}</option>
            <option value="draft_order_created">{{ t.converted }}</option>
            <option value="closed">{{ t.closed }}</option>
          </select>
          <input v-model="q" class="input input--search" :placeholder="t.search" />
        </div>

        <div v-if="notice" class="hint" :class="{ 'hint--error': noticeType === 'error' }">{{ notice }}</div>

        <div class="table-wrap">
          <div class="table-head">
            <div>{{ t.created }}</div>
            <div>{{ t.customer }}</div>
            <div>{{ t.route }}</div>
            <div>{{ t.trip }}</div>
            <div>{{ t.agent }}</div>
            <div>{{ t.status }}</div>
            <div>{{ t.actions }}</div>
          </div>
          <div v-for="row in filteredRows" :key="row.id" class="table-row">
            <div>
              <strong>{{ formatDate(row.createdAt) }}</strong>
              <span class="muted">{{ row.id }}</span>
            </div>
            <div>
              <strong>{{ row.name || '-' }}</strong>
              <span>{{ row.email || '-' }}</span>
              <span>{{ row.phone || '-' }}</span>
            </div>
            <div>
              <strong>{{ row.fromPoint || '-' }}</strong>
              <span>{{ row.toPoint || '-' }}</span>
            </div>
            <div>
              <span>{{ formatDate(row.pickupAt) }}</span>
              <span>{{ [row.vehicleClass, passengerLine(row)].filter(Boolean).join(' · ') || '-' }}</span>
              <span v-if="row.flightNumber">{{ t.flight }}: {{ row.flightNumber }}</span>
            </div>
            <div>
              <strong>{{ row.agentName || '-' }}</strong>
              <span>{{ row.agentContact || '-' }}</span>
              <a v-if="row.sourceUrl" :href="row.sourceUrl" target="_blank" rel="noopener">{{ t.sourceUrl }}</a>
            </div>
            <div>
              <span class="status-pill" :class="`status-pill--${row.operationalStatus}`">{{ statusLabel(row.operationalStatus) }}</span>
              <span v-if="row.orderId" class="muted">Order: {{ row.orderId }}</span>
            </div>
            <div class="row-actions">
              <button class="btn btn--small btn--primary" :disabled="busyId === row.id || row.orderId" @click="createDraftOrder(row)">
                {{ t.createDraftOrder }}
              </button>
              <button class="btn btn--small btn--ghost" :disabled="busyId === row.id || row.operationalStatus === 'needs_clarification'" @click="markClarification(row)">
                {{ t.askClarification }}
              </button>
              <button class="btn btn--small btn--ghost" :disabled="busyId === row.id || row.operationalStatus === 'closed'" @click="closeRequest(row)">
                {{ t.close }}
              </button>
            </div>
          </div>
          <div v-if="!filteredRows.length" class="empty">{{ t.empty }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import AdminTabs from '@/components/partials/adminTabs'

export default {
  layout: 'admin',
  middleware: 'staff',
  components: { AdminTabs },
  data: () => ({
    rows: [],
    summary: {},
    status: '',
    q: '',
    loading: false,
    busyId: '',
    notice: '',
    noticeType: 'ok'
  }),
  computed: {
    lang () { return this.$store.state.language },
    t () {
      return this.lang === 'ru'
        ? {
            title: 'AI заявки — публичные драфты от агентов',
            subtitle: 'Здесь видны заявки, созданные через публичный AI endpoint. Они не являются подтверждёнными заказами и не содержат финальную цену, пока оператор не проверит доступность и условия.',
            refresh: 'Обновить',
            loading: 'Загружаю...',
            total: 'Всего',
            draftReceived: 'Получены',
            needsClarification: 'Уточнить',
            converted: 'Создан draft-заказ',
            closed: 'Закрыты',
            allStatuses: 'Все статусы',
            search: 'Поиск по клиенту, маршруту, агенту',
            created: 'Создано',
            customer: 'Клиент',
            route: 'Маршрут',
            trip: 'Поездка',
            agent: 'Агент',
            status: 'Статус',
            actions: 'Действия',
            flight: 'Рейс',
            sourceUrl: 'Источник',
            createDraftOrder: 'Создать draft-заказ',
            askClarification: 'Нужно уточнение',
            close: 'Закрыть',
            empty: 'AI заявок пока нет'
          }
        : {
            title: 'AI requests — public agent drafts',
            subtitle: 'Requests submitted through the public AI endpoint. They are not confirmed bookings and do not have a final price until Riderra reviews availability and terms.',
            refresh: 'Refresh',
            loading: 'Loading...',
            total: 'Total',
            draftReceived: 'Received',
            needsClarification: 'Clarification',
            converted: 'Draft order created',
            closed: 'Closed',
            allStatuses: 'All statuses',
            search: 'Search customer, route, agent',
            created: 'Created',
            customer: 'Customer',
            route: 'Route',
            trip: 'Trip',
            agent: 'Agent',
            status: 'Status',
            actions: 'Actions',
            flight: 'Flight',
            sourceUrl: 'Source',
            createDraftOrder: 'Create draft order',
            askClarification: 'Needs clarification',
            close: 'Close',
            empty: 'No AI requests yet'
          }
    },
    filteredRows () {
      const needle = this.q.trim().toLowerCase()
      if (!needle) return this.rows
      return this.rows.filter((row) => [
        row.name,
        row.email,
        row.phone,
        row.fromPoint,
        row.toPoint,
        row.agentName,
        row.agentContact,
        row.flightNumber
      ].filter(Boolean).join(' ').toLowerCase().includes(needle))
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    },
    async jsonRequest (url, options = {}) {
      const response = await fetch(url, options)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`)
      return body
    },
    async load () {
      this.loading = true
      this.notice = ''
      try {
        const qs = this.status ? `?status=${encodeURIComponent(this.status)}` : ''
        const body = await this.jsonRequest(`/api/admin/ai-draft-requests${qs}`, { headers: this.headers() })
        this.rows = body.rows || []
        this.summary = body.summary || {}
      } catch (error) {
        this.noticeType = 'error'
        this.notice = error.message || 'Failed to load'
      } finally {
        this.loading = false
      }
    },
    async createDraftOrder (row) {
      await this.runAction(row, 'create-draft-order', this.lang === 'ru' ? 'Draft-заказ создан.' : 'Draft order created.')
    },
    async markClarification (row) {
      await this.runAction(row, 'clarification', this.lang === 'ru' ? 'Заявка помечена как требующая уточнения.' : 'Request marked for clarification.')
    },
    async closeRequest (row) {
      await this.runAction(row, 'close', this.lang === 'ru' ? 'Заявка закрыта.' : 'Request closed.')
    },
    async runAction (row, action, message) {
      this.busyId = row.id
      this.notice = ''
      try {
        await this.jsonRequest(`/api/admin/ai-draft-requests/${row.id}/${action}`, {
          method: 'POST',
          headers: {
            ...this.headers(),
            'Idempotency-Key': `admin-ai-request-${action}-${row.id}`
          },
          body: JSON.stringify({ comment: null })
        })
        this.noticeType = 'ok'
        this.notice = message
        await this.load()
      } catch (error) {
        this.noticeType = 'error'
        this.notice = error.message || 'Action failed'
      } finally {
        this.busyId = ''
      }
    },
    passengerLine (row) {
      const parts = []
      if (row.passengers != null) parts.push(`${row.passengers} pax`)
      if (row.luggage != null) parts.push(`${row.luggage} luggage`)
      return parts.join(', ')
    },
    statusLabel (status) {
      const ru = {
        draft_received: 'Получена',
        needs_clarification: 'Уточнить',
        draft_order_created: 'Draft-заказ',
        closed: 'Закрыта'
      }
      const en = {
        draft_received: 'Received',
        needs_clarification: 'Clarification',
        draft_order_created: 'Draft order',
        closed: 'Closed'
      }
      return (this.lang === 'ru' ? ru : en)[status] || status || '-'
    },
    formatDate (value) {
      if (!value) return '-'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value)
      return date.toLocaleString(this.lang === 'ru' ? 'ru-RU' : 'en-US')
    }
  }
}
</script>

<style scoped>
.ai-requests-section { padding-top: 140px; padding-bottom: 40px; }
.ops-rail { border: 1px solid #d8d8e6; background: #fff; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; }
.hint { color: #64748b; font-size: 14px; line-height: 1.5; }
.hint--error { color: #b91c1c; }
.overview-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
.overview-card { background: #fff; border: 1px solid #d8d8e6; border-radius: 8px; padding: 14px; display: grid; gap: 8px; }
.overview-card span { color: #64748b; font-size: 13px; }
.overview-card strong { color: #0f172a; font-size: 24px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.input { border: 1px solid #d8d8e6; border-radius: 8px; padding: 8px 10px; min-width: 220px; }
.input--search { min-width: min(420px, 100%); }
.table-wrap { background: #fff; border: 1px solid #d8d8e6; border-radius: 8px; overflow: auto; }
.table-head, .table-row { display: grid; grid-template-columns: 150px 190px 1fr 210px 190px 150px 180px; gap: 12px; padding: 10px 12px; min-width: 1240px; }
.table-head { font-weight: 800; border-bottom: 1px solid #e5e7ef; color: #334155; }
.table-row { border-bottom: 1px solid #f1f3f8; align-items: start; }
.table-row > div { display: grid; gap: 4px; min-width: 0; }
.muted, .table-row span { color: #64748b; font-size: 13px; overflow-wrap: anywhere; }
.status-pill { display: inline-flex; width: max-content; border-radius: 999px; padding: 4px 8px; background: #eef2ff; color: #3730a3; font-size: 12px; font-weight: 800; }
.status-pill--needs_clarification { background: #fff7ed; color: #c2410c; }
.status-pill--draft_order_created { background: #ecfdf5; color: #047857; }
.status-pill--closed { background: #f1f5f9; color: #475569; }
.row-actions { display: grid; gap: 6px; }
.empty { padding: 18px; color: #64748b; }
@media (max-width: 900px) {
  .overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .overview-grid { grid-template-columns: 1fr; }
}
</style>
