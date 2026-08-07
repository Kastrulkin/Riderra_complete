<template>
  <div>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf crm-section">
      <div class="container">
        <admin-tabs />

        <div class="section-actions">
          <button class="btn btn--ghost" @click="reload">Обновить</button>
        </div>

        <div class="overview-strip">
          <div v-for="card in overviewCards" :key="card.key" class="overview-card" :class="`overview-card--${card.tone}`">
            <div class="overview-card__value">{{ card.value }}</div>
            <div class="overview-card__label">{{ card.label }}</div>
            <div class="overview-card__hint">{{ card.hint }}</div>
          </div>
        </div>

        <div class="mode-switch">
          <button class="mode-pill" :class="{ 'mode-pill--active': mode === 'companies' }" @click="switchMode('companies')">
            <span>Компании</span>
            <small>{{ companyCount }}</small>
          </button>
          <button class="mode-pill" :class="{ 'mode-pill--active': mode === 'contacts' }" @click="switchMode('contacts')">
            <span>Контакты</span>
            <small>{{ contactCount }}</small>
          </button>
        </div>

        <div class="view-strip">
          <button
            v-for="view in savedViews"
            :key="view.key"
            type="button"
            class="view-pill"
            :class="{ 'view-pill--active': activeView === view.key }"
            @click="selectView(view.key)"
          >
            <span class="view-pill__label">{{ view.label }}</span>
            <span class="view-pill__count">{{ viewCount(view.key) }}</span>
          </button>
        </div>

        <div class="crm-filters">
          <input
            v-model="query"
            class="input crm-search"
            :placeholder="mode === 'companies' ? 'Поиск: компания / email / телефон / город' : 'Поиск: имя / email / телефон / город'"
            @keyup.enter="reload"
          />
          <button class="btn btn--ghost" @click="reload">Поиск</button>
          <div class="crm-filters__meta">
            <span>Показан срез:</span>
            <strong>{{ currentViewLabel }}</strong>
          </div>
        </div>

        <div v-if="loading" class="hint">Загрузка CRM...</div>
        <div v-else-if="loadError" class="hint hint--error">{{ loadError }}</div>
        <div v-else>
          <div class="crm-table">
            <div class="crm-table__head" :class="`crm-table__head--${mode}`">
              <div>{{ mode === 'companies' ? 'Компания / сегмент' : 'Контакт / сегмент' }}</div>
              <div>{{ mode === 'companies' ? 'География и связи' : 'Компании и география' }}</div>
              <div>Каналы связи</div>
              <div>Следующее действие</div>
            </div>

            <div
              v-for="row in displayedRows"
              :key="row.id"
              class="crm-table__row"
              :class="`crm-table__row--${mode}`"
            >
              <div class="entity-main">
                <div class="entity-main__title">{{ entityTitle(row) }}</div>
                <div class="entity-main__sub">{{ entitySubline(row) }}</div>
                <div class="segment-badges">
                  <span v-for="seg in normalizedSegments(row)" :key="seg" class="segment-badge">{{ segmentLabel(seg) }}</span>
                </div>
              </div>

              <div class="entity-geo">
                <div class="entity-geo__title">{{ geographyLine(row) }}</div>
                <div class="entity-geo__sub">{{ relationLine(row) }}</div>
              </div>

              <div class="entity-channels">
                <div>{{ row.email || 'Email не указан' }}</div>
                <div>{{ row.phone || 'Телефон не указан' }}</div>
                <div>{{ row.telegramUrl || 'Telegram не указан' }}</div>
              </div>

              <div class="entity-actions">
                <div class="next-action">{{ nextActionLabel(row) }}</div>
                <button class="btn btn--primary btn--small" @click="openDetails(row)">{{ primaryButtonLabel(row) }}</button>
              </div>
            </div>
          </div>

          <div class="hint">Всего в текущем срезе: {{ displayedRows.length }} из {{ total }}</div>
        </div>
      </div>
    </section>

    <div v-if="details" class="modal-overlay" @click="details=null">
      <div class="modal" @click.stop>
        <div class="modal-head">
          <div>
            <h3>{{ detailsTitle }}</h3>
            <p class="modal-subtitle">
              {{ detailsMode === 'company'
                ? 'Контакты, география, каналы и сегменты.'
                : 'Роль, компании, география и каналы связи.' }}
            </p>
          </div>
          <button class="modal-close" type="button" @click="details=null">×</button>
        </div>

        <div class="crm-focus-card">
          <div class="crm-focus-card__main">
            <div class="crm-focus-card__label">Следующий шаг</div>
            <div class="crm-focus-card__title">{{ nextActionLabel(details) }}</div>
            <div class="crm-focus-card__hint">{{ detailsFocusHint(details) }}</div>
          </div>
          <div class="crm-focus-card__stats">
            <div class="summary-chip">
              <span>Каналы</span>
              <strong>{{ contactStateLabel(details) }}</strong>
            </div>
            <div class="summary-chip">
              <span>География</span>
              <strong>{{ geographyStateLabel(details) }}</strong>
            </div>
            <div class="summary-chip">
              <span>Связи</span>
              <strong>{{ relationStateLabel(details) }}</strong>
            </div>
          </div>
        </div>

        <details class="crm-detail-panel" open>
          <summary class="section-summary">Основное</summary>
          <div v-if="detailsMode==='company'" class="card-grid">
            <input v-model="form.name" class="input" placeholder="Название" />
            <input v-model="form.website" class="input" placeholder="Сайт" />
            <input v-model="form.phone" class="input" placeholder="Телефон" />
            <input v-model="form.email" class="input" placeholder="Email" />
            <input v-model="form.telegramUrl" class="input" placeholder="Telegram ссылка" />
            <input v-model="form.registrationCountry" class="input" placeholder="Страна регистрации" />
            <input v-model="form.registrationCity" class="input" placeholder="Город регистрации" />
            <input v-model="form.registrationAddress" class="input" placeholder="Адрес регистрации" />
            <textarea
              v-model="form.presenceMapText"
              class="input textarea textarea--wide"
              placeholder="География присутствия&#10;United Kingdom: London, Manchester&#10;UAE: Dubai, Abu Dhabi"
            />
            <textarea v-model="form.comment" class="input textarea textarea--wide" placeholder="Комментарий"></textarea>
          </div>
          <div v-else class="card-grid">
            <input v-model="form.fullName" class="input" placeholder="Имя" />
            <input v-model="form.position" class="input" placeholder="Должность" />
            <input v-model="form.phone" class="input" placeholder="Телефон" />
            <input v-model="form.email" class="input" placeholder="Email" />
            <input v-model="form.telegramUrl" class="input" placeholder="Telegram ссылка" />
            <input v-model="form.registrationCountry" class="input" placeholder="Страна регистрации" />
            <input v-model="form.registrationCity" class="input" placeholder="Город регистрации" />
            <input v-model="form.registrationAddress" class="input" placeholder="Адрес регистрации" />
            <textarea
              v-model="form.presenceMapText"
              class="input textarea textarea--wide"
              placeholder="География присутствия&#10;United Kingdom: London, Manchester&#10;UAE: Dubai, Abu Dhabi"
            />
            <textarea v-model="form.comment" class="input textarea textarea--wide" placeholder="Комментарий"></textarea>
          </div>
        </details>

        <div class="detail-sections">
          <details v-if="detailsMode==='company' && (companyComparison.source || companyComparison.loading)" class="links-block detail-card crm-detail-panel comparison-card" open>
            <summary class="section-summary">Цены и возможности</summary>
            <div v-if="companyComparison.loading" class="hint">Загружаем последний анализ цен…</div>
            <template v-else-if="companyComparison.source">
              <div class="comparison-card__head">
                <div>
                  <h4>{{ companyComparison.source.name }}: текущая картина</h4>
                  <div class="hint">Публичные цены компании сравниваются с действующим прайсом Riderra. Основной прайс автоматически не меняется.</div>
                </div>
                <span class="comparison-status">{{ comparisonStatusLabel(companyComparison.run?.status) }}</span>
              </div>

              <div class="comparison-kpis">
                <div class="summary-chip"><span>Ценовое преимущество</span><strong>{{ companyPriceOpportunityCount }}</strong></div>
                <div class="summary-chip"><span>Компания не продаёт</span><strong>{{ companyComparison.run?.coverageOpportunityCount || 0 }}</strong></div>
                <div class="summary-chip"><span>Нужно проверить</span><strong>{{ companyComparison.run?.needsReviewCount || 0 }}</strong></div>
                <div class="summary-chip"><span>Последний срез</span><strong>{{ formatDateTime(companyComparison.run?.finishedAt || companyComparison.run?.createdAt) }}</strong></div>
              </div>

              <div v-if="companyComparison.run" class="comparison-assumptions">
                <span><strong>Формула:</strong> {{ comparisonFormulaLabel(companyComparison.source) }}</span>
                <span><strong>Дата поездки:</strong> {{ formatDateTime(companyComparison.run.serviceAt) }}</span>
                <span><strong>Объём:</strong> {{ comparisonRouteCount }} направлений · {{ companyComparison.run.routeCount }} строк прайса</span>
              </div>

              <div class="comparison-tabs" role="tablist" aria-label="Данные о ценах компании">
                <button
                  type="button"
                  role="tab"
                  class="comparison-tab"
                  :class="{ 'comparison-tab--active': companyComparison.activeTab === 'prices' }"
                  :aria-selected="companyComparison.activeTab === 'prices'"
                  @click="companyComparison.activeTab = 'prices'"
                >
                  Прайс {{ companyComparison.source.name }} <span>{{ companyComparison.catalog.available ? companyComparison.catalog.totalQuotes : companyExternalQuotes.length }}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  class="comparison-tab"
                  :class="{ 'comparison-tab--active': companyComparison.activeTab === 'opportunities' }"
                  :aria-selected="companyComparison.activeTab === 'opportunities'"
                  @click="companyComparison.activeTab = 'opportunities'"
                >
                  Возможности <span>{{ companyOpportunityRows.length }}</span>
                </button>
              </div>

              <div v-if="companyComparison.activeTab === 'prices'" class="comparison-panel" role="tabpanel">
                <div v-if="companyExternalQuotes.length" class="comparison-price-tools">
                  <input
                    :value="companyComparison.quoteQuery"
                    class="input"
                    placeholder="Найти направление, город или класс"
                    @input="setCompanyQuoteQuery($event.target.value)"
                  />
                  <span>Показано {{ pagedCompanyExternalQuotes.length }} цен · {{ companyComparison.catalog.available ? `${companyComparison.catalog.totalRoutes} направлений в каталоге` : `${filteredCompanyExternalQuotes.length} цен в срезе` }}</span>
                </div>
                <div v-if="companyExternalQuotes.length" class="comparison-price-table">
                  <div class="comparison-price-row comparison-price-row--head">
                    <div>Направление</div><div>Класс компании</div><div>Пассажиры</div><div>Цена</div><div>Получена</div>
                  </div>
                  <div v-for="quote in pagedCompanyExternalQuotes" :key="quote.id" class="comparison-price-row">
                    <div><strong>{{ quote.routeFrom }} → {{ quote.routeTo }}</strong></div>
                    <div>{{ quote.externalVehicleName }}</div>
                    <div>{{ quote.maxPassengers || '—' }}</div>
                    <div><strong>{{ formatMoney(quote.publicSellPrice, quote.currency) }}</strong></div>
                    <div>{{ formatDateTime(quote.quotedAt) }}</div>
                  </div>
                </div>
                <div v-if="companyExternalQuotes.length" class="comparison-price-pager">
                  <button class="btn btn--ghost btn--small" :disabled="companyComparison.quotePage <= 1" @click="changeCompanyQuotePage(-1)">Назад</button>
                  <span>Страница {{ companyComparison.quotePage }} из {{ companyQuotePageCount }}</span>
                  <button class="btn btn--ghost btn--small" :disabled="companyComparison.quotePage >= companyQuotePageCount" @click="changeCompanyQuotePage(1)">Дальше</button>
                </div>
                <div v-if="companyComparison.catalog.crawl" class="hint">
                  Полный каталог: {{ companyComparison.catalog.crawl.processedRoutes }} из {{ companyComparison.catalog.crawl.totalRoutes }} направлений · {{ comparisonStatusLabel(companyComparison.catalog.crawl.status) }}
                </div>
                <div v-if="!companyExternalQuotes.length" class="comparison-empty">
                  <strong>Сохранённых публичных цен пока нет</strong>
                  <span>Запустите сбор повторно. Маршруты без публичного предложения {{ companyComparison.source.name }} попадут во вкладку «Возможности».</span>
                </div>
              </div>

              <div v-else class="comparison-panel" role="tabpanel">
                <div v-if="companyOpportunityRows.length" class="comparison-route-list">
                  <div v-for="route in companyOpportunityRows" :key="route.key" class="comparison-route-row">
                    <div><strong>{{ route.routeFrom }} → {{ route.routeTo }}</strong><span>{{ route.detail }}</span></div>
                    <div><span class="comparison-status" :class="`comparison-status--${route.status}`">{{ comparisonStatusLabel(route.status) }}</span></div>
                    <div>{{ route.priceLabel }}</div>
                  </div>
                </div>
                <div v-else class="comparison-empty">
                  <strong>В последнем анализе возможностей не найдено</strong>
                  <span>Здесь появятся направления, где цена Riderra проходит формулу {{ companyComparison.source.name }} или компания не предлагает машину.</span>
                </div>
              </div>

              <div v-if="companyComparison.error" class="hint hint--error">{{ companyComparison.error }}</div>
              <div class="comparison-card__actions">
                <button class="btn btn--primary" :disabled="companyComparison.busy" @click="rerunCompanyComparison">
                  {{ companyComparison.busy ? 'Идёт сбор и сверка…' : 'Собрать цены заново и сравнить' }}
                </button>
                <button v-if="companyComparison.run && companyComparison.rows.length" class="btn btn--ghost" @click="downloadCompanyComparison">
                  Скачать Excel
                </button>
              </div>
            </template>
          </details>

          <details class="segments-block detail-card crm-detail-panel">
            <summary class="section-summary">Сегменты</summary>
            <h4>Сегменты</h4>
            <div class="segments-grid">
              <label v-for="opt in segmentOptionsForDetails" :key="opt.value" class="segment-item">
                <input
                  type="checkbox"
                  :value="opt.value"
                  :checked="isSegmentChecked(opt.value)"
                  @change="toggleSegment(opt.value, $event.target.checked)"
                />
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </details>

          <details v-if="detailsMode==='company' && (details.supplierDrivers || []).length" class="links-block detail-card crm-detail-panel" open>
            <summary class="section-summary">Перевозчик и покрытие</summary>
            <h4>Водители, машины и закупочные тарифы</h4>
            <div class="hint">
              Здесь собран рабочий контур перевозчика: кто возит, какие классы реально доступны и по каким тарифам сейчас считаем закупку.
            </div>

            <div
              v-for="driver in details.supplierDrivers || []"
              :key="driver.id"
              class="supplier-driver-card"
            >
              <div class="supplier-driver-card__head">
                <div>
                  <div class="supplier-driver-card__title">{{ driver.name || 'Без имени' }}</div>
                  <div class="supplier-driver-card__sub">
                    {{ driver.phone || driver.supplierContact?.phone || 'Телефон не указан' }}
                    <span v-if="driver.supplierContact?.fullName && driver.supplierContact?.fullName !== driver.name">
                      · контакт: {{ driver.supplierContact.fullName }}
                    </span>
                  </div>
                </div>
                <div class="supplier-driver-card__stats">
                  <span class="summary-chip">
                    <span>Машины</span>
                    <strong>{{ driver._count?.vehicles || 0 }}</strong>
                  </span>
                  <span class="summary-chip">
                    <span>Тарифы</span>
                    <strong>{{ driver._count?.routes || 0 }}</strong>
                  </span>
                </div>
              </div>

              <div class="supplier-driver-grid">
                <div class="supplier-driver-panel">
                  <div class="supplier-driver-panel__label">Доступные классы</div>
                  <div v-if="carrierClasses(driver).length" class="segment-badges">
                    <span
                      v-for="vehicleType in carrierClasses(driver)"
                      :key="`${driver.id}-${vehicleType}`"
                      class="segment-badge"
                    >
                      {{ vehicleClassLabel(vehicleType) }}
                    </span>
                  </div>
                  <div v-else class="hint">Классы пока не заполнены</div>
                </div>

                <div class="supplier-driver-panel">
                  <div class="supplier-driver-panel__label">Машины</div>
                  <div v-if="(driver.vehicles || []).length" class="carrier-vehicle-list">
                    <div
                      v-for="vehicle in driver.vehicles || []"
                      :key="vehicle.id"
                      class="carrier-vehicle-row"
                    >
                      <strong>{{ vehicle.make || 'Машина' }} {{ vehicle.model || '' }}</strong>
                      <span>{{ vehicleClassLabel(vehicle.vehicleType) }}</span>
                      <span>{{ vehicle.plate || 'Без номера' }}</span>
                    </div>
                  </div>
                  <div v-else class="hint">Машины пока не добавлены</div>
                </div>
              </div>

              <div class="supplier-driver-panel supplier-driver-panel--wide">
                <div class="supplier-driver-panel__label">Актуальные закупочные тарифы</div>
                <div v-if="(driver.routes || []).length" class="carrier-rate-list">
                  <div
                    v-for="route in driver.routes || []"
                    :key="route.id"
                    class="carrier-rate-row"
                  >
                    <div class="carrier-rate-row__route">{{ route.fromPoint }} → {{ route.toPoint }}</div>
                    <div class="carrier-rate-row__meta">
                      <span>{{ vehicleClassLabel(route.vehicleType) }}</span>
                      <strong>{{ formatMoney(route.supplierPrice, route.currency) }}</strong>
                      <span v-if="route.sourceLabel">· {{ route.sourceLabel }}</span>
                      <span v-if="route.sourceQuotedAt">· {{ formatDateTime(route.sourceQuotedAt) }}</span>
                    </div>
                  </div>
                </div>
                <div v-else class="hint">Закупочные тарифы пока не внесены</div>
              </div>
            </div>
          </details>

          <details v-if="detailsMode==='company'" class="links-block detail-card crm-detail-panel" open>
            <summary class="section-summary">Менеджеры и контакты</summary>
            <h4>Люди, связанные с компанией</h4>
            <div class="hint">Добавляйте менеджеров заказчика или исполнителя. Контакт сохраняется отдельной карточкой и остаётся доступен в CRM.</div>
            <div v-if="!(details.links || []).length" class="manager-empty">
              Пока менеджеров нет. Заполните форму ниже, чтобы карточка компании была готова к работе.
            </div>
            <div class="manager-list">
              <div class="manager-row" v-for="link in details.links || []" :key="link.id">
                <div class="manager-row__main">
                  <strong>{{ link.contact.fullName }}</strong>
                  <span>{{ link.contact.position || 'Должность не указана' }}</span>
                </div>
                <div class="manager-row__channels">
                  <a v-if="link.contact.email" :href="`mailto:${link.contact.email}`">{{ link.contact.email }}</a>
                  <span v-else>Email не указан</span>
                  <a v-if="link.contact.phone" :href="`tel:${link.contact.phone}`">{{ link.contact.phone }}</a>
                  <span v-else>Телефон не указан</span>
                </div>
                <button type="button" class="btn btn--ghost btn--small" :disabled="managerBusy" @click="unlinkManager(link.contact)">Убрать связь</button>
              </div>
            </div>
            <div class="manager-form">
              <div class="manager-form__title">Добавить менеджера</div>
              <input v-model="managerForm.fullName" class="input" placeholder="Имя и фамилия *" />
              <input v-model="managerForm.position" class="input" placeholder="Должность" />
              <input v-model="managerForm.email" class="input" type="email" placeholder="Email" />
              <input v-model="managerForm.phone" class="input" placeholder="Телефон" />
              <input v-model="managerForm.website" class="input manager-form__wide" placeholder="Сайт или профиль" />
              <div v-if="managerError" class="hint hint--error manager-form__wide">{{ managerError }}</div>
              <div class="manager-form__actions manager-form__wide">
                <button type="button" class="btn btn--primary btn--small" :disabled="managerBusy" @click="addManager">
                  {{ managerBusy ? 'Сохраняем…' : 'Добавить менеджера' }}
                </button>
              </div>
            </div>
          </details>

          <details v-else class="links-block detail-card crm-detail-panel">
            <summary class="section-summary">Связанные компании</summary>
            <h4>Компании контакта</h4>
            <div v-if="!(details.links || []).length" class="hint">Пока нет связанных компаний</div>
            <div class="linked-row" v-for="link in details.links || []" :key="link.id">
              <div>{{ link.company.name }}</div>
              <div>{{ formatSegments(link.company.segments || []) }}</div>
              <div>{{ link.company.email || link.company.phone || '-' }}</div>
            </div>
          </details>
        </div>

        <div class="actions">
          <button class="btn btn--primary" @click="saveDetails">Сохранить</button>
          <button class="btn btn--ghost" @click="details=null">Закрыть</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import adminTabs from '~/components/partials/adminTabs.vue'

