<template>
  <div>
    <navigation></navigation>
    <div class="page-background"><div class="page-background__gradient"></div><div class="page-background__overlay"></div></div>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <admin-tabs />

        <div class="section-actions">
          <button class="btn btn--ghost" @click="reloadAll">{{ t.refresh }}</button>
          <button class="btn" @click="downloadEtaTemplate">{{ t.etaTemplate }}</button>
        </div>

        <div class="overview-strip">
          <div v-for="card in overviewCards" :key="card.key" class="overview-card" :class="`overview-card--${card.tone}`">
            <div class="overview-card__value">{{ card.value }}</div>
            <div class="overview-card__label">{{ card.label }}</div>
            <div class="overview-card__hint">{{ card.hint }}</div>
          </div>
        </div>

        <div class="subtabs">
          <button class="subtab" :class="{ 'subtab--active': tab==='base' }" @click="tab='base'">{{ t.base }}</button>
          <button class="subtab" :class="{ 'subtab--active': tab==='counterparty' }" @click="tab='counterparty'">{{ t.counterparty }}</button>
          <button class="subtab" :class="{ 'subtab--active': tab==='driver' }" @click="tab='driver'">{{ t.driver }}</button>
          <button class="subtab" :class="{ 'subtab--active': tab==='conflicts' }" @click="tab='conflicts'">{{ t.conflicts }}</button>
          <button class="subtab" :class="{ 'subtab--active': tab==='adjustments' }" @click="tab='adjustments'">{{ t.adjustments }}</button>
        </div>

        <div class="toolbar">
          <input v-model="q" class="input toolbar-search" :placeholder="searchPlaceholder" />
          <button v-if="tab==='base'" class="btn btn--primary" @click="openBaseForm()">{{ t.addRow }}</button>
          <button v-if="tab==='conflicts'" class="btn btn--danger" @click="recalc">{{ t.recalc }}</button>
        </div>

        <div v-if="notice" class="hint">{{ notice }}</div>

        <div v-if="tab==='base'" class="panel">
          <div class="panel-head">
            <div>
              <h3>{{ t.base }}</h3>
              <p class="panel-hint">{{ t.baseHint }}</p>
            </div>
          </div>
          <div class="pricing-list">
            <div class="pricing-list__head pricing-list__head--base">
              <div>{{ t.routeScope }}</div>
              <div>{{ t.vehicleClass }}</div>
              <div>{{ t.priceAndCurrency }}</div>
              <div>{{ t.managementSignal }}</div>
            </div>
            <div v-for="r in filteredBaseRows" :key="r.id" class="pricing-row pricing-row--base">
              <div class="route-cell">
                <div class="route-cell__title">{{ routeSummary(r) }}</div>
                <div class="route-cell__sub">{{ baseScopeLabel(r) }}</div>
              </div>
              <div>
                <span :class="['class-badge', { 'class-badge--missing': !r.vehicleType }]">{{ r.vehicleType || t.missingClass }}</span>
              </div>
              <div class="price-cell">
                <strong>{{ priceLabel(r.fixedPrice, r.currency) }}</strong>
              </div>
              <div class="signal-cell">
                <div class="signal-cell__title">{{ baseSignalTitle(r) }}</div>
                <div class="signal-cell__copy">{{ baseSignalCopy(r) }}</div>
                <div class="row-actions">
                  <button class="btn btn--small btn--primary" @click="openBaseForm(r)">{{ t.edit }}</button>
                  <button class="btn btn--small btn--danger" @click="removeBaseRow(r)">{{ t.delete }}</button>
                </div>
              </div>
            </div>
            <div v-if="!filteredBaseRows.length" class="empty-state">{{ t.empty }}</div>
          </div>
        </div>

        <div v-if="tab==='counterparty'" class="panel">
          <div class="panel-head">
            <div>
              <h3>{{ t.counterparty }}</h3>
              <p class="panel-hint">{{ t.counterpartyHint }}</p>
            </div>
          </div>
          <div class="pricing-list">
            <div class="pricing-list__head pricing-list__head--counterparty">
              <div>{{ t.counterpartyName }}</div>
              <div>{{ t.routeScope }}</div>
              <div>{{ t.priceAndCurrency }}</div>
              <div>{{ t.managementSignal }}</div>
            </div>
            <div v-for="r in filteredCpRows" :key="r.id" class="pricing-row pricing-row--counterparty">
              <div class="route-cell">
                <div class="route-cell__title">{{ r.counterpartyName || '-' }}</div>
                <div class="route-cell__sub">{{ r.city || t.noCity }}</div>
              </div>
              <div class="route-cell">
                <div class="route-cell__title">{{ routeSummary(r) }}</div>
                <div class="route-cell__sub">
                  <span :class="['class-badge', { 'class-badge--missing': !r.vehicleType }]">{{ r.vehicleType || t.missingClass }}</span>
                </div>
              </div>
              <div class="price-cell">
                <strong>{{ priceLabel(r.sellPrice, r.currency) }}</strong>
                <span class="muted">{{ t.markup }}: {{ markupLabel(r.markupPercent) }}</span>
              </div>
              <div class="signal-cell">
                <div class="signal-cell__title">{{ r.isActive ? t.ruleActive : t.ruleInactive }}</div>
                <div class="signal-cell__copy">{{ counterpartySignalCopy(r) }}</div>
              </div>
            </div>
            <div v-if="!filteredCpRows.length" class="empty-state">{{ t.empty }}</div>
          </div>
        </div>

        <div v-if="tab==='driver'" class="panel">
          <div class="panel-head">
            <div>
              <h3>{{ t.driver }}</h3>
              <p class="panel-hint">{{ t.driverHint }}</p>
            </div>
          </div>
          <div class="pricing-list">
            <div class="pricing-list__head pricing-list__head--driver">
              <div>{{ t.name }}</div>
              <div>{{ t.coverage }}</div>
              <div>{{ t.driverEconomics }}</div>
              <div>{{ t.managementSignal }}</div>
            </div>
            <div v-for="d in filteredDriverRows" :key="d.id" class="pricing-row pricing-row--driver">
              <div class="route-cell">
                <div class="route-cell__title">{{ d.name || '-' }}</div>
                <div class="route-cell__sub">{{ d.comment || t.noComment }}</div>
              </div>
              <div class="route-cell">
                <div class="route-cell__title">{{ [d.country, d.city].filter(Boolean).join(' · ') || t.noCoverage }}</div>
                <div class="route-cell__sub">{{ t.childSeat }}: {{ simpleValue(d.childSeatPrice) }}</div>
              </div>
              <div class="price-cell">
                <strong>{{ t.perKm }}: {{ simpleValue(d.kmRate) }}</strong>
                <span class="muted">{{ t.hourly }}: {{ simpleValue(d.hourlyRate) }}</span>
              </div>
              <div class="signal-cell">
                <div class="signal-cell__title">{{ driverSignalTitle(d) }}</div>
                <div class="signal-cell__copy">{{ driverSignalCopy(d) }}</div>
              </div>
            </div>
            <div v-if="!filteredDriverRows.length" class="empty-state">{{ t.empty }}</div>
          </div>
        </div>

        <div v-if="tab==='conflicts'" class="panel">
          <div class="panel-head">
            <div>
              <h3>{{ t.conflicts }}</h3>
              <p class="panel-hint">{{ t.conflictsHint }}</p>
            </div>
          </div>
          <div class="pricing-list">
            <div class="pricing-list__head pricing-list__head--conflicts">
              <div>{{ t.issue }}</div>
              <div>{{ t.routeScope }}</div>
              <div>{{ t.margin }}</div>
              <div>{{ t.managementSignal }}</div>
            </div>
            <div v-for="c in filteredConflictRows" :key="c.id" class="pricing-row pricing-row--conflicts">
              <div class="route-cell">
                <div class="route-cell__title">{{ c.issueType }}</div>
                <div class="route-cell__sub">ID: {{ c.orderId || '-' }}</div>
              </div>
              <div class="route-cell">
                <div class="route-cell__title">{{ c.order ? `${c.order.fromPoint || '-'} → ${c.order.toPoint || '-'}` : '-' }}</div>
                <div class="route-cell__sub">{{ priceLabel(c.sellPrice) }} / {{ priceLabel(c.driverCost) }}</div>
              </div>
              <div class="price-cell">
                <strong>{{ priceLabel(c.marginAbs) }}</strong>
                <span class="muted">{{ percentLabel(c.marginPct) }}</span>
              </div>
              <div class="signal-cell">
                <div class="signal-cell__title">
                  <span class="severity-pill" :class="`severity-pill--${String(c.severity || '').toLowerCase()}`">{{ c.severity || '-' }}</span>
                </div>
                <div class="signal-cell__copy">{{ conflictSignalCopy(c) }}</div>
              </div>
            </div>
            <div v-if="!filteredConflictRows.length" class="empty-state">{{ t.empty }}</div>
          </div>
        </div>

        <div v-if="tab==='adjustments'" class="panel">
          <div class="panel-head">
            <div>
              <h3>{{ t.adjustments }}</h3>
              <p class="panel-hint">{{ t.adjustmentsHint }}</p>
            </div>
          </div>
          <div class="stats-grid">
            <div class="mini-stat">
              <span>{{ t.penaltyCount }}</span>
              <strong>{{ adjustmentTotals.adjustmentCount || 0 }}</strong>
            </div>
            <div class="mini-stat">
              <span>{{ t.penaltyAmount }}</span>
              <strong>{{ currencyTotalsLabel('penaltyAmount') }}</strong>
            </div>
            <div class="mini-stat">
              <span>{{ t.netProfit }}</span>
              <strong>{{ currencyTotalsLabel('netProfit') }}</strong>
            </div>
          </div>

          <div class="split-panels">
            <div class="pricing-list">
              <div class="pricing-list__head pricing-list__head--adjustment-stat">
                <div>{{ t.name }}</div>
                <div>{{ t.penaltyCount }}</div>
                <div>{{ t.penaltyAmount }}</div>
              </div>
              <div v-for="d in filteredAdjustmentDrivers" :key="d.key" class="pricing-row pricing-row--adjustment-stat">
                <div class="route-cell__title">{{ d.name }}</div>
                <div>{{ d.count }}</div>
                <div class="price-cell"><strong>{{ priceLabel(d.amount, d.currency) }}</strong></div>
              </div>
              <div v-if="!filteredAdjustmentDrivers.length" class="empty-state">{{ t.empty }}</div>
            </div>

            <div class="pricing-list">
              <div class="pricing-list__head pricing-list__head--adjustment-stat">
                <div>{{ t.counterpartyName }}</div>
                <div>{{ t.penaltyCount }}</div>
                <div>{{ t.penaltyAmount }}</div>
              </div>
              <div v-for="c in filteredAdjustmentCounterparties" :key="c.key" class="pricing-row pricing-row--adjustment-stat">
                <div class="route-cell__title">{{ c.name }}</div>
                <div>{{ c.count }}</div>
                <div class="price-cell"><strong>{{ priceLabel(c.amount, c.currency) }}</strong></div>
              </div>
              <div v-if="!filteredAdjustmentCounterparties.length" class="empty-state">{{ t.empty }}</div>
            </div>
          </div>

          <div class="pricing-list adjustments-recent">
            <div class="pricing-list__head pricing-list__head--adjustments">
              <div>{{ t.routeScope }}</div>
              <div>{{ t.counterpartyName }}</div>
              <div>{{ t.name }}</div>
              <div>{{ t.penaltyAmount }}</div>
            </div>
            <div v-for="row in filteredAdjustmentRows" :key="row.id" class="pricing-row pricing-row--adjustments">
              <div class="route-cell">
                <div class="route-cell__title">{{ row.order ? `${row.order.fromPoint || '-'} → ${row.order.toPoint || '-'}` : '-' }}</div>
                <div class="route-cell__sub">{{ row.reason || row.rawText || '-' }}</div>
              </div>
              <div>{{ row.customerCompany?.name || row.counterpartyName || '-' }}</div>
              <div>{{ row.driver?.name || row.driverNameRaw || '-' }}</div>
              <div class="price-cell">
                <strong>{{ priceLabel(row.amount, row.currency) }}</strong>
              </div>
            </div>
            <div v-if="!filteredAdjustmentRows.length" class="empty-state">{{ t.empty }}</div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="editingBase" class="modal-overlay" @click="closeBaseForm">
      <div class="modal" @click.stop>
        <div class="modal-head">
          <div>
            <h3>{{ editingBase.id ? t.editRow : t.addRow }}</h3>
            <p class="modal-subtitle">{{ t.baseFormHint }}</p>
          </div>
          <button class="modal-close" type="button" @click="closeBaseForm">×</button>
        </div>
        <div class="form-grid">
          <div>
            <label>{{ t.country }}</label>
            <input v-model="baseForm.country" class="input" />
          </div>
          <div>
            <label>{{ t.from }}</label>
            <input v-model="baseForm.routeFrom" class="input" />
          </div>
          <div>
            <label>{{ t.to }}</label>
            <input v-model="baseForm.routeTo" class="input" />
          </div>
          <div>
            <label>{{ t.vehicleClass }} *</label>
            <input v-model="baseForm.vehicleType" class="input" />
          </div>
          <div>
            <label>{{ t.sale }} *</label>
            <input v-model="baseForm.fixedPrice" class="input" type="number" step="0.01" min="0" />
          </div>
          <div>
            <label>{{ t.currency }} *</label>
            <input v-model="baseForm.currency" class="input" />
          </div>
        </div>
        <div class="actions">
          <button class="btn btn--primary" @click="saveBaseRow">{{ t.save }}</button>
          <button class="btn" @click="closeBaseForm">{{ t.cancel }}</button>
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
    tab: 'base',
    q: '',
    baseRows: [],
    cpRows: [],
    conflictRows: [],
    driverRows: [],
    adjustmentSummary: null,
    notice: '',
    editingBase: null,
    baseForm: {
      country: '',
      routeFrom: '',
      routeTo: '',
      vehicleType: '',
      fixedPrice: '',
      currency: 'EUR'
    }
  }),
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'Прайс и контроль маржи',
            subtitle: 'Здесь команда видит не просто набор цен, а управленческую картину: где базовый прайс, где особые договорённости, где водительские ставки и где уже есть риск для маржи.',
            base: 'Базовый прайс',
            counterparty: 'Контрагенты',
            driver: 'Цены водителей',
            conflicts: 'Риски и расхождения',
            adjustments: 'Штрафы',
            refresh: 'Обновить',
            addRow: 'Добавить строку',
            editRow: 'Редактировать строку',
            edit: 'Изменить',
            delete: 'Удалить',
            etaTemplate: 'Шаблон для ETA',
            recalc: 'Пересчитать риски',
            city: 'Город',
            route: 'Маршрут',
            routeScope: 'Маршрут и покрытие',
            from: 'Откуда',
            to: 'Куда',
            vehicleClass: 'Класс авто',
            missingClass: 'Класс не задан',
            sale: 'Цена',
            priceAndCurrency: 'Цена и валюта',
            currency: 'Валюта',
            perKm: 'За км',
            hourly: 'Почасовая',
            childSeat: 'Детское кресло',
            counterpartyName: 'Контрагент',
            markup: 'Наценка',
            status: 'Статус',
            name: 'Водитель',
            country: 'Страна',
            coverage: 'Покрытие',
            comment: 'Комментарий',
            noComment: 'Комментарий не указан',
            noCoverage: 'Покрытие не задано',
            noCity: 'Город не указан',
            issue: 'Проблема',
            driverCost: 'Цена водителя',
            margin: 'Маржа',
            penaltyCount: 'Количество штрафов',
            penaltyAmount: 'Сумма штрафов',
            netProfit: 'Профит после штрафов',
            managementSignal: 'Следующий шаг',
            loadedRows: 'Загружено строк базового прайса',
            save: 'Сохранить',
            cancel: 'Отмена',
            empty: 'По текущему фильтру данных пока нет.',
            baseHint: 'Главный источник истины по продажной цене Riderra. Именно отсюда должна браться финальная цена, если нет специально согласованного исключения.',
            counterpartyHint: 'Отдельные договорённости с контрагентами. Здесь важно быстро видеть, где мы живём не по базовому прайсу.',
            driverHint: 'Экономика исполнителей: стоимость по км, почасовая аренда и детские кресла.',
            conflictsHint: 'Открытые ситуации, где цена водителя уже конфликтует с продажной ценой или маржа стала опасной.',
            adjustmentsHint: 'Штрафы и удержания из заказов. Здесь видно, на каких водителей и клиентов приходится больше всего потерь, и как это меняет реальный профит.',
            baseFormHint: 'Добавляем или редактируем строку основного прайса Riderra. Это опорная цена для команды.',
            ruleActive: 'Правило активно',
            ruleInactive: 'Правило выключено'
          }
        : {
            title: 'Pricing & Margin Control',
            subtitle: 'This screen shows more than price rows. It gives the team a management view of base pricing, special agreements, driver economics, and margin risk.',
            base: 'Base pricing',
            counterparty: 'Counterparties',
            driver: 'Driver prices',
            conflicts: 'Risks and conflicts',
            adjustments: 'Penalties',
            refresh: 'Refresh',
            addRow: 'Add row',
            editRow: 'Edit row',
            edit: 'Edit',
            delete: 'Delete',
            etaTemplate: 'ETA Template',
            recalc: 'Recalculate risks',
            city: 'City',
            route: 'Route',
            routeScope: 'Route and scope',
            from: 'From',
            to: 'To',
            vehicleClass: 'Vehicle class',
            missingClass: 'Class missing',
            sale: 'Price',
            priceAndCurrency: 'Price and currency',
            currency: 'Currency',
            perKm: 'Per km',
            hourly: 'Hourly',
            childSeat: 'Child seat',
            counterpartyName: 'Counterparty',
            markup: 'Markup',
            status: 'Status',
            name: 'Driver',
            country: 'Country',
            coverage: 'Coverage',
            comment: 'Comment',
            noComment: 'No comment',
            noCoverage: 'Coverage not set',
            noCity: 'City not set',
            issue: 'Issue',
            driverCost: 'Driver cost',
            margin: 'Margin',
            penaltyCount: 'Penalty count',
            penaltyAmount: 'Penalty amount',
            netProfit: 'Profit after penalties',
            managementSignal: 'Next step',
            loadedRows: 'Loaded base pricing rows',
            save: 'Save',
            cancel: 'Cancel',
            empty: 'No data for the current filter yet.',
            baseHint: 'The main source of truth for Riderra selling price. The team should fall back to this unless there is an explicit exception.',
            counterpartyHint: 'Special deals with counterparties. This is where the team should quickly see where pricing diverges from the base book.',
            driverHint: 'Supplier economics: per-km rate, hourly rental, and child seat pricing.',
            conflictsHint: 'Open situations where driver cost already conflicts with the sell price or margin became risky.',
            adjustmentsHint: 'Penalties and deductions from orders. This shows which drivers and clients create the largest loss and how real profit changes.',
            baseFormHint: 'Add or edit a base pricing row. This is the anchor sale price for the team.',
            ruleActive: 'Rule active',
            ruleInactive: 'Rule disabled'
          }
    },
    searchPlaceholder () {
      if (this.tab === 'base') return this.$store.state.language === 'ru' ? 'Поиск по стране, маршруту или классу авто' : 'Search by country, route, or vehicle class'
      if (this.tab === 'counterparty') return this.$store.state.language === 'ru' ? 'Поиск по контрагенту, городу или маршруту' : 'Search by counterparty, city, or route'
      if (this.tab === 'driver') return this.$store.state.language === 'ru' ? 'Поиск по водителю, стране или городу' : 'Search by driver, country, or city'
      if (this.tab === 'adjustments') return this.$store.state.language === 'ru' ? 'Поиск по водителю, клиенту или маршруту' : 'Search by driver, client, or route'
      return this.$store.state.language === 'ru' ? 'Поиск по проблеме, ID заказа или маршруту' : 'Search by issue, order ID, or route'
    },
    overviewCards () {
      const specialDeals = this.cpRows.filter((row) => row.isActive).length
      const driverWithEconomics = this.driverRows.filter((row) => row.kmRate || row.hourlyRate || row.childSeatPrice).length
      const penalties = this.adjustmentTotals.adjustmentCount || 0
      return [
        { key: 'base', value: this.baseRows.length, label: this.t.base, hint: this.t.baseHint, tone: 'neutral' },
        { key: 'counterparty', value: specialDeals, label: this.t.counterparty, hint: this.t.counterpartyHint, tone: specialDeals ? 'info' : 'neutral' },
        { key: 'driver', value: driverWithEconomics, label: this.t.driver, hint: this.t.driverHint, tone: driverWithEconomics ? 'ok' : 'neutral' },
        { key: 'conflicts', value: this.conflictRows.length, label: this.t.conflicts, hint: this.t.conflictsHint, tone: this.conflictRows.length ? 'warn' : 'neutral' },
        { key: 'penalties', value: penalties, label: this.t.adjustments, hint: this.t.adjustmentsHint, tone: penalties ? 'critical' : 'neutral' }
      ]
    },
    adjustmentTotals () {
      return this.adjustmentSummary?.totals || {}
    },
    filteredBaseRows () {
      const q = this.q.trim().toLowerCase()
      if (!q) return this.baseRows
      return this.baseRows.filter((row) => `${row.country || ''} ${row.routeFrom || ''} ${row.routeTo || ''} ${row.vehicleType || ''}`.toLowerCase().includes(q))
    },
    filteredCpRows () {
      const q = this.q.trim().toLowerCase()
      if (!q) return this.cpRows
      return this.cpRows.filter((row) => `${row.counterpartyName || ''} ${row.city || ''} ${row.routeFrom || ''} ${row.routeTo || ''} ${row.vehicleType || ''}`.toLowerCase().includes(q))
    },
    filteredDriverRows () {
      const q = this.q.trim().toLowerCase()
      if (!q) return this.driverRows
      return this.driverRows.filter((row) => `${row.name || ''} ${row.country || ''} ${row.city || ''} ${row.comment || ''}`.toLowerCase().includes(q))
    },
    filteredConflictRows () {
      const q = this.q.trim().toLowerCase()
      if (!q) return this.conflictRows
      return this.conflictRows.filter((row) => {
        const route = row.order ? `${row.order.fromPoint || ''} ${row.order.toPoint || ''}` : ''
        return `${row.issueType || ''} ${row.orderId || ''} ${route}`.toLowerCase().includes(q)
      })
    },
    filteredAdjustmentRows () {
      const rows = this.adjustmentSummary?.recent || []
      const q = this.q.trim().toLowerCase()
      if (!q) return rows
      return rows.filter((row) => {
        const route = row.order ? `${row.order.fromPoint || ''} ${row.order.toPoint || ''}` : ''
        return `${row.driver?.name || ''} ${row.driverNameRaw || ''} ${row.customerCompany?.name || ''} ${row.counterpartyName || ''} ${route} ${row.reason || ''}`.toLowerCase().includes(q)
      })
    },
    filteredAdjustmentDrivers () {
      const rows = this.adjustmentSummary?.byDriver || []
      const q = this.q.trim().toLowerCase()
      if (!q) return rows
      return rows.filter((row) => `${row.name || ''}`.toLowerCase().includes(q))
    },
    filteredAdjustmentCounterparties () {
      const rows = this.adjustmentSummary?.byCounterparty || []
      const q = this.q.trim().toLowerCase()
      if (!q) return rows
      return rows.filter((row) => `${row.name || ''}`.toLowerCase().includes(q))
    }
  },
  mounted () { this.reloadAll() },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
    async fetchJson (url, options = {}) {
      const response = await fetch(url, { headers: this.headers(), ...options })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || `HTTP ${response.status}`)
      }
      return body
    },
    routeSummary (row) {
      const from = row.routeFrom || '—'
      const to = row.routeTo || '—'
      return `${from} → ${to}`
    },
    baseScopeLabel (row) {
      return [row.country, row.city].filter(Boolean).join(' · ') || (this.$store.state.language === 'ru' ? 'Глобальное правило' : 'Global rule')
    },
    priceLabel (value, currency = '') {
      if (value === null || value === undefined || value === '') return '-'
      return `${value}${currency ? ` ${currency}` : ''}`
    },
    markupLabel (value) {
      if (value === null || value === undefined || value === '') return '-'
      return `${value}%`
    },
    percentLabel (value) {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
      return `${Number(value).toFixed(1)}%`
    },
    currencyTotalsLabel (field) {
      const rows = this.adjustmentTotals.byCurrency || []
      if (!rows.length) return '-'
      return rows
        .filter((row) => row[field] !== null && row[field] !== undefined)
        .map((row) => this.priceLabel(Number(row[field]).toFixed(2), row.currency))
        .join(' / ') || '-'
    },
    simpleValue (value) {
      return value === null || value === undefined || value === '' ? '-' : value
    },
    baseSignalTitle (row) {
      return row.vehicleType ? (this.$store.state.language === 'ru' ? 'Базовая строка готова' : 'Base row ready') : this.t.missingClass
    },
    baseSignalCopy (row) {
      if (!row.vehicleType) {
        return this.$store.state.language === 'ru'
          ? 'Класс авто не указан. Такая строка не годится как опорный прайс для команды.'
          : 'Vehicle class is missing. The row is not reliable as a pricing anchor.'
      }
      return this.$store.state.language === 'ru'
        ? 'Эта строка может использоваться как базовая цена Riderra, если нет отдельного исключения для контрагента.'
        : 'This row can be used as the Riderra anchor price unless a dedicated counterparty rule overrides it.'
    },
    counterpartySignalCopy (row) {
      if (!row.isActive) {
        return this.$store.state.language === 'ru'
          ? 'Правило сейчас выключено. Проверьте, нужно ли оно вообще или его можно убрать из системы.'
          : 'The rule is disabled. Check whether it is still needed or can be removed.'
      }
      return this.$store.state.language === 'ru'
        ? 'Это отдельная договорённость. Важно держать её в актуальном состоянии, чтобы команда не продавала по старым условиям.'
        : 'This is a special agreement. Keep it updated so the team does not sell on outdated terms.'
    },
    driverSignalTitle (row) {
      return row.kmRate || row.hourlyRate
        ? (this.$store.state.language === 'ru' ? 'Экономика заведена' : 'Economics set')
        : (this.$store.state.language === 'ru' ? 'Нужно заполнить ставки' : 'Rates missing')
    },
    driverSignalCopy (row) {
      if (row.kmRate || row.hourlyRate) {
        return this.$store.state.language === 'ru'
          ? 'По этому водителю уже можно оценивать маржу и сравнивать продажную цену с себестоимостью.'
          : 'This supplier already has enough economics data to compare margin against the sell price.'
      }
      return this.$store.state.language === 'ru'
        ? 'У водителя нет ставок. Пока он плохо пригоден для быстрых решений по цене.'
        : 'The supplier has no rates yet and is not reliable for fast pricing decisions.'
    },
    conflictSignalCopy (row) {
      const severity = String(row.severity || '').toLowerCase()
      if (severity === 'high' || severity === 'critical') {
        return this.$store.state.language === 'ru'
          ? 'Маржа уже опасно низкая или отрицательная. Это нужно разбирать в первую очередь.'
          : 'Margin is already dangerously low or negative. This should be handled first.'
      }
      return this.$store.state.language === 'ru'
        ? 'Есть расхождение, но оно не выглядит критичным. Всё равно нужно проверить правило, цену водителя и продажи.'
        : 'There is a mismatch, but it does not look critical yet. Still worth checking the rule, supplier cost, and sell price.'
    },
    openBaseForm (row = null) {
      this.editingBase = row || {}
      this.baseForm = {
        country: row?.country || '',
        routeFrom: row?.routeFrom || '',
        routeTo: row?.routeTo || '',
        vehicleType: row?.vehicleType || '',
        fixedPrice: row?.fixedPrice ?? '',
        currency: row?.currency || 'EUR'
      }
    },
    closeBaseForm () {
      this.editingBase = null
    },
    async saveBaseRow () {
      const payload = {
        country: this.baseForm.country || null,
        routeFrom: this.baseForm.routeFrom || null,
        routeTo: this.baseForm.routeTo || null,
        vehicleType: String(this.baseForm.vehicleType || '').trim(),
        fixedPrice: this.baseForm.fixedPrice === '' ? null : parseFloat(this.baseForm.fixedPrice),
        currency: String(this.baseForm.currency || 'EUR').trim().toUpperCase()
      }
      if (!payload.vehicleType) throw new Error('vehicleType is required')
      if (payload.fixedPrice === null || Number.isNaN(payload.fixedPrice)) throw new Error('fixedPrice is required')

      if (this.editingBase?.id) {
        await this.fetchJson(`/api/admin/pricing/cities/${this.editingBase.id}`, {
          method: 'PUT',
          headers: {
            ...this.headers(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      } else {
        await this.fetchJson('/api/admin/pricing/cities', {
          method: 'POST',
          headers: {
            ...this.headers(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      }
      this.closeBaseForm()
      await this.reloadAll()
    },
    async removeBaseRow (row) {
      if (!row?.id) return
      await this.fetchJson(`/api/admin/pricing/cities/${row.id}`, {
        method: 'DELETE',
        headers: this.headers()
      })
      await this.reloadAll()
    },
    async reloadAll () {
      this.notice = ''
      const [base, cp, cf, dr, adj] = await Promise.allSettled([
        this.fetchJson('/api/admin/pricing/cities?limit=5000'),
        this.fetchJson('/api/admin/pricing/counterparty-rules'),
        this.fetchJson('/api/admin/pricing/conflicts?status=open&limit=500'),
        this.fetchJson('/api/admin/drivers'),
        this.fetchJson('/api/admin/pricing/adjustments/summary?type=penalty&limit=1000')
      ])
      this.baseRows = base.status === 'fulfilled' ? (base.value.rows || []) : []
      this.cpRows = cp.status === 'fulfilled' ? (cp.value.rows || []) : []
      this.conflictRows = cf.status === 'fulfilled' ? (cf.value.rows || []) : []
      this.driverRows = dr.status === 'fulfilled' ? (Array.isArray(dr.value) ? dr.value : []) : []
      this.adjustmentSummary = adj.status === 'fulfilled' ? adj.value : null

      const errors = [base, cp, cf, dr, adj]
        .filter((x) => x.status === 'rejected')
        .map((x) => x.reason?.message || 'unknown')
      this.notice = errors.length
        ? `Часть данных не загружена: ${errors.join('; ')}`
        : `${this.t.loadedRows}: ${this.baseRows.length}`
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
.admin-section {
  padding-top: 150px;
  color: #17233d;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 14px;
}

.page-subtitle {
  margin: 6px 0 0;
  max-width: 760px;
  color: #60708f;
  font-size: 15px;
  line-height: 1.55;
}

.page-head-actions,
.toolbar,
.subtabs,
.actions,
.row-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.overview-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.overview-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid #d8e0ef;
  background: linear-gradient(180deg, #fff 0%, #f8fbff 100%);
  box-shadow: 0 12px 28px rgba(16, 30, 67, 0.06);
}

.overview-card__value {
  font-size: 28px;
  font-weight: 800;
  color: #17233d;
}

.overview-card__label {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #223356;
}

.overview-card__hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: #6b7280;
}

.overview-card--warn { border-color: #fde68a; background: linear-gradient(180deg, #fffdf4 0%, #fff8dc 100%); }
.overview-card--critical { border-color: #fecaca; background: linear-gradient(180deg, #fff8f8 0%, #ffefef 100%); }
.overview-card--ok { border-color: #bbf7d0; background: linear-gradient(180deg, #f7fff9 0%, #edfff3 100%); }
.overview-card--info { border-color: #bfdbfe; background: linear-gradient(180deg, #f7fbff 0%, #ecf5ff 100%); }

.subtab {
  border: 1px solid #d8e0ef;
  border-radius: 999px;
  padding: 10px 14px;
  background: #fff;
  color: #1f3b70;
  font-weight: 700;
}

.subtab--active {
  background: #1f4fff;
  color: #fff;
  border-color: transparent;
}

.toolbar {
  margin-bottom: 14px;
  align-items: center;
}

.toolbar-search {
  flex: 1 1 320px;
}

.hint {
  margin-bottom: 12px;
  color: #4a628c;
}

.panel {
  background: #fff;
  border: 1px solid #d8d8e6;
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 14px 28px rgba(16, 24, 40, 0.06);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 14px;
}

.panel-hint {
  margin: 6px 0 0;
  color: #64748b;
  line-height: 1.5;
}

.pricing-list {
  border: 1px solid #e6ebf5;
  border-radius: 14px;
  overflow: hidden;
}

.pricing-list__head,
.pricing-row {
  display: grid;
  gap: 14px;
  padding: 14px 16px;
}

.pricing-list__head {
  font-weight: 700;
  color: #1d2c4a;
  border-bottom: 1px solid #e4e7f0;
  background: #fbfcff;
}

.pricing-row {
  color: #2f3e60;
  border-bottom: 1px solid #f0f2f7;
}

.pricing-list__head--base,
.pricing-row--base,
.pricing-list__head--counterparty,
.pricing-row--counterparty,
.pricing-list__head--driver,
.pricing-row--driver,
.pricing-list__head--conflicts,
.pricing-row--conflicts,
.pricing-list__head--adjustments,
.pricing-row--adjustments {
  grid-template-columns: minmax(240px, 1.1fr) minmax(180px, .8fr) minmax(160px, .7fr) minmax(260px, 1fr);
}

.pricing-list__head--adjustment-stat,
.pricing-row--adjustment-stat {
  grid-template-columns: minmax(160px, 1fr) 90px minmax(120px, .7fr);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.mini-stat {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid #e6ebf5;
  border-radius: 12px;
  background: #fbfcff;
}

.mini-stat span {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.mini-stat strong {
  color: #17233d;
  font-size: 22px;
}

.split-panels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.adjustments-recent {
  margin-top: 14px;
}

.route-cell,
.signal-cell,
.price-cell {
  display: grid;
  gap: 6px;
}

.route-cell__title,
.signal-cell__title {
  color: #1d2c4a;
  font-weight: 700;
}

.route-cell__sub,
.signal-cell__copy,
.muted,
.modal-subtitle {
  color: #6b7280;
  line-height: 1.5;
}

.price-cell strong {
  color: #102b63;
}

.class-badge {
  display: inline-block;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  background: #e5f4ff;
  color: #0b3a66;
  font-weight: 600;
  font-size: 12px;
}

.class-badge--missing {
  background: #ffe8e8;
  color: #8a1f1f;
}

.severity-pill {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.severity-pill--high {
  background: #fef2f2;
  color: #991b1b;
}

.severity-pill--critical {
  background: #fef2f2;
  color: #991b1b;
}

.severity-pill--medium {
  background: #fff7ed;
  color: #c2410c;
}

.severity-pill--warning {
  background: #fff7ed;
  color: #c2410c;
}

.severity-pill--low {
  background: #eff6ff;
  color: #1d4ed8;
}

.empty-state {
  padding: 28px;
  text-align: center;
  color: #64748b;
}

.input {
  border: 1px solid #d8d8e6;
  border-radius: 12px;
  padding: 10px 12px;
  min-width: 220px;
  width: 100%;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  width: min(760px, 95vw);
  background: #ffffff;
  border-radius: 16px;
  padding: 18px;
  border: 1px solid #d8d8e6;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.modal-close {
  border: none;
  background: transparent;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  color: #64748b;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 14px;
}

.btn {
  border: none;
  border-radius: 14px;
  padding: 12px 18px;
  cursor: pointer;
  font-weight: 700;
  background: #eef2ff;
  color: #1f3b70;
}

.btn--small {
  padding: 9px 12px;
  font-size: 13px;
}

.btn--primary {
  background: #1f4fff;
  color: #fff;
}

.btn--ghost {
  background: #fff;
  border: 1px solid #d7e0ef;
  color: #21385f;
}

.btn--danger {
  background: #b42318;
  color: #fff;
}

@media (max-width: 1100px) {
  .overview-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pricing-list__head,
  .pricing-row,
  .split-panels,
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .page-head,
  .panel-head {
    flex-direction: column;
  }

  .page-head-actions,
  .subtabs {
    width: 100%;
  }

  .subtabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .subtab {
    flex: 0 0 auto;
  }

  .overview-strip,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .toolbar {
    width: 100%;
  }

  .page-head-actions .btn,
  .actions .btn {
    width: 100%;
  }

  .modal {
    width: min(100vw - 16px, 760px);
    padding: 16px;
  }
}
</style>
