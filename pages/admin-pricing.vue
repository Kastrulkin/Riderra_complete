<template>
  <div>
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
          <div class="pricing-list pricing-list--sheet">
            <div class="pricing-list__head pricing-list__head--sheet">
              <div>{{ t.country }}</div>
              <div>{{ t.from }}</div>
              <div>{{ t.to }}</div>
              <div>{{ t.type }}</div>
              <div>{{ t.pax }}</div>
              <div>{{ t.price }}</div>
              <div>{{ t.currency }}</div>
            </div>
            <div v-for="r in filteredBaseRows" :key="r.id" class="pricing-row pricing-row--sheet">
              <div>{{ sheetCountryLabel(r) }}</div>
              <div>{{ sheetPlaceLabel(r.routeFrom, r) }}</div>
              <div>{{ sheetPlaceLabel(r.routeTo, r) }}</div>
              <div>{{ r.vehicleType || '-' }}</div>
              <div>{{ paxLabel(r.vehicleType) }}</div>
              <div class="price-cell"><strong>{{ priceAmountLabel(r.fixedPrice) }}</strong></div>
              <div>
                <div>{{ r.currency || '-' }}</div>
                <div class="row-actions row-actions--inline">
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
          <div class="pricebook-toolbar">
            <div class="filter-chips">
              <button class="filter-chip" :class="{ 'filter-chip--active': !selectedCounterparties.length }" @click="clearCounterparties">{{ t.allCounterparties }}</button>
              <button v-for="name in counterpartyOptions" :key="name" class="filter-chip" :class="{ 'filter-chip--active': selectedCounterparties.includes(name) }" @click="toggleCounterparty(name)">{{ name }}</button>
            </div>
          </div>
          <div class="pricing-list pricing-list--sheet">
            <div class="pricing-list__head pricing-list__head--comparison" :style="counterpartyGridStyle">
              <div>{{ t.country }}</div>
              <div>{{ t.from }}</div>
              <div>{{ t.to }}</div>
              <div>{{ t.type }}</div>
              <div>{{ t.pax }}</div>
              <div>{{ t.riderraPrice }}</div>
              <div>{{ t.currency }}</div>
              <div v-for="name in counterpartyComparisonColumns" :key="`head-${name}`">{{ name }}</div>
            </div>
            <div v-for="r in visibleCounterpartyComparisonRows" :key="r.key" class="pricing-row pricing-row--comparison" :style="counterpartyGridStyle">
              <div>{{ sheetCountryLabel(r) }}</div>
              <div>{{ sheetPlaceLabel(r.routeFrom, r) }}</div>
              <div>{{ sheetPlaceLabel(r.routeTo, r) }}</div>
              <div>{{ r.vehicleType || '-' }}</div>
              <div>{{ paxLabel(r.vehicleType) }}</div>
              <div class="price-cell"><strong>{{ priceAmountLabel(r.riderraPrice) }}</strong></div>
              <div>{{ r.currency || '-' }}</div>
              <div v-for="name in counterpartyComparisonColumns" :key="`${r.key}-${name}`" class="price-cell price-cell--counterparty">
                <strong>{{ counterpartyPriceLabel(r, name) }}</strong>
              </div>
            </div>
            <div v-if="!filteredCounterpartyComparisonRows.length" class="empty-state">{{ t.empty }}</div>
            <div v-else-if="counterpartyHiddenRowsCount > 0" class="pricing-list__more">
              <button class="btn" @click="showMoreCounterpartyRows">{{ t.showMore }} · {{ counterpartyHiddenRowsCount }}</button>
            </div>
          </div>
        </div>

        <div v-if="tab==='driver'" class="panel">
          <div class="panel-head">
            <div>
              <h3>{{ t.driver }}</h3>
              <p class="panel-hint">{{ t.driverHint }}</p>
            </div>
          </div>
          <div class="pricebook-toolbar">
            <div class="filter-chips">
              <button class="filter-chip" :class="{ 'filter-chip--active': !selectedSuppliers.length }" @click="clearSuppliers">{{ t.allSuppliers }}</button>
              <button v-for="name in supplierOptions" :key="name" class="filter-chip" :class="{ 'filter-chip--active': selectedSuppliers.includes(name) }" @click="toggleSupplier(name)">{{ name }}</button>
            </div>
          </div>
          <div class="pricing-list pricing-list--sheet">
            <div class="pricing-list__head pricing-list__head--comparison" :style="supplierGridStyle">
              <div>{{ t.country }}</div>
              <div>{{ t.from }}</div>
              <div>{{ t.to }}</div>
              <div>{{ t.type }}</div>
              <div>{{ t.pax }}</div>
              <div>{{ t.riderraPrice }}</div>
              <div>{{ t.currency }}</div>
              <div v-for="name in supplierComparisonColumns" :key="`supplier-head-${name}`">{{ name }}</div>
            </div>
            <div v-for="d in visibleSupplierComparisonRows" :key="d.key" class="pricing-row pricing-row--comparison" :style="supplierGridStyle">
              <div>{{ sheetCountryLabel(d) }}</div>
              <div>{{ sheetPlaceLabel(d.routeFrom, d) }}</div>
              <div>{{ sheetPlaceLabel(d.routeTo, d) }}</div>
              <div>{{ d.vehicleType || '-' }}</div>
              <div>{{ paxLabel(d.vehicleType) }}</div>
              <div class="price-cell"><strong>{{ priceAmountLabel(d.riderraPrice) }}</strong></div>
              <div>{{ d.currency || '-' }}</div>
              <div v-for="name in supplierComparisonColumns" :key="`${d.key}-${name}`" class="price-cell price-cell--counterparty">
                <strong>{{ supplierPriceLabel(d, name) }}</strong>
              </div>
            </div>
            <div v-if="!filteredSupplierComparisonRows.length" class="empty-state">{{ t.empty }}</div>
            <div v-else-if="supplierHiddenRowsCount > 0" class="pricing-list__more">
              <button class="btn" @click="showMoreSupplierRows">{{ t.showMore }} · {{ supplierHiddenRowsCount }}</button>
            </div>
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
                <div class="route-cell__title">{{ conflictIssueLabel(c) }}</div>
                <div class="route-cell__sub">ID: {{ c.orderId || '-' }}</div>
              </div>
              <div class="route-cell">
                <div class="route-cell__title">{{ c.order ? `${c.order.fromPoint || '-'} → ${c.order.toPoint || '-'}` : '-' }}</div>
                <div class="route-cell__sub">{{ t.sale }}: {{ priceLabel(c.sellPrice) }} · {{ t.driverCost }}: {{ priceLabel(c.driverCost) }}</div>
              </div>
              <div class="price-cell">
                <strong>{{ priceLabel(c.marginAbs) }}</strong>
                <span class="muted">{{ percentLabel(c.marginPct) }}</span>
              </div>
              <div class="signal-cell">
                <div class="signal-cell__title">
                  <span class="severity-pill" :class="`severity-pill--${String(c.severity || '').toLowerCase()}`">{{ conflictSeverityLabel(c) }}</span>
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
          <div class="pricing-field">
            <label class="pricing-field__label">{{ t.country }}</label>
            <input v-model="baseForm.country" class="input pricing-field__input" />
          </div>
          <div class="pricing-field">
            <label class="pricing-field__label">{{ t.from }}</label>
            <input v-model="baseForm.routeFrom" class="input pricing-field__input" />
          </div>
          <div class="pricing-field">
            <label class="pricing-field__label">{{ t.to }}</label>
            <input v-model="baseForm.routeTo" class="input pricing-field__input" />
          </div>
          <div class="pricing-field">
            <label class="pricing-field__label">{{ t.vehicleClass }} *</label>
            <input v-model="baseForm.vehicleType" class="input pricing-field__input" />
          </div>
          <div class="pricing-field">
            <label class="pricing-field__label">{{ t.sale }} *</label>
            <input v-model="baseForm.fixedPrice" class="input pricing-field__input" type="number" step="0.01" min="0" />
          </div>
          <div class="pricing-field">
            <label class="pricing-field__label">{{ t.currency }} *</label>
            <input v-model="baseForm.currency" class="input pricing-field__input" />
          </div>
        </div>
        <div class="actions modal-actions">
          <button class="btn btn--primary" @click="saveBaseRow">{{ t.save }}</button>
          <button class="btn" @click="closeBaseForm">{{ t.cancel }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import adminTabs from '~/components/partials/adminTabs.vue'

export default {
  layout: 'admin',
  middleware: 'staff',
  components: { adminTabs },
  data: () => ({
    tab: 'base',
    q: '',
    baseRows: [],
    cpRows: [],
    conflictRows: [],
    driverRows: [],
    adjustmentSummary: null,
    selectedCounterparties: [],
    selectedSuppliers: [],
    counterpartyVisibleLimit: 250,
    supplierVisibleLimit: 250,
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
  watch: {
    q () {
      this.resetCounterpartyVisibleLimit()
      this.resetSupplierVisibleLimit()
    },
    selectedCounterparties () {
      this.resetCounterpartyVisibleLimit()
    },
    selectedSuppliers () {
      this.resetSupplierVisibleLimit()
    }
  },
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'Прайс и контроль маржи',
            subtitle: 'Здесь команда видит не просто набор цен, а управленческую картину: где базовый прайс, где особые договорённости, где водительские ставки и где уже есть риск для маржи.',
            base: 'Базовый прайс',
            counterparty: 'Прайсы клиентов',
            driver: 'Прайсы исполнителей',
            allCounterparties: 'Все клиенты',
            allSuppliers: 'Все исполнители',
            conflicts: 'Риски',
            adjustments: 'Штрафы',
            refresh: 'Обновить',
            addRow: 'Добавить строку',
            editRow: 'Редактировать строку',
            edit: 'Изменить',
            delete: 'Удалить',
            showMore: 'Показать ещё',
            etaTemplate: 'Шаблон для ETA',
            recalc: 'Пересчитать риски',
            city: 'Город',
            route: 'Маршрут',
            routeScope: 'Маршрут и покрытие',
            from: 'Откуда',
            to: 'Куда',
            type: 'Type',
            pax: 'Pax',
            price: 'Price',
            riderraPrice: 'Price (Riderra)',
            vehicleClass: 'Класс авто',
            sale: 'Цена',
            currency: 'Валюта',
            counterpartyName: 'Контрагент',
            name: 'Водитель',
            country: 'Страна',
            coverage: 'Покрытие',
            issue: 'Проблема',
            driverCost: 'Цена водителя',
            margin: 'Маржа',
            criticalRisks: 'Критичные риски',
            warningRisks: 'Предупреждения',
            penaltyCount: 'Количество штрафов',
            penaltyAmount: 'Сумма штрафов',
            netProfit: 'Профит после штрафов',
            managementSignal: 'Следующий шаг',
            loadedRows: 'Загружено строк базового прайса',
            save: 'Сохранить',
            cancel: 'Отмена',
            empty: 'По текущему фильтру данных пока нет.',
            baseHint: 'Главный источник истины по продажной цене Riderra. Именно отсюда должна браться финальная цена, если нет специально согласованного исключения.',
            counterpartyHint: 'Актуальный прайс-лист выбранного клиента. Таблица показывает итоговые действующие цены, а не отдельные правки.',
            driverHint: 'Актуальный прайс-лист выбранного исполнителя: маршруты, классы авто, себестоимость и источник строки.',
            conflictsHint: 'Открытые ситуации, где цена водителя уже конфликтует с продажной ценой или маржа стала опасной.',
            adjustmentsHint: 'Штрафы и удержания из заказов. Здесь видно, на каких водителей и клиентов приходится больше всего потерь, и как это меняет реальный профит.',
            baseFormHint: 'Добавляем или редактируем строку основного прайса Riderra. Это опорная цена для команды.',
            issueDriverGtSell: 'Цена исполнителя выше продажи',
            issueLowMargin: 'Низкая маржа',
            severityCritical: 'Критично',
            severityWarning: 'Внимание'
          }
        : {
            title: 'Pricing & Margin Control',
            subtitle: 'This screen shows more than price rows. It gives the team a management view of base pricing, special agreements, driver economics, and margin risk.',
            base: 'Base pricing',
            counterparty: 'Customer prices',
            driver: 'Supplier prices',
            allCounterparties: 'All customers',
            allSuppliers: 'All suppliers',
            conflicts: 'Risks',
            adjustments: 'Penalties',
            refresh: 'Refresh',
            addRow: 'Add row',
            editRow: 'Edit row',
            edit: 'Edit',
            delete: 'Delete',
            showMore: 'Show more',
            etaTemplate: 'ETA Template',
            recalc: 'Recalculate risks',
            city: 'City',
            route: 'Route',
            routeScope: 'Route and scope',
            from: 'From',
            to: 'To',
            type: 'Type',
            pax: 'Pax',
            price: 'Price',
            riderraPrice: 'Price (Riderra)',
            vehicleClass: 'Vehicle class',
            sale: 'Price',
            currency: 'Currency',
            counterpartyName: 'Counterparty',
            name: 'Driver',
            country: 'Country',
            coverage: 'Coverage',
            issue: 'Issue',
            driverCost: 'Driver cost',
            margin: 'Margin',
            criticalRisks: 'Critical risks',
            warningRisks: 'Warnings',
            penaltyCount: 'Penalty count',
            penaltyAmount: 'Penalty amount',
            netProfit: 'Profit after penalties',
            managementSignal: 'Next step',
            loadedRows: 'Loaded base pricing rows',
            save: 'Save',
            cancel: 'Cancel',
            empty: 'No data for the current filter yet.',
            baseHint: 'The main source of truth for Riderra selling price. The team should fall back to this unless there is an explicit exception.',
            counterpartyHint: 'Current price book for the selected customer. The table shows effective active prices, not separate edits.',
            driverHint: 'Current price book for the selected supplier: routes, vehicle classes, supplier cost, and row source.',
            conflictsHint: 'Open situations where driver cost already conflicts with the sell price or margin became risky.',
            adjustmentsHint: 'Penalties and deductions from orders. This shows which drivers and clients create the largest loss and how real profit changes.',
            baseFormHint: 'Add or edit a base pricing row. This is the anchor sale price for the team.',
            issueDriverGtSell: 'Supplier price is above sell price',
            issueLowMargin: 'Low margin',
            severityCritical: 'Critical',
            severityWarning: 'Warning'
          }
    },
    searchPlaceholder () {
      if (this.tab === 'base') return this.$store.state.language === 'ru' ? 'Поиск по стране, маршруту или классу авто' : 'Search by country, route, or vehicle class'
      if (this.tab === 'counterparty') return this.$store.state.language === 'ru' ? 'Поиск по клиенту, городу или маршруту' : 'Search by customer, city, or route'
      if (this.tab === 'driver') return this.$store.state.language === 'ru' ? 'Поиск по исполнителю, стране или городу' : 'Search by supplier, country, or city'
      if (this.tab === 'adjustments') return this.$store.state.language === 'ru' ? 'Поиск по водителю, клиенту или маршруту' : 'Search by driver, client, or route'
      return this.$store.state.language === 'ru' ? 'Поиск по проблеме, ID заказа или маршруту' : 'Search by issue, order ID, or route'
    },
    overviewCards () {
      const specialDeals = this.cpRows.filter((row) => row.isActive).length
      const driverWithEconomics = this.driverPriceRows.length
      const penalties = this.adjustmentTotals.adjustmentCount || 0
      const criticalRisks = this.conflictRows.filter((row) => String(row.severity || '').toLowerCase() === 'critical').length
      const warningRisks = this.conflictRows.filter((row) => String(row.severity || '').toLowerCase() === 'warning').length
      return [
        { key: 'base', value: this.baseRows.length, label: this.t.base, hint: this.t.baseHint, tone: 'neutral' },
        { key: 'counterparty', value: specialDeals, label: this.t.counterparty, hint: this.t.counterpartyHint, tone: specialDeals ? 'info' : 'neutral' },
        { key: 'driver', value: driverWithEconomics, label: this.t.driver, hint: this.t.driverHint, tone: driverWithEconomics ? 'ok' : 'neutral' },
        { key: 'conflicts', value: `${criticalRisks}/${warningRisks}`, label: this.t.conflicts, hint: `${this.t.criticalRisks}: ${criticalRisks} · ${this.t.warningRisks}: ${warningRisks}`, tone: criticalRisks ? 'critical' : (warningRisks ? 'warn' : 'neutral') },
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
    counterpartyOptions () {
      return Array.from(new Set(this.cpRows
        .filter((row) => row.isActive)
        .map((row) => row.customerCompany?.name || row.counterpartyName)
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
    },
    supplierOptions () {
      return Array.from(new Set(this.driverPriceRows
        .map((row) => row.supplierName || row.driverName)
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
    },
    counterpartyPricebookRows () {
      return this.cpRows
        .filter((row) => row.isActive)
        .map((row) => ({
          ...row,
          pricebookOwner: row.customerCompany?.name || row.counterpartyName,
          pricebookPrice: row.sellPrice
        }))
    },
    counterpartyComparisonColumns () {
      return this.selectedCounterparties.length ? this.selectedCounterparties : this.counterpartyOptions
    },
    counterpartyGridStyle () {
      const priceColumns = this.counterpartyComparisonColumns.map(() => 'minmax(120px, .65fr)').join(' ')
      return {
        gridTemplateColumns: `minmax(130px, .8fr) minmax(220px, 1.35fr) minmax(220px, 1.35fr) minmax(170px, 1fr) minmax(64px, .45fr) minmax(120px, .7fr) minmax(92px, .55fr) ${priceColumns}`.trim(),
        minWidth: `${1060 + (this.counterpartyComparisonColumns.length * 136)}px`
      }
    },
    counterpartyComparisonRows () {
      const rows = new Map()
      const ensure = (row = {}) => {
        const key = this.pricebookRouteKey(row)
        if (!rows.has(key)) {
          rows.set(key, {
            key,
            country: row.country || '',
            city: row.city || '',
            routeFrom: row.routeFrom || row.fromPoint || '',
            routeTo: row.routeTo || row.toPoint || '',
            vehicleType: row.vehicleType || '',
            riderraPrice: row.fixedPrice ?? null,
            currency: row.currency || 'EUR',
            counterpartyPrices: {}
          })
        }
        return rows.get(key)
      }

      this.baseRows.forEach((row) => {
        const item = ensure(row)
        item.country = row.country || item.country
        item.city = row.city || item.city
        item.routeFrom = row.routeFrom || item.routeFrom
        item.routeTo = row.routeTo || item.routeTo
        item.vehicleType = row.vehicleType || item.vehicleType
        item.riderraPrice = row.fixedPrice ?? item.riderraPrice
        item.currency = row.currency || item.currency
      })

      this.counterpartyPricebookRows.forEach((row) => {
        const owner = row.pricebookOwner
        if (!owner) return
        const item = ensure(row)
        if (!item.country) item.country = row.country || this.countryByPlace(row.city) || ''
        if (!item.city) item.city = row.city || ''
        if (!item.routeFrom) item.routeFrom = row.routeFrom || ''
        if (!item.routeTo) item.routeTo = row.routeTo || ''
        if (!item.vehicleType) item.vehicleType = row.vehicleType || ''
        if (!item.currency) item.currency = row.currency || 'EUR'
        if (!item.counterpartyPrices[owner]) {
          item.counterpartyPrices[owner] = {
            price: row.pricebookPrice,
            currency: row.currency || item.currency || 'EUR'
          }
        }
      })

      return Array.from(rows.values())
        .sort((a, b) => this.pricebookSortLabel(a).localeCompare(this.pricebookSortLabel(b)))
    },
    filteredCounterpartyComparisonRows () {
      const owners = this.selectedCounterparties
      const q = this.q.trim().toLowerCase()
      return this.counterpartyComparisonRows.filter((row) => {
        if (owners.length && !owners.some((owner) => row.counterpartyPrices[owner])) return false
        if (!q) return true
        return [
          this.sheetCountryLabel(row),
          this.sheetPlaceLabel(row.routeFrom, row),
          this.sheetPlaceLabel(row.routeTo, row),
          row.vehicleType,
          row.currency,
          ...Object.entries(row.counterpartyPrices).flatMap(([owner, price]) => [owner, price.price, price.currency])
        ].join(' ').toLowerCase().includes(q)
      })
    },
    visibleCounterpartyComparisonRows () {
      return this.filteredCounterpartyComparisonRows.slice(0, this.counterpartyVisibleLimit)
    },
    counterpartyHiddenRowsCount () {
      return Math.max(0, this.filteredCounterpartyComparisonRows.length - this.visibleCounterpartyComparisonRows.length)
    },
    filteredCounterpartyPricebookRows () {
      const owners = this.selectedCounterparties
      const q = this.q.trim().toLowerCase()
      return this.counterpartyPricebookRows.filter((row) => {
        if (owners.length && !owners.includes(row.pricebookOwner)) return false
        if (!q) return true
        return `${row.pricebookOwner || ''} ${row.city || ''} ${row.country || ''} ${row.routeFrom || ''} ${row.routeTo || ''} ${row.vehicleType || ''}`.toLowerCase().includes(q)
      })
    },
    filteredDriverRows () {
      const owners = this.selectedSuppliers
      const q = this.q.trim().toLowerCase()
      return this.driverPriceRows.filter((row) => {
        const rowOwner = row.supplierName || row.driverName
        if (owners.length && !owners.includes(rowOwner)) return false
        if (!q) return true
        return `${rowOwner || ''} ${row.country || ''} ${row.city || ''} ${row.fromPoint || ''} ${row.toPoint || ''} ${row.vehicleType || ''} ${row.sourceLabel || ''}`.toLowerCase().includes(q)
      })
    },
    supplierComparisonColumns () {
      return this.selectedSuppliers.length ? this.selectedSuppliers : this.supplierOptions
    },
    supplierGridStyle () {
      const priceColumns = this.supplierComparisonColumns.map(() => 'minmax(120px, .65fr)').join(' ')
      return {
        gridTemplateColumns: `minmax(130px, .8fr) minmax(220px, 1.35fr) minmax(220px, 1.35fr) minmax(170px, 1fr) minmax(64px, .45fr) minmax(120px, .7fr) minmax(92px, .55fr) ${priceColumns}`.trim(),
        minWidth: `${1060 + (this.supplierComparisonColumns.length * 136)}px`
      }
    },
    supplierComparisonRows () {
      const rows = new Map()
      const ensure = (row = {}) => {
        const key = this.pricebookRouteKey(row)
        if (!rows.has(key)) {
          rows.set(key, {
            key,
            country: row.country || '',
            city: row.city || '',
            routeFrom: row.routeFrom || row.fromPoint || '',
            routeTo: row.routeTo || row.toPoint || '',
            vehicleType: row.vehicleType || '',
            riderraPrice: row.fixedPrice ?? null,
            currency: row.currency || 'EUR',
            supplierPrices: {}
          })
        }
        return rows.get(key)
      }

      this.baseRows.forEach((row) => {
        const item = ensure(row)
        item.country = row.country || item.country
        item.city = row.city || item.city
        item.routeFrom = row.routeFrom || item.routeFrom
        item.routeTo = row.routeTo || item.routeTo
        item.vehicleType = row.vehicleType || item.vehicleType
        item.riderraPrice = row.fixedPrice ?? item.riderraPrice
        item.currency = row.currency || item.currency
      })

      this.driverPriceRows.forEach((row) => {
        const owner = row.supplierName || row.driverName
        if (!owner) return
        const item = ensure(row)
        if (!item.country) item.country = row.country || this.countryByPlace(row.city) || ''
        if (!item.city) item.city = row.city || ''
        if (!item.routeFrom) item.routeFrom = row.routeFrom || row.fromPoint || ''
        if (!item.routeTo) item.routeTo = row.routeTo || row.toPoint || ''
        if (!item.vehicleType) item.vehicleType = row.vehicleType || ''
        if (!item.currency) item.currency = row.currency || 'EUR'
        if (!item.supplierPrices[owner]) {
          item.supplierPrices[owner] = {
            price: row.driverPrice,
            currency: row.currency || item.currency || 'EUR'
          }
        }
      })

      return Array.from(rows.values())
        .sort((a, b) => this.pricebookSortLabel(a).localeCompare(this.pricebookSortLabel(b)))
    },
    filteredSupplierComparisonRows () {
      const owners = this.selectedSuppliers
      const q = this.q.trim().toLowerCase()
      return this.supplierComparisonRows.filter((row) => {
        if (owners.length && !owners.some((owner) => row.supplierPrices[owner])) return false
        if (!q) return true
        return [
          this.sheetCountryLabel(row),
          this.sheetPlaceLabel(row.routeFrom, row),
          this.sheetPlaceLabel(row.routeTo, row),
          row.vehicleType,
          row.currency,
          ...Object.entries(row.supplierPrices).flatMap(([owner, price]) => [owner, price.price, price.currency])
        ].join(' ').toLowerCase().includes(q)
      })
    },
    visibleSupplierComparisonRows () {
      return this.filteredSupplierComparisonRows.slice(0, this.supplierVisibleLimit)
    },
    supplierHiddenRowsCount () {
      return Math.max(0, this.filteredSupplierComparisonRows.length - this.visibleSupplierComparisonRows.length)
    },
    driverPriceRows () {
      return this.driverRows.flatMap((driver) => {
        const coverage = [driver.country, driver.city].filter(Boolean).join(' · ')
        return (driver.routes || []).map((route) => ({
          ...route,
          driverName: driver.name,
          country: driver.country,
          city: driver.city,
          coverage,
          supplierName: driver.supplierCompany?.name || driver.supplierContact?.fullName || ''
        }))
      })
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
    priceLabel (value, currency = '') {
      if (value === null || value === undefined || value === '') return '-'
      return `${value}${currency ? ` ${currency}` : ''}`
    },
    priceAmountLabel (value) {
      if (value === null || value === undefined || value === '') return '-'
      return Number.isFinite(Number(value)) ? Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : String(value)
    },
    counterpartyPriceLabel (row, owner) {
      const price = row.counterpartyPrices?.[owner]
      if (!price || price.price === null || price.price === undefined || price.price === '') return '-'
      return this.priceLabel(this.priceAmountLabel(price.price), price.currency || row.currency || '')
    },
    supplierPriceLabel (row, owner) {
      const price = row.supplierPrices?.[owner]
      if (!price || price.price === null || price.price === undefined || price.price === '') return '-'
      return this.priceLabel(this.priceAmountLabel(price.price), price.currency || row.currency || '')
    },
    pricebookSortLabel (row = {}) {
      return [
        this.sheetCountryLabel(row),
        this.sheetPlaceLabel(row.routeFrom, row),
        this.sheetPlaceLabel(row.routeTo, row),
        row.vehicleType || ''
      ].join(' ')
    },
    pricebookRouteKey (row = {}) {
      return [
        this.normalizePricebookPart(this.sheetCountryLabel(row)),
        this.normalizePricebookPart(this.sheetPlaceLabel(row.routeFrom || row.fromPoint, row)),
        this.normalizePricebookPart(this.sheetPlaceLabel(row.routeTo || row.toPoint, row)),
        this.normalizePricebookPart(row.vehicleType || '')
      ].join('|')
    },
    normalizePricebookPart (value = '') {
      return String(value || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    },
    sheetCountryLabel (row) {
      return row.country || this.countryByPlace(row.city) || this.countryByPlace(row.routeFrom || row.fromPoint) || this.countryByPlace(row.routeTo || row.toPoint) || row.city || '-'
    },
    sheetPlaceLabel (value = '', row = {}) {
      const place = String(value || '').trim()
      if (!place) return '-'
      const airport = this.airportLabel(place)
      if (airport) return airport
      const zone = this.londonZoneLabel(place, row)
      return zone || place
    },
    countryByPlace (value = '') {
      const airport = this.airportByCode(value)
      if (airport) return airport.country
      const text = String(value || '').toLowerCase()
      const placeCountries = [
        { pattern: 'vancouver', country: 'Canada' },
        { pattern: 'toronto', country: 'Canada' },
        { pattern: 'london', country: 'United Kingdom' }
      ]
      return placeCountries.find((item) => text.includes(item.pattern))?.country || ''
    },
    airportLabel (value = '') {
      const airport = this.airportByCode(value)
      if (!airport) return ''
      const airportName = airport.name.toLowerCase() === airport.city.toLowerCase() ? '' : ` ${airport.name}`
      const airportWord = airport.code === 'LCY' ? 'Airport' : 'airport'
      return `${airport.city}${airportName} ${airportWord} (${airport.code})`
    },
    airportByCode (value = '') {
      const text = String(value || '').trim().toUpperCase()
      const code = text.match(/^[A-Z]{3}$/)?.[0] || text.match(/\(([A-Z]{3})\)/)?.[1] || ''
      const airports = {
        AMS: { city: 'Amsterdam', name: 'Schiphol', country: 'Netherlands' },
        BCN: { city: 'Barcelona', name: 'El Prat', country: 'Spain' },
        BER: { city: 'Berlin', name: 'Brandenburg', country: 'Germany' },
        CDG: { city: 'Paris', name: 'Charles de Gaulle', country: 'France' },
        DME: { city: 'Moscow', name: 'Domodedovo', country: 'Russia' },
        HEL: { city: 'Helsinki', name: 'Vantaa', country: 'Finland' },
        IST: { city: 'Istanbul', name: 'Istanbul', country: 'Turkey' },
        LCY: { city: 'London', name: 'City', country: 'United Kingdom' },
        LGW: { city: 'London', name: 'Gatwick', country: 'United Kingdom' },
        LHR: { city: 'London', name: 'Heathrow', country: 'United Kingdom' },
        LTN: { city: 'London', name: 'Luton', country: 'United Kingdom' },
        MAN: { city: 'Manchester', name: 'Manchester', country: 'United Kingdom' },
        ORY: { city: 'Paris', name: 'Orly', country: 'France' },
        STN: { city: 'London', name: 'Stansted', country: 'United Kingdom' },
        SVO: { city: 'Moscow', name: 'Sheremetyevo', country: 'Russia' },
        VKO: { city: 'Moscow', name: 'Vnukovo', country: 'Russia' },
        YVR: { city: 'Vancouver', name: 'International', country: 'Canada' },
        ZIA: { city: 'Moscow', name: 'Zhukovsky', country: 'Russia' }
      }
      return airports[code] ? { ...airports[code], code } : null
    },
    londonZoneLabel (value = '', row = {}) {
      const zone = String(value || '').trim().toUpperCase()
      const city = String(row.city || row.country || '').toLowerCase()
      const londonZones = ['N', 'E', 'EC', 'SE', 'SW', 'W', 'WC', 'NW']
      if (!londonZones.includes(zone)) return ''
      if (city && !city.includes('london')) return ''
      return `London ${zone}`
    },
    paxLabel (vehicleType = '') {
      const text = String(vehicleType || '')
      const explicit = text.match(/(\d+)\s*(?:pax|pass|passenger|seat|мест|p)/i)
      if (explicit) return explicit[1]
      const anyNumber = text.match(/\b(\d{1,2})\b/)
      if (anyNumber) return anyNumber[1]
      if (/mpv/i.test(text)) return '5'
      if (/class\s+car|sedan|business|first/i.test(text)) return '3'
      return '-'
    },
    toggleCounterparty (name) {
      this.selectedCounterparties = this.selectedCounterparties.includes(name)
        ? this.selectedCounterparties.filter((item) => item !== name)
        : [...this.selectedCounterparties, name]
    },
    clearCounterparties () {
      this.selectedCounterparties = []
    },
    resetCounterpartyVisibleLimit () {
      this.counterpartyVisibleLimit = 250
    },
    showMoreCounterpartyRows () {
      this.counterpartyVisibleLimit += 250
    },
    toggleSupplier (name) {
      this.selectedSuppliers = this.selectedSuppliers.includes(name)
        ? this.selectedSuppliers.filter((item) => item !== name)
        : [...this.selectedSuppliers, name]
    },
    clearSuppliers () {
      this.selectedSuppliers = []
    },
    resetSupplierVisibleLimit () {
      this.supplierVisibleLimit = 250
    },
    showMoreSupplierRows () {
      this.supplierVisibleLimit += 250
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
    conflictSignalCopy (row) {
      const severity = String(row.severity || '').toLowerCase()
      if (String(row.issueType || '') === 'driver_gt_sell') {
        return this.$store.state.language === 'ru'
          ? 'Себестоимость уже выше продажной цены. Нужно менять продажу, исполнителя или согласованные условия.'
          : 'Supplier cost is already above the sell price. Change the sell price, supplier, or agreed terms.'
      }
      if (severity === 'high' || severity === 'critical') {
        return this.$store.state.language === 'ru'
          ? 'Маржа уже опасно низкая или отрицательная. Это нужно разбирать в первую очередь.'
          : 'Margin is already dangerously low or negative. This should be handled first.'
      }
      return this.$store.state.language === 'ru'
        ? 'Есть расхождение, но оно не выглядит критичным. Всё равно нужно проверить правило, цену водителя и продажи.'
        : 'There is a mismatch, but it does not look critical yet. Still worth checking the rule, supplier cost, and sell price.'
    },
    conflictIssueLabel (row) {
      if (row.issueType === 'driver_gt_sell') return this.t.issueDriverGtSell
      if (row.issueType === 'low_margin') return this.t.issueLowMargin
      return row.issueType || '-'
    },
    conflictSeverityLabel (row) {
      const severity = String(row.severity || '').toLowerCase()
      if (severity === 'critical') return this.t.severityCritical
      if (severity === 'warning') return this.t.severityWarning
      return row.severity || '-'
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
        this.fetchJson('/api/admin/pricing/counterparty-rules?active=true&limit=5000'),
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

.actions {
  margin-top: 20px;
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

.pricebook-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.filter-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
}

.filter-chip {
  border: 1px solid #d8e0ef;
  border-radius: 999px;
  padding: 8px 12px;
  background: #fff;
  color: #1f3b70;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.filter-chip--active {
  border-color: #1f4fff;
  background: #eef4ff;
  color: #173fb4;
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

.pricing-list--sheet {
  overflow-x: auto;
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

.pricing-list__more {
  padding: 14px 16px;
  border-top: 1px solid #eef2f7;
  background: #fbfcff;
}

.pricing-list__head--sheet,
.pricing-row--sheet {
  grid-template-columns:
    minmax(130px, .8fr)
    minmax(220px, 1.35fr)
    minmax(220px, 1.35fr)
    minmax(170px, 1fr)
    minmax(64px, .45fr)
    minmax(100px, .6fr)
    minmax(92px, .55fr);
  min-width: 1060px;
}

.pricing-list__head--base,
.pricing-row--base,
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

.row-actions--inline {
  margin-top: 8px;
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
  box-sizing: border-box;
  min-height: 48px;
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
  width: min(820px, 95vw);
  max-height: min(92vh, 720px);
  overflow: auto;
  background: #ffffff;
  border-radius: 16px;
  padding: 22px 24px;
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
  column-gap: 18px;
  row-gap: 20px;
  margin-top: 20px;
}

.pricing-field {
  display: grid;
  grid-template-rows: auto 52px;
  gap: 6px;
  min-width: 0;
}

.pricing-field__label {
  display: block;
  color: #17233d;
  font-size: 14px;
  font-weight: 700;
  line-height: 18px;
  margin: 0;
  padding: 0;
}

.pricing-field__input {
  min-height: 52px;
  height: 52px;
  padding: 0 14px;
  font-size: 16px;
  line-height: 52px;
}

.modal-actions {
  margin-top: 24px;
  align-items: center;
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
