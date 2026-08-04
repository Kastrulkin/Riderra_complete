<template>
  <div>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf matrix-section">
      <div class="container">
        <admin-tabs />
        <network-direction-views />

        <div class="workspace-tabs" role="tablist" :aria-label="t.workspaceLabel">
          <button type="button" class="workspace-tab" :class="{ 'workspace-tab--active': activeWorkspace === 'coverage' }" @click="activeWorkspace = 'coverage'">
            {{ t.coverageTab }}
          </button>
          <button type="button" class="workspace-tab" :class="{ 'workspace-tab--active': activeWorkspace === 'benchmarks' }" @click="openBenchmarks">
            {{ t.benchmarkTab }}
            <span v-if="benchmarkSummary.total" class="workspace-tab__count">{{ benchmarkSummary.total }}</span>
          </button>
        </div>

        <template v-if="activeWorkspace === 'coverage'">
        <div class="section-actions">
          <button class="btn btn--ghost" @click="load">{{ t.refresh }}</button>
        </div>

        <div class="overview-strip">
          <div v-for="card in overviewCards" :key="card.key" class="overview-card" :class="`overview-card--${card.tone}`">
            <div class="overview-card__value">{{ card.value }}</div>
            <div class="overview-card__label">{{ card.label }}</div>
            <div class="overview-card__hint">{{ card.hint }}</div>
          </div>
        </div>

        <div class="view-strip">
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
            <span class="toolbar-meta__title">{{ t.activeView }}:</span>
            <strong class="toolbar-meta__value">{{ currentViewLabel }}</strong>
          </div>
        </div>

        <div class="matrix-list">
          <div class="matrix-list__head">
            <div>{{ t.location }}</div>
            <div>{{ t.clients }}</div>
            <div>{{ t.suppliers }}</div>
            <div>{{ t.managementSignal }}</div>
          </div>

          <div
            v-for="row in displayedRows"
            :key="`${row.country}::${row.city}`"
            class="matrix-row"
          >
            <div class="location-cell">
              <div class="location-cell__country">{{ row.country }}</div>
              <div class="location-cell__city">{{ row.city }}</div>
              <div class="location-cell__meta">
                {{ row.clientsCount }} {{ t.clientsShort }} · {{ row.suppliersCount }} {{ t.suppliersShort }}
              </div>
            </div>

            <div class="entity-cell">
              <div v-if="row.clients.length" class="entity-list">
                <button
                  v-for="item in row.clients"
                  :key="item.id"
                  class="entity-pill entity-pill--client"
                  @click="openCompany(item.id)"
                >
                  {{ item.name }}
                </button>
              </div>
              <div v-else class="muted">{{ t.noClients }}</div>
            </div>

            <div class="entity-cell">
              <div v-if="row.suppliers.length" class="entity-list">
                <button
                  v-for="item in row.suppliers"
                  :key="item.id"
                  class="entity-pill entity-pill--supplier"
                  @click="openCompany(item.id)"
                >
                  {{ item.name }}
                </button>
              </div>
              <div v-else class="muted">{{ t.noSuppliers }}</div>
            </div>

            <div class="signal-cell">
              <strong class="signal-cell__title">{{ signalTitle(row) }}</strong>
              <p class="signal-cell__copy">{{ signalCopy(row) }}</p>
              <span class="signal-pill" :class="`signal-pill--${signalTone(row)}`">{{ signalLabel(row) }}</span>
            </div>
          </div>

          <div v-if="!displayedRows.length" class="empty-state">{{ t.empty }}</div>
        </div>
        </template>

        <template v-else>
          <div class="benchmark-hero">
            <div>
              <h2>{{ t.benchmarkTitle }}</h2>
              <p>{{ t.benchmarkSubtitle }}</p>
            </div>
            <button class="btn btn--primary" type="button" @click="openPointForm()">{{ t.addPoint }}</button>
          </div>

          <div class="benchmark-summary">
            <div><strong>{{ benchmarkSummary.total || 0 }}</strong><span>{{ t.allPoints }}</span></div>
            <div><strong>{{ benchmarkSummary.verified || 0 }}</strong><span>{{ t.verified }}</span></div>
            <div><strong>{{ (benchmarkSummary.candidate || 0) + (benchmarkSummary.needs_review || 0) }}</strong><span>{{ t.awaitingReview }}</span></div>
            <div><strong>{{ benchmarkSummary.coveredZones || 0 }}</strong><span>{{ t.coveredZones }}</span></div>
          </div>

          <div class="benchmark-note">
            <strong>{{ t.howItWorks }}</strong>
            <span>{{ t.howItWorksCopy }}</span>
          </div>

          <div class="toolbar benchmark-toolbar">
            <input v-model="benchmarkQuery" class="input toolbar-search" :placeholder="t.benchmarkSearch" @keyup.enter="loadBenchmarks" />
            <select v-model="benchmarkStatus" class="input status-filter" @change="loadBenchmarks">
              <option value="">{{ t.allStatuses }}</option>
              <option value="candidate">{{ statusLabel('candidate') }}</option>
              <option value="needs_review">{{ statusLabel('needs_review') }}</option>
              <option value="verified">{{ statusLabel('verified') }}</option>
              <option value="rejected">{{ statusLabel('rejected') }}</option>
            </select>
            <button class="btn btn--ghost" type="button" @click="loadBenchmarks">{{ t.refresh }}</button>
          </div>

          <div v-if="benchmarkError" class="form-error">{{ benchmarkError }}</div>
          <div class="benchmark-table">
            <div class="benchmark-table__head">
              <div>{{ t.route }}</div><div>{{ t.controlAddress }}</div><div>{{ t.geoZone }}</div><div>{{ t.status }}</div><div></div>
            </div>
            <div v-for="point in benchmarkPoints" :key="point.id" class="benchmark-row">
              <div>
                <strong>{{ point.airportIata || '—' }} · {{ point.city || point.country || '—' }}</strong>
                <small>{{ point.pickupAddress }}</small>
                <small v-if="point.sourceDistanceKm != null">{{ point.sourceDistanceKm }} km · {{ point.source }}</small>
              </div>
              <div class="benchmark-address">{{ point.destinationAddress }}</div>
              <div>{{ point.zoneName || t.zoneNotSelected }}</div>
              <div><span class="status-badge" :class="`status-badge--${point.status}`">{{ statusLabel(point.status) }}</span></div>
              <div><button class="link-button" type="button" @click="openPointForm(point)">{{ t.review }}</button></div>
            </div>
            <div v-if="!benchmarkLoading && !benchmarkPoints.length" class="empty-state">
              <strong>{{ t.noBenchmarkPoints }}</strong>
              <p>{{ t.noBenchmarkPointsCopy }}</p>
              <button class="btn btn--primary" type="button" @click="openPointForm()">{{ t.addFirstPoint }}</button>
            </div>
            <div v-if="benchmarkLoading" class="empty-state">{{ t.loading }}</div>
          </div>
        </template>
      </div>
    </section>

    <div v-if="companyModal.open" class="modal-overlay" @click="companyModal.open = false">
      <div class="modal" @click.stop>
        <div class="modal-head">
          <div>
            <h3>{{ companyForm.name || t.companyCard }}</h3>
            <p class="modal-subtitle">{{ t.companyCardHint }}</p>
          </div>
          <button class="modal-close" type="button" @click="companyModal.open = false">×</button>
        </div>

        <div class="grid two-cols">
          <input v-model="companyForm.name" class="input" :placeholder="t.companyName" />
          <input v-model="companyForm.website" class="input" :placeholder="t.website" />
          <input v-model="companyForm.phone" class="input" :placeholder="t.phone" />
          <input v-model="companyForm.email" class="input" placeholder="Email" />
          <input v-model="companyForm.telegramUrl" class="input" :placeholder="t.telegram" />
          <input v-model="companyForm.registrationCountry" class="input" :placeholder="t.registrationCountry" />
          <input v-model="companyForm.registrationCity" class="input" :placeholder="t.registrationCity" />
          <input v-model="companyForm.registrationAddress" class="input" :placeholder="t.registrationAddress" />
          <textarea
            v-model="companyForm.presenceMapText"
            class="input textarea textarea--wide"
            :placeholder="t.presencePlaceholder"
          />
          <textarea v-model="companyForm.comment" class="input textarea" :placeholder="t.comment"></textarea>
        </div>

        <div class="actions">
          <button class="btn btn--primary" @click="saveCompany">{{ t.save }}</button>
          <button class="btn" @click="companyModal.open = false">{{ t.close }}</button>
        </div>
      </div>
    </div>

    <div v-if="pointModal.open" class="modal-overlay" @click="pointModal.open = false">
      <div class="modal benchmark-modal" @click.stop>
        <div class="modal-head">
          <div><h3>{{ pointModal.id ? t.reviewPoint : t.addPoint }}</h3><p class="modal-subtitle">{{ t.pointFormHint }}</p></div>
          <button class="modal-close" type="button" @click="pointModal.open = false">×</button>
        </div>
        <div class="grid two-cols">
          <input v-model="pointForm.country" class="input" :placeholder="t.country" />
          <input v-model="pointForm.city" class="input" :placeholder="t.city" />
          <input v-model="pointForm.airportIata" class="input" :placeholder="t.airportIata" />
          <input v-model="pointForm.pickupAddress" class="input" :placeholder="t.pickupAddress" />
          <textarea v-model="pointForm.destinationAddress" class="input textarea textarea--wide" :placeholder="t.destinationAddress"></textarea>
          <input v-model="pointForm.latitude" class="input" :placeholder="t.latitude" />
          <input v-model="pointForm.longitude" class="input" :placeholder="t.longitude" />
          <select v-model="pointForm.zoneName" class="input textarea--wide">
            <option value="">{{ t.chooseZone }}</option>
            <option v-for="zone in geoZones" :key="zone.id || zone.name" :value="zone.name">{{ zone.name }}</option>
          </select>
          <input v-model="pointForm.smartRydePickupPlaceId" class="input" :placeholder="t.smartRydePickupId" />
          <input v-model="pointForm.smartRydeDropoffPlaceId" class="input" :placeholder="t.smartRydeDropoffId" />
          <textarea v-model="pointForm.reviewNote" class="input textarea textarea--wide" :placeholder="t.reviewNote"></textarea>
        </div>
        <div v-if="pointFormError" class="form-error">{{ pointFormError }}</div>
        <div class="actions">
          <button class="btn btn--primary" type="button" @click="savePoint('verified')">{{ t.verifyAndSave }}</button>
          <button class="btn" type="button" @click="savePoint('needs_review')">{{ t.saveForReview }}</button>
          <button v-if="pointModal.id" class="btn btn--danger" type="button" @click="savePoint('rejected')">{{ t.reject }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import adminTabs from '~/components/partials/adminTabs.vue'
import networkDirectionViews from '~/components/partials/networkDirectionViews.vue'

export default {
  layout: 'admin',
  middleware: 'crm',
  components: { adminTabs, networkDirectionViews },
  data: () => ({
    activeWorkspace: 'coverage',
    rows: [],
    filtered: [],
    q: '',
    activeView: 'all',
    companyModal: { open: false, id: '' },
    companyForm: {},
    benchmarkPoints: [],
    benchmarkSummary: {},
    benchmarkQuery: '',
    benchmarkStatus: '',
    benchmarkLoading: false,
    benchmarkError: '',
    geoZones: [],
    pointModal: { open: false, id: '' },
    pointForm: {},
    pointFormError: ''
  }),
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'Матрица направлений',
            subtitle: 'Это не просто справочник городов, а экран покрытия: где есть заказчики, где есть исполнители и где команде нужно двигаться дальше.',
            refresh: 'Обновить',
            search: 'Поиск по стране, городу, заказчику или исполнителю',
            activeView: 'Показан срез',
            location: 'Локация',
            clients: 'Заказчики',
            suppliers: 'Исполнители',
            managementSignal: 'Следующий управленческий шаг',
            clientsShort: 'заказч.',
            suppliersShort: 'исполн.',
            noClients: 'Нет заказчиков',
            noSuppliers: 'Нет исполнителей',
            empty: 'По этому фильтру пока ничего не найдено.',
            companyCard: 'Карточка компании',
            companyCardHint: 'Отсюда можно быстро поправить географию и контакты компании, если из матрицы видно пробелы.',
            companyName: 'Название',
            website: 'Сайт',
            phone: 'Телефон',
            telegram: 'Telegram ссылка',
            registrationCountry: 'Страна регистрации',
            registrationCity: 'Город регистрации',
            registrationAddress: 'Адрес регистрации',
            presencePlaceholder: 'География присутствия\nUnited Kingdom: London, Manchester\nUAE: Dubai, Abu Dhabi',
            comment: 'Комментарий',
            save: 'Сохранить',
            close: 'Закрыть',
            workspaceLabel: 'Разделы направлений',
            coverageTab: 'Покрытие',
            benchmarkTab: 'Контрольные адреса',
            benchmarkTitle: 'База контрольных адресов',
            benchmarkSubtitle: 'Точные точки внутри геозон Riderra для проверки публичных цен SmartRyde и других агрегаторов.',
            addPoint: 'Добавить адрес',
            allPoints: 'всего адресов',
            verified: 'подтверждено',
            awaitingReview: 'ждут проверки',
            coveredZones: 'геозон покрыто',
            howItWorks: 'Как используется:',
            howItWorksCopy: 'в анализ цен попадают только подтверждённые адреса с выбранной геозоной. Импортированные точки сначала требуют ручной проверки.',
            benchmarkSearch: 'Страна, город, IATA, адрес или геозона',
            allStatuses: 'Все статусы',
            route: 'Аэропорт / город',
            controlAddress: 'Контрольный адрес',
            geoZone: 'Геозона Riderra',
            status: 'Статус',
            zoneNotSelected: 'Не выбрана',
            review: 'Проверить',
            noBenchmarkPoints: 'База адресов пока пуста',
            noBenchmarkPointsCopy: 'Добавьте первую точную точку внутри геозоны или импортируйте подготовленный список.',
            addFirstPoint: 'Добавить первый адрес',
            loading: 'Загрузка…',
            reviewPoint: 'Проверка контрольного адреса',
            pointFormHint: 'Проверьте точный адрес и выберите геозону. Координаты позволяют автоматически сверить попадание в KML-полигон.',
            country: 'Страна',
            city: 'Город',
            airportIata: 'IATA аэропорта',
            pickupAddress: 'Точный адрес отправления',
            destinationAddress: 'Точный контрольный адрес назначения',
            latitude: 'Широта (необязательно)',
            longitude: 'Долгота (необязательно)',
            chooseZone: 'Выберите геозону Riderra',
            smartRydePickupId: 'SmartRyde Place ID отправления',
            smartRydeDropoffId: 'SmartRyde Place ID назначения',
            reviewNote: 'Комментарий проверяющего',
            verifyAndSave: 'Подтвердить адрес',
            saveForReview: 'Сохранить для проверки',
            reject: 'Отклонить',
            statuses: { candidate: 'Кандидат', needs_review: 'Нужна проверка', verified: 'Подтверждён', rejected: 'Отклонён' },
            views: {
              all: 'Все направления',
              demand_gap: 'Есть спрос, нет исполнителей',
              supply_gap: 'Есть исполнители, нет заказчиков',
              covered: 'Есть обе стороны',
              empty: 'Пустые точки'
            },
            hints: {
              all: 'Полная картина покрытия по городам',
              demand_gap: 'Клиенты уже есть, нужно добирать исполнителей',
              supply_gap: 'Исполнители есть, можно предлагать направление заказчикам',
              covered: 'Город уже покрыт с обеих сторон',
              empty: 'Город пока не привязан ни к одной стороне'
            },
            signal: {
              demand_gap: 'Нужно искать исполнителей',
              supply_gap: 'Нужно развивать продажи',
              covered: 'Направление покрыто',
              empty: 'Нет покрытия',
              monitor: 'Нужно следить'
            },
            signalCopy: {
              demand_gap: 'В городе уже есть заказчики. Следующий шаг — найти и завести исполнителей, чтобы не терять запросы.',
              supply_gap: 'Исполнители в городе уже есть. Следующий шаг — предложить направление действующим и потенциальным заказчикам.',
              covered: 'В городе есть и заказчики, и исполнители. Дальше важно следить за актуальностью контактов и цен.',
              empty: 'Город в матрице пока не даёт опоры для работы. Нужен ручной разбор, стоит ли вообще держать его в активном фокусе.',
              monitor: 'Ситуация рабочая, но есть смысл проверить контакты и качество покрытия.'
            }
          }
        : {
            title: 'Directions Matrix',
            subtitle: 'This is not only a city directory. It is a coverage screen that shows where demand exists, where suppliers exist, and what the team should do next.',
            refresh: 'Refresh',
            search: 'Search by country, city, client or supplier',
            activeView: 'Current view',
            location: 'Location',
            clients: 'Clients',
            suppliers: 'Suppliers',
            managementSignal: 'Next management step',
            clientsShort: 'clients',
            suppliersShort: 'suppliers',
            noClients: 'No clients',
            noSuppliers: 'No suppliers',
            empty: 'Nothing found for this view yet.',
            companyCard: 'Company card',
            companyCardHint: 'Use this to quickly adjust company geography and contacts when the matrix reveals gaps.',
            companyName: 'Name',
            website: 'Website',
            phone: 'Phone',
            telegram: 'Telegram link',
            registrationCountry: 'Registration country',
            registrationCity: 'Registration city',
            registrationAddress: 'Registration address',
            presencePlaceholder: 'Coverage geography\nUnited Kingdom: London, Manchester\nUAE: Dubai, Abu Dhabi',
            comment: 'Comment',
            save: 'Save',
            close: 'Close',
            workspaceLabel: 'Directions sections',
            coverageTab: 'Coverage',
            benchmarkTab: 'Control addresses',
            benchmarkTitle: 'Control address database',
            benchmarkSubtitle: 'Exact points inside Riderra zones for checking public SmartRyde and other aggregator prices.',
            addPoint: 'Add address',
            allPoints: 'all addresses',
            verified: 'verified',
            awaitingReview: 'awaiting review',
            coveredZones: 'zones covered',
            howItWorks: 'How it works:',
            howItWorksCopy: 'only verified addresses with a selected zone are used in price analysis. Imported points require human review first.',
            benchmarkSearch: 'Country, city, IATA, address or zone',
            allStatuses: 'All statuses',
            route: 'Airport / city',
            controlAddress: 'Control address',
            geoZone: 'Riderra zone',
            status: 'Status',
            zoneNotSelected: 'Not selected',
            review: 'Review',
            noBenchmarkPoints: 'The address database is empty',
            noBenchmarkPointsCopy: 'Add an exact point inside a zone or import a prepared list.',
            addFirstPoint: 'Add first address',
            loading: 'Loading…',
            reviewPoint: 'Review control address',
            pointFormHint: 'Check the exact address and select its zone. Coordinates enable automatic KML polygon validation.',
            country: 'Country', city: 'City', airportIata: 'Airport IATA', pickupAddress: 'Exact pickup address',
            destinationAddress: 'Exact control destination address', latitude: 'Latitude (optional)', longitude: 'Longitude (optional)',
            chooseZone: 'Select Riderra zone', smartRydePickupId: 'SmartRyde pickup Place ID', smartRydeDropoffId: 'SmartRyde drop-off Place ID',
            reviewNote: 'Reviewer note', verifyAndSave: 'Verify address', saveForReview: 'Save for review', reject: 'Reject',
            statuses: { candidate: 'Candidate', needs_review: 'Needs review', verified: 'Verified', rejected: 'Rejected' },
            views: {
              all: 'All directions',
              demand_gap: 'Demand without suppliers',
              supply_gap: 'Suppliers without clients',
              covered: 'Covered directions',
              empty: 'Empty points'
            },
            hints: {
              all: 'Full coverage picture by city',
              demand_gap: 'Clients exist, suppliers still need to be added',
              supply_gap: 'Suppliers exist, clients can be developed',
              covered: 'Both sides are present in the city',
              empty: 'City is not attached to either side yet'
            },
            signal: {
              demand_gap: 'Find suppliers',
              supply_gap: 'Push sales',
              covered: 'Direction covered',
              empty: 'No coverage',
              monitor: 'Monitor'
            },
            signalCopy: {
              demand_gap: 'Clients already exist in this city. The next step is to onboard suppliers so requests are not lost.',
              supply_gap: 'Suppliers already exist in this city. The next step is to pitch the direction to current and potential clients.',
              covered: 'Both clients and suppliers exist here. The next step is to keep contacts and pricing up to date.',
              empty: 'This city currently does not support operations. A manual decision is needed on whether to keep it in focus.',
              monitor: 'The situation is workable, but coverage and contacts should still be reviewed.'
            }
          }
    },
    savedViews () {
      return [
        { key: 'all', label: this.t.views.all, hint: this.t.hints.all },
        { key: 'demand_gap', label: this.t.views.demand_gap, hint: this.t.hints.demand_gap },
        { key: 'supply_gap', label: this.t.views.supply_gap, hint: this.t.hints.supply_gap },
        { key: 'covered', label: this.t.views.covered, hint: this.t.hints.covered },
        { key: 'empty', label: this.t.views.empty, hint: this.t.hints.empty }
      ]
    },
    currentViewLabel () {
      return this.savedViews.find((view) => view.key === this.activeView)?.label || this.savedViews[0].label
    },
    displayedRows () {
      return this.filtered.filter((row) => this.matchesView(row, this.activeView))
    },
    overviewCards () {
      const rows = this.filtered
      const withDemandGap = rows.filter((row) => row.clientsCount > 0 && row.suppliersCount === 0).length
      const withSupplyGap = rows.filter((row) => row.suppliersCount > 0 && row.clientsCount === 0).length
      const covered = rows.filter((row) => row.clientsCount > 0 && row.suppliersCount > 0).length
      const empty = rows.filter((row) => row.clientsCount === 0 && row.suppliersCount === 0).length
      return [
        { key: 'all', value: rows.length, label: this.t.views.all, hint: this.t.hints.all, tone: 'neutral' },
        { key: 'demand_gap', value: withDemandGap, label: this.t.views.demand_gap, hint: this.t.hints.demand_gap, tone: withDemandGap ? 'warn' : 'neutral' },
        { key: 'supply_gap', value: withSupplyGap, label: this.t.views.supply_gap, hint: this.t.hints.supply_gap, tone: withSupplyGap ? 'info' : 'neutral' },
        { key: 'covered', value: covered, label: this.t.views.covered, hint: this.t.hints.covered, tone: covered ? 'ok' : 'neutral' },
        { key: 'empty', value: empty, label: this.t.views.empty, hint: this.t.hints.empty, tone: empty ? 'critical' : 'neutral' }
      ]
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    authHeaders () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' }
    },
    statusLabel (status) {
      return this.t.statuses?.[status] || status
    },
    async openBenchmarks () {
      this.activeWorkspace = 'benchmarks'
      if (!this.benchmarkPoints.length) await Promise.all([this.loadBenchmarks(), this.loadGeoZones()])
    },
    async loadBenchmarks () {
      this.benchmarkLoading = true
      this.benchmarkError = ''
      try {
        const params = new URLSearchParams({ limit: '500' })
        if (this.benchmarkQuery.trim()) params.set('q', this.benchmarkQuery.trim())
        if (this.benchmarkStatus) params.set('status', this.benchmarkStatus)
        const res = await fetch(`/api/admin/directions/benchmark-points?${params}`, { headers: this.authHeaders() })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load benchmark points')
        this.benchmarkPoints = data.rows || []
        this.benchmarkSummary = data.summary || {}
      } catch (error) {
        this.benchmarkError = error.message
      } finally {
        this.benchmarkLoading = false
      }
    },
    async loadGeoZones () {
      const res = await fetch('/api/admin/directions/geo-zone-catalog', { headers: this.authHeaders() })
      const data = await res.json()
      if (res.ok) this.geoZones = data.rows || []
    },
    openPointForm (point = null) {
      this.pointFormError = ''
      this.pointModal = { open: true, id: point?.id || '' }
      this.pointForm = point
        ? { ...point, latitude: point.latitude ?? '', longitude: point.longitude ?? '' }
        : { country: '', city: '', airportIata: '', pickupAddress: '', destinationAddress: '', latitude: '', longitude: '', zoneName: '', smartRydePickupPlaceId: '', smartRydeDropoffPlaceId: '', reviewNote: '' }
      if (!this.geoZones.length) this.loadGeoZones()
    },
    async savePoint (status) {
      this.pointFormError = ''
      try {
        const url = this.pointModal.id ? `/api/admin/directions/benchmark-points/${this.pointModal.id}` : '/api/admin/directions/benchmark-points'
        const res = await fetch(url, {
          method: this.pointModal.id ? 'PUT' : 'POST',
          headers: this.authHeaders(),
          body: JSON.stringify({ ...this.pointForm, status })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to save benchmark point')
        this.pointModal.open = false
        await this.loadBenchmarks()
      } catch (error) {
        this.pointFormError = error.message
      }
    },
    splitPresenceList (raw) {
      return String(raw || '')
        .split(/[,\n;|/]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    },
    buildPresenceMapText (countriesRaw, groupedRaw, flatCitiesRaw) {
      const groupedText = String(groupedRaw || '').trim()
      if (groupedText && groupedText.includes(':')) {
        return groupedText
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .join('\n')
      }

      const countries = this.splitPresenceList(countriesRaw)
      const cities = this.splitPresenceList(flatCitiesRaw || groupedRaw)

      if (!countries.length && !cities.length) return ''
      if (countries.length === 1 && cities.length) return `${countries[0]}: ${cities.join(', ')}`
      if (countries.length > 1 && !cities.length) return countries.join('\n')
      if (!countries.length && cities.length) return `Без страны: ${cities.join(', ')}`

      return [
        ...countries,
        cities.length ? `Без страны: ${cities.join(', ')}` : ''
      ].filter(Boolean).join('\n')
    },
    buildPresencePayload () {
      const rows = String(this.companyForm.presenceMapText || '')
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)

      const countries = []
      const cities = []
      const normalizedRows = []

      for (const row of rows) {
        const separator = row.indexOf(':')
        const hasSeparator = separator >= 0
        const country = (hasSeparator ? row.slice(0, separator) : row).trim()
        const cityChunk = hasSeparator ? row.slice(separator + 1).trim() : ''
        const rowCities = this.splitPresenceList(cityChunk)

        if (country && country.toLowerCase() !== 'без страны') countries.push(country)
        for (const city of rowCities) cities.push(city)

        if (country) {
          normalizedRows.push(rowCities.length ? `${country}: ${rowCities.join(', ')}` : country)
        } else if (rowCities.length) {
          normalizedRows.push(`Без страны: ${rowCities.join(', ')}`)
        }
      }

      return {
        presenceCountries: [...new Set(countries)].join(', '),
        countryPresence: [...new Set(countries)].join(', '),
        presenceCities: normalizedRows.join('\n'),
        cityPresence: [...new Set(cities)].join(', ')
      }
    },
    matchesView (row, view) {
      if (view === 'demand_gap') return row.clientsCount > 0 && row.suppliersCount === 0
      if (view === 'supply_gap') return row.suppliersCount > 0 && row.clientsCount === 0
      if (view === 'covered') return row.clientsCount > 0 && row.suppliersCount > 0
      if (view === 'empty') return row.clientsCount === 0 && row.suppliersCount === 0
      return true
    },
    viewCount (view) {
      return this.filtered.filter((row) => this.matchesView(row, view)).length
    },
    signalTone (row) {
      if (row.clientsCount > 0 && row.suppliersCount === 0) return 'warn'
      if (row.suppliersCount > 0 && row.clientsCount === 0) return 'info'
      if (row.clientsCount > 0 && row.suppliersCount > 0) return 'ok'
      return 'critical'
    },
    signalLabel (row) {
      if (row.clientsCount > 0 && row.suppliersCount === 0) return this.t.signal.demand_gap
      if (row.suppliersCount > 0 && row.clientsCount === 0) return this.t.signal.supply_gap
      if (row.clientsCount > 0 && row.suppliersCount > 0) return this.t.signal.covered
      return this.t.signal.empty
    },
    signalTitle (row) {
      return `${row.country} · ${row.city}`
    },
    signalCopy (row) {
      if (row.clientsCount > 0 && row.suppliersCount === 0) return this.t.signalCopy.demand_gap
      if (row.suppliersCount > 0 && row.clientsCount === 0) return this.t.signalCopy.supply_gap
      if (row.clientsCount > 0 && row.suppliersCount > 0) return this.t.signalCopy.covered
      return this.t.signalCopy.empty
    },
    async load () {
      const res = await fetch('/api/admin/crm/directions-matrix', { headers: this.authHeaders() })
      const data = await res.json()
      this.rows = data.rows || []
      this.applyFilter()
    },
    applyFilter () {
      const q = this.q.trim().toLowerCase()
      if (!q) {
        this.filtered = this.rows
        return
      }
      this.filtered = this.rows.filter((r) => {
        const clients = (r.clients || []).map((item) => item.name).join(' ')
        const suppliers = (r.suppliers || []).map((item) => item.name).join(' ')
        return `${r.country} ${r.city} ${clients} ${suppliers}`.toLowerCase().includes(q)
      })
    },
    async openCompany (id) {
      const res = await fetch(`/api/admin/crm/companies/${id}`, { headers: this.authHeaders() })
      const company = await res.json()
      this.companyModal = { open: true, id }
      this.companyForm = {
        name: company.name || '',
        website: company.website || '',
        phone: company.phone || '',
        email: company.email || '',
        telegramUrl: company.telegramUrl || '',
        registrationCountry: company.registrationCountry || company.countryPresence || '',
        registrationCity: company.registrationCity || '',
        registrationAddress: company.registrationAddress || '',
        presenceCountries: company.presenceCountries || '',
        presenceCities: company.presenceCities || '',
        cityPresence: company.cityPresence || '',
        presenceMapText: this.buildPresenceMapText(
          company.presenceCountries || company.countryPresence || '',
          company.presenceCities || '',
          company.cityPresence || ''
        ),
        comment: company.comment || ''
      }
    },
    async saveCompany () {
      await fetch(`/api/admin/crm/companies/${this.companyModal.id}`, {
        method: 'PUT',
        headers: this.authHeaders(),
        body: JSON.stringify({
          ...this.companyForm,
          ...this.buildPresencePayload()
        })
      })
      await this.load()
      this.companyModal.open = false
    }
  }
}
</script>

