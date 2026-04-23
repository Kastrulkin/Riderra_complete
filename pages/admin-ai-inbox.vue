<template>
  <div>
    <navigation></navigation>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf ai-section">
      <div class="container">
        <admin-tabs />

        <div class="section-actions">
          <button class="btn btn--primary" @click="load">Обновить</button>
        </div>

        <div class="ops-rail">
          <div>
            <strong>AI Inbox — очередь черновиков.</strong>
            <p class="hint">Здесь проверяем, что распозналось из письма, уточняем проблемные поля и только потом подтверждаем заказ.</p>
          </div>
        </div>

        <div class="overview-grid">
          <div class="overview-card">
            <span class="overview-card__label">Ждут подтверждения</span>
            <strong>{{ pendingCount }}</strong>
          </div>
          <div class="overview-card">
            <span class="overview-card__label">Требуют уточнения</span>
            <strong>{{ needsReviewCount }}</strong>
          </div>
          <div class="overview-card">
            <span class="overview-card__label">Готовы к созданию</span>
            <strong>{{ readyCount }}</strong>
          </div>
        </div>

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
            <div>
              <span class="status-pill" :class="`status-pill--${row.status}`">{{ row.status }}</span>
              <div class="row-hint">{{ draftStateLabel(row) }}</div>
            </div>
            <div>
              <button class="btn btn--small btn--primary" @click="openDraft(row.id)">{{ draftActionLabel(row) }}</button>
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

        <div class="focus-card">
          <div class="focus-card__head">
            <div>
              <h4>{{ orderDraft.customerName || 'Черновик без контрагента' }}</h4>
              <div class="hint">{{ [orderDraft.city, orderDraft.pickupAt].filter(Boolean).join(' · ') || 'Дата и город пока не определены' }}</div>
            </div>
            <span class="status-pill" :class="`status-pill--${draft.status}`">{{ draft.status }}</span>
          </div>
          <p class="focus-card__summary">{{ focusSummary }}</p>
          <div class="focus-meta">
            <span class="pill">{{ orderDraft.flightNumber ? `Рейс: ${orderDraft.flightNumber}` : 'Рейс не найден' }}</span>
            <span class="pill">{{ formatMoney(pricing.authoritativeClientPrice != null ? pricing.authoritativeClientPrice : orderDraft.clientPrice, pricing.authoritativeCurrency || orderDraft.currency) }}</span>
            <span class="pill">{{ orderDraft.vehicleType || 'Класс не определён' }}</span>
          </div>
          <div class="focus-actions">
            <button
              class="btn btn--small btn--primary"
              :disabled="draft.status !== 'pending' || saving"
              @click="approve"
            >
              {{ saving ? 'Сохраняю...' : primaryDraftAction }}
            </button>
            <button
              class="btn btn--small btn--ghost"
              :disabled="draft.status !== 'pending' || saving"
              @click="reject"
            >
              Отклонить
            </button>
            <button
              class="btn btn--small btn--ghost"
              type="button"
              :disabled="flightChecking || !orderDraft.flightNumber"
              @click="runFlightCheck"
            >
              {{ flightChecking ? 'Проверяю рейс...' : 'Проверить рейс' }}
            </button>
          </div>
        </div>

        <details class="section-card" open>
          <summary class="section-summary">Подготовленный заказ</summary>
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
        </details>

        <details class="section-card" v-if="flightCheck">
          <summary class="section-summary">Проверка рейса</summary>
          <div class="meta-grid">
            <div><strong>Провайдер:</strong> {{ flightCheck.provider || '-' }}</div>
            <div><strong>Проверен:</strong> {{ formatDate(flightCheck.checkedAt) }}</div>
            <div><strong>Рейс:</strong> {{ flightCheck.query?.flightNumber || orderDraft.flightNumber || '-' }}</div>
            <div><strong>Дата:</strong> {{ flightCheck.query?.flightDate || '-' }}</div>
            <div><strong>Найден:</strong> {{ flightCheck.found ? 'Да' : 'Нет' }}</div>
            <div><strong>Совпадений:</strong> {{ flightCheck.resultCount == null ? '-' : flightCheck.resultCount }}</div>
          </div>
          <div v-if="flightCheck.bestMatch" class="meta-grid" style="margin-top: 10px;">
            <div><strong>Статус:</strong> {{ flightCheck.bestMatch.flightStatus || '-' }}</div>
            <div><strong>Авиакомпания:</strong> {{ flightCheck.bestMatch.airlineName || '-' }}</div>
            <div><strong>Вылет:</strong> {{ formatDate(flightCheck.bestMatch.departureScheduled || flightCheck.bestMatch.departureEstimated || flightCheck.bestMatch.departureActual) }}</div>
            <div><strong>Прилёт:</strong> {{ formatDate(flightCheck.bestMatch.arrivalEstimated || flightCheck.bestMatch.arrivalScheduled || flightCheck.bestMatch.arrivalActual) }}</div>
            <div><strong>Из:</strong> {{ flightCheck.bestMatch.departureAirport || flightCheck.bestMatch.departureIata || '-' }}</div>
            <div><strong>В:</strong> {{ flightCheck.bestMatch.arrivalAirport || flightCheck.bestMatch.arrivalIata || '-' }}</div>
          </div>
          <div v-if="flightCheckError" class="hint hint--error">{{ flightCheckError }}</div>
        </details>

        <details class="section-card">
          <summary class="section-summary">Проверка цены</summary>
          <div class="meta-grid">
            <div><strong>Источник цены:</strong> {{ pricing.pricingSource || 'не найдено' }}</div>
            <div><strong>Riderra price:</strong> {{ formatMoney(pricing.authoritativeClientPrice, pricing.authoritativeCurrency || orderDraft.currency) }}</div>
            <div><strong>Conflict:</strong> {{ pricing.conflict ? 'Да' : 'Нет' }}</div>
            <div><strong>Rule ID:</strong> {{ pricing.pricingRuleId || '-' }}</div>
          </div>
        </details>

        <details class="section-card" v-if="qualityChecks.length" :open="Boolean(payload.infoReason || missingFields.length)">
          <summary class="section-summary">Проверка полей</summary>
          <div class="checks-list">
            <div v-for="check in qualityChecks" :key="`${check.key}-${check.message}`" class="check-row">
              <span class="pill" :class="checkPillClass(check.level)">{{ checkLevelLabel(check.level) }}</span>
              <span>{{ check.message }}</span>
            </div>
          </div>
          <div v-if="payload.infoReason" class="hint hint--warn">
            Нужно уточнить: {{ payload.infoReason }}
          </div>
        </details>

        <details class="section-card" v-if="sheetRowPreview && Object.keys(sheetRowPreview).length">
          <summary class="section-summary">Строка для таблицы</summary>
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
        </details>

        <details class="section-card" v-if="missingFields.length || proposedActions.length" :open="Boolean(missingFields.length)">
          <summary class="section-summary">Проверить перед подтверждением</summary>
          <div v-if="missingFields.length" class="pill-list">
            <span v-for="item in missingFields" :key="item" class="pill pill--warn">{{ item }}</span>
          </div>
          <div v-if="proposedActions.length" class="pill-list">
            <span v-for="(item, idx) in proposedActions" :key="idx" class="pill">{{ typeof item === 'string' ? item : JSON.stringify(item) }}</span>
          </div>
        </details>

        <details class="section-card" v-if="payload.rawText">
          <summary class="section-summary">Исходный текст</summary>
          <pre>{{ payload.rawText }}</pre>
        </details>

        <div class="actions">
          <input v-model="reviewComment" class="input comment-input" placeholder="Комментарий ревьюера (необязательно)" />
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
    saving: false,
    flightChecking: false,
    flightCheckError: ''
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
    },
    flightCheck () {
      return this.payload.flightCheck || null
    },
    pendingCount () {
      return this.rows.filter((row) => row.status === 'pending').length
    },
    needsReviewCount () {
      return this.rows.filter((row) => {
        const payload = this.parsePayload(row.payloadJson)
        return (Array.isArray(payload.missingFields) && payload.missingFields.length) || String(payload.infoReason || '').trim()
      }).length
    },
    readyCount () {
      return this.rows.filter((row) => {
        const payload = this.parsePayload(row.payloadJson)
        return row.status === 'pending' && !(Array.isArray(payload.missingFields) && payload.missingFields.length) && !String(payload.infoReason || '').trim()
      }).length
    },
    focusSummary () {
      if (this.payload.infoReason) return `Нужно уточнить: ${this.payload.infoReason}`
      if (this.missingFields.length) return `Перед подтверждением нужно проверить: ${this.missingFields.join(', ')}`
      if (this.pricing.conflict) return 'Найдено расхождение по цене, лучше проверить перед созданием заказа.'
      return 'Черновик выглядит целостным. Можно подтвердить и создать заказ.'
    },
    primaryDraftAction () {
      if (this.payload.infoReason || this.missingFields.length || this.pricing.conflict) return 'Проверить и подтвердить'
      return 'Подтвердить и создать заказ'
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
    draftStateLabel (row) {
      const payload = this.parsePayload(row.payloadJson)
      if (row.status === 'approved') return 'Уже подтверждён'
      if (row.status === 'rejected') return 'Отклонён'
      if (String(payload.infoReason || '').trim()) return 'Есть блокирующее уточнение'
      if (Array.isArray(payload.missingFields) && payload.missingFields.length) return 'Есть неполные поля'
      if (payload.pricing?.conflict) return 'Проверьте цену'
      return 'Можно проверять и подтверждать'
    },
    draftActionLabel (row) {
      return this.draftStateLabel(row).includes('Можно') ? 'Подтвердить' : 'Разобрать'
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
      this.flightCheckError = ''
    },
    closeDraft () {
      this.draft = null
      this.reviewComment = ''
      this.actionResult = ''
      this.saving = false
      this.flightChecking = false
      this.flightCheckError = ''
    },
    async runFlightCheck () {
      if (!this.draft) return
      this.flightChecking = true
      this.flightCheckError = ''
      try {
        const res = await fetch(`/api/admin/ops/drafts/${this.draft.id}/flight-check`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({})
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Flight check failed')
        this.draft = data.draft || this.draft
      } catch (error) {
        this.flightCheckError = error.message || 'Flight check failed'
      } finally {
        this.flightChecking = false
      }
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
.page-subtitle { margin: 6px 0 0; max-width: 760px; color: #60708f; font-size: 15px; line-height: 1.55; }
.ops-rail { display: flex; justify-content: space-between; align-items: center; gap: 14px; border: 1px solid #ead7f0; background: #fcf7fd; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; }
.overview-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
.overview-card { background: #fff; border: 1px solid #d8d8e6; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.overview-card strong { font-size: 24px; color: #0f172a; }
.overview-card__label { color: #64748b; font-size: 13px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 12px; }
.input { border: 1px solid #d8d8e6; border-radius: 8px; padding: 8px 10px; min-width: 220px; }
.table-wrap { background: #fff; border: 1px solid #d8d8e6; border-radius: 12px; overflow: auto; }
.table-head, .table-row { display: grid; grid-template-columns: 170px 180px 1fr 1.2fr 180px 120px 120px; gap: 12px; padding: 10px 12px; min-width: 1100px; }
.table-head { font-weight: 700; border-bottom: 1px solid #e5e7ef; }
.table-row { border-bottom: 1px solid #f1f3f8; align-items: center; }
.row-hint { color: #64748b; font-size: 12px; margin-top: 6px; }
.empty { padding: 16px; color: #64748b; }
.status-pill { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.status-pill--pending { background: #fef3c7; color: #92400e; }
.status-pill--approved { background: #dcfce7; color: #166534; }
.status-pill--rejected { background: #fee2e2; color: #991b1b; }
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; justify-content: center; align-items: center; z-index: 1200; padding: 20px; }
.modal-card { width: min(1100px, 96vw); max-height: 90vh; overflow: auto; background: #fff; border-radius: 16px; padding: 18px; }
.modal-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.modal-close { border: 0; background: transparent; font-size: 28px; cursor: pointer; color: #334155; }
.banner { margin: 12px 0; padding: 12px 14px; border-radius: 10px; background: #fbf2ff; color: #702283; line-height: 1.45; }
.focus-card { margin-top: 12px; padding: 16px; border-radius: 14px; border: 1px solid #ead7f0; background: linear-gradient(180deg, #fff 0%, #fcf7fd 100%); }
.focus-card__head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
.focus-card__head h4 { margin: 0 0 4px; }
.focus-card__summary { margin: 0; color: #0f172a; line-height: 1.5; }
.focus-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.focus-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
.focus-actions .btn--primary { box-shadow: 0 10px 24px rgba(112, 34, 131, .18); }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
.section-card { margin-top: 14px; border: 1px solid #e5e7ef; border-radius: 12px; padding: 14px; }
.section-card[open] { background: #fff; }
.section-summary { cursor: pointer; font-weight: 800; list-style: none; margin: -14px; padding: 14px; color: #17233d; background: #fcf7fd; }
.section-summary::-webkit-details-marker { display: none; }
.section-card[open] .section-summary { border-bottom: 1px solid #e5e7ef; }
.section-card > :not(summary) { padding-top: 14px; }
.section-card h4 { margin: 0 0 10px; }
.note-block pre, .section-card pre { white-space: pre-wrap; word-break: break-word; margin: 8px 0 0; font-family: inherit; }
.pill-list { display: flex; flex-wrap: wrap; gap: 8px; }
.pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #fbf2ff; color: #702283; font-size: 12px; }
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
  .page-head, .toolbar, .actions, .ops-rail, .focus-card__head, .focus-actions { flex-direction: column; align-items: stretch; }
  .overview-grid,
  .meta-grid { grid-template-columns: 1fr; }
}
</style>
