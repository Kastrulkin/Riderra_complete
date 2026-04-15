<template>
  <div>
    <navigation></navigation>
    <section class="site-section site-section--pf ai-section">
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="h2">AI Inbox</h1>
            <p class="hint">Черновики от OpenClaw. Ничего не попадает в боевые заказы без подтверждения.</p>
          </div>
          <button class="btn btn--primary" @click="load">Обновить</button>
        </div>

        <admin-tabs />

        <div class="toolbar">
          <select v-model="status" class="input" @change="load">
            <option value="pending">Pending</option>
            <option value="">All statuses</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div class="table-wrap">
          <div class="table-head">
            <div>Создан</div>
            <div>Тип</div>
            <div>Контрагент</div>
            <div>Маршрут</div>
            <div>Цена</div>
            <div>Статус</div>
            <div>Действия</div>
          </div>
          <div v-for="row in rows" :key="row.id" class="table-row">
            <div>{{ formatDate(row.createdAt) }}</div>
            <div>{{ row.parsedType }}</div>
            <div>{{ summarize(row).customer }}</div>
            <div>{{ summarize(row).route }}</div>
            <div>{{ summarize(row).price }}</div>
            <div><span class="status-pill" :class="`status-pill--${row.status}`">{{ row.status }}</span></div>
            <div>
              <button class="btn btn--small" @click="openDraft(row.id)">Открыть</button>
            </div>
          </div>
          <div v-if="!rows.length" class="empty">Пока пусто</div>
        </div>
      </div>
    </section>

    <div v-if="draft" class="modal-overlay" @click.self="closeDraft">
      <div class="modal-card">
        <div class="modal-head">
          <div>
            <h3>Черновик AI</h3>
            <div class="hint">ID: {{ draft.id }}</div>
          </div>
          <button class="modal-close" type="button" @click="closeDraft">×</button>
        </div>

        <div class="banner">
          Я помощник Riderra, работаю в тестовом режиме. Показываю найденную информацию и источник, но финальное действие только после подтверждения сотрудника.
        </div>

        <div class="meta-grid">
          <div><strong>Источник:</strong> {{ payload.source || 'openclaw' }}</div>
          <div><strong>Канал:</strong> {{ orderDraft.sourceType || '-' }}</div>
          <div><strong>Контракт:</strong> {{ payload.contractVersion || '-' }}</div>
          <div><strong>Confidence:</strong> {{ payload.confidence == null ? '-' : payload.confidence }}</div>
          <div><strong>Сообщение:</strong> {{ orderDraft.externalMessageId || '-' }}</div>
          <div><strong>Статус:</strong> {{ draft.status }}</div>
        </div>

        <div class="section-card">
          <h4>Подготовленный заказ</h4>
          <div class="meta-grid">
            <div><strong>Контрагент:</strong> {{ orderDraft.customerName || '-' }}</div>
            <div><strong>Номер:</strong> {{ orderDraft.orderNumber || '-' }}</div>
            <div><strong>Город:</strong> {{ orderDraft.city || '-' }}</div>
            <div><strong>Дата/время:</strong> {{ orderDraft.pickupAt || '-' }}</div>
            <div><strong>Откуда:</strong> {{ orderDraft.fromPoint || '-' }}</div>
            <div><strong>Куда:</strong> {{ orderDraft.toPoint || '-' }}</div>
            <div><strong>Класс:</strong> {{ orderDraft.vehicleType || '-' }}</div>
            <div><strong>Рейс:</strong> {{ orderDraft.flightNumber || '-' }}</div>
            <div><strong>Пассажиры:</strong> {{ orderDraft.passengers == null ? '-' : orderDraft.passengers }}</div>
            <div><strong>Багаж:</strong> {{ orderDraft.luggage == null ? '-' : orderDraft.luggage }}</div>
            <div><strong>Цена из OpenClaw:</strong> {{ formatMoney(orderDraft.clientPrice, orderDraft.currency) }}</div>
            <div><strong>Цена водителя:</strong> {{ formatMoney(orderDraft.driverPrice, orderDraft.currency) }}</div>
          </div>
          <div v-if="orderDraft.comment" class="note-block">
            <strong>Комментарий:</strong>
            <pre>{{ orderDraft.comment }}</pre>
          </div>
        </div>

        <div class="section-card">
          <h4>Проверка цены</h4>
          <div class="meta-grid">
            <div><strong>Источник цены:</strong> {{ pricing.pricingSource || 'не найдено' }}</div>
            <div><strong>Riderra price:</strong> {{ formatMoney(pricing.authoritativeClientPrice, pricing.authoritativeCurrency || orderDraft.currency) }}</div>
            <div><strong>Conflict:</strong> {{ pricing.conflict ? 'Да' : 'Нет' }}</div>
            <div><strong>Rule ID:</strong> {{ pricing.pricingRuleId || '-' }}</div>
          </div>
        </div>

        <div class="section-card" v-if="qualityChecks.length">
          <h4>Проверка полей</h4>
          <div class="checks-list">
            <div v-for="check in qualityChecks" :key="`${check.key}-${check.message}`" class="check-row">
              <span class="pill" :class="checkPillClass(check.level)">{{ checkLevelLabel(check.level) }}</span>
              <span>{{ check.message }}</span>
            </div>
          </div>
          <div v-if="payload.infoReason" class="hint hint--warn">
            Нужно уточнить: {{ payload.infoReason }}
          </div>
        </div>

        <div class="section-card" v-if="sheetRowPreview && Object.keys(sheetRowPreview).length">
          <h4>Строка для таблицы</h4>
          <div class="meta-grid">
            <div><strong>Контрагент:</strong> {{ sheetRowPreview.contractor || '-' }}</div>
            <div><strong>Номер заказа:</strong> {{ sheetRowPreview.orderNumber || '-' }}</div>
            <div><strong>Дата:</strong> {{ sheetRowPreview.date || '-' }}</div>
            <div><strong>Откуда:</strong> {{ sheetRowPreview.fromPoint || '-' }}</div>
            <div><strong>Куда:</strong> {{ sheetRowPreview.toPoint || '-' }}</div>
            <div><strong>Сумма:</strong> {{ sheetRowPreview.sum || '-' }}</div>
            <div><strong>Водитель:</strong> {{ sheetRowPreview.driver || '-' }}</div>
            <div><strong>Внутренний номер:</strong> {{ sheetRowPreview.internalOrderNumber || '-' }}</div>
          </div>
          <div v-if="sheetRowPreview.comment" class="note-block">
            <strong>Комментарий для таблицы:</strong>
            <pre>{{ sheetRowPreview.comment }}</pre>
          </div>
        </div>

        <div class="section-card" v-if="missingFields.length || proposedActions.length">
          <h4>Проверить перед подтверждением</h4>
          <div v-if="missingFields.length" class="pill-list">
            <span v-for="item in missingFields" :key="item" class="pill pill--warn">{{ item }}</span>
          </div>
          <div v-if="proposedActions.length" class="pill-list">
            <span v-for="(item, idx) in proposedActions" :key="idx" class="pill">{{ typeof item === 'string' ? item : JSON.stringify(item) }}</span>
          </div>
        </div>

        <div class="section-card" v-if="payload.rawText">
          <h4>Исходный текст</h4>
          <pre>{{ payload.rawText }}</pre>
        </div>

        <div class="actions">
          <input v-model="reviewComment" class="input comment-input" placeholder="Комментарий ревьюера (необязательно)" />
          <button
            class="btn btn--primary"
            :disabled="draft.status !== 'pending' || saving"
            @click="approve"
          >
            {{ saving ? 'Сохраняю...' : 'Подтвердить и создать draft-заказ' }}
          </button>
          <button
            class="btn btn--ghost"
            :disabled="draft.status !== 'pending' || saving"
            @click="reject"
          >
            Отклонить
          </button>
        </div>

        <div v-if="actionResult" class="hint result-block">{{ actionResult }}</div>
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
    status: 'pending',
    rows: [],
    draft: null,
    reviewComment: '',
    actionResult: '',
    saving: false
  }),
  computed: {
    payload () {
      return this.draft?.payload || {}
    },
    orderDraft () {
      return this.payload.orderDraft || {}
    },
    pricing () {
      return this.payload.pricing || {}
    },
    missingFields () {
      return Array.isArray(this.payload.missingFields) ? this.payload.missingFields : []
    },
    proposedActions () {
      return Array.isArray(this.payload.proposedActions) ? this.payload.proposedActions : []
    },
    qualityChecks () {
      return Array.isArray(this.payload.qualityChecks) ? this.payload.qualityChecks : []
    },
    sheetRowPreview () {
      return this.payload.sheetRowPreview || {}
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
    summarize (row) {
      const payload = this.parsePayload(row.payloadJson)
      const orderDraft = payload.orderDraft || {}
      const pricing = payload.pricing || {}
      return {
        customer: orderDraft.customerName || '-',
        route: [orderDraft.fromPoint, orderDraft.toPoint].filter(Boolean).join(' -> ') || '-',
        price: this.formatMoney(
          pricing.authoritativeClientPrice != null ? pricing.authoritativeClientPrice : orderDraft.clientPrice,
          pricing.authoritativeCurrency || orderDraft.currency
        )
      }
    },
    parsePayload (raw) {
      try {
        return JSON.parse(raw || '{}')
      } catch (_) {
        return {}
      }
    },
    formatDate (value) {
      if (!value) return '-'
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return value
      return d.toLocaleString()
    },
    formatMoney (value, currency = 'EUR') {
      if (value == null || value === '') return '-'
      const n = Number(value)
      if (!Number.isFinite(n)) return '-'
      return `${n.toFixed(2)} ${currency || 'EUR'}`
    },
    checkLevelLabel (level) {
      const map = { ok: 'OK', warn: 'Warn', error: 'Error' }
      return map[level] || level || '-'
    },
    checkPillClass (level) {
      return {
        'pill--ok': level === 'ok',
        'pill--warn': level === 'warn',
        'pill--danger': level === 'error'
      }
    },
    async load () {
      const params = new URLSearchParams()
      if (this.status) params.set('status', this.status)
      params.set('parsedType', 'openclaw_order_draft')
      const res = await fetch(`/api/admin/ops/drafts?${params.toString()}`, { headers: this.headers() })
      const data = await res.json()
      this.rows = data.rows || []
    },
    async openDraft (id) {
      const res = await fetch(`/api/admin/ops/drafts/${id}`, { headers: this.headers() })
      const data = await res.json()
      this.draft = data
      this.reviewComment = ''
      this.actionResult = ''
    },
    closeDraft () {
      this.draft = null
      this.reviewComment = ''
      this.actionResult = ''
      this.saving = false
    },
    async approve () {
      if (!this.draft) return
      this.saving = true
      try {
        const res = await fetch(`/api/admin/ops/drafts/${this.draft.id}/approve`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ comment: this.reviewComment || null })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Approve failed')
        this.actionResult = data.order
          ? `Черновик подтверждён. Создан заказ ${data.order.id} со статусом ${data.order.status}.`
          : 'Черновик подтверждён.'
        await this.openDraft(this.draft.id)
        await this.load()
      } catch (error) {
        this.actionResult = error.message || 'Approve failed'
      } finally {
        this.saving = false
      }
    },
    async reject () {
      if (!this.draft) return
      this.saving = true
      try {
        const res = await fetch(`/api/admin/ops/drafts/${this.draft.id}/reject`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ comment: this.reviewComment || null })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Reject failed')
        this.actionResult = 'Черновик отклонён.'
        await this.openDraft(this.draft.id)
        await this.load()
      } catch (error) {
        this.actionResult = error.message || 'Reject failed'
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.ai-section { padding-top: 140px; padding-bottom: 40px; }
.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 12px; }
.input { border: 1px solid #d8d8e6; border-radius: 8px; padding: 8px 10px; min-width: 220px; }
.table-wrap { background: #fff; border: 1px solid #d8d8e6; border-radius: 12px; overflow: auto; }
.table-head, .table-row { display: grid; grid-template-columns: 170px 180px 1fr 1.2fr 180px 120px 120px; gap: 12px; padding: 10px 12px; min-width: 1100px; }
.table-head { font-weight: 700; border-bottom: 1px solid #e5e7ef; }
.table-row { border-bottom: 1px solid #f1f3f8; align-items: center; }
.empty { padding: 16px; color: #64748b; }
.status-pill { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.status-pill--pending { background: #fef3c7; color: #92400e; }
.status-pill--approved { background: #dcfce7; color: #166534; }
.status-pill--rejected { background: #fee2e2; color: #991b1b; }
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; justify-content: center; align-items: center; z-index: 1200; padding: 20px; }
.modal-card { width: min(1100px, 96vw); max-height: 90vh; overflow: auto; background: #fff; border-radius: 16px; padding: 18px; }
.modal-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.modal-close { border: 0; background: transparent; font-size: 28px; cursor: pointer; color: #334155; }
.banner { margin: 12px 0; padding: 12px 14px; border-radius: 10px; background: #eff6ff; color: #1e3a8a; line-height: 1.45; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
.section-card { margin-top: 14px; border: 1px solid #e5e7ef; border-radius: 12px; padding: 14px; }
.section-card h4 { margin: 0 0 10px; }
.note-block pre, .section-card pre { white-space: pre-wrap; word-break: break-word; margin: 8px 0 0; font-family: inherit; }
.pill-list { display: flex; flex-wrap: wrap; gap: 8px; }
.pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-size: 12px; }
.pill--ok { background: #dcfce7; color: #166534; }
.pill--warn { background: #fff7ed; color: #9a3412; }
.pill--danger { background: #fee2e2; color: #991b1b; }
.checks-list { display: grid; gap: 10px; }
.check-row { display: flex; gap: 10px; align-items: flex-start; line-height: 1.45; }
.hint--warn { color: #9a3412; }
.actions { display: flex; gap: 10px; align-items: center; margin-top: 16px; flex-wrap: wrap; }
.comment-input { flex: 1; min-width: 280px; }
.hint { color: #64748b; }
.result-block { margin-top: 10px; }
@media (max-width: 900px) {
  .page-head, .toolbar, .actions { flex-direction: column; align-items: stretch; }
  .meta-grid { grid-template-columns: 1fr; }
}
</style>
