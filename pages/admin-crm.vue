<template>
  <div>
    <navigation></navigation>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf crm-section">
      <div class="container">
        <div class="crm-header">
          <div>
            <h1 class="h2">CRM</h1>
            <p class="crm-subtitle">Кого открыть, где не хватает связей и что делать дальше.</p>
          </div>
          <div class="crm-actions">
            <button class="btn btn--ghost" @click="reload">Обновить</button>
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
            @click="activeView = view.key"
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

          <details v-if="detailsMode==='company'" class="links-block detail-card crm-detail-panel">
            <summary class="section-summary">Связанные контакты</summary>
            <h4>Контакты компании</h4>
            <div v-if="!(details.links || []).length" class="hint">Пока нет связанных контактов</div>
            <div class="linked-row" v-for="link in details.links || []" :key="link.id">
              <div>{{ link.contact.fullName }}</div>
              <div>{{ link.contact.email || '-' }}</div>
              <div>{{ link.contact.phone || '-' }}</div>
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
import navigation from '~/components/partials/nav.vue'
import adminTabs from '~/components/partials/adminTabs.vue'

export default {
  layout: 'default',
  middleware: 'crm',
  components: { navigation, adminTabs },
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
      form: {}
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
    }
  },
  mounted() {
    this.reload()
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
.actions { display:flex; gap:10px; justify-content:flex-end; }
@media (max-width: 1100px) {
  .overview-strip { grid-template-columns:repeat(3,minmax(0,1fr)); }
}
@media (max-width: 900px) {
  .crm-header, .crm-filters { grid-template-columns:1fr; display:grid; }
  .crm-actions { justify-content:flex-start; }
  .crm-focus-card, .detail-sections, .card-grid { grid-template-columns:1fr; }
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
  .modal {
    width:min(100vw - 16px, 980px);
    padding:16px;
  }
}
</style>