<style scoped>
.matrix-section {
  padding-top: 150px;
}

.workspace-tabs {
  display: flex;
  gap: 8px;
  margin: 18px 0;
  padding: 5px;
  width: fit-content;
  border: 1px solid #d8e0ef;
  border-radius: 16px;
  background: #fff;
}

.workspace-tab {
  border: 0;
  border-radius: 12px;
  padding: 10px 16px;
  background: transparent;
  color: #52617d;
  font-weight: 700;
  cursor: pointer;
}

.workspace-tab--active { background: #f6eaf9; color: #702283; }
.workspace-tab__count { margin-left: 6px; padding: 2px 7px; border-radius: 999px; background: #fff; }

.benchmark-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 22px;
  border-radius: 18px;
  background: linear-gradient(135deg, #fff 0%, #f9effb 100%);
  border: 1px solid #e4d5e8;
}

.benchmark-hero h2 { margin: 0; color: #1f2b46; }
.benchmark-hero p { margin: 8px 0 0; max-width: 760px; color: #60708f; line-height: 1.5; }
.benchmark-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 14px 0; }
.benchmark-summary > div { display: grid; gap: 4px; padding: 15px; border: 1px solid #dce3ef; border-radius: 14px; background: #fff; }
.benchmark-summary strong { font-size: 25px; color: #1d2c4a; }
.benchmark-summary span { color: #68758d; font-size: 13px; }
.benchmark-note { display: flex; gap: 8px; padding: 12px 15px; margin-bottom: 14px; border-radius: 12px; background: #eef7ff; color: #29456f; line-height: 1.45; }
.benchmark-toolbar { align-items: stretch; }
.status-filter { width: auto; min-width: 180px; }
.benchmark-table { overflow: hidden; border: 1px solid #d8dfe9; border-radius: 16px; background: #fff; }
.benchmark-table__head, .benchmark-row { display: grid; grid-template-columns: minmax(180px, .9fr) minmax(260px, 1.4fr) minmax(180px, .8fr) 150px 90px; gap: 12px; align-items: center; padding: 13px 16px; }
.benchmark-table__head { background: #f8faff; border-bottom: 1px solid #e2e7f0; color: #354563; font-weight: 700; }
.benchmark-row { border-bottom: 1px solid #eef1f6; color: #31405c; }
.benchmark-row small { display: block; margin-top: 5px; color: #7a8497; line-height: 1.35; }
.benchmark-address { line-height: 1.45; }
.status-badge { display: inline-flex; padding: 5px 9px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.status-badge--candidate { background: #f3f4f6; color: #4b5563; }
.status-badge--needs_review { background: #fff4d6; color: #8a5b00; }
.status-badge--verified { background: #eafaf0; color: #166534; }
.status-badge--rejected { background: #fef2f2; color: #991b1b; }
.link-button { border: 0; background: transparent; color: #702283; font-weight: 700; cursor: pointer; }
.form-error { margin: 10px 0; padding: 10px 12px; border-radius: 10px; background: #fef2f2; color: #991b1b; }
.btn--danger { background: #fef2f2; color: #991b1b; }

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 18px;
}

.page-subtitle {
  margin: 6px 0 0;
  max-width: 860px;
  color: #60708f;
  font-size: 15px;
  line-height: 1.55;
}

.overview-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}

.overview-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid #d8e0ef;
  background: linear-gradient(180deg, #fff 0%, #fcf7fd 100%);
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

.view-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.view-pill {
  display: grid;
  gap: 4px;
  text-align: left;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid #d6deee;
  background: #fff;
  color: #223356;
}

.view-pill__label {
  font-weight: 700;
}

.view-pill__count {
  color: #6b7280;
  font-size: 12px;
}

.view-pill--active {
  background: linear-gradient(135deg, #ff017a 0%, #702283 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 18px 34px rgba(112, 34, 131, 0.24);
}

.view-pill--active .view-pill__count {
  color: rgba(255, 255, 255, 0.78);
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.toolbar-search {
  flex: 1 1 320px;
}

.toolbar-meta {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: #60708f;
}

.toolbar-meta__title {
  font-size: 13px;
}

.toolbar-meta__value {
  color: #1f2b46;
}

.input {
  border: 1px solid #d8d8e6;
  border-radius: 12px;
  padding: 10px 12px;
  min-width: 220px;
  width: 100%;
}

.textarea {
  min-height: 90px;
  resize: vertical;
}

.textarea--wide {
  grid-column: 1 / -1;
}

.matrix-list {
  background: #fff;
  border: 1px solid #d8d8e6;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 14px 28px rgba(16, 24, 40, 0.06);
}

.matrix-list__head,
.matrix-row {
  display: grid;
  grid-template-columns: minmax(190px, 0.9fr) minmax(220px, 1fr) minmax(220px, 1fr) minmax(280px, 1.2fr);
  gap: 14px;
  padding: 14px 18px;
}

.matrix-list__head {
  font-weight: 700;
  color: #1d2c4a;
  border-bottom: 1px solid #e5e7ef;
  background: #fbfcff;
}

.matrix-row {
  border-bottom: 1px solid #f0f2f8;
}

.location-cell__country {
  font-weight: 800;
  color: #1f325a;
}

.location-cell__city {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 700;
  color: #20314f;
}

.location-cell__meta {
  margin-top: 6px;
  color: #6b7280;
  font-size: 13px;
}

.entity-cell {
  min-height: 52px;
}

.entity-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.entity-pill {
  border: 1px solid #d2d9eb;
  background: #fcf7fd;
  color: #5f216f;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
}

.entity-pill--client { border-color: #b9daf7; background: #eef7ff; }
.entity-pill--supplier { border-color: #bce6d4; background: #effaf5; }

.signal-cell {
  display: grid;
  gap: 8px;
}

.signal-cell__title {
  color: #20314f;
}

.signal-cell__copy {
  margin: 0;
  color: #60708f;
  line-height: 1.5;
}

.signal-pill {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.signal-pill--warn { background: #fff4d6; color: #9a6700; }
.signal-pill--info { background: #eef7ff; color: #1f4d96; }
.signal-pill--ok { background: #ecfdf3; color: #166534; }
.signal-pill--critical { background: #fef2f2; color: #991b1b; }

.empty-state {
  padding: 28px;
  text-align: center;
  color: #64748b;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.modal {
  width: min(900px, 92vw);
  max-height: 86vh;
  overflow: auto;
  background: #fff;
  border-radius: 18px;
  padding: 18px;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.modal-close {
  border: none;
  background: transparent;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  color: #64748b;
}

.modal-subtitle {
  margin: 6px 0 0;
  color: #64748b;
}

.grid.two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 14px 0;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.btn {
  border: none;
  border-radius: 14px;
  padding: 12px 18px;
  cursor: pointer;
  font-weight: 700;
  background: #fbf2ff;
  color: #702283;
}

.btn--primary {
  background: linear-gradient(135deg, #1a237e 0%, #0d1421 100%);
  color: #fff;
}

.btn--ghost {
  background: #fff;
  border: 1px solid #d7e0ef;
  color: #21385f;
}

.muted {
  color: #6b7280;
  font-size: 13px;
}

@media (max-width: 1100px) {
  .overview-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .matrix-list__head,
  .matrix-row {
    grid-template-columns: 1fr;
  }

  .grid.two-cols {
    grid-template-columns: 1fr;
  }

  .benchmark-table__head { display: none; }
  .benchmark-row { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 720px) {
  .benchmark-hero { flex-direction: column; }
  .benchmark-summary { grid-template-columns: 1fr 1fr; }
  .benchmark-row { grid-template-columns: 1fr; }
  .workspace-tabs { width: 100%; }
  .workspace-tab { flex: 1; }
  .page-head {
    flex-direction: column;
  }

  .page-head-actions,
  .view-strip,
  .toolbar {
    width: 100%;
  }

  .view-strip {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .view-pill {
    flex: 0 0 auto;
  }

  .overview-strip {
    grid-template-columns: 1fr;
  }

  .toolbar-meta {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .page-head-actions .btn,
  .actions .btn {
    width: 100%;
  }

  .modal {
    width: min(100vw - 16px, 95vw);
    padding: 16px;
  }
}
</style>
