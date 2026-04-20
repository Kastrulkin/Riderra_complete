<template>
  <div>
    <navigation></navigation>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="h2">{{ t.title }}</h1>
            <p class="page-subtitle">{{ t.subtitle }}</p>
          </div>
          <div class="page-head-actions">
            <button class="btn btn--ghost" :disabled="queueBulkSaving" @click="queueAllMarked">
              {{ queueBulkSaving ? t.queueing : t.queueAllMarked }}
            </button>
            <button class="btn btn--primary" :disabled="loading" @click="load">
              {{ loading ? t.loading : t.refresh }}
            </button>
          </div>
        </div>
        <admin-tabs />

        <div class="overview-strip">
          <div v-for="card in overviewCards" :key="card.key" class="overview-card" :class="`overview-card--${card.tone}`">
            <div class="overview-card__value">{{ card.value }}</div>
            <div class="overview-card__label">{{ card.label }}</div>
            <div class="overview-card__hint">{{ card.hint }}</div>
          </div>
        </div>

        <div class="subtabs">
          <button class="subtab" :class="{ 'subtab--active': mode === 'table' }" @click="mode = 'table'">{{ t.tableTab }}</button>
          <button class="subtab" :class="{ 'subtab--active': mode === 'raw' }" @click="mode = 'raw'">{{ t.rawTab }}</button>
        </div>

        <div v-if="mode === 'table'" class="view-strip">
          <button
            v-for="view in savedViews"
            :key="view.key"
            type="button"
            class="view-pill"
            :class="{ 'view-pill--active': activeView === view.key }"
            @click="activeView = view.key"
          >
            <span class="view-pill__label">{{ view.label }}</span>
            <span class="view-pill__count">{{ viewCount(view.key) }}</span>
          </button>
        </div>

        <div class="toolbar">
          <input v-model="q" class="input toolbar-search" :placeholder="t.search" @input="applyFilter" />
          <div class="toolbar-meta">
            <span class="toolbar-meta__title">{{ t.activeViewLabel }}:</span>
            <span class="toolbar-meta__value">{{ currentViewLabel }}</span>
          </div>
        </div>
        <div v-if="loadError" class="hint hint--error">{{ loadError }}</div>
        <div v-if="queueNotice" class="hint">{{ queueNotice }}</div>

        <div v-if="mode === 'table'" class="table-wrap">
          <div class="table-head main-grid">
            <div>{{ t.statusDate }}</div>
            <div>{{ t.orderRoute }}</div>
            <div>{{ t.clientInfo }}</div>
            <div>{{ t.price }}</div>
            <div>{{ t.driver }}</div>
            <div>{{ t.issue }}</div>
            <div>{{ t.nextStep }}</div>
          </div>
          <div v-for="o in displayedTableRows" :key="`${o.sourceRow}-${o.id}`" class="table-row main-grid">
            <div class="order-meta">
              <span class="status-pill" :class="statusPillClass(o.status)">{{ statusLabel(o.status) }}</span>
              <div class="order-meta__date">{{ o.date || '-' }}</div>
              <div class="order-meta__sub">{{ orderIdentity(o) }}</div>
            </div>

            <div class="route-block">
              <div class="route-block__title">{{ o.contractor || '-' }}</div>
              <div class="route-block__route">{{ routeLabel(o) }}</div>
              <div class="route-block__sub">
                <button
                  v-if="o.orderNumber"
                  class="order-link"
                  type="button"
                  @click="openOrderDetails(o.orderNumber)"
                >
                  {{ t.openDetailsByOrder }}: {{ o.orderNumber }}
                </button>
                <span v-else>{{ t.noOrderNumber }}</span>
              </div>
            </div>

            <div class="client-block">
              <div class="client-block__line"><strong>ID:</strong> <span class="cell-ellipsis" :title="o.id">{{ o.id || '-' }}</span></div>
              <div class="client-block__line"><strong>{{ t.source }}:</strong> {{ o.source || '-' }}</div>
              <div class="client-block__line"><strong>{{ t.internalOrderNumber }}:</strong> {{ o.internalOrderNumber || '-' }}</div>
            </div>

            <div class="price-block">
              <div class="price-block__sum">{{ o.sum || '-' }}</div>
              <div class="price-block__hint">{{ priceContextLabel(o) }}</div>
            </div>

            <div class="driver-block">
              <div class="driver-block__name">{{ o.driver || t.driverMissing }}</div>
              <div class="driver-block__hint">{{ driverStateLabel(o) }}</div>
            </div>

            <div class="issue-block">
              <div class="issue-block__title">{{ issueSummary(o) }}</div>
              <div
                v-if="o.needsInfo || o.infoReason"
                class="info-reason"
                :title="infoReasonTooltip(o.infoReason)"
              >
                {{ o.infoReason || t.infoFlagged }}
              </div>
              <div v-else class="issue-block__hint">{{ commentSummary(o) }}</div>
            </div>

            <div class="row-actions">
              <button
                class="card-link card-link--primary"
                type="button"
                :disabled="!o.id || rowPrimaryBusy(o)"
                @click="runPrimaryAction(o)"
              >
                {{ primaryActionLabel(o) }}
              </button>
              <div class="row-actions__secondary">
                <button class="card-link" type="button" :disabled="!o.id" @click="openOrderCard(o)">
                  {{ t.openCard }}
                </button>
                <button class="card-link" type="button" :disabled="!o.id || queueSavingByOrder[o.id]" @click="queueOrder(o)">
                  {{ queueSavingByOrder[o.id] ? t.queueing : t.queueOne }}
                </button>
              </div>
              <select class="action-select" :value="infoPresetFromRow(o)" @change="onInfoQuickChange(o, $event.target.value)">
                <option value="none">{{ t.infoNone }}</option>
                <option value="baggage">{{ t.infoPresetBaggage }}</option>
                <option value="pickup">{{ t.infoPresetPickup }}</option>
                <option value="flight">{{ t.infoPresetFlight }}</option>
                <option value="other">{{ t.infoPresetOther }}</option>
              </select>
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
        <div class="hint">{{ t.total }}: {{ mode === 'table' ? displayedTableRows.length : filteredRawRows.length }}</div>
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

        <div v-if="orderCardDetailError" class="hint hint--error">{{ orderCardDetailError }}</div>

        <div v-if="selectedOrder.flightNumber || selectedOrder.flightCheck" class="status-history">
          <div class="section-head">
            <h4>{{ t.flightCheckTitle }}</h4>
            <button
              v-if="selectedOrder.flightNumber"
              class="btn btn--ghost btn--sm"
              type="button"
              :disabled="flightCheckSaving"
              @click="runOrderFlightCheck"
            >
              {{ flightCheckSaving ? t.flightChecking : t.flightCheckRun }}
            </button>
          </div>
          <div class="meta-grid">
            <div><strong>{{ t.flightNumberLabel }}:</strong> {{ selectedOrder.flightNumber || '-' }}</div>
            <div><strong>{{ t.flightSourceLabel }}:</strong> {{ selectedOrder.sourceType || '-' }}</div>
            <div><strong>{{ t.flightCheckedAtLabel }}:</strong> {{ formatDateTime(selectedOrder.flightCheck && selectedOrder.flightCheck.checkedAt) }}</div>
            <div><strong>{{ t.flightStatusLabel }}:</strong> {{ selectedOrder.flightCheck && selectedOrder.flightCheck.bestMatch ? (selectedOrder.flightCheck.bestMatch.flightStatus || '-') : '-' }}</div>
            <div><strong>{{ t.flightArrivalLabel }}:</strong> {{ flightArrivalValue(selectedOrder.flightCheck) }}</div>
            <div><strong>{{ t.flightRouteLabel }}:</strong> {{ flightRouteValue(selectedOrder.flightCheck) }}</div>
          </div>
          <div v-if="selectedOrder.flightCheck && selectedOrder.flightCheck.error" class="hint hint--error">
            {{ selectedOrder.flightCheck.error }}
          </div>
        </div>

        <div v-if="selectedOrder.addressVerification" class="status-history">
          <div class="section-head">
            <h4>{{ t.addressCheckTitle }}</h4>
            <button
              class="btn btn--ghost btn--sm"
              type="button"
              :disabled="addressCheckSaving"
              @click="runOrderAddressCheck"
            >
              {{ addressCheckSaving ? t.addressChecking : t.addressCheckRun }}
            </button>
          </div>
          <div class="meta-grid">
            <div><strong>{{ t.addressCheckedAtLabel }}:</strong> {{ formatDateTime(selectedOrder.addressVerification && selectedOrder.addressVerification.checkedAt) }}</div>
            <div><strong>{{ t.addressSourceLabel }}:</strong> {{ selectedOrder.addressVerification && selectedOrder.addressVerification.provider || '-' }}</div>
            <div><strong>{{ t.fromNormalizedLabel }}:</strong> {{ addressNormalizedValue(selectedOrder.addressVerification, 'fromPoint') }}</div>
            <div><strong>{{ t.toNormalizedLabel }}:</strong> {{ addressNormalizedValue(selectedOrder.addressVerification, 'toPoint') }}</div>
            <div><strong>{{ t.fromCoordsLabel }}:</strong> {{ addressCoordsValue(selectedOrder.addressVerification, 'fromPoint') }}</div>
            <div><strong>{{ t.toCoordsLabel }}:</strong> {{ addressCoordsValue(selectedOrder.addressVerification, 'toPoint') }}</div>
          </div>
        </div>

        <div v-if="selectedOrder.qualityChecks && selectedOrder.qualityChecks.length" class="status-history">
          <h4>{{ t.qualityChecksTitle }}</h4>
          <div class="checks-list">
            <div v-for="check in selectedOrder.qualityChecks" :key="`${check.key}-${check.message}`" class="check-row">
              <span class="pill" :class="`pill--${check.level || 'ok'}`">{{ check.level || 'ok' }}</span>
              <span>{{ check.message }}</span>
            </div>
          </div>
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
    <div v-if="infoModal.open" class="modal-backdrop" @click.self="closeInfoModal">
      <div class="modal-card info-modal-card">
        <div class="modal-head">
          <h3>{{ t.infoModalTitle }}</h3>
          <button class="modal-close" type="button" @click="closeInfoModal">×</button>
        </div>
        <div class="info-modal-label">
          {{ infoModal.label || infoModal.orderId || '-' }}
        </div>
        <p v-if="t.infoModalHint" class="hint info-modal-hint">{{ t.infoModalHint }}</p>
        <label class="info-field">
          <span>{{ t.infoReasonLabel }}</span>
          <textarea
            class="info-textarea"
            v-model="infoModal.reason"
            :placeholder="t.infoReasonPlaceholder"
            rows="4"
          ></textarea>
        </label>
        <label class="info-toggle">
          <input type="checkbox" v-model="infoModal.needsInfo" />
          <span>{{ t.infoNeedsInfoLabel }}</span>
        </label>
        <div v-if="infoModal.message" class="hint">{{ infoModal.message }}</div>
        <div v-if="infoModal.error" class="hint hint--error">{{ infoModal.error }}</div>
        <div class="modal-actions info-modal-actions">
          <button class="btn btn--primary" type="button" :disabled="infoSaving" @click="saveInfoNote">
            {{ infoSaving ? t.saving : t.infoSave }}
          </button>
          <button class="btn btn--secondary" type="button" @click="closeInfoModal">
            {{ t.infoCancel }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="dispatchModal.open" class="modal-backdrop" @click.self="closeDispatchModal">
      <div class="modal-card info-modal-card">
        <div class="modal-head">
          <h3>{{ t.dispatchModalTitle }}</h3>
          <button class="modal-close" type="button" @click="closeDispatchModal">×</button>
        </div>
        <div class="info-modal-label">{{ dispatchModal.label || '-' }}</div>
        <p class="hint info-modal-hint">{{ t.dispatchModalHint }}</p>
        <label class="info-field">
          <span>{{ t.dispatchMessageLabel }}</span>
          <textarea
            class="info-textarea"
            v-model="dispatchModal.text"
            rows="6"
          ></textarea>
        </label>
        <label class="info-toggle">
          <input type="checkbox" v-model="dispatchModal.confirmed" />
          <span>{{ t.dispatchConfirmLabel }}</span>
        </label>
        <div v-if="dispatchModal.message" class="hint">{{ dispatchModal.message }}</div>
        <div v-if="dispatchModal.error" class="hint hint--error">{{ dispatchModal.error }}</div>
        <div class="modal-actions info-modal-actions">
          <button
            class="btn btn--primary"
            type="button"
            :disabled="quickDispatchSavingByOrder[dispatchModal.orderId] || !dispatchModal.confirmed || !dispatchModal.text.trim()"
            @click="sendDispatchNow"
          >
            {{ quickDispatchSavingByOrder[dispatchModal.orderId] ? t.sendingDispatchNow : t.dispatchSendButton }}
          </button>
          <button class="btn btn--secondary" type="button" @click="closeDispatchModal">
            {{ t.infoCancel }}
          </button>
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
    activeView: 'all',
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
    orderCardDetailError: '',
    availableStatuses: [],
    selectedToStatus: '',
    statusReason: '',
    statusSaving: false,
    flightCheckSaving: false,
    addressCheckSaving: false,
    transitionsError: '',
    infoModal: {
      open: false,
      orderId: null,
      needsInfo: true,
      reason: '',
      label: '',
      message: '',
      error: ''
    },
    dispatchModal: {
      open: false,
      orderId: null,
      label: '',
      text: '',
      confirmed: false,
      message: '',
      error: ''
    },
    infoSaving: false,
    queueSavingByOrder: {},
    sendToChatSavingByOrder: {},
    quickDispatchSavingByOrder: {},
    queueBulkSaving: false,
    queueNotice: '',
    loading: false,
    loadError: ''
  }),
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'Таблица заказов',
            subtitle: 'Главная операционная очередь: что требует уточнения, что не назначено и какой следующий шаг нужен по каждому заказу.',
            tableTab: 'Таблица',
            rawTab: 'Подробности',
            search: 'Поиск по заказам',
            activeViewLabel: 'Показаны заказы',
            refresh: 'Обновить',
            loading: 'Загрузка...',
            queueOne: 'В рассылку',
            sendToChat: 'Отправить в чат',
            sendingToChat: 'Открываю чат...',
            sendDispatchNow: 'Отправить клиенту',
            sendingDispatchNow: 'Отправляю...',
            queueAllMarked: 'Добавить все отмеченные к рассылке',
            queueing: 'Добавляю...',
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
            actions: 'Действия',
            statusDate: 'Статус и дата',
            orderRoute: 'Заказ и маршрут',
            clientInfo: 'Служебно',
            price: 'Цена',
            issue: 'Что мешает',
            nextStep: 'Следующий шаг',
            openDetailsByOrder: 'Подробности',
            noOrderNumber: 'Номер заказа не указан',
            driverMissing: 'Водитель не назначен',
            openCard: 'Открыть',
            orderCard: 'Карточка заказа',
            status: 'Статус',
            statusHistory: 'История статусов',
            loadingHistory: 'Загрузка истории...',
            noHistory: 'История статусов пока пуста',
            flightCheckTitle: 'Проверка рейса',
            flightCheckRun: 'Проверить рейс',
            flightChecking: 'Проверяю...',
            flightNumberLabel: 'Рейс',
            flightSourceLabel: 'Источник',
            flightCheckedAtLabel: 'Проверено',
            flightStatusLabel: 'Статус рейса',
            flightArrivalLabel: 'Прилёт',
            flightRouteLabel: 'Маршрут',
            addressCheckTitle: 'Проверка адресов',
            addressCheckRun: 'Проверить адреса',
            addressChecking: 'Проверяю...',
            addressCheckedAtLabel: 'Проверено',
            addressSourceLabel: 'Источник',
            fromNormalizedLabel: 'Нормализованное “Откуда”',
            toNormalizedLabel: 'Нормализованное “Куда”',
            fromCoordsLabel: 'Координаты “Откуда”',
            toCoordsLabel: 'Координаты “Куда”',
            qualityChecksTitle: 'Проверка полей',
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
            notFoundInDetails: 'В Подробностях не найдено',
            infoFlag: 'Инфо-пометка',
            markInfo: 'Пометить',
            infoFlagged: 'Помечено',
            infoNone: 'Без пометки',
            infoPresetBaggage: 'Уточнить багаж',
            infoPresetPickup: 'Уточнить место подачи',
            infoPresetFlight: 'Уточнить рейс',
            infoPresetOther: 'Другое...',
            infoModalTitle: 'Инфо-пометка заказа',
            infoModalHint: 'Укажите, что уточнить, чтобы чат-очередь знала задачу',
            infoReasonLabel: 'Что уточнить',
            infoReasonPlaceholder: 'Например, багаж, место подачи или рейс',
            infoNeedsInfoLabel: 'Оставить метку «нужна доп. информация»',
            infoSave: 'Сохранить',
            infoCancel: 'Отмена',
            infoMarkedSuccess: 'Пометка сохранена',
            infoRemovedSuccess: 'Пометка снята',
            infoModalError: 'Не удалось обновить пометку',
            queueOneDone: 'Заказ добавлен в очередь чатов',
            sendToChatDone: 'Открываю задачу в Чатах',
            sendDispatchDone: 'Детали поездки отправлены клиенту',
            dispatchModalTitle: 'Отправить клиенту (проверка перед отправкой)',
            dispatchModalHint: 'Проверьте текст сообщения и подтвердите отправку вручную.',
            dispatchMessageLabel: 'Текст сообщения',
            dispatchConfirmLabel: 'Подтверждаю отправку этого сообщения клиенту',
            dispatchSendButton: 'Подтвердить и отправить',
            dispatchRollbackError: 'Отправка не прошла. Сообщение откатили в handoff человеку.',
            queueBulkDone: 'В очередь чатов добавлено/обновлено',
          }
        : {
            title: 'Orders Table',
            subtitle: 'Main operating queue: what needs clarification, what is still unassigned, and what action should happen next.',
            tableTab: 'Table',
            rawTab: 'Details',
            search: 'Search',
            activeViewLabel: 'Current view',
            refresh: 'Refresh',
            loading: 'Loading...',
            queueOne: 'Queue',
            sendToChat: 'Send to chat',
            sendingToChat: 'Opening chat...',
            sendDispatchNow: 'Send to client',
            sendingDispatchNow: 'Sending...',
            queueAllMarked: 'Queue all flagged',
            queueing: 'Queueing...',
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
            actions: 'Actions',
            statusDate: 'Status and date',
            orderRoute: 'Order and route',
            clientInfo: 'Internal',
            price: 'Price',
            issue: 'Blocker',
            nextStep: 'Next step',
            openDetailsByOrder: 'Details',
            noOrderNumber: 'Order number is missing',
            driverMissing: 'Driver not assigned',
            openCard: 'Open',
            orderCard: 'Order card',
            status: 'Status',
            statusHistory: 'Status history',
            loadingHistory: 'Loading history...',
            noHistory: 'No status history yet',
            flightCheckTitle: 'Flight check',
            flightCheckRun: 'Check flight',
            flightChecking: 'Checking...',
            flightNumberLabel: 'Flight',
            flightSourceLabel: 'Source',
            flightCheckedAtLabel: 'Checked at',
            flightStatusLabel: 'Flight status',
            flightArrivalLabel: 'Arrival',
            flightRouteLabel: 'Route',
            addressCheckTitle: 'Address verification',
            addressCheckRun: 'Check addresses',
            addressChecking: 'Checking...',
            addressCheckedAtLabel: 'Checked at',
            addressSourceLabel: 'Source',
            fromNormalizedLabel: 'Normalized from',
            toNormalizedLabel: 'Normalized to',
            fromCoordsLabel: 'From coords',
            toCoordsLabel: 'To coords',
            qualityChecksTitle: 'Field checks',
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
            notFoundInDetails: 'Not found in details',
            infoFlag: 'Info',
            markInfo: 'Mark',
            infoFlagged: 'Marked',
            infoNone: 'No flag',
            infoPresetBaggage: 'Clarify luggage',
            infoPresetPickup: 'Clarify pickup location',
            infoPresetFlight: 'Clarify flight',
            infoPresetOther: 'Other...',
            infoModalTitle: 'Info flag',
            infoModalHint: 'Describe what needs to be clarified for the chat queue',
            infoReasonLabel: 'Clarification needed',
            infoReasonPlaceholder: 'e.g. missing luggage, pickup point or flight number',
            infoNeedsInfoLabel: 'Keep this flagged for more info',
            infoSave: 'Save',
            infoCancel: 'Cancel',
            infoMarkedSuccess: 'Flag saved',
            infoRemovedSuccess: 'Flag removed',
            infoModalError: 'Failed to update flag',
            queueOneDone: 'Order queued for chats',
            sendToChatDone: 'Opening task in Chats',
            sendDispatchDone: 'Trip details sent to client',
            dispatchModalTitle: 'Send to client (review before send)',
            dispatchModalHint: 'Review the message and confirm sending manually.',
            dispatchMessageLabel: 'Message text',
            dispatchConfirmLabel: 'I confirm sending this message to client',
            dispatchSendButton: 'Confirm and send',
            dispatchRollbackError: 'Send failed. Message was rolled back to human handoff.',
            queueBulkDone: 'Chat queue updated',
          }
    },
    savedViews () {
      return this.$store.state.language === 'ru'
        ? [
            { key: 'all', label: 'Все' },
            { key: 'needs_info', label: 'Требуют уточнения' },
            { key: 'unassigned', label: 'Без водителя' },
            { key: 'ready', label: 'Готовы к отправке' },
            { key: 'problem', label: 'Проблемные' }
          ]
        : [
            { key: 'all', label: 'All' },
            { key: 'needs_info', label: 'Needs info' },
            { key: 'unassigned', label: 'No driver' },
            { key: 'ready', label: 'Ready to send' },
            { key: 'problem', label: 'Problematic' }
          ]
    },
    displayedTableRows () {
      return this.filteredRows.filter((row) => this.matchesActiveView(row))
    },
    currentViewLabel () {
      return this.savedViews.find((view) => view.key === this.activeView)?.label || this.savedViews[0]?.label || '-'
    },
    overviewCards () {
      const rows = Array.isArray(this.rows) ? this.rows : []
      const total = rows.length
      const needsInfo = rows.filter((row) => row.needsInfo).length
      const unassigned = rows.filter((row) => !String(row?.driver || '').trim()).length
      const ready = rows.filter((row) => !row.needsInfo && String(row?.status || '').toLowerCase() !== 'cancelled').length
      const problematic = rows.filter((row) => this.isProblemRow(row)).length
      const today = rows.filter((row) => this.isLikelyToday(row)).length
      return this.$store.state.language === 'ru'
        ? [
            { key: 'total', value: total, label: 'Всего заказов', hint: 'Полный объём текущего листа', tone: 'neutral' },
            { key: 'needsInfo', value: needsInfo, label: 'Нужно уточнить', hint: 'Не хватает данных для безопасной отправки', tone: needsInfo ? 'warn' : 'ok' },
            { key: 'unassigned', value: unassigned, label: 'Без водителя', hint: 'Нужно распределение', tone: unassigned ? 'critical' : 'ok' },
            { key: 'ready', value: ready, label: 'Готовы к отправке', hint: 'Можно идти в чат или клиенту', tone: ready ? 'info' : 'neutral' },
            { key: 'problem', value: problematic, label: 'Риски', hint: 'Комбинация статуса, пустых полей и инцидентов', tone: problematic ? 'critical' : 'ok' },
            { key: 'today', value: today, label: 'Похоже на сегодня', hint: 'Быстрый ориентир по дате подачи', tone: 'neutral' }
          ]
        : [
            { key: 'total', value: total, label: 'Total orders', hint: 'Current sheet volume', tone: 'neutral' },
            { key: 'needsInfo', value: needsInfo, label: 'Need clarification', hint: 'Missing data blocks a safe send', tone: needsInfo ? 'warn' : 'ok' },
            { key: 'unassigned', value: unassigned, label: 'No driver', hint: 'Needs dispatching', tone: unassigned ? 'critical' : 'ok' },
            { key: 'ready', value: ready, label: 'Ready to send', hint: 'Can move to chat or notify client', tone: ready ? 'info' : 'neutral' },
            { key: 'problem', value: problematic, label: 'Risks', hint: 'Status, empty fields, or incidents', tone: problematic ? 'critical' : 'ok' },
            { key: 'today', value: today, label: 'Likely today', hint: 'Quick date-based focus', tone: 'neutral' }
          ]
    },
    rawGridStyle () {
      const cols = Math.max(this.rawHeaders.length, 1)
      return { gridTemplateColumns: `170px 120px 80px repeat(${cols}, minmax(180px, 1fr))` }
    }
  },
  mounted () { this.load().catch(() => {}) },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
    async load () {
      this.loading = true
      this.loadError = ''
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
      const timeoutId = controller ? setTimeout(() => controller.abort(), 20000) : null
      try {
        const response = await fetch('/api/admin/orders-sheet-view', {
          headers: this.headers(),
          ...(controller ? { signal: controller.signal } : {})
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data?.error || `HTTP ${response.status}`)
        }
        this.rows = data.rows || []
        this.rawRows = data.rawRows || []
        this.rawHeaders = data.headers || []
        this.drilldownNotice = ''
        this.drilldownToken = ''
        this.queueNotice = ''
        this.applyFilter()
      } catch (error) {
        this.rows = []
        this.rawRows = []
        this.rawHeaders = []
        this.filteredRows = []
        this.filteredRawRows = []
        this.loadError = this.$store.state.language === 'ru'
          ? `Не удалось загрузить таблицу заказов: ${error?.message || 'unknown'}`
          : `Failed to load orders table: ${error?.message || 'unknown'}`
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
        this.loading = false
      }
    },
    async queueOrderRequest (order, { assignToMe = false } = {}) {
      const taskType = order.needsInfo ? 'clarification' : 'dispatch_info'
      const response = await fetch('/api/admin/chats/queue-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `chat-queue-order-${order.id}-${Date.now()}`,
          ...this.headers()
        },
        body: JSON.stringify({ orderId: order.id, taskType, assignToMe })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'queue_failed')
      return data
    },
    async queueOrder (order) {
      if (!order || !order.id || this.queueSavingByOrder[order.id]) return
      this.queueNotice = ''
      this.$set(this.queueSavingByOrder, order.id, true)
      try {
        await this.queueOrderRequest(order, { assignToMe: false })
        this.queueNotice = `${this.t.queueOneDone}: ${order.orderNumber || order.internalOrderNumber || order.id}`
      } catch (error) {
        this.queueNotice = error?.message || 'Failed to queue order'
      } finally {
        this.$set(this.queueSavingByOrder, order.id, false)
      }
    },
    async sendToChat (order) {
      if (!order || !order.id || this.sendToChatSavingByOrder[order.id]) return
      this.queueNotice = ''
      this.$set(this.sendToChatSavingByOrder, order.id, true)
      try {
        const data = await this.queueOrderRequest(order, { assignToMe: true })
        const taskId = data?.task?.id
        if (!taskId) throw new Error('task_id_missing')
        const prefillText = String(data?.prefillText || '').trim()
        if (prefillText && typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(`chat-prefill-${taskId}`, prefillText)
        }
        this.queueNotice = `${this.t.sendToChatDone}: ${order.orderNumber || order.internalOrderNumber || order.id}`
        await this.$router.push({ path: '/admin-chats', query: { taskId } })
      } catch (error) {
        this.queueNotice = error?.message || 'Failed to open chat task'
      } finally {
        this.$set(this.sendToChatSavingByOrder, order.id, false)
      }
    },
    buildDispatchPrefill (order) {
      const route = [order?.fromPoint, order?.toPoint].filter(Boolean).join(' -> ')
      const parts = [
        'Я помощник Riderra, работаю в тестовом режиме.',
        'Подтверждаем детали поездки.'
      ]
      if (order?.orderNumber) parts.push(`Номер заказа: ${order.orderNumber}.`)
      if (route) parts.push(`Маршрут: ${route}.`)
      parts.push('Если нужно, уточните дополнительные детали в ответ на это сообщение.')
      return parts.join(' ')
    },
    openDispatchModal (order) {
      if (!order || !order.id || order.needsInfo || this.quickDispatchSavingByOrder[order.id]) return
      this.dispatchModal.open = true
      this.dispatchModal.orderId = order.id
      this.dispatchModal.label = order.orderNumber || order.internalOrderNumber || order.contractor || order.id
      this.dispatchModal.text = this.buildDispatchPrefill(order)
      this.dispatchModal.confirmed = false
      this.dispatchModal.message = ''
      this.dispatchModal.error = ''
    },
    closeDispatchModal () {
      this.dispatchModal.open = false
      this.dispatchModal.orderId = null
      this.dispatchModal.label = ''
      this.dispatchModal.text = ''
      this.dispatchModal.confirmed = false
      this.dispatchModal.message = ''
      this.dispatchModal.error = ''
    },
    async sendDispatchNow () {
      const orderId = this.dispatchModal.orderId
      if (!orderId || !this.dispatchModal.confirmed || !this.dispatchModal.text.trim()) return
      this.dispatchModal.error = ''
      this.dispatchModal.message = ''
      this.queueNotice = ''
      this.$set(this.quickDispatchSavingByOrder, orderId, true)
      try {
        const response = await fetch('/api/admin/chats/dispatch-one-click', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `chat-dispatch-oneclick-${orderId}-${Date.now()}`,
            ...this.headers()
          },
          body: JSON.stringify({
            orderId,
            messageText: this.dispatchModal.text.trim(),
            confirmed: true
          })
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (response.status === 502) {
            throw new Error(this.t.dispatchRollbackError)
          }
          throw new Error(data?.error || 'dispatch_send_failed')
        }
        const row = this.rows.find((item) => item.id === orderId)
        this.queueNotice = `${this.t.sendDispatchDone}: ${row?.orderNumber || row?.internalOrderNumber || orderId}`
        this.closeDispatchModal()
      } catch (error) {
        const message = error?.message || 'Failed to send dispatch info'
        this.queueNotice = message
        this.dispatchModal.error = message
      } finally {
        this.$set(this.quickDispatchSavingByOrder, orderId, false)
      }
    },
    async queueAllMarked () {
      if (this.queueBulkSaving) return
      this.queueBulkSaving = true
      this.queueNotice = ''
      try {
        const markedIds = this.displayedTableRows
          .filter((row) => row.id && row.needsInfo)
          .map((row) => row.id)
        if (!markedIds.length) {
          this.queueNotice = this.$store.state.language === 'ru'
            ? 'В текущем списке нет отмеченных заказов с ID'
            : 'No flagged orders with ID in current list'
          return
        }
        const response = await fetch('/api/admin/chats/queue-marked', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `chat-queue-marked-${Date.now()}`,
            ...this.headers()
          },
          body: JSON.stringify({ orderIds: markedIds })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'bulk_queue_failed')
        this.queueNotice = `${this.t.queueBulkDone}: total=${data.totalMarked || 0}, created=${data.created || 0}, updated=${data.updated || 0}`
      } catch (error) {
        this.queueNotice = error?.message || 'Failed to queue marked orders'
      } finally {
        this.queueBulkSaving = false
      }
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
    matchesActiveView (row) {
      return this.matchesViewKey(row, this.activeView)
    },
    matchesViewKey (row, key) {
      switch (key) {
        case 'needs_info':
          return Boolean(row?.needsInfo)
        case 'unassigned':
          return !String(row?.driver || '').trim()
        case 'ready':
          return !row?.needsInfo && !this.isProblemRow(row)
        case 'problem':
          return this.isProblemRow(row)
        case 'all':
        default:
          return true
      }
    },
    viewCount (key) {
      return (this.filteredRows || []).filter((row) => this.matchesViewKey(row, key)).length
    },
    isProblemRow (row) {
      const status = String(row?.status || '').toLowerCase()
      if (row?.needsInfo) return true
      if (!String(row?.driver || '').trim()) return true
      if (!String(row?.sum || '').trim()) return true
      return ['dispatch_risk', 'incident_open', 'incident_reported', 'finance_hold', 'cancelled'].includes(status)
    },
    isLikelyToday (row) {
      const token = String(row?.date || '').trim()
      if (!token) return false
      const today = new Date()
      const candidates = [
        today.toISOString().slice(0, 10),
        today.toLocaleDateString('ru-RU'),
        today.toLocaleDateString('en-GB'),
        `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`
      ]
      return candidates.some((candidate) => token.includes(candidate))
    },
    routeLabel (row) {
      return [row?.fromPoint, row?.toPoint].filter(Boolean).join(' → ') || '-'
    },
    orderIdentity (row) {
      return [row?.orderNumber, row?.internalOrderNumber].filter(Boolean).join(' / ') || '-'
    },
    commentSummary (row) {
      const text = String(row?.comment || '').trim()
      if (!text) return this.$store.state.language === 'ru' ? 'Без комментария' : 'No comment'
      return text.length > 80 ? `${text.slice(0, 77)}…` : text
    },
    issueSummary (row) {
      if (row?.needsInfo) return row?.infoReason || (this.$store.state.language === 'ru' ? 'Нужно уточнение' : 'Needs clarification')
      if (!String(row?.driver || '').trim()) return this.$store.state.language === 'ru' ? 'Нужно назначить водителя' : 'Driver assignment required'
      const status = String(row?.status || '').toLowerCase()
      if (['dispatch_risk', 'incident_open', 'incident_reported', 'finance_hold', 'cancelled'].includes(status)) return this.statusLabel(status)
      return this.$store.state.language === 'ru' ? 'Критичных блокеров нет' : 'No critical blocker'
    },
    priceContextLabel (row) {
      const text = String(row?.sum || '').trim()
      if (!text) return this.$store.state.language === 'ru' ? 'Цена не указана' : 'Price missing'
      return this.$store.state.language === 'ru' ? 'Продажная цена из таблицы' : 'Sales price from sheet'
    },
    driverStateLabel (row) {
      return String(row?.driver || '').trim()
        ? (this.$store.state.language === 'ru' ? 'Назначен в таблице' : 'Assigned in sheet')
        : (this.$store.state.language === 'ru' ? 'Ждёт распределения' : 'Awaiting dispatch')
    },
    primaryActionLabel (row) {
      if (row?.needsInfo) return this.sendToChatSavingByOrder[row.id] ? this.t.sendingToChat : this.t.sendToChat
      if (!String(row?.driver || '').trim()) return this.sendToChatSavingByOrder[row.id] ? this.t.sendingToChat : this.t.sendToChat
      return this.quickDispatchSavingByOrder[row.id] ? this.t.sendingDispatchNow : this.t.sendDispatchNow
    },
    rowPrimaryBusy (row) {
      if (!row?.id) return true
      if (row?.needsInfo || !String(row?.driver || '').trim()) return Boolean(this.sendToChatSavingByOrder[row.id])
      return Boolean(this.quickDispatchSavingByOrder[row.id])
    },
    runPrimaryAction (row) {
      if (!row || !row.id) return
      if (row.needsInfo || !String(row?.driver || '').trim()) {
        this.sendToChat(row)
        return
      }
      this.openDispatchModal(row)
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
    openInfoModal (order) {
      if (!order || !order.id) return
      this.infoModal.orderId = order.id
      this.infoModal.needsInfo = Boolean(order.needsInfo)
      this.infoModal.reason = order.infoReason || ''
      this.infoModal.label = order.orderNumber || order.internalOrderNumber || order.contractor || order.id
      this.infoModal.message = ''
      this.infoModal.error = ''
      this.infoModal.open = true
    },
    closeInfoModal () {
      this.infoModal.open = false
      this.infoModal.orderId = null
      this.infoModal.needsInfo = true
      this.infoModal.reason = ''
      this.infoModal.label = ''
      this.infoModal.message = ''
      this.infoModal.error = ''
    },
    infoPresetFromRow (row) {
      if (!row || !row.needsInfo) return 'none'
      const reason = String(row.infoReason || '').toLowerCase()
      if (reason.includes('багаж') || reason.includes('luggage') || reason.includes('baggage')) return 'baggage'
      if (reason.includes('место подачи') || reason.includes('pickup')) return 'pickup'
      if (reason.includes('рейс') || reason.includes('flight')) return 'flight'
      return 'other'
    },
    infoPresetReason (preset) {
      const map = {
        baggage: this.t.infoPresetBaggage,
        pickup: this.t.infoPresetPickup,
        flight: this.t.infoPresetFlight
      }
      return map[preset] || ''
    },
    async onInfoQuickChange (order, preset) {
      if (!order || !order.id || this.infoSaving) return
      if (preset === 'other') {
        this.openInfoModal({ ...order, needsInfo: true })
        return
      }
      if (preset === 'none') {
        await this.updateInfoNote(order.id, false, null)
        return
      }
      const reason = this.infoPresetReason(preset)
      await this.updateInfoNote(order.id, true, reason || null)
    },
    async updateInfoNote (orderId, needsInfo, infoReason) {
      const payload = {
        needsInfo: Boolean(needsInfo),
        infoReason: needsInfo ? (String(infoReason || '').trim() || null) : null
      }
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/info-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `order-info-${orderId}-${Date.now()}`,
          ...this.headers()
        },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || this.t.infoModalError)
      const updated = data?.order
      if (!updated) throw new Error(this.t.infoModalError)
      this.rows = this.rows.map((row) => (
        row.id === updated.id
          ? { ...row, needsInfo: Boolean(updated.needsInfo), infoReason: updated.infoReason || null }
          : row
      ))
      if (this.selectedOrder && this.selectedOrder.id === updated.id) {
        this.selectedOrder = { ...this.selectedOrder, needsInfo: Boolean(updated.needsInfo), infoReason: updated.infoReason || null }
      }
      this.applyFilter()
      return updated
    },
    async saveInfoNote () {
      if (!this.infoModal.orderId || this.infoSaving) return
      this.infoSaving = true
      this.infoModal.message = ''
      this.infoModal.error = ''
      try {
        const reasonValue = String(this.infoModal.reason || '').trim()
        const updated = await this.updateInfoNote(this.infoModal.orderId, this.infoModal.needsInfo, reasonValue || null)
        this.infoModal.reason = updated.infoReason || ''
        this.infoModal.message = updated.needsInfo ? this.t.infoMarkedSuccess : this.t.infoRemovedSuccess
      } catch (error) {
        this.infoModal.error = error?.message || this.t.infoModalError
      } finally {
        this.infoSaving = false
      }
    },
    infoReasonTooltip (reason) {
      if (!reason) return ''
      return this.$store.state.language === 'ru'
        ? `Причина: ${reason}`
        : `Reason: ${reason}`
    },
    async loadOrderCardData (orderId) {
      this.historyLoading = true
      this.historyError = ''
      this.orderCardDetailError = ''
      this.transitionsError = ''
      try {
        const [historyResponse, transitionsResponse, detailResponse] = await Promise.all([
          fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status-history`, { headers: this.headers() }),
          fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/available-status-transitions`, { headers: this.headers() }),
          fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/card-detail`, { headers: this.headers() })
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

        if (detailResponse.ok) {
          const detailData = await detailResponse.json()
          const detail = detailData?.detail || {}
          this.selectedOrder = {
            ...this.selectedOrder,
            flightNumber: detail.flightNumber || null,
            flightCheck: detail.flightCheck || null,
            addressVerification: detail.addressVerification || null,
            qualityChecks: Array.isArray(detail.qualityChecks) ? detail.qualityChecks : [],
            sourceType: detail.sourceType || null,
            orderComment: detail.comment || null
          }
        } else {
          this.orderCardDetailError = this.$store.state.language === 'ru'
            ? 'Не удалось загрузить детали карточки'
            : 'Failed to load order card details'
        }
      } catch (_) {
        this.historyError = this.$store.state.language === 'ru'
          ? 'Не удалось загрузить историю статусов'
          : 'Failed to load status history'
        this.transitionsError = this.$store.state.language === 'ru'
          ? 'Не удалось загрузить доступные переходы'
          : 'Failed to load available transitions'
        this.orderCardDetailError = this.$store.state.language === 'ru'
          ? 'Не удалось загрузить детали карточки'
          : 'Failed to load order card details'
      } finally {
        this.historyLoading = false
      }
    },
    async runOrderFlightCheck () {
      if (!this.selectedOrder || !this.selectedOrder.id || this.flightCheckSaving) return
      this.flightCheckSaving = true
      this.orderCardDetailError = ''
      try {
        const response = await fetch(`/api/admin/orders/${encodeURIComponent(this.selectedOrder.id)}/flight-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.headers()
          }
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || 'failed')
        const payload = data?.draft?.payload || {}
        this.selectedOrder = {
          ...this.selectedOrder,
          flightCheck: payload.flightCheck || data?.flightCheck || null,
          qualityChecks: Array.isArray(payload.qualityChecks) ? payload.qualityChecks : (this.selectedOrder.qualityChecks || [])
        }
      } catch (error) {
        this.orderCardDetailError = error?.message || (this.$store.state.language === 'ru'
          ? 'Не удалось проверить рейс'
          : 'Failed to check flight')
      } finally {
        this.flightCheckSaving = false
      }
    },
    async runOrderAddressCheck () {
      if (!this.selectedOrder || !this.selectedOrder.id || this.addressCheckSaving) return
      this.addressCheckSaving = true
      this.orderCardDetailError = ''
      try {
        const response = await fetch(`/api/admin/orders/${encodeURIComponent(this.selectedOrder.id)}/address-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.headers()
          }
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || 'failed')
        const payload = data?.draft?.payload || {}
        this.selectedOrder = {
          ...this.selectedOrder,
          addressVerification: payload.addressVerification || data?.addressVerification || null,
          qualityChecks: Array.isArray(payload.qualityChecks) ? payload.qualityChecks : (this.selectedOrder.qualityChecks || [])
        }
      } catch (error) {
        this.orderCardDetailError = error?.message || (this.$store.state.language === 'ru'
          ? 'Не удалось проверить адреса'
          : 'Failed to check addresses')
      } finally {
        this.addressCheckSaving = false
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
      this.orderCardDetailError = ''
      this.availableStatuses = []
      this.selectedToStatus = ''
      this.statusReason = ''
      this.statusSaving = false
      this.flightCheckSaving = false
      this.addressCheckSaving = false
      this.transitionsError = ''
    },
    flightArrivalValue (flightCheck) {
      const match = flightCheck && flightCheck.bestMatch ? flightCheck.bestMatch : null
      return match ? (match.arrivalEstimated || match.arrivalScheduled || match.arrivalActual || '-') : '-'
    },
    flightRouteValue (flightCheck) {
      const match = flightCheck && flightCheck.bestMatch ? flightCheck.bestMatch : null
      if (!match) return '-'
      return [match.departureIata || match.departureAirport || null, match.arrivalIata || match.arrivalAirport || null].filter(Boolean).join(' → ') || '-'
    },
    addressNormalizedValue (addressVerification, pointKey) {
      const match = addressVerification && addressVerification[pointKey] && addressVerification[pointKey].bestMatch
        ? addressVerification[pointKey].bestMatch
        : null
      return match ? (match.displayName || '-') : '-'
    },
    addressCoordsValue (addressVerification, pointKey) {
      const match = addressVerification && addressVerification[pointKey] && addressVerification[pointKey].bestMatch
        ? addressVerification[pointKey].bestMatch
        : null
      if (!match) return '-'
      if (match.lat == null || match.lon == null) return '-'
      return `${Number(match.lat).toFixed(5)}, ${Number(match.lon).toFixed(5)}`
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
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}
.page-subtitle {
  margin: 6px 0 0;
  max-width: 820px;
  color: #60708f;
  font-size: 15px;
  line-height: 1.55;
}
.page-head-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.overview-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.overview-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid #d8e0ef;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
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
.view-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}
.view-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid #d8e0ef;
  background: #fff;
  color: #2f3e60;
  font-weight: 700;
}
.view-pill__count {
  display: inline-flex;
  min-width: 28px;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: #324473;
  font-size: 12px;
}
.view-pill--active {
  background: linear-gradient(135deg, #15316d 0%, #2b6eff 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 14px 30px rgba(22, 51, 109, 0.18);
}
.view-pill--active .view-pill__count {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}
.toolbar {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}
.toolbar-search {
  min-width: 0;
}
.toolbar-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
}
.toolbar-meta__title {
  font-weight: 700;
}
.toolbar-meta__value {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #edf4ff;
  color: #223356;
  font-weight: 700;
}
.input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #c8ccdc; background: #fff; color: #1f2b46; }
.table-wrap { background: #fff; border: 1px solid #d8d8e6; border-radius: 12px; overflow: auto; }
.table-head, .table-row { gap: 14px; min-width: 1500px; padding: 12px 14px; }
.table-head { font-weight: 700; border-bottom: 1px solid #e4e7f0; }
.table-row { border-top: 1px solid #f0f2f7; color: #2f3e60; }
.table-row--group-start { border-top: 2px solid #8ea2c9; }
.table-row--matched { background: #fff8dd; }
.main-grid { display: grid; grid-template-columns: 180px minmax(260px, 1.25fr) 200px 120px 150px 220px 240px; align-items: start; }
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
.order-meta,
.route-block,
.client-block,
.price-block,
.driver-block,
.issue-block {
  display: grid;
  gap: 6px;
}
.order-meta__date,
.route-block__title,
.price-block__sum,
.driver-block__name,
.issue-block__title {
  font-weight: 700;
  color: #17233d;
}
.order-meta__sub,
.route-block__sub,
.client-block__line,
.price-block__hint,
.driver-block__hint,
.issue-block__hint {
  font-size: 12px;
  line-height: 1.45;
  color: #64748b;
}
.route-block__route {
  font-size: 14px;
  line-height: 1.5;
  color: #334155;
}
.card-link {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #1e3a8a;
  padding: 4px 10px;
  border-radius: 8px;
  font-weight: 600;
}
.card-link--primary {
  border-color: #0ea5e9;
  background: #e0f2fe;
  color: #0c4a6e;
}
.card-link--success {
  border-color: #16a34a;
  background: #dcfce7;
  color: #166534;
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
.row-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}
.row-actions__secondary {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.action-select {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #1e293b;
  border-radius: 8px;
  padding: 5px 8px;
  min-width: 170px;
  width: 100%;
}
.info-reason {
  font-size: 12px;
  color: #475569;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.checks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #334155;
}
.pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.pill--ok {
  background: #dcfce7;
  color: #166534;
}
.pill--warn {
  background: #fef3c7;
  color: #92400e;
}
.pill--error,
.pill--danger {
  background: #fee2e2;
  color: #991b1b;
}
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
.info-modal-card {
  width: min(520px, 100%);
}
.info-modal-label {
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}
.info-modal-hint {
  margin-top: 0;
  margin-bottom: 12px;
}
.info-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}
.info-textarea {
  min-height: 96px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  padding: 10px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}
.info-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 8px;
}
.info-toggle input {
  width: 16px;
  height: 16px;
}
.info-modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  justify-content: flex-end;
}
@media (max-width: 900px) {
  .page-head {
    flex-direction: column;
  }
  .overview-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .toolbar {
    grid-template-columns: 1fr;
  }
  .meta-grid { grid-template-columns: 1fr; }
  .status-change-row { grid-template-columns: 1fr; }
  .main-grid {
    min-width: 1180px;
  }
}
@media (max-width: 640px) {
  .overview-strip {
    grid-template-columns: 1fr;
  }
}
</style>