export default {
  layout: 'admin',
  middleware: 'crm',
  components: { adminTabs },
  data() {
    return {
      mode: 'companies',
      query: '',
      activeView: 'all',
      rows: [],
      total: 0,
      loading: false,
      loadError: '',
      details: null,
      detailsTitle: '',
      detailsMode: 'company',
      detailsId: '',
      form: {},
      managerForm: { fullName: '', position: '', email: '', phone: '', website: '' },
      managerBusy: false,
      managerError: '',
      companyComparison: { source: null, run: null, rows: [], historicalOpportunityRows: [], externalQuotes: [], catalog: { available: false, routes: [], totalRoutes: 0, totalQuotes: 0, crawl: null }, activeTab: 'prices', quoteQuery: '', quotePage: 1, quotePageSize: 100, catalogPageSize: 20, loading: false, busy: false, error: '', pollTimer: null, quoteSearchTimer: null }
    }
  },
  computed: {
    companyCount() {
      return this.mode === 'companies' ? this.total : 0
    },
    contactCount() {
      return this.mode === 'contacts' ? this.total : 0
    },
    savedViews() {
      return this.mode === 'companies'
        ? [
            { key: 'all', label: 'Все компании' },
            { key: 'clients', label: 'Заказчики' },
            { key: 'suppliers', label: 'Исполнители' },
            { key: 'potential', label: 'Потенциальные' },
            { key: 'coverage_gap', label: 'Нужен разбор' }
          ]
        : [
            { key: 'all', label: 'Все контакты' },
            { key: 'clients', label: 'Контакты заказчиков' },
            { key: 'suppliers', label: 'Контакты исполнителей' },
            { key: 'potential', label: 'Потенциальные' },
            { key: 'coverage_gap', label: 'Нужен разбор' }
          ]
    },
    displayedRows() {
      return this.rows.filter((row) => this.matchesView(row, this.activeView))
    },
    currentViewLabel() {
      return this.savedViews.find((view) => view.key === this.activeView)?.label || this.savedViews[0]?.label || '-'
    },
    overviewCards() {
      const rows = Array.isArray(this.rows) ? this.rows : []
      const clients = rows.filter((row) => this.hasAnySegment(row, ['client_company', 'client_contact'])).length
      const suppliers = rows.filter((row) => this.hasAnySegment(row, ['supplier_company', 'supplier_contact', 'potential_supplier'])).length
      const potential = rows.filter((row) => this.hasAnySegment(row, ['potential_client_company', 'potential_client_contact', 'potential_client_agent', 'potential_supplier'])).length
      const withGeo = rows.filter((row) => this.hasGeography(row)).length
      const gaps = rows.filter((row) => this.needsAttention(row)).length
      return [
        { key: 'total', value: rows.length, label: this.mode === 'companies' ? 'Компаний в работе' : 'Контактов в работе', hint: 'Текущий список', tone: 'neutral' },
        { key: 'clients', value: clients, label: 'Заказчики', hint: 'Активные client-сегменты', tone: clients ? 'info' : 'neutral' },
        { key: 'suppliers', value: suppliers, label: 'Исполнители', hint: 'Покрытие и supplier-сегменты', tone: suppliers ? 'ok' : 'warn' },
        { key: 'potential', value: potential, label: 'Потенциальные', hint: 'Нужно развивать', tone: potential ? 'warn' : 'neutral' },
        { key: 'geo', value: withGeo, label: 'С географией', hint: 'Есть присутствие', tone: withGeo ? 'ok' : 'warn' },
        { key: 'gaps', value: gaps, label: 'Нужен разбор', hint: 'Не хватает связей или каналов', tone: gaps ? 'critical' : 'ok' }
      ]
    },
    companyComparisonRoutes() {
      const grouped = new Map()
      for (const row of this.companyComparison.rows || []) {
        if (row.status === 'ignored') continue
        const key = `${row.routeFrom}\u0000${row.routeTo}`
        if (!grouped.has(key)) grouped.set(key, { key, routeFrom: row.routeFrom, routeTo: row.routeTo, rows: [] })
        grouped.get(key).rows.push(row)
      }
      return Array.from(grouped.values()).map((route) => {
        const statuses = route.rows.map((row) => row.result?.status || row.status)
        const prices = route.rows
          .filter((row) => row.clientSellPrice !== null && row.clientSellPrice !== undefined && row.clientSellPrice !== '')
          .map((row) => Number(row.clientSellPrice))
          .filter(Number.isFinite)
        const currency = route.rows.find((row) => row.clientCurrency)?.clientCurrency || ''
        const status = statuses.includes('opportunity') ? 'opportunity'
          : statuses.includes('no_quote') ? 'coverage_opportunity'
            : statuses.some((value) => ['needs_review', 'failed'].includes(value)) ? 'needs_review'
              : 'not_opportunity'
        return {
          ...route,
          status,
          vehicleCount: new Set(route.rows.map((row) => row.requestedVehicleType)).size,
          priceLabel: prices.length ? `${Math.min(...prices)}–${Math.max(...prices)} ${currency}` : 'Цена отсутствует'
        }
      })
    },
    companyExternalQuotes() {
      if (this.companyComparison.catalog.available) {
        return this.companyComparison.catalog.routes.flatMap((route) => (route.prices || []).map((quote) => ({
          id: `${route.id}-${quote.currency}-${quote.externalVehicleKey}`,
          routeKey: route.routeKey,
          routeFrom: route.routeFrom,
          routeTo: route.routeTo,
          externalVehicleKey: quote.externalVehicleKey,
          externalVehicleName: quote.externalVehicleName,
          maxPassengers: quote.maxPassengers,
          publicSellPrice: quote.publicSellPrice,
          currency: quote.currency,
          quotedAt: route.quotedAt
        })))
      }
      const latest = new Map()
      for (const quote of this.companyComparison.externalQuotes || []) {
        const key = `${quote.routeKey}\u0000${quote.externalVehicleKey}\u0000${quote.currency}`
        if (!latest.has(key)) latest.set(key, quote)
      }
      return Array.from(latest.values())
    },
    filteredCompanyExternalQuotes() {
      if (this.companyComparison.catalog.available) return this.companyExternalQuotes
      const query = String(this.companyComparison.quoteQuery || '').trim().toLowerCase()
      if (!query) return this.companyExternalQuotes
      return this.companyExternalQuotes.filter((quote) => [quote.routeFrom, quote.routeTo, quote.externalVehicleName, quote.externalVehicleKey]
        .some((value) => String(value || '').toLowerCase().includes(query)))
    },
    companyQuotePageCount() {
      if (this.companyComparison.catalog.available) return Math.max(1, Math.ceil(this.companyComparison.catalog.totalRoutes / this.companyComparison.catalogPageSize))
      return Math.max(1, Math.ceil(this.filteredCompanyExternalQuotes.length / this.companyComparison.quotePageSize))
    },
    pagedCompanyExternalQuotes() {
      if (this.companyComparison.catalog.available) return this.filteredCompanyExternalQuotes
      const start = (this.companyComparison.quotePage - 1) * this.companyComparison.quotePageSize
      return this.filteredCompanyExternalQuotes.slice(start, start + this.companyComparison.quotePageSize)
    },
    companyOpportunityRows() {
      const combinedRows = [...(this.companyComparison.rows || []), ...(this.companyComparison.historicalOpportunityRows || [])]
      const seenOpportunities = new Set()
      const priceRows = combinedRows
        .filter((row) => (row.result?.status || row.status) === 'opportunity')
        .filter((row) => {
          const key = [row.routeFrom, row.routeTo, row.requestedVehicleType, row.riderraCurrency, row.riderraSellPrice, row.clientSellPrice].join('\u0000')
          if (seenOpportunities.has(key)) return false
          seenOpportunities.add(key)
          return true
        })
        .map((row) => ({
          key: `price-${row.id}`,
          routeFrom: row.routeFrom,
          routeTo: row.routeTo,
          status: 'opportunity',
          detail: `${this.vehicleClassLabel(row.requestedVehicleType)} · Riderra ${this.formatMoney(row.riderraSellPrice, row.riderraCurrency)} · цена компании после комиссии ${this.formatMoney(row.result?.targetPrice, row.riderraCurrency)}`,
          priceLabel: this.formatMoney(row.clientSellPrice, row.clientCurrency)
        }))
      const coverageRows = this.companyComparisonRoutes
        .filter((route) => route.status === 'coverage_opportunity')
        .map((route) => ({
          key: `coverage-${route.key}`,
          routeFrom: route.routeFrom,
          routeTo: route.routeTo,
          status: route.status,
          detail: `${route.vehicleCount} классов Riderra доступны для предложения`,
          priceLabel: 'Нет предложения'
        }))
      return [...priceRows, ...coverageRows]
    },
    companyPriceOpportunityCount() {
      return this.companyOpportunityRows.filter((row) => row.status === 'opportunity').length
    },
    comparisonRouteCount() {
      return this.companyComparisonRoutes.length || this.comparisonScopePairs().length
    }
  },
  mounted() {
    this.reload()
  },
  beforeDestroy() {
    if (this.companyComparison.pollTimer) clearTimeout(this.companyComparison.pollTimer)
    if (this.companyComparison.quoteSearchTimer) clearTimeout(this.companyComparison.quoteSearchTimer)
  },
  methods: {
    authHeaders() {
      const token = localStorage.getItem('authToken')
      return {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      }
    },
    switchMode(mode) {
      if (this.mode === mode) return
      this.mode = mode
      this.activeView = 'all'
      this.reload()
    },
    selectView(view) {
      if (this.activeView === view) return
      this.activeView = view
      this.reload()
    },
    setCompanyQuoteQuery(value) {
      this.companyComparison.quoteQuery = value
      this.companyComparison.quotePage = 1
      if (this.companyComparison.catalog.available) {
        if (this.companyComparison.quoteSearchTimer) clearTimeout(this.companyComparison.quoteSearchTimer)
        this.companyComparison.quoteSearchTimer = setTimeout(() => this.loadCompanyCatalog(), 350)
      }
    },
    changeCompanyQuotePage(delta) {
      const next = Math.min(this.companyQuotePageCount, Math.max(1, this.companyComparison.quotePage + delta))
      if (next === this.companyComparison.quotePage) return
      this.companyComparison.quotePage = next
      if (this.companyComparison.catalog.available) this.loadCompanyCatalog()
    },
    serverViewSegments() {
      if (this.activeView === 'clients') return this.mode === 'companies' ? ['client_company'] : ['client_contact']
      if (this.activeView === 'suppliers') return this.mode === 'companies'
        ? ['supplier_company', 'potential_supplier']
        : ['supplier_contact', 'potential_supplier']
      if (this.activeView === 'potential') return this.mode === 'companies'
        ? ['potential_client_company', 'potential_supplier']
        : ['potential_client_contact', 'potential_client_agent', 'potential_supplier']
      return []
    },
    normalizedSegments(row) {
      return (row?.segments || []).map((segment) => segment.segment || segment).filter(Boolean)
    },
    hasAnySegment(row, wanted) {
      const set = new Set(this.normalizedSegments(row))
      return wanted.some((segment) => set.has(segment))
    },
    matchesView(row, key) {
      if (key === 'all') return true
      if (key === 'clients') return this.hasAnySegment(row, ['client_company', 'client_contact'])
      if (key === 'suppliers') return this.hasAnySegment(row, ['supplier_company', 'supplier_contact', 'potential_supplier'])
      if (key === 'potential') return this.hasAnySegment(row, ['potential_client_company', 'potential_client_contact', 'potential_client_agent', 'potential_supplier'])
      if (key === 'coverage_gap') return this.needsAttention(row)
      return true
    },
    viewCount(key) {
      return this.rows.filter((row) => this.matchesView(row, key)).length
    },
    hasGeography(row) {
      return Boolean(String(row?.presenceCountries || row?.countryPresence || row?.presenceCities || row?.cityPresence || '').trim())
    },
    needsAttention(row) {
      const linked = Number(row?._count?.links || 0)
      const hasChannel = Boolean(String(row?.email || row?.phone || row?.telegramUrl || '').trim())
      return !hasChannel || !linked || !this.hasGeography(row)
    },
    segmentLabel(code) {
      const map = {
        client_company: 'Заказчик (компания)',
        client_contact: 'Заказчик (контакт)',
        supplier_company: 'Исполнитель (компания)',
        supplier_contact: 'Исполнитель (контакт)',
        potential_client_company: 'Потенциальный заказчик (компания)',
        potential_client_contact: 'Потенциальный заказчик (контакт)',
        potential_client_agent: 'Потенциальный заказчик (агент)',
        potential_supplier: 'Потенциальный исполнитель'
      }
      return map[code] || code
    },
    entityTitle(row) {
      return this.mode === 'companies' ? row.name : row.fullName
    },
    entitySubline(row) {
      if (this.mode === 'companies') return [row.registrationCountry, row.registrationCity].filter(Boolean).join(', ') || 'Регистрация не указана'
      return row.position || 'Должность не указана'
    },
    geographyLine(row) {
      const countries = String(row.presenceCountries || row.countryPresence || '').trim()
      const cities = String(row.cityPresence || row.presenceCities || '').trim()
      if (!countries && !cities) return 'География не заполнена'
      if (countries && cities) return `${countries} · ${cities}`
      return countries || cities
    },
    relationLine(row) {
      const linked = Number(row?._count?.links || 0)
      if (this.mode === 'companies') return linked ? `Связанных контактов: ${linked}` : 'Нет связанных контактов'
      return linked ? `Связанных компаний: ${linked}` : 'Не привязан к компании'
    },
    nextActionLabel(row) {
      if (!String(row?.email || row?.phone || row?.telegramUrl || '').trim()) return 'Добавить канал связи'
      if (!this.hasGeography(row)) return 'Заполнить географию присутствия'
      if (!Number(row?._count?.links || 0)) return this.mode === 'companies' ? 'Привязать контакт к компании' : 'Привязать контакт к компании'
      if (this.hasAnySegment(row, ['potential_client_company', 'potential_client_contact', 'potential_client_agent', 'potential_supplier'])) return 'Проверить и перевести в рабочий сегмент'
      return 'Карточка готова к работе'
    },
    primaryButtonLabel(row) {
      return this.needsAttention(row) ? 'Разобрать' : 'Карточка'
    },
    contactStateLabel(row) {
      return String(row?.email || row?.phone || row?.telegramUrl || '').trim() ? 'Есть' : 'Нужно добавить'
    },
    geographyStateLabel(row) {
      return this.hasGeography(row) ? 'Заполнена' : 'Нужно заполнить'
    },
    relationStateLabel(row) {
      return Number(row?._count?.links || 0) ? `Есть (${row._count.links})` : 'Нет связей'
    },
    detailsFocusHint(row) {
      if (!String(row?.email || row?.phone || row?.telegramUrl || '').trim()) return 'Сначала добавьте канал связи, иначе карточка не готова к работе.'
      if (!this.hasGeography(row)) return 'Следом заполните географию, чтобы запись работала в матрице направлений.'
      if (!Number(row?._count?.links || 0)) return 'После этого свяжите карточку с компанией или контактом.'
      if (this.hasAnySegment(row, ['potential_client_company', 'potential_client_contact', 'potential_client_agent', 'potential_supplier'])) return 'Проверьте запись и переведите её в рабочий сегмент, если контакт уже актуален.'
      return 'Карточка в рабочем состоянии. Можно использовать её в операционной работе.'
    },
    segmentOptionsForDetails() {
      const companySegments = [
        'client_company',
        'supplier_company',
        'potential_client_company',
        'potential_client_agent',
        'potential_supplier'
      ]
      const contactSegments = [
        'client_contact',
        'supplier_contact',
        'potential_client_contact',
        'potential_supplier'
      ]
      const source = this.detailsMode === 'company' ? companySegments : contactSegments
      return source.map((value) => ({ value, label: this.segmentLabel(value) }))
    },
    isSegmentChecked(value) {
      const list = Array.isArray(this.form.segments) ? this.form.segments : []
      return list.includes(value)
    },
    toggleSegment(value, checked) {
      const list = new Set(Array.isArray(this.form.segments) ? this.form.segments : [])
      if (checked) list.add(value)
      else list.delete(value)
      this.form = { ...this.form, segments: Array.from(list) }
    },
    formatSegments(list) {
      return list.length ? list.map((s) => this.segmentLabel(s.segment || s)).join(', ') : '-'
    },
    comparisonStatusLabel(status) {
      const labels = {
        configured: 'Готов к запуску', running: 'Собираем цены', paused: 'Приостановлено', needs_review: 'Нужна проверка', ready: 'Готово', failed: 'Ошибка',
        opportunity: 'Цена выгоднее', coverage_opportunity: 'Компания не продаёт', no_quote: 'Компания не продаёт', not_opportunity: 'Ценового преимущества нет'
      }
      return labels[status] || status || 'Нет запусков'
    },
    comparisonFormulaLabel(source) {
      const policy = source?.pricingPolicy || {}
      if (policy.type === 'client_commission') return `${source?.name || 'Компания'} × ${(1 - Number(policy.commissionPercent || 0) / 100).toFixed(2)}`
      if (policy.type === 'percentage_discount') return `Riderra × ${(1 - Number(policy.discountPercent || 0) / 100).toFixed(2)}`
      if (policy.type === 'sequential_deductions' && policy.basis === 'client_sell') {
        const factors = (policy.deductions || []).map((value) => (1 - Number(value || 0) / 100).toFixed(2))
        const total = (policy.deductions || []).reduce((factor, value) => factor * (1 - Number(value || 0) / 100), 1)
        return `${source?.name || 'Компания'} × ${factors.join(' × ')} = ×${total.toFixed(2)}`
      }
      return source?.formulaVersion || '—'
    },
    comparisonScopePairs() {
      try { return JSON.parse(this.companyComparison.run?.scopeJson || '{}').routePairs || [] } catch (_) { return [] }
    },
    comparisonRunScopeType(run) {
      try { return JSON.parse(run?.scopeJson || '{}').type || '' } catch (_) { return '' }
    },
    async loadCompanyComparison(companyId) {
      if (this.companyComparison.quoteSearchTimer) clearTimeout(this.companyComparison.quoteSearchTimer)
      this.companyComparison = { source: null, run: null, rows: [], historicalOpportunityRows: [], externalQuotes: [], catalog: { available: false, routes: [], totalRoutes: 0, totalQuotes: 0, crawl: null }, activeTab: 'prices', quoteQuery: '', quotePage: 1, quotePageSize: 100, catalogPageSize: 20, loading: true, busy: false, error: '', pollTimer: this.companyComparison.pollTimer, quoteSearchTimer: this.companyComparison.quoteSearchTimer }
      try {
        const sourcesRes = await fetch('/api/admin/pricing/comparison-sources', { headers: this.authHeaders() })
        const sourcesData = await sourcesRes.json()
        if (sourcesRes.status === 403) return
        if (!sourcesRes.ok) throw new Error(sourcesData.error || 'Не удалось загрузить источник сравнения')
        const source = (sourcesData.rows || []).find((row) => row.customerCompanyId === companyId || row.customerCompany?.id === companyId)
        if (!source) return
        this.companyComparison.source = source
        const [runsRes, quotesRes, catalogRes] = await Promise.all([
          fetch(`/api/admin/pricing/comparison-runs?sourceId=${encodeURIComponent(source.id)}&limit=20`, { headers: this.authHeaders() }),
          fetch(`/api/admin/pricing/external-quotes?sourceId=${encodeURIComponent(source.id)}&limit=20000&compact=1`, { headers: this.authHeaders() }),
          fetch(`/api/admin/pricing/external-catalog?sourceId=${encodeURIComponent(source.id)}&page=1&limit=${this.companyComparison.catalogPageSize}`, { headers: this.authHeaders() })
        ])
        const [runsData, quotesData, catalogData] = await Promise.all([runsRes.json(), quotesRes.json(), catalogRes.json()])
        if (!runsRes.ok) throw new Error(runsData.error || 'Не удалось загрузить запуски')
        if (!quotesRes.ok) throw new Error(quotesData.error || 'Не удалось загрузить сохранённый прайс')
        this.companyComparison.externalQuotes = quotesData.rows || []
        if (catalogRes.ok && (catalogData.totalRoutes || catalogData.crawl)) this.companyComparison.catalog = { available: true, routes: catalogData.routes || [], totalRoutes: catalogData.totalRoutes || 0, totalQuotes: catalogData.totalQuotes || 0, crawl: catalogData.crawl || null }
        const run = (runsData.rows || []).find((row) => this.comparisonRunScopeType(row) === 'riderra_active_price_book')
          || (runsData.rows || []).find((row) => this.comparisonRunScopeType(row) !== 'booking_historical_workbook')
          || runsData.rows?.[0]
          || null
        this.companyComparison.run = run
        if (run) await this.loadCompanyComparisonRun(run.id)
        const opportunityRun = (runsData.rows || []).find((row) => Number(row.opportunitiesCount) > 0)
        if (opportunityRun && opportunityRun.id !== run?.id) await this.loadCompanyHistoricalOpportunities(opportunityRun.id)
      } catch (error) {
        this.companyComparison.error = error.message
      } finally {
        this.companyComparison.loading = false
      }
    },
    async loadCompanyComparisonRun(runId) {
      const res = await fetch(`/api/admin/pricing/comparison-runs/${runId}/results`, { headers: this.authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Не удалось загрузить результаты анализа')
      this.companyComparison.run = data.run
      this.companyComparison.rows = data.rows || []
    },
    async loadCompanyExternalQuotes() {
      const sourceId = this.companyComparison.source?.id
      if (!sourceId) return
      const res = await fetch(`/api/admin/pricing/external-quotes?sourceId=${encodeURIComponent(sourceId)}&limit=20000&compact=1`, { headers: this.authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Не удалось обновить сохранённый прайс')
      this.companyComparison.externalQuotes = data.rows || []
      if (this.companyComparison.catalog.available) await this.loadCompanyCatalog()
    },
    async loadCompanyCatalog() {
      const sourceId = this.companyComparison.source?.id
      if (!sourceId) return
      const params = new URLSearchParams({ sourceId, page: String(this.companyComparison.quotePage), limit: String(this.companyComparison.catalogPageSize) })
      if (this.companyComparison.quoteQuery.trim()) params.set('q', this.companyComparison.quoteQuery.trim())
      const res = await fetch(`/api/admin/pricing/external-catalog?${params.toString()}`, { headers: this.authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Не удалось загрузить полный каталог')
      this.companyComparison.catalog = { available: true, routes: data.routes || [], totalRoutes: data.totalRoutes || 0, totalQuotes: data.totalQuotes || 0, crawl: data.crawl || null }
    },
    async loadCompanyHistoricalOpportunities(runId) {
      const res = await fetch(`/api/admin/pricing/comparison-runs/${runId}/results?resultStatus=opportunity`, { headers: this.authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Не удалось загрузить найденные ранее возможности')
      this.companyComparison.historicalOpportunityRows = data.rows || []
    },
    async rerunCompanyComparison() {
      const source = this.companyComparison.source
      if (!source || this.companyComparison.busy) return
      const routePairs = this.comparisonScopePairs()
      const routeCount = routePairs.length || 'все активные'
      if (!window.confirm(`Запустить публичный сбор цен ${source.name} для ${routeCount} направлений и сравнить с текущим прайсом Riderra?`)) return
      this.companyComparison.busy = true
      this.companyComparison.error = ''
      try {
        const createRes = await fetch('/api/admin/pricing/comparison-runs', {
          method: 'POST', headers: this.authHeaders(), body: JSON.stringify({ sourceId: source.id, routePairs })
        })
        const run = await createRes.json()
        if (!createRes.ok) throw new Error(run.error || 'Не удалось подготовить анализ')
        this.companyComparison.run = run
        this.companyComparison.rows = []
        const executeRes = await fetch(`/api/admin/pricing/comparison-runs/${run.id}/execute`, { method: 'POST', headers: this.authHeaders() })
        const executeData = await executeRes.json()
        if (!executeRes.ok) throw new Error(executeData.error || 'Не удалось запустить анализ')
        this.pollCompanyComparison(run.id)
      } catch (error) {
        this.companyComparison.busy = false
        this.companyComparison.error = error.message
      }
    },
    async pollCompanyComparison(runId) {
      if (this.companyComparison.pollTimer) clearTimeout(this.companyComparison.pollTimer)
      try {
        await this.loadCompanyComparisonRun(runId)
        const active = ['configured', 'running'].includes(this.companyComparison.run?.status)
        this.companyComparison.busy = active
        if (active) this.companyComparison.pollTimer = setTimeout(() => this.pollCompanyComparison(runId), 3000)
        else await this.loadCompanyExternalQuotes()
      } catch (error) {
        this.companyComparison.busy = false
        this.companyComparison.error = error.message
      }
    },
    async downloadCompanyComparison() {
      const runId = this.companyComparison.run?.id
      if (!runId) return
      const response = await fetch(`/api/admin/pricing/comparison-runs/${runId}/export.xlsx`, { headers: this.authHeaders() })
      if (!response.ok) return
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${this.companyComparison.source.name}-price-comparison.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    },
    vehicleClassLabel(value) {
      const map = {
        sedan: 'Седан',
        comfort: 'Комфорт',
        business: 'Бизнес',
        van: 'Минивэн',
        suv: 'SUV'
      }
      return map[String(value || '').toLowerCase()] || value || 'Не указан'
    },
    carrierClasses(driver) {
      const classes = new Set()
      for (const vehicle of driver?.vehicles || []) {
        if (vehicle?.vehicleType) classes.add(String(vehicle.vehicleType).toLowerCase())
      }
      for (const route of driver?.routes || []) {
        if (route?.vehicleType) classes.add(String(route.vehicleType).toLowerCase())
      }
      return Array.from(classes)
    },
    formatMoney(amount, currency) {
      const numeric = Number(amount)
      if (!Number.isFinite(numeric)) return '-'
      return `${numeric.toFixed(2)} ${currency || 'EUR'}`
    },
    formatDateTime(value) {
      if (!value) return ''
      try {
        return new Date(value).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch (_) {
        return String(value)
      }
    },
    splitPresenceList(raw) {
      return String(raw || '')
        .split(/[,\n;|/]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    },
    buildPresenceMapText(countriesRaw, groupedRaw, flatCitiesRaw) {
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
    buildPresencePayload() {
      const rows = String(this.form.presenceMapText || '')
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
    async reload() {
      this.loading = true
      this.loadError = ''
      try {
        const params = new URLSearchParams()
        if (this.query) params.set('q', this.query)
        const segments = this.serverViewSegments()
        if (segments.length) params.set('segments', segments.join(','))
        params.set('limit', '500')

        const endpoint = this.mode === 'companies' ? '/api/admin/crm/companies' : '/api/admin/crm/contacts'
        const res = await fetch(`${endpoint}?${params.toString()}`, { headers: this.authHeaders() })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to fetch CRM')
        this.rows = data.rows || []
        this.total = data.total || 0
      } catch (error) {
        console.error(error)
        this.loadError = error?.message || 'Не удалось загрузить CRM'
      } finally {
        this.loading = false
      }
    },
    async openCompany(id) {
      const res = await fetch(`/api/admin/crm/companies/${id}`, { headers: this.authHeaders() })
      this.details = await res.json()
      this.detailsMode = 'company'
      this.detailsId = id
      this.detailsTitle = `Компания: ${this.details.name || id}`
      this.form = {
        name: this.details.name || '',
        website: this.details.website || '',
        phone: this.details.phone || '',
        email: this.details.email || '',
        telegramUrl: this.details.telegramUrl || '',
        registrationCountry: this.details.registrationCountry || this.details.countryPresence || '',
        registrationCity: this.details.registrationCity || '',
        registrationAddress: this.details.registrationAddress || '',
        presenceCountries: this.details.presenceCountries || '',
        presenceCities: this.details.presenceCities || '',
        cityPresence: this.details.cityPresence || '',
        presenceMapText: this.buildPresenceMapText(
          this.details.presenceCountries || this.details.countryPresence || '',
          this.details.presenceCities || '',
          this.details.cityPresence || ''
        ),
        comment: this.details.comment || '',
        segments: (this.details.segments || []).map((s) => s.segment)
      }
      this.managerForm = { fullName: '', position: '', email: '', phone: '', website: '' }
      this.managerError = ''
      await this.loadCompanyComparison(id)
    },
    async openContact(id) {
      const res = await fetch(`/api/admin/crm/contacts/${id}`, { headers: this.authHeaders() })
      this.details = await res.json()
      this.detailsMode = 'contact'
      this.detailsId = id
      this.detailsTitle = `Контакт: ${this.details.fullName || id}`
      this.form = {
        fullName: this.details.fullName || '',
        position: this.details.position || '',
        phone: this.details.phone || '',
        email: this.details.email || '',
        telegramUrl: this.details.telegramUrl || '',
        registrationCountry: this.details.registrationCountry || this.details.countryPresence || '',
        registrationCity: this.details.registrationCity || '',
        registrationAddress: this.details.registrationAddress || '',
        presenceCountries: this.details.presenceCountries || '',
        presenceCities: this.details.presenceCities || '',
        cityPresence: this.details.cityPresence || '',
        presenceMapText: this.buildPresenceMapText(
          this.details.presenceCountries || this.details.countryPresence || '',
          this.details.presenceCities || '',
          this.details.cityPresence || ''
        ),
        comment: this.details.comment || '',
        segments: (this.details.segments || []).map((s) => s.segment)
      }
    },
    openDetails(row) {
      if (!row?.id) return
      if (this.mode === 'companies') return this.openCompany(row.id)
      return this.openContact(row.id)
    },
    async saveDetails() {
      const endpoint = this.detailsMode === 'company'
        ? `/api/admin/crm/companies/${this.detailsId}`
        : `/api/admin/crm/contacts/${this.detailsId}`
      await fetch(endpoint, {
        method: 'PUT',
        headers: this.authHeaders(),
        body: JSON.stringify({
          ...this.form,
          ...this.buildPresencePayload()
        })
      })
      if (this.detailsMode === 'company') {
        await this.openCompany(this.detailsId)
      } else {
        await this.openContact(this.detailsId)
      }
      await this.reload()
    },
    async addManager() {
      if (this.managerBusy) return
      this.managerError = ''
      if (!String(this.managerForm.fullName || '').trim()) {
        this.managerError = 'Укажите имя менеджера'
        return
      }
      if (!String(this.managerForm.email || '').trim() && !String(this.managerForm.phone || '').trim()) {
        this.managerError = 'Укажите email или телефон менеджера'
        return
      }
      this.managerBusy = true
      try {
        const res = await fetch(`/api/admin/crm/companies/${this.detailsId}/contacts`, {
          method: 'POST',
          headers: { ...this.authHeaders(), 'Idempotency-Key': `crm-manager-${this.detailsId}-${Date.now()}` },
          body: JSON.stringify(this.managerForm)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Не удалось добавить менеджера')
        await this.openCompany(this.detailsId)
        await this.reload()
      } catch (error) {
        this.managerError = error.message
      } finally {
        this.managerBusy = false
      }
    },
    async unlinkManager(contact) {
      if (this.managerBusy || !contact?.id) return
      if (!window.confirm(`Убрать связь ${contact.fullName} с этой компанией? Карточка контакта останется в CRM.`)) return
      this.managerBusy = true
      this.managerError = ''
      try {
        const res = await fetch(`/api/admin/crm/companies/${this.detailsId}/contacts/${contact.id}`, {
          method: 'DELETE',
          headers: { ...this.authHeaders(), 'Idempotency-Key': `crm-manager-unlink-${this.detailsId}-${contact.id}-${Date.now()}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Не удалось убрать связь')
        await this.openCompany(this.detailsId)
        await this.reload()
      } catch (error) {
        this.managerError = error.message
      } finally {
        this.managerBusy = false
      }
    },
  }
}
</script>

<style scoped lang="scss">
.crm-section { padding-top: 140px; padding-bottom: 40px; color:#17233d; }
.crm-header { display:flex; justify-content:space-between; align-items:flex-start; gap:18px; margin-bottom:14px; }
.crm-subtitle { margin:6px 0 0; max-width:760px; color:#64748b; line-height:1.55; font-size:15px; }
.crm-actions { display:flex; gap:10px; flex-wrap:wrap; }
.overview-strip { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:12px; margin-bottom:16px; }
.overview-card { padding:14px 16px; border-radius:16px; border:1px solid #d8e0ef; background:linear-gradient(180deg,#fff 0%,#f8fbff 100%); box-shadow:0 12px 28px rgba(16,30,67,.06); }
.overview-card__value { font-size:28px; font-weight:800; color:#17233d; }
.overview-card__label { margin-top:4px; font-size:14px; font-weight:700; color:#223356; }
.overview-card__hint { margin-top:6px; font-size:12px; line-height:1.4; color:#6b7280; }
.overview-card--warn { border-color:#fde68a; background:linear-gradient(180deg,#fffdf4 0%,#fff8dc 100%); }
.overview-card--critical { border-color:#fecaca; background:linear-gradient(180deg,#fff8f8 0%,#ffefef 100%); }
.overview-card--ok { border-color:#bbf7d0; background:linear-gradient(180deg,#f7fff9 0%,#edfff3 100%); }
.overview-card--info { border-color:#bfdbfe; background:linear-gradient(180deg,#f7fbff 0%,#ecf5ff 100%); }
.mode-switch, .view-strip { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:12px; }
.mode-pill, .view-pill { display:inline-flex; align-items:center; gap:10px; padding:10px 14px; border-radius:999px; border:1px solid #d8e0ef; background:#fff; color:#223356; font-weight:700; }
.mode-pill small, .view-pill__count { display:inline-flex; min-width:28px; justify-content:center; padding:2px 8px; border-radius:999px; background:#f8eafb; color:#702283; font-size:12px; }
.mode-pill--active, .view-pill--active { background:linear-gradient(135deg,#ff017a 0%,#702283 100%); border-color:transparent; color:#fff; box-shadow:0 14px 30px rgba(112,34,131,.22); }
.mode-pill--active small, .view-pill--active .view-pill__count { background:rgba(255,255,255,.18); color:#fff; }
.crm-filters { display:grid; grid-template-columns:minmax(280px,1fr) auto auto; gap:12px; align-items:center; margin-bottom:14px; }
.crm-search { min-width:0; }
.crm-filters__meta { display:inline-flex; align-items:center; gap:8px; color:#64748b; font-size:13px; }
.input { border:1px solid #d8d8e6; border-radius:10px; padding:10px 12px; min-width:220px; }
.crm-table { background:#fff; border:1px solid #d8d8e6; border-radius:14px; overflow:auto; }
.crm-table__head, .crm-table__row { display:grid; grid-template-columns:1.1fr 1fr .95fr .8fr; gap:16px; padding:14px 16px; min-width:1100px; }
.crm-table__head { font-weight:800; color:#223356; border-bottom:1px solid #e5eaf3; }
.crm-table__row { border-top:1px solid #f0f3f8; align-items:start; }
.entity-main, .entity-geo, .entity-channels, .entity-actions { display:grid; gap:6px; }
.entity-main__title, .entity-geo__title, .next-action { font-weight:700; color:#17233d; }
.entity-main__sub, .entity-geo__sub, .entity-channels div { color:#64748b; font-size:13px; line-height:1.45; }
.segment-badges { display:flex; flex-wrap:wrap; gap:6px; }
.segment-badge { display:inline-flex; align-items:center; padding:4px 10px; border-radius:999px; background:#fbf2ff; color:#702283; font-size:12px; font-weight:700; }
.entity-actions { align-items:flex-start; }
.hint { margin-top:10px; color:#64748b; }
.hint--error { color:#9f1239; }
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1200; }
.modal { width:min(980px,92vw); max-height:85vh; overflow:auto; background:#fff; border-radius:14px; padding:20px; }
.modal-head { display:flex; justify-content:space-between; gap:12px; margin-bottom:12px; }
.modal-subtitle { margin:6px 0 0; color:#64748b; line-height:1.5; }
.modal-close { border:none; background:transparent; font-size:30px; line-height:1; color:#334155; }
.crm-focus-card {
  display:grid;
  grid-template-columns:minmax(0,1fr) 320px;
  gap:14px;
  margin:10px 0 16px;
  padding:16px;
  border:1px solid #dbe5f3;
  border-radius:16px;
  background:linear-gradient(180deg,#fff 0%,#fcf7fd 100%);
}
.crm-focus-card__label {
  font-size:12px;
  font-weight:800;
  letter-spacing:.04em;
  text-transform:uppercase;
  color:#702283;
}
.crm-focus-card__title {
  margin-top:4px;
  font-size:20px;
  font-weight:800;
  color:#17233d;
}
.crm-focus-card__hint {
  margin-top:8px;
  color:#64748b;
  line-height:1.5;
}
.crm-focus-card__stats {
  display:grid;
  gap:10px;
}
.actions .btn--primary {
  box-shadow: 0 10px 24px rgba(112, 34, 131, .18);
}
.card-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:10px 0 16px; }
.textarea { min-height:96px; resize:vertical; }
.textarea--wide { grid-column:1 / -1; }
.detail-sections { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
.detail-card { border:1px solid #e7ebf2; border-radius:12px; padding:14px; background:#fbfcff; }
.comparison-card { grid-column:1 / -1; }
.comparison-card__head { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; }
.comparison-card__head h4 { margin:0; color:#17233d; font-size:18px; }
.comparison-kpis { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:14px; }
.comparison-kpis .summary-chip { display:grid; gap:4px; padding:12px; border:1px solid #e7ebf2; border-radius:12px; background:#fff; }
.comparison-kpis .summary-chip span { color:#64748b; font-size:12px; }
.comparison-kpis .summary-chip strong { color:#17233d; font-size:18px; }
.comparison-assumptions { display:flex; flex-wrap:wrap; gap:8px 18px; margin:14px 0; padding:10px 12px; border-radius:10px; background:#f8f3fb; color:#475569; font-size:13px; }
.comparison-tabs { display:flex; gap:6px; margin:0 0 12px; padding:4px; width:max-content; max-width:100%; border:1px solid #e7ebf2; border-radius:12px; background:#f8fafc; }
.comparison-tab { display:flex; align-items:center; gap:8px; border:0; border-radius:9px; padding:9px 12px; background:transparent; color:#64748b; font:inherit; font-weight:800; cursor:pointer; }
.comparison-tab span { min-width:24px; padding:2px 7px; border-radius:999px; background:#e7ebf2; color:#475569; font-size:12px; text-align:center; }
.comparison-tab--active { background:#fff; color:#17233d; box-shadow:0 2px 8px rgba(23,35,61,.08); }
.comparison-tab--active span { background:#f3e8f7; color:#702283; }
.comparison-panel { min-height:120px; }
.comparison-price-tools, .comparison-price-pager { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; color:#64748b; font-size:13px; }
.comparison-price-tools .input { max-width:460px; }
.comparison-price-pager { justify-content:flex-end; margin:10px 0 0; }
.comparison-price-table { max-height:420px; overflow:auto; border:1px solid #e7ebf2; border-radius:12px; background:#fff; }
.comparison-price-row { display:grid; grid-template-columns:minmax(260px,1.8fr) minmax(150px,1fr) 90px 120px 145px; gap:12px; align-items:center; min-width:850px; padding:10px 12px; border-top:1px solid #eef2f8; color:#334155; font-size:13px; }
.comparison-price-row:first-child { border-top:0; }
.comparison-price-row--head { position:sticky; top:0; z-index:1; background:#f8fafc; color:#64748b; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; }
.comparison-empty { display:grid; gap:6px; padding:22px; border:1px dashed #cbd5e1; border-radius:12px; background:#fff; text-align:center; }
.comparison-empty strong { color:#17233d; }
.comparison-empty span { color:#64748b; line-height:1.5; }
.comparison-route-list { display:grid; border:1px solid #e7ebf2; border-radius:12px; overflow:hidden; }
.comparison-route-row { display:grid; grid-template-columns:minmax(0,1fr) 180px 150px; gap:12px; align-items:center; padding:10px 12px; background:#fff; border-top:1px solid #eef2f8; }
.comparison-route-row:first-child { border-top:0; }
.comparison-route-row > div:first-child { display:grid; gap:3px; }
.comparison-route-row span { color:#64748b; font-size:12px; }
.comparison-status { display:inline-flex; align-items:center; width:max-content; padding:5px 9px; border-radius:999px; background:#eef2f8; color:#475569; font-size:12px; font-weight:800; }
.comparison-status--opportunity { background:#dcfce7; color:#166534; }
.comparison-status--coverage_opportunity { background:#e0f2fe; color:#075985; }
.comparison-status--needs_review { background:#fef3c7; color:#92400e; }
.comparison-card__actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:14px; }
.crm-detail-panel {
  overflow:hidden;
}
.crm-detail-panel summary,
.section-summary {
  cursor:pointer;
  list-style:none;
  margin:-14px -14px 14px;
  padding:14px;
  font-weight:800;
  color:#17233d;
  background:#fcf7fd;
  border-bottom:1px solid #e7ebf2;
}
.crm-detail-panel summary::-webkit-details-marker,
.section-summary::-webkit-details-marker {
  display:none;
}
.segments-block { margin:0; }
.segments-grid { display:grid; grid-template-columns:1fr; gap:8px; }
.segment-item { display:flex; align-items:center; gap:8px; font-size:14px; color:#2f3e60; }
.links-block { margin:0; }
.linked-row { display:grid; grid-template-columns:1.4fr 1fr 1fr; gap:10px; padding:8px 0; border-bottom:1px solid #f1f4f8; }
.manager-empty { margin-top:12px; padding:12px; border:1px dashed #cbd5e1; border-radius:10px; background:#fff; color:#64748b; line-height:1.5; }
.manager-list { display:grid; gap:8px; margin-top:12px; }
.manager-row { display:grid; grid-template-columns:minmax(160px,1fr) minmax(220px,1.3fr) auto; gap:12px; align-items:center; padding:12px; border:1px solid #e7ebf2; border-radius:10px; background:#fff; }
.manager-row__main, .manager-row__channels { display:grid; gap:4px; min-width:0; }
.manager-row__main span, .manager-row__channels span { color:#64748b; font-size:13px; }
.manager-row__channels a { color:#702283; overflow-wrap:anywhere; }
.manager-form { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:16px; padding-top:16px; border-top:1px solid #e7ebf2; }
.manager-form__title, .manager-form__wide { grid-column:1 / -1; }
.manager-form__title { font-weight:800; color:#17233d; }
.manager-form__actions { display:flex; justify-content:flex-start; }
.supplier-driver-card {
  display:grid;
  gap:14px;
  padding:14px;
  border:1px solid #e7ebf2;
  border-radius:14px;
  background:#fff;
}
.supplier-driver-card + .supplier-driver-card {
  margin-top:12px;
}
.supplier-driver-card__head {
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:12px;
}
.supplier-driver-card__title {
  font-size:18px;
  font-weight:800;
  color:#17233d;
}
.supplier-driver-card__sub {
  margin-top:4px;
  color:#64748b;
  line-height:1.5;
}
.supplier-driver-card__stats {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.supplier-driver-grid {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}
.supplier-driver-panel {
  display:grid;
  gap:10px;
  padding:12px;
  border:1px solid #eef2f8;
  border-radius:12px;
  background:#fbfcff;
}
.supplier-driver-panel--wide {
  background:linear-gradient(180deg,#fff 0%,#fcf7fd 100%);
}
.supplier-driver-panel__label {
  font-size:12px;
  font-weight:800;
  letter-spacing:.04em;
  text-transform:uppercase;
  color:#702283;
}
.carrier-vehicle-list,
.carrier-rate-list {
  display:grid;
  gap:8px;
}
.carrier-vehicle-row,
.carrier-rate-row {
  display:grid;
  gap:4px;
  padding:10px 12px;
  border:1px solid #eef2f8;
  border-radius:10px;
  background:#fff;
}
.carrier-vehicle-row span,
.carrier-rate-row__meta {
  color:#64748b;
  line-height:1.45;
}
.carrier-rate-row__route {
  font-weight:700;
  color:#17233d;
}
.actions { display:flex; gap:10px; justify-content:flex-end; }
@media (max-width: 1100px) {
  .overview-strip { grid-template-columns:repeat(3,minmax(0,1fr)); }
}
@media (max-width: 900px) {
  .crm-header, .crm-filters { grid-template-columns:1fr; display:grid; }
  .crm-actions { justify-content:flex-start; }
  .crm-focus-card, .detail-sections, .card-grid { grid-template-columns:1fr; }
  .comparison-kpis { grid-template-columns:1fr 1fr; }
  .comparison-route-row { grid-template-columns:1fr; }
  .comparison-tabs { width:100%; }
  .comparison-tab { flex:1; justify-content:center; }
  .supplier-driver-grid,
  .supplier-driver-card__head { grid-template-columns:1fr; display:grid; }
  .overview-strip { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .crm-table__head, .crm-table__row { min-width:900px; }
}
@media (max-width: 640px) {
  .overview-strip { grid-template-columns:1fr; }
  .mode-switch, .view-strip {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .mode-pill, .view-pill {
    flex: 0 0 auto;
  }
  .crm-actions, .actions {
    width: 100%;
  }
  .crm-actions .btn, .actions .btn {
    width: 100%;
  }
  .crm-filters__meta {
    flex-wrap: wrap;
  }
  .linked-row {
    grid-template-columns:1fr;
  }
  .manager-row, .manager-form {
    grid-template-columns:1fr;
  }
  .manager-form__title, .manager-form__wide {
    grid-column:auto;
  }
  .comparison-kpis { grid-template-columns:1fr; }
  .comparison-card__head { display:grid; }
  .modal {
    width:min(100vw - 16px, 980px);
    padding:16px;
  }
}
</style>
