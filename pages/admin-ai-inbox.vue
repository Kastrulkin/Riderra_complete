<template>
  <div>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf ai-section">
      <div class="container">
        <admin-tabs />

        <div class="section-actions">
          <button class="btn btn--primary" @click="load">Обновить</button>
          <button class="btn btn--ghost" :disabled="cleanupSaving" @click="cleanupSmokeDrafts">
            {{ cleanupSaving ? 'Убираю...' : 'Убрать тестовые' }}
          </button>
          <button class="btn btn--ghost" :disabled="bulkDeleting || !selectedDraftIds.length" @click="deleteSelectedDrafts">
            {{ bulkDeleting ? 'Убираю...' : `Убрать выбранные (${selectedDraftIds.length})` }}
          </button>
        </div>

        <div class="ops-rail">
          <div>
            <strong>Заказы из почты</strong>
            <p class="hint">Проверьте письмо и скопируйте подготовленную строку в Google Sheet. Таблица остаётся источником истины.</p>
          </div>
        </div>

        <details class="manual-import">
          <summary class="manual-import__summary">Добавить письмо вручную</summary>
          <div class="manual-import__body">
            <div class="manual-import__grid">
              <input v-model="manualEmail.fromEmail" class="input" placeholder="От кого (email, необязательно)" />
              <input v-model="manualEmail.subject" class="input" placeholder="Тема письма (необязательно)" />
            </div>
            <textarea
              v-model="manualEmail.rawText"
              class="input manual-import__text"
              placeholder="Вставьте текст письма или сырой заказ. AI Inbox создаст подготовленный черновик, проверит обязательные поля, адреса и цену."
            ></textarea>
            <div class="manual-import__actions">
              <button class="btn btn--small btn--primary" :disabled="manualSaving || manualEmail.rawText.trim().length < 10" @click="createManualEmailDraft">
                {{ manualSaving ? 'Создаю черновик...' : 'Создать AI-черновик' }}
              </button>
              <span v-if="manualResult" class="hint">{{ manualResult }}</span>
            </div>
          </div>
        </details>

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
          <div class="overview-card">
            <span class="overview-card__label">Проверяются</span>
            <strong>{{ processingCount }}</strong>
          </div>
          <div class="overview-card">
            <span class="overview-card__label">Ошибки проверки</span>
            <strong>{{ failedCheckCount }}</strong>
          </div>
        </div>

        <div class="toolbar">
          <select v-model="queueState" class="input" @change="load">
            <option value="work">Рабочая очередь</option>
            <option value="quarantine">Карантин</option>
            <option value="">Все письма</option>
          </select>
          <select v-model="status" class="input" @change="load">
            <option value="pending">Pending</option>
            <option value="">All statuses</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <div class="period-buttons" role="group" aria-label="Период поездки">
            <button class="btn btn--small" :class="{ 'btn--primary': period === 'future' }" type="button" @click="setPeriod('future')">Будущие</button>
            <button class="btn btn--small" :class="{ 'btn--primary': period === 'week' }" type="button" @click="setPeriod('week')">7 дней</button>
            <button class="btn btn--small" :class="{ 'btn--primary': period === 'month' }" type="button" @click="setPeriod('month')">30 дней</button>
          </div>
          <input v-model="fromPickup" class="input input--date" type="date" aria-label="Дата поездки от" @change="applyCustomPeriod" />
          <input v-model="toPickup" class="input input--date" type="date" aria-label="Дата поездки до" @change="applyCustomPeriod" />
          <button class="btn btn--small btn--ghost" type="button" @click="resetPeriod">Сбросить</button>
        </div>
        <div v-if="selectedDraftIds.length" class="bulk-panel">
          <div>
            <strong>Выбрано: {{ selectedDraftIds.length }}</strong>
            <span class="hint">Групповая обработка применится только к pending-черновикам на текущем экране.</span>
          </div>
          <div class="bulk-panel__actions">
            <button class="btn btn--small btn--ghost" type="button" :disabled="bulkDeleting" @click="clearSelectedDrafts">Снять выбор</button>
            <button class="btn btn--small btn--primary" type="button" :disabled="bulkDeleting" @click="deleteSelectedDrafts">
              {{ bulkDeleting ? 'Убираю...' : 'Убрать выбранные' }}
            </button>
          </div>
        </div>
        <div v-if="actionResult && !draft" class="hint result-block page-result">{{ actionResult }}</div>

        <div class="table-wrap">
          <div class="table-head">
            <div>
              <input
                type="checkbox"
                :checked="allVisibleSelected"
                :disabled="!selectableRows.length"
                aria-label="Выбрать все видимые черновики"
                @change="toggleAllVisible"
              />
              <span class="sr-only">Выбор</span>
            </div>
            <div>Контрагент</div>
            <div>Номер заказа</div>
            <div>Дата</div>
            <div>Откуда</div>
            <div>Куда</div>
            <div>Сумма</div>
            <div>Водители</div>
            <div>Комментарий</div>
            <div>Внутренний номер заказа</div>
            <div>Проверки</div>
            <div>Действия</div>
          </div>
          <div v-for="row in rows" :key="row.id" class="table-row">
            <div>
              <input
                v-model="selectedDraftIds"
                type="checkbox"
                :value="row.id"
                :disabled="row.status !== 'pending'"
                :aria-label="`Выбрать черновик ${row.id}`"
              />
            </div>
            <div>
              <div class="row-title">{{ sheetField(row, 'contractor') }}</div>
              <span v-if="rowEventNotice(row)" class="event-badge" :class="rowEventNotice(row).className">
                <span class="event-badge__icon">!</span>
                {{ rowEventNotice(row).label }}
              </span>
              <div class="row-hint">{{ sourceLabel(row) }}</div>
            </div>
            <div>
              <div class="row-title">{{ sheetField(row, 'orderNumber') || orderTitle(row) }}</div>
            </div>
            <div>
              <div class="row-title">{{ sheetField(row, 'date') || formatPickup(row) }}</div>
              <div class="row-hint">Создан: {{ formatDate(row.createdAt) }}</div>
            </div>
            <div>
              <div class="row-title row-title--address">{{ sheetField(row, 'fromPoint') || routePoint(row, 'fromPoint') }}</div>
              <span v-if="rowAddressPointBadge(row, 'fromPoint')" class="check-badge" :class="rowAddressPointBadge(row, 'fromPoint').className">
                <span v-if="rowAddressPointBadge(row, 'fromPoint').icon" class="check-badge__icon">!</span>
                {{ rowAddressPointBadge(row, 'fromPoint').label }}
              </span>
            </div>
            <div>
              <div class="row-title row-title--address">{{ sheetField(row, 'toPoint') || routePoint(row, 'toPoint') }}</div>
              <span v-if="rowAddressPointBadge(row, 'toPoint')" class="check-badge" :class="rowAddressPointBadge(row, 'toPoint').className">
                <span v-if="rowAddressPointBadge(row, 'toPoint').icon" class="check-badge__icon">!</span>
                {{ rowAddressPointBadge(row, 'toPoint').label }}
              </span>
            </div>
            <div>
              <div class="row-title">{{ sheetField(row, 'sum') || summarize(row).price }}</div>
              <span v-if="rowPriceBadge(row)" class="check-badge" :class="rowPriceBadge(row).className">
                <span v-if="rowPriceBadge(row).icon" class="check-badge__icon">!</span>
                {{ rowPriceBadge(row).label }}
              </span>
            </div>
            <div>
              <div class="row-title">{{ sheetField(row, 'driver') || '-' }}</div>
            </div>
            <div>
              <div class="row-title row-title--comment">{{ sheetField(row, 'comment') || '-' }}</div>
            </div>
            <div>
              <div class="row-title">{{ sheetField(row, 'internalOrderNumber') || '-' }}</div>
            </div>
            <div>
              <span class="status-pill" :class="`status-pill--${row.status}`">{{ row.status }}</span>
              <div class="row-hint">{{ draftStateLabel(row) }}</div>
              <div v-if="rowAddressBadge(row)" class="row-hint">
                <span class="address-badge" :class="rowAddressBadge(row).className">
                  <span v-if="rowAddressBadge(row).icon" class="address-badge__icon">!</span>
                  {{ rowAddressBadge(row).label }}
                </span>
              </div>
            </div>
            <div class="row-actions">
              <button class="btn btn--small btn--primary" :disabled="isEmailChecking(row) || retryingDraftId === row.id" @click="handleDraftAction(row)">{{ draftActionLabel(row) }}</button>
              <button class="btn btn--small btn--ghost" type="button" :disabled="isEmailChecking(row)" @click="copyDraftRow(row)">Скопировать</button>
              <button class="btn btn--small btn--ghost" type="button" @click="hideDraft(row)">Убрать</button>
            </div>
          </div>
          <div v-if="!rows.length" class="empty">Пока пусто</div>
        </div>
      </div>
    </section>

    <div v-if="draftLoading" class="modal-overlay">
      <div class="modal-card modal-card--loading" role="status" aria-live="polite">
        <strong>Открываем письмо…</strong>
        <span class="hint">Загружаем данные выбранного заказа.</span>
      </div>
    </div>

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
          Помощник Riderra показывает найденную информацию и источник. Финальное действие выполняется только после подтверждения сотрудника.
        </div>

        <div v-if="eventNotice" class="event-alert" :class="eventNotice.className">
          <div class="event-alert__icon">!</div>
          <div>
            <strong>{{ eventNotice.title }}</strong>
            <p>{{ eventNotice.description }}</p>
          </div>
        </div>

        <div class="focus-card">
          <div class="focus-card__head">
            <div>
              <h4>{{ orderDraft.counterpartyName || 'Черновик без контрагента' }}</h4>
              <div class="hint">{{ [orderDraft.city, orderDraft.pickupAt ? formatDate(orderDraft.pickupAt) : ''].filter(Boolean).join(' · ') || 'Дата и город пока не определены' }}</div>
            </div>
            <span class="status-pill" :class="`status-pill--${draft.status}`">{{ draft.status }}</span>
          </div>
          <p class="focus-card__summary">{{ focusSummary }}</p>
          <div class="focus-meta">
            <span class="pill">{{ orderDraft.flightNumber ? `Рейс: ${orderDraft.flightNumber}` : 'Рейс не найден' }}</span>
            <span class="pill">{{ formatMoney(pricing.authoritativeClientPrice != null ? pricing.authoritativeClientPrice : orderDraft.clientPrice, pricing.authoritativeCurrency || orderDraft.currency) }}</span>
            <span class="pill">{{ orderDraft.vehicleType || 'Класс не определён' }}</span>
            <span v-if="addressSummaryBadge" class="address-badge" :class="addressSummaryBadge.className">
              <span v-if="addressSummaryBadge.icon" class="address-badge__icon">!</span>
              {{ addressSummaryBadge.label }}
            </span>
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
              @click="copyCurrentDraftRow"
            >
              Скопировать строку
            </button>
            <button
              class="btn btn--small btn--ghost"
              type="button"
              :disabled="refreshingChecks"
              @click="refreshChecks"
            >
              {{ refreshingChecks ? 'Проверяю...' : 'Проверить адреса и цену' }}
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
            <div><strong>Контрагент:</strong> {{ orderDraft.counterpartyName || '-' }}</div>
            <div><strong>Пассажир:</strong> {{ orderDraft.customerName || '-' }}</div>
            <div><strong>Номер:</strong> {{ orderDraft.orderNumber || '-' }}</div>
            <div><strong>Город:</strong> {{ orderDraft.city || '-' }}</div>
            <div><strong>Дата/время:</strong> {{ formatDate(orderDraft.pickupAt) }}</div>
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

        <details class="section-card" v-if="addressStatusRows.length" open>
          <summary class="section-summary">Проверка адресов</summary>
          <div class="address-checks">
            <div
              v-for="row in addressStatusRows"
              :key="row.key"
              class="address-check"
              :class="row.ok ? 'address-check--ok' : 'address-check--danger'"
            >
              <div class="address-check__status">
                <span v-if="!row.ok" class="address-check__icon">!</span>
                <span>{{ row.statusLabel }}</span>
              </div>
              <div class="address-check__body">
                <div><strong>{{ row.label }}:</strong> {{ row.source || '-' }}</div>
                <div class="hint"><strong>Искали:</strong> {{ row.query || row.source || '-' }}</div>
                <div class="hint">{{ row.matchLabel }}</div>
                <div v-if="row.coordinates" class="hint">{{ row.coordinates }}</div>
                <div v-if="row.geoZoneLabel" class="hint"><strong>Геозона:</strong> {{ row.geoZoneLabel }}</div>
              </div>
            </div>
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
          <div class="price-check">
            <span v-if="priceBadge" class="check-badge" :class="priceBadge.className">
              <span v-if="priceBadge.icon" class="check-badge__icon">!</span>
              {{ priceBadge.label }}
            </span>
            <div class="meta-grid">
              <div><strong>Цена из письма:</strong> {{ formatMoney(orderDraft.clientPrice, orderDraft.currency) }}</div>
              <div><strong>Цена Riderra:</strong> {{ formatMoney(pricing.authoritativeClientPrice, pricing.authoritativeCurrency || orderDraft.currency) }}</div>
              <div><strong>Источник цены:</strong> {{ pricingSourceLabel(pricing) }}</div>
              <div v-if="pricingMatchLabel"><strong>Матчинг:</strong> {{ pricingMatchLabel }}</div>
              <div><strong>Rule ID:</strong> {{ pricing.pricingRuleId || '-' }}</div>
              <div v-if="pricing.supplierCost"><strong>Закупка:</strong> {{ supplierCostLabel(pricing.supplierCost) }}</div>
              <div><strong>Расхождение:</strong> {{ pricing.conflict ? 'Да' : 'Нет' }}</div>
            </div>
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
          <div class="section-tools">
            <button class="btn btn--small btn--ghost" type="button" @click="copyCurrentDraftRow">Скопировать строку для таблицы</button>
          </div>
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
        <div v-if="copyNotice" class="hint result-block">{{ copyNotice }}</div>
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
    queueState: 'work',
    status: 'pending',
    period: 'future',
    fromPickup: '',
    toPickup: '',
    selectedDraftIds: [],
    rows: [],
    draft: null,
    draftLoading: false,
    draftLoadError: '',
    reviewComment: '',
    actionResult: '',
    copyNotice: '',
    saving: false,
    flightChecking: false,
    refreshingChecks: false,
    flightCheckError: '',
    manualSaving: false,
    retryingDraftId: '',
    refreshTimer: null,
    cleanupSaving: false,
    bulkDeleting: false,
    manualResult: '',
    manualEmail: {
      fromEmail: '',
      subject: '',
      rawText: ''
    }
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
    addressVerification () {
      return this.payload.addressVerification || null
    },
    geoZones () {
      return this.payload.geoZones || null
    },
    pricingMatchLabel () {
      return this.pricingMatchLabelFromPricing(this.pricing)
    },
    addressStatusRows () {
      return this.buildAddressStatusRows(this.payload)
    },
    addressSummaryBadge () {
      return this.addressBadgeFromRows(this.addressStatusRows)
    },
    priceBadge () {
      return this.priceBadgeFromPayload(this.payload)
    },
    eventNotice () {
      return this.eventNoticeFromPayload(this.payload)
    },
    pendingCount () {
      return this.rows.filter((row) => row.status === 'pending' && !this.isEmailChecking(row) && row.queueState !== 'check_failed').length
    },
    processingCount () {
      return this.rows.filter((row) => this.isEmailChecking(row)).length
    },
    failedCheckCount () {
      return this.rows.filter((row) => row.queueState === 'check_failed').length
    },
    needsReviewCount () {
      return this.rows.filter((row) => {
        if (this.isEmailChecking(row) || row.queueState === 'check_failed') return false
        const payload = this.parsePayload(row.payloadJson)
        return (Array.isArray(payload.missingFields) && payload.missingFields.length) || String(payload.infoReason || '').trim()
      }).length
    },
    readyCount () {
      return this.rows.filter((row) => {
        if (this.isEmailChecking(row) || row.queueState === 'check_failed') return false
        const payload = this.parsePayload(row.payloadJson)
        return row.status === 'pending' && !(Array.isArray(payload.missingFields) && payload.missingFields.length) && !String(payload.infoReason || '').trim()
      }).length
    },
    selectableRows () {
      return this.rows.filter((row) => row.status === 'pending' && !this.isEmailChecking(row) && row.queueState !== 'check_failed')
    },
    allVisibleSelected () {
      return this.selectableRows.length > 0 && this.selectableRows.every((row) => this.selectedDraftIds.includes(row.id))
    },
    focusSummary () {
      if (this.eventNotice) return this.eventNotice.description
      if (this.payload.infoReason) return `Нужно уточнить: ${this.payload.infoReason}`
      if (this.missingFields.length) return `Перед подтверждением нужно проверить: ${this.missingFields.join(', ')}`
      if (this.pricing.conflict) return 'Найдено расхождение по цене, лучше проверить перед созданием заказа.'
      return 'Черновик выглядит целостным. Можно подготовить строку для Google Sheet.'
    },
    primaryDraftAction () {
      const eventType = this.eventTypeFromPayload(this.payload)
      if (eventType === 'cancel') return 'Разобрать отмену'
      if (eventType === 'change') return 'Разобрать изменение'
      if (this.payload.infoReason || this.missingFields.length || this.pricing.conflict) return 'Проверить и подготовить строку'
      return 'Подготовить строку для таблицы'
    }
  },
  async mounted () {
    const draftId = String(this.$route.query.draftId || '').trim()
    if (draftId) {
      await this.openDraft(draftId)
      this.load().catch(() => {})
      return
    }
    await this.load()
  },
  beforeDestroy () {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
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
      const riderraPrice = Number(pricing.authoritativeClientPrice)
      const emailPrice = Number(orderDraft.clientPrice)
      const price = riderraPrice > 0 ? riderraPrice : emailPrice > 0 ? emailPrice : null
      return {
        customer: orderDraft.counterpartyName || '-',
        route: [orderDraft.fromPoint, orderDraft.toPoint].filter(Boolean).join(' -> ') || '-',
        price: this.formatMoney(price, pricing.authoritativeCurrency || orderDraft.currency)
      }
    },
    orderTitle (row) {
      const payload = this.parsePayload(row.payloadJson)
      const orderDraft = payload.orderDraft || {}
      return orderDraft.orderNumber || orderDraft.externalMessageId || 'Черновик заказа'
    },
    sheetField (row, key) {
      const payload = this.parsePayload(row.payloadJson)
      const sheetRow = this.sheetRowFromPayload(payload)
      return sheetRow[key] || ''
    },
    routePoint (row, key) {
      const payload = this.parsePayload(row.payloadJson)
      const orderDraft = payload.orderDraft || {}
      return orderDraft[key] || '-'
    },
    eventTypeFromPayload (payload = {}) {
      const orderDraft = payload.orderDraft || {}
      const direct = String(payload.eventType || orderDraft.eventType || payload.event_type || orderDraft.event_type || '').trim().toLowerCase()
      if (['cancel', 'change', 'new'].includes(direct)) return direct
      const haystack = [
        payload.rawText,
        orderDraft.rawText,
        orderDraft.comment,
        payload.infoReason
      ].filter(Boolean).join('\n').toLowerCase()
      if (/(cancelled|canceled|cancellation|cancel\b|отмен[аеуы]|аннулир|снят[ао]?)/i.test(haystack)) return 'cancel'
      if (/(changed|change|updated|update|modified|amended|измен|обнов|коррект|поменя)/i.test(haystack)) return 'change'
      return 'new'
    },
    eventNoticeFromPayload (payload = {}) {
      const orderDraft = payload.orderDraft || {}
      const eventType = this.eventTypeFromPayload(payload)
      const rawText = String(payload.rawText || orderDraft.rawText || orderDraft.comment || '')
      if (eventType === 'cancel') {
        const paid = /(cancelled with cost|still get paid|оплат|будет оплачен|будет оплачена)/i.test(rawText)
        return {
          className: 'event-alert--cancel',
          rowClassName: 'event-badge--cancel',
          label: paid ? 'Отмена с оплатой' : 'Отмена',
          title: paid ? 'Это отмена с оплатой' : 'Это отмена заказа',
          description: paid
            ? 'Письмо сообщает об отмене поездки, но контрагент пишет, что она будет оплачена. Проверьте существующий заказ и отметьте отмену, не создавая новый обычный заказ.'
            : 'Письмо сообщает об отмене поездки. Проверьте существующий заказ и обработайте отмену, не создавая новый обычный заказ.'
        }
      }
      if (eventType === 'change') {
        return {
          className: 'event-alert--change',
          rowClassName: 'event-badge--change',
          label: 'Изменение',
          title: 'Это изменение заказа',
          description: 'Письмо сообщает об изменении существующей поездки. Сверьте номер заказа и изменившиеся поля перед переносом в базу.'
        }
      }
      return null
    },
    rowEventNotice (row) {
      const payload = this.parsePayload(row.payloadJson)
      const notice = this.eventNoticeFromPayload(payload)
      if (!notice) return null
      return {
        className: notice.rowClassName,
        label: notice.label
      }
    },
    serviceLabel (row) {
      const payload = this.parsePayload(row.payloadJson)
      const orderDraft = payload.orderDraft || {}
      const parts = [
        orderDraft.vehicleType ? `Класс: ${orderDraft.vehicleType}` : '',
        orderDraft.flightNumber ? `Рейс: ${orderDraft.flightNumber}` : '',
        orderDraft.passengers != null ? `PAX: ${orderDraft.passengers}` : '',
        orderDraft.luggage != null ? `Багаж: ${orderDraft.luggage}` : ''
      ].filter(Boolean)
      return parts.join(' · ') || 'Служебные поля не заполнены'
    },
    sheetRowFromPayload (payload = {}) {
      const orderDraft = payload.orderDraft || {}
      const pricing = payload.pricing || {}
      const preview = payload.sheetRowPreview || {}
      const riderraPrice = Number(pricing.authoritativeClientPrice)
      const emailPrice = Number(orderDraft.clientPrice)
      const price = riderraPrice > 0 ? riderraPrice : emailPrice > 0 ? emailPrice : null
      const currency = pricing.authoritativeCurrency || orderDraft.currency || 'EUR'
      return {
        contractor: preview.contractor || orderDraft.counterpartyName || '',
        orderNumber: preview.orderNumber || orderDraft.orderNumber || '',
        date: preview.date || (orderDraft.pickupAt ? String(orderDraft.pickupAt).replace('T', ' ').slice(0, 16) : ''),
        fromPoint: preview.fromPoint || orderDraft.fromPoint || '',
        toPoint: preview.toPoint || orderDraft.toPoint || '',
        sum: this.normalizedPreviewSum(preview.sum) || (Number.isFinite(Number(price)) && Number(price) > 0 ? `${Number(price).toFixed(2)} ${currency}` : ''),
        driver: preview.driver || '',
        internalOrderNumber: preview.internalOrderNumber || orderDraft.internalOrderNumber || '',
        comment: preview.comment || orderDraft.comment || ''
      }
    },
    normalizedPreviewSum (value) {
      const raw = String(value || '').trim()
      if (!raw) return ''
      const amount = Number(raw.replace(',', '.').match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.'))
      if (Number.isFinite(amount) && amount <= 0) return ''
      return raw
    },
    sheetRowToTsv (row = {}) {
      const values = [
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
      return values.map((value) => String(value || '').replace(/\r?\n/g, ' ').replace(/\t/g, ' ').trim()).join('\t')
    },
    async copyText (text) {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return
      }
      if (typeof document === 'undefined') throw new Error('Clipboard is not available')
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    },
    async copyDraftRow (row) {
      try {
        const payload = this.parsePayload(row.payloadJson)
        const sheetRow = this.sheetRowFromPayload(payload)
        await this.copyText(this.sheetRowToTsv(sheetRow))
        this.copyNotice = 'Строка скопирована. Можно вставить в таблицу.'
      } catch (error) {
        this.copyNotice = error.message || 'Не удалось скопировать строку'
      }
    },
    async copyCurrentDraftRow () {
      if (!this.draft) return
      try {
        const sheetRow = this.sheetRowFromPayload(this.payload)
        await this.copyText(this.sheetRowToTsv(sheetRow))
        this.copyNotice = 'Строка скопирована. Можно вставить в таблицу.'
      } catch (error) {
        this.copyNotice = error.message || 'Не удалось скопировать строку'
      }
    },
    draftStateLabel (row) {
      if (this.isEmailChecking(row)) return 'Проверяем письмо — результат появится автоматически'
      if (row.queueState === 'check_failed') return 'Проверка не завершилась — письмо сохранено'
      const payload = this.parsePayload(row.payloadJson)
      const eventType = this.eventTypeFromPayload(payload)
      if (row.status === 'approved') return 'Уже подтверждён'
      if (row.status === 'rejected') return 'Отклонён'
      if (eventType === 'cancel') return 'Внимание: отмена заказа'
      if (eventType === 'change') return 'Внимание: изменение заказа'
      if (String(payload.infoReason || '').trim()) return 'Есть блокирующее уточнение'
      if (Array.isArray(payload.missingFields) && payload.missingFields.length) return 'Есть неполные поля'
      if (payload.pricing?.conflict) return 'Проверьте цену'
      return 'Можно проверять и подтверждать'
    },
    rowAddressBadge (row) {
      const payload = this.parsePayload(row.payloadJson)
      return this.addressBadgeFromRows(this.buildAddressStatusRows(payload))
    },
    rowAddressPointBadge (row, key) {
      const payload = this.parsePayload(row.payloadJson)
      return this.addressPointBadgeFromRows(this.buildAddressStatusRows(payload), key)
    },
    rowPriceBadge (row) {
      const payload = this.parsePayload(row.payloadJson)
      return this.priceBadgeFromPayload(payload)
    },
    priceBadgeFromPayload (payload = {}) {
      const pricing = payload.pricing || {}
      const orderDraft = payload.orderDraft || {}
      const counterparty = orderDraft.counterpartyName || 'клиента'
      const emailPrice = Number(orderDraft.clientPrice)
      const riderraPrice = Number(pricing.authoritativeClientPrice)
      const hasEmailPrice = Number.isFinite(emailPrice) && emailPrice > 0
      const hasRiderraPrice = Number.isFinite(riderraPrice) && riderraPrice > 0
      if (pricing.pricingSource === 'counterparty_pricing_missing') {
        return {
          className: 'check-badge--danger',
          icon: true,
          label: pricing.pricingMissingReason || `Нет согласованной цены ${counterparty} в базе`
        }
      }
      if (hasRiderraPrice && hasEmailPrice && pricing.conflict) {
        const sourceLabel = pricing.pricingSource === 'counterparty_pricing' ? `ценой ${counterparty}` : 'ценой Riderra'
        return {
          className: 'check-badge--danger',
          icon: true,
          label: `Цена не совпала с ${sourceLabel}: письмо ${this.formatMoney(emailPrice, orderDraft.currency)}, база ${this.formatMoney(riderraPrice, pricing.authoritativeCurrency || orderDraft.currency)}`
        }
      }
      if (hasRiderraPrice && hasEmailPrice) {
        return {
          className: 'check-badge--ok',
          icon: false,
          label: pricing.pricingSource === 'counterparty_pricing' ? `Цена проверена по прайсу ${counterparty}` : 'Цена проверена по Riderra'
        }
      }
      if (hasRiderraPrice) {
        return {
          className: 'check-badge--ok',
          icon: false,
          label: pricing.pricingSource === 'counterparty_pricing' ? `Цена взята из прайса ${counterparty}` : 'Цена взята из Riderra'
        }
      }
      if (hasEmailPrice) {
        return {
          className: 'check-badge--warn',
          icon: true,
          label: 'Цена только из письма'
        }
      }
      return {
        className: 'check-badge--danger',
        icon: true,
        label: 'Цена не найдена'
      }
    },
    pricingSourceLabel (pricing = {}) {
      if (pricing.pricingSource === 'counterparty_pricing') return 'Client price book'
      if (pricing.pricingSource === 'counterparty_pricing_missing') return 'Client price book: not found'
      if (pricing.pricingSource === 'riderra_pricing') return 'Riderra price book'
      if (pricing.pricingSource) return pricing.pricingSource
      return 'не найдено'
    },
    pricingMatchLabelFromPricing (pricing = {}) {
      const meta = pricing.pricingMatchMeta || {}
      if (meta.matchedBy === 'geo_zone') {
        return [meta.fromZoneName, meta.toZoneName].filter(Boolean).join(' -> ') || 'по геозонам'
      }
      if (meta.matchedBy === 'address_text') return 'по тексту маршрута'
      if (meta.matchedBy === 'city_fallback') return 'по городу'
      return ''
    },
    supplierCostLabel (supplierCost = {}) {
      const driver = supplierCost.driver || {}
      const supplierName = driver.supplierCompany?.name || driver.name || supplierCost.sourceLabel || 'поставщик'
      const price = this.formatMoney(supplierCost.supplierPrice, supplierCost.currency || 'EUR')
      return `${supplierName}: ${price}`
    },
    addressProviderLabel (provider) {
      const value = String(provider || '').toLowerCase()
      if (value === 'google_maps') return 'Google Maps'
      if (value === 'nominatim') return 'Nominatim'
      return provider || 'геокодер'
    },
    buildAddressStatusRows (payload = {}) {
      const verification = payload.addressVerification || null
      if (!verification || typeof verification !== 'object') return []
      const orderDraft = payload.orderDraft || {}
      const geoZones = payload.geoZones || {}
      const checkedAt = verification.checkedAt ? this.formatDate(verification.checkedAt) : ''
      const providerLabel = this.addressProviderLabel(verification.provider)
      return [
        { key: 'fromPoint', label: 'Откуда', source: orderDraft.fromPoint || '' },
        { key: 'toPoint', label: 'Куда', source: orderDraft.toPoint || '' }
      ].map((item) => {
        const geo = verification[item.key] || null
        if (!geo) return null
        const best = geo.bestMatch || null
        const ok = Boolean(geo.found && best)
        const itemProviderLabel = this.addressProviderLabel(geo.provider || verification.provider)
        const matchName = best?.displayName || best?.formattedAddress || ''
        const lat = best?.lat
        const lon = best?.lon
        const coordinates = lat != null && lon != null ? `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}` : ''
        return {
          ...item,
          ok,
          providerLabel: itemProviderLabel || providerLabel,
          query: geo.query || item.source || '',
          statusLabel: ok ? `Проверено по ${itemProviderLabel || providerLabel}` : `Адрес не совпал с ${itemProviderLabel || providerLabel}`,
          matchLabel: ok
            ? `Совпадение: ${matchName || 'найдено'}${checkedAt ? ` · ${checkedAt}` : ''}`
            : `Совпадение не найдено${checkedAt ? ` · ${checkedAt}` : ''}`,
          coordinates,
          geoZoneLabel: geoZones[item.key]?.name || ''
        }
      }).filter(Boolean)
    },
    addressBadgeFromRows (rows = []) {
      if (!rows.length) return null
      const failed = rows.some((row) => !row.ok)
      const providerLabel = rows.find((row) => row.providerLabel)?.providerLabel || 'геокодер'
      if (failed) {
        return {
          className: 'address-badge--danger',
          icon: true,
          label: `Адрес не совпал с ${providerLabel}`
        }
      }
      return {
        className: 'address-badge--ok',
        icon: false,
        label: `Адрес проверен по ${providerLabel}`
      }
    },
    addressPointBadgeFromRows (rows = [], key) {
      const row = rows.find((item) => item.key === key)
      if (!row) return null
      const providerLabel = row.providerLabel || 'геокодер'
      return {
        className: row.ok ? 'check-badge--ok' : 'check-badge--danger',
        icon: !row.ok,
        label: row.ok ? `Совпадает с ${providerLabel}` : `Не совпадает с ${providerLabel}`
      }
    },
    draftActionLabel (row) {
      if (this.isEmailChecking(row)) return 'Проверяем…'
      if (row.queueState === 'check_failed') return this.retryingDraftId === row.id ? 'Запускаем…' : 'Повторить проверку'
      const payload = this.parsePayload(row.payloadJson)
      const eventType = this.eventTypeFromPayload(payload)
      if (eventType === 'cancel') return 'Разобрать отмену'
      if (eventType === 'change') return 'Разобрать изменение'
      return this.draftStateLabel(row).includes('Можно') ? 'Проверить' : 'Разобрать'
    },
    isEmailChecking (row) {
      return ['checking_queued', 'checking'].includes(String(row?.queueState || ''))
    },
    async handleDraftAction (row) {
      if (this.isEmailChecking(row)) return
      if (row.queueState === 'check_failed') return this.retryChecks(row)
      return this.openDraft(row.id)
    },
    async retryChecks (row) {
      this.retryingDraftId = row.id
      this.actionResult = ''
      try {
        const res = await fetch(`/api/admin/ops/drafts/${row.id}/retry-checks`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({})
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Не удалось повторить проверку')
        this.actionResult = 'Проверка запущена. Результат появится автоматически.'
        await this.load()
      } catch (error) {
        this.actionResult = error.message || 'Не удалось повторить проверку'
      } finally {
        this.retryingDraftId = ''
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
      return d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
      })
    },
    formatMoney (value, currency = 'EUR') {
      if (value == null || value === '') return '-'
      const n = Number(value)
      if (!Number.isFinite(n)) return '-'
      return `${n.toFixed(2)} ${currency || 'EUR'}`
    },
    pickupValue (row) {
      const payload = this.parsePayload(row.payloadJson)
      return payload?.orderDraft?.pickupAt || payload?.sheetRowPreview?.date || ''
    },
    formatPickup (row) {
      return this.formatDate(this.pickupValue(row))
    },
    sourceLabel (row) {
      const payload = this.parsePayload(row.payloadJson)
      const orderDraft = payload.orderDraft || {}
      const created = this.formatDate(row.createdAt)
      const from = this.sourceSender(payload, orderDraft)
      return from
        ? `Источник: письмо от ${created}, ${from}`
        : `Источник: письмо от ${created}`
    },
    sourceSender (payload = {}, orderDraft = {}) {
      const direct = String(
        payload.fromEmail ||
        payload.senderEmail ||
        orderDraft.fromEmail ||
        payload.sourceActorId ||
        orderDraft.sourceActorId ||
        ''
      ).trim()
      if (direct && direct !== 'technical-inbox' && direct !== 'manual-email' && direct !== 'openclaw') return direct
      const comment = String(orderDraft.comment || payload.comment || '').trim()
      const match = comment.match(/(?:^|\n)From:\s*([^\n]+)/i)
      return match ? match[1].trim() : ''
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
      if (this.queueState) params.set('queueState', this.queueState)
      params.set('sort', 'pickup_future')
      if (this.period) params.set('period', this.period)
      if (this.fromPickup) params.set('fromPickup', this.fromPickup)
      if (this.toPickup) params.set('toPickup', this.toPickup)
      params.set('limit', '50')
      const res = await fetch(`/api/admin/ops/drafts?${params.toString()}`, { headers: this.headers() })
      const data = await res.json()
      this.rows = data.rows || []
      const visible = new Set(this.rows.map((row) => row.id))
      this.selectedDraftIds = this.selectedDraftIds.filter((id) => visible.has(id))
      if (this.refreshTimer) clearTimeout(this.refreshTimer)
      if (this.rows.some((row) => this.isEmailChecking(row))) {
        this.refreshTimer = setTimeout(() => this.load(), 3000)
      }
    },
    toggleAllVisible (event) {
      const checked = Boolean(event?.target?.checked)
      const ids = this.selectableRows.map((row) => row.id)
      if (checked) {
        this.selectedDraftIds = [...new Set([...this.selectedDraftIds, ...ids])]
      } else {
        const removing = new Set(ids)
        this.selectedDraftIds = this.selectedDraftIds.filter((id) => !removing.has(id))
      }
    },
    async deleteSelectedDrafts () {
      if (!this.selectedDraftIds.length) return
      this.bulkDeleting = true
      this.actionResult = ''
      try {
        const res = await fetch('/api/admin/ops/drafts/bulk-delete', {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ ids: this.selectedDraftIds })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Не удалось удалить выбранные черновики')
        this.actionResult = data.updated
          ? `Убрано выбранных черновиков: ${data.updated}.`
          : 'Выбранные черновики уже не были в Pending.'
        this.selectedDraftIds = []
        await this.load()
      } catch (error) {
        this.actionResult = error.message || 'Не удалось удалить выбранные черновики'
      } finally {
        this.bulkDeleting = false
      }
    },
    clearSelectedDrafts () {
      this.selectedDraftIds = []
    },
    setPeriod (period) {
      this.period = period
      this.fromPickup = ''
      this.toPickup = ''
      this.load()
    },
    applyCustomPeriod () {
      this.period = ''
      this.load()
    },
    resetPeriod () {
      this.period = ''
      this.fromPickup = ''
      this.toPickup = ''
      this.load()
    },
    async createManualEmailDraft () {
      this.manualSaving = true
      this.manualResult = ''
      try {
        const res = await fetch('/api/admin/ops/drafts/manual-email', {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            fromEmail: this.manualEmail.fromEmail || null,
            subject: this.manualEmail.subject || null,
            rawText: this.manualEmail.rawText
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Не удалось создать черновик')
        this.manualResult = data.idempotent
          ? 'Такой черновик уже был создан ранее.'
          : 'Письмо сохранено. Проверяем адреса и цену в фоне.'
        this.manualEmail.rawText = ''
        await this.load()
      } catch (error) {
        this.manualResult = error.message || 'Не удалось создать черновик'
      } finally {
        this.manualSaving = false
      }
    },
    async cleanupSmokeDrafts () {
      this.cleanupSaving = true
      this.actionResult = ''
      try {
        const res = await fetch('/api/admin/ops/drafts/cleanup', {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ mode: 'smoke' })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Не удалось убрать тестовые черновики')
        this.actionResult = data.updated
          ? `Убрано тестовых черновиков: ${data.updated}.`
          : 'Тестовых черновиков не найдено.'
        await this.load()
      } catch (error) {
        this.actionResult = error.message || 'Не удалось убрать тестовые черновики'
      } finally {
        this.cleanupSaving = false
      }
    },
    async hideDraft (row) {
      if (!row?.id) return
      try {
        const res = await fetch(`/api/admin/ops/drafts/${row.id}/reject`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ comment: 'Hidden from AI Inbox as old/unneeded draft' })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Не удалось убрать черновик')
        this.actionResult = 'Черновик убран из Pending.'
        await this.load()
      } catch (error) {
        this.actionResult = error.message || 'Не удалось убрать черновик'
      }
    },
    async openDraft (id) {
      this.draftLoading = true
      this.draftLoadError = ''
      try {
        const res = await fetch(`/api/admin/ops/drafts/${id}`, { headers: this.headers() })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
        this.draft = data
        this.reviewComment = ''
        this.actionResult = ''
        this.copyNotice = ''
        this.flightCheckError = ''
      } catch (error) {
        this.draftLoadError = error.message || 'Не удалось открыть письмо'
        this.actionResult = this.draftLoadError
      } finally {
        this.draftLoading = false
      }
    },
    closeDraft () {
      this.draft = null
      this.reviewComment = ''
      this.actionResult = ''
      this.copyNotice = ''
      this.saving = false
      this.flightChecking = false
      this.refreshingChecks = false
      this.flightCheckError = ''
    },
    async refreshChecks () {
      if (!this.draft) return
      this.refreshingChecks = true
      this.actionResult = ''
      try {
        const res = await fetch(`/api/admin/ops/drafts/${this.draft.id}/refresh-checks`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({})
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Не удалось проверить адреса и цену')
        this.draft = data
        this.actionResult = 'Адреса и цена перепроверены.'
        await this.load()
      } catch (error) {
        this.actionResult = error.message || 'Не удалось проверить адреса и цену'
      } finally {
        this.refreshingChecks = false
      }
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
        this.actionResult = 'Черновик проверен. Скопируйте строку в Google Sheet; после синхронизации Riderra найдёт заказ автоматически.'
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
.manual-import { border: 1px solid #d8d8e6; background: #fff; border-radius: 14px; margin-bottom: 14px; overflow: hidden; }
.manual-import__summary { cursor: pointer; list-style: none; padding: 14px 16px; font-weight: 800; color: #17233d; }
.manual-import__summary::-webkit-details-marker { display: none; }
.manual-import[open] .manual-import__summary { border-bottom: 1px solid #eef1f7; background: #f8fbff; }
.manual-import__body { display: grid; gap: 10px; padding: 14px 16px 16px; }
.manual-import__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.manual-import__text { width: 100%; min-height: 150px; resize: vertical; line-height: 1.45; }
.manual-import__actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.overview-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
.overview-card { background: #fff; border: 1px solid #d8d8e6; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.overview-card strong { font-size: 24px; color: #0f172a; }
.overview-card__label { color: #64748b; font-size: 13px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
.period-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.input { border: 1px solid #d8d8e6; border-radius: 8px; padding: 8px 10px; min-width: 220px; }
.input--date { min-width: 150px; }
.bulk-panel { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 12px; padding: 10px 12px; border: 1px solid #d8d8e6; border-radius: 10px; background: #f8fafc; }
.bulk-panel__actions { display: flex; gap: 8px; flex-wrap: wrap; }
.table-wrap { background: #fff; border: 1px solid #d8d8e6; border-radius: 12px; overflow: auto; }
.table-head, .table-row { display: grid; grid-template-columns: 42px 190px 170px 170px minmax(230px, 1fr) minmax(230px, 1fr) 160px 180px minmax(260px, 1fr) 210px 230px 250px; gap: 12px; padding: 10px 12px; min-width: 2320px; }
.table-head { font-weight: 700; border-bottom: 1px solid #e5e7ef; }
.table-row { border-bottom: 1px solid #f1f3f8; align-items: center; }
.row-title { color: #17233d; font-weight: 800; line-height: 1.35; overflow-wrap: anywhere; }
.row-title--address { font-weight: 700; }
.row-title--comment { font-weight: 650; }
.row-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.row-hint { color: #64748b; font-size: 12px; margin-top: 6px; }
.empty { padding: 16px; color: #64748b; }
.event-badge { display: inline-flex; align-items: center; gap: 6px; width: fit-content; max-width: 100%; margin-top: 8px; padding: 5px 9px; border-radius: 999px; font-size: 12px; font-weight: 900; line-height: 1.2; text-transform: uppercase; }
.event-badge__icon { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 18px; height: 18px; border-radius: 50%; color: #fff; font-size: 13px; font-weight: 900; line-height: 1; }
.event-badge--cancel { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.event-badge--change { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
.event-badge--cancel .event-badge__icon { background: #dc2626; }
.event-badge--change .event-badge__icon { background: #ea580c; }
.status-pill { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.status-pill--pending { background: #fef3c7; color: #92400e; }
.status-pill--approved { background: #dcfce7; color: #166534; }
.status-pill--rejected { background: #fee2e2; color: #991b1b; }
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; justify-content: center; align-items: center; z-index: 1200; padding: 20px; }
.modal-card { width: min(1100px, 96vw); max-height: 90vh; overflow: auto; background: #fff; border-radius: 16px; padding: 18px; }
.modal-card--loading { width: min(420px, 92vw); display: grid; gap: 8px; padding: 28px; text-align: center; }
.modal-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.modal-close { border: 0; background: transparent; font-size: 28px; cursor: pointer; color: #334155; }
.banner { margin: 12px 0; padding: 12px 14px; border-radius: 10px; background: #fbf2ff; color: #702283; line-height: 1.45; }
.event-alert { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 12px; align-items: flex-start; margin: 12px 0; padding: 14px; border-radius: 10px; border: 1px solid; line-height: 1.45; }
.event-alert__icon { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; color: #fff; font-size: 18px; font-weight: 900; line-height: 1; }
.event-alert strong { display: block; margin-bottom: 4px; font-size: 15px; }
.event-alert p { margin: 0; }
.event-alert--cancel { background: #fef2f2; color: #991b1b; border-color: #fca5a5; }
.event-alert--change { background: #fff7ed; color: #9a3412; border-color: #fdba74; }
.event-alert--cancel .event-alert__icon { background: #dc2626; }
.event-alert--change .event-alert__icon { background: #ea580c; }
.focus-card { margin-top: 12px; padding: 16px; border-radius: 14px; border: 1px solid #ead7f0; background: linear-gradient(180deg, #fff 0%, #fcf7fd 100%); }
.focus-card__head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
.focus-card__head h4 { margin: 0 0 4px; }
.focus-card__summary { margin: 0; color: #0f172a; line-height: 1.5; }
.focus-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.focus-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
.focus-actions .btn--primary { box-shadow: 0 10px 24px rgba(112, 34, 131, .18); }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
.address-badge { display: inline-flex; align-items: center; gap: 6px; width: fit-content; padding: 5px 9px; border-radius: 999px; font-size: 12px; font-weight: 800; line-height: 1.2; }
.address-badge--ok { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
.address-badge--danger { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.address-badge__icon,
.address-check__icon,
.check-badge__icon { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 18px; height: 18px; border-radius: 50%; background: #dc2626; color: #fff; font-size: 13px; font-weight: 900; line-height: 1; }
.check-badge { display: inline-flex; align-items: center; gap: 6px; width: fit-content; max-width: 100%; margin-top: 8px; padding: 5px 9px; border-radius: 999px; font-size: 12px; font-weight: 800; line-height: 1.2; }
.check-badge--ok { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
.check-badge--warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.check-badge--danger { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.address-checks { display: grid; gap: 10px; }
.address-check { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 12px; align-items: flex-start; border: 1px solid #e5e7ef; border-radius: 10px; padding: 12px; }
.address-check--ok { background: #f0fdf4; border-color: #bbf7d0; }
.address-check--danger { background: #fef2f2; border-color: #fecaca; }
.address-check__status { display: inline-flex; align-items: center; gap: 8px; color: #17233d; font-weight: 900; }
.address-check--ok .address-check__status { color: #166534; }
.address-check--danger .address-check__status { color: #991b1b; }
.address-check__body { display: grid; gap: 5px; min-width: 0; line-height: 1.45; }
.section-card { margin-top: 14px; border: 1px solid #e5e7ef; border-radius: 12px; padding: 14px; }
.section-card[open] { background: #fff; }
.section-tools { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.section-summary { cursor: pointer; font-weight: 800; list-style: none; margin: -14px; padding: 14px; color: #17233d; background: #fcf7fd; }
.section-summary::-webkit-details-marker { display: none; }
.section-card[open] .section-summary { border-bottom: 1px solid #e5e7ef; }
.section-card > :not(summary) { padding-top: 14px; }
.section-card h4 { margin: 0 0 10px; }
.price-check { display: grid; gap: 12px; }
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
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.result-block { margin-top: 10px; }
.page-result { margin: -4px 0 12px; }
@media (max-width: 900px) {
  .page-head, .toolbar, .actions, .ops-rail, .focus-card__head, .focus-actions, .bulk-panel { flex-direction: column; align-items: stretch; }
  .overview-grid,
  .meta-grid,
  .manual-import__grid,
  .address-check { grid-template-columns: 1fr; }
}
</style>
