<template>
  <div>
    <navigation></navigation>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>

    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <admin-tabs />

        <div class="subtabs">
          <button class="btn btn--small" :class="{ active: activeTab === 'drivers' }" @click="activeTab = 'drivers'">{{ t.driversTab }}</button>
          <button class="btn btn--small" :class="{ active: activeTab === 'vehicles' }" @click="activeTab = 'vehicles'">{{ t.vehiclesTab }}</button>
        </div>

        <div class="toolbar">
          <input v-model="q" class="input" :placeholder="activeTab === 'drivers' ? t.searchDrivers : t.searchVehicles" @input="onSearch" />
          <button class="btn btn--primary" @click="refreshActive">{{ t.refresh }}</button>
          <button v-if="activeTab === 'vehicles'" class="btn" @click="openVehicleModal()">{{ t.addVehicle }}</button>
        </div>

        <div v-if="activeTab === 'drivers'" class="drivers-table">
          <div class="table-header">
            <div>{{ t.name }}</div>
            <div>{{ t.email }}</div>
            <div>{{ t.phone }}</div>
            <div>{{ t.supplierContact }}</div>
            <div>{{ t.country }}</div>
            <div>{{ t.city }}</div>
            <div>{{ t.pricing }}</div>
            <div>{{ t.rating }}</div>
            <div>{{ t.status }}</div>
            <div>{{ t.actions }}</div>
          </div>
          <div v-for="driver in rows" :key="driver.id" class="table-row">
            <div>{{ driver.name }}</div>
            <div>{{ driver.email }}</div>
            <div>{{ driver.phone || '-' }}</div>
            <div>{{ driver.supplierContact ? driver.supplierContact.fullName : '-' }}</div>
            <div>{{ driver.country || '-' }}</div>
            <div>{{ driver.city || '-' }}</div>
            <div>{{ pricingSummary(driver) }}</div>
            <div>{{ driver.rating || '-' }}</div>
            <div>{{ driver.verificationStatus }}</div>
            <div>
              <button class="btn btn--small btn--primary" @click="editDriver(driver)">{{ t.edit }}</button>
              <button class="btn btn--small" :class="driver.isActive ? 'btn--danger' : 'btn--success'" @click="toggleDriver(driver)">
                {{ driver.isActive ? t.deactivate : t.activate }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'vehicles'" class="vehicles-table">
          <div class="table-header table-header--vehicles">
            <div>{{ t.vehicleClass }}</div>
            <div>{{ t.vehicleCard }}</div>
            <div>{{ t.plate }}</div>
            <div>{{ t.driver }}</div>
            <div>{{ t.location }}</div>
            <div>{{ t.status }}</div>
            <div>{{ t.actions }}</div>
          </div>
          <div v-for="vehicle in vehicleRows" :key="vehicle.id" class="table-row table-row--vehicles">
            <div><span class="class-chip">{{ vehicle.vehicleClass }}</span></div>
            <div>{{ vehicleCard(vehicle) }}</div>
            <div>{{ vehicle.plateNumber }}</div>
            <div>{{ vehicle.driver ? vehicle.driver.name : '-' }}</div>
            <div>{{ vehicle.driver ? [vehicle.driver.country, vehicle.driver.city].filter(Boolean).join(', ') : '-' }}</div>
            <div>{{ vehicle.isActive ? t.active : t.inactive }}</div>
            <div>
              <button class="btn btn--small btn--primary" @click="openVehicleModal(vehicle)">{{ t.edit }}</button>
              <button class="btn btn--small btn--danger" @click="deactivateVehicle(vehicle)">{{ t.delete }}</button>
            </div>
          </div>
        </div>

        <div v-if="editing" class="modal-overlay" @click="editing = null">
          <div class="modal" @click.stop>
            <h3>{{ t.editDriver }}</h3>
            <div class="form-grid">
              <div>
                <label>{{ t.name }}</label>
                <input v-model="editForm.name" class="input" />
              </div>
              <div>
                <label>{{ t.email }}</label>
                <input v-model="editForm.email" class="input" />
              </div>
              <div>
                <label>{{ t.phone }}</label>
                <input v-model="editForm.phone" class="input" />
              </div>
              <div>
                <label>{{ t.country }}</label>
                <input v-model="editForm.country" class="input" />
              </div>
              <div>
                <label>{{ t.city }}</label>
                <input v-model="editForm.city" class="input" />
              </div>
              <div>
                <label>{{ t.commission }}</label>
                <input v-model="editForm.commissionRate" class="input" type="number" min="0" max="100" step="0.1" />
              </div>
              <div>
                <label>{{ t.pricingCurrency }}</label>
                <input v-model="editForm.pricingCurrency" class="input" />
              </div>
              <div>
                <label>{{ t.telegramId }}</label>
                <input v-model="editForm.telegramUserId" class="input" />
              </div>
              <div>
                <label>{{ t.supplierCompany }}</label>
                <select v-model="editForm.supplierCompanyId" class="input">
                  <option value="">-</option>
                  <option v-for="company in supplierCompanies" :key="company.id" :value="company.id">
                    {{ company.name }}{{ company.phone ? ` · ${company.phone}` : '' }}
                  </option>
                </select>
              </div>
              <div>
                <label>{{ t.supplierContact }}</label>
                <select v-model="editForm.supplierContactId" class="input">
                  <option value="">-</option>
                  <option v-for="contact in supplierContacts" :key="contact.id" :value="contact.id">
                    {{ contact.fullName }}{{ contact.phone ? ` · ${contact.phone}` : '' }}
                  </option>
                </select>
              </div>
            </div>
            <div>
              <label>{{ t.comment }}</label>
              <textarea v-model="editForm.comment" class="input" rows="3"></textarea>
            </div>

            <div class="route-panel">
              <div class="route-panel__head">
                <h4>{{ t.routePricing }}</h4>
                <div class="route-panel__hint">{{ t.routePricingHint }}</div>
              </div>

              <div v-if="routeRows.length" class="route-list">
                <div v-for="route in routeRows" :key="route.id" class="route-card">
                  <div class="route-card__title">
                    <strong>{{ route.vehicleType || t.allVehicleClasses }}</strong>
                    <span>{{ route.fromPoint }} → {{ route.toPoint }}</span>
                  </div>
                  <div class="route-card__meta">
                    <span>{{ route.driverPrice }} {{ route.currency || editForm.pricingCurrency || 'EUR' }}</span>
                    <span v-if="route.sourceLabel">{{ route.sourceLabel }}</span>
                    <span v-if="route.sourceQuotedAt">{{ formatDate(route.sourceQuotedAt) }}</span>
                    <span v-if="route.sourceStatus">{{ route.sourceStatus }}</span>
                  </div>
                  <div v-if="route.sourceMessage" class="route-card__message">{{ route.sourceMessage }}</div>
                  <div class="route-card__actions">
                    <button class="btn btn--small btn--primary" @click="startRouteEdit(route)">{{ t.edit }}</button>
                    <button class="btn btn--small btn--danger" @click="deleteRoute(route)">{{ t.delete }}</button>
                  </div>
                </div>
              </div>
              <div v-else class="hint">{{ t.noRoutes }}</div>

              <div v-if="routeSourceEntries.length" class="source-panel">
                <div class="source-panel__head">
                  <h4>{{ t.priceSources }}</h4>
                  <div class="route-panel__hint">{{ t.priceSourcesHint }}</div>
                </div>
                <div class="source-list">
                  <div v-for="entry in routeSourceEntries" :key="entry.key" class="source-card">
                    <div class="source-card__meta">
                      <strong>{{ entry.label }}</strong>
                      <span>{{ entry.status }}</span>
                      <span v-if="entry.quotedAt">{{ formatDate(entry.quotedAt) }}</span>
                    </div>
                    <div class="source-card__coverage">{{ entry.coverage }}</div>
                    <div v-if="entry.message" class="source-card__message">{{ entry.message }}</div>
                  </div>
                </div>
              </div>

              <div class="route-form">
                <div class="form-grid">
                  <div>
                    <label>{{ t.fromPoint }}</label>
                    <input v-model="routeForm.fromPoint" class="input" />
                  </div>
                  <div>
                    <label>{{ t.toPoint }}</label>
                    <input v-model="routeForm.toPoint" class="input" />
                  </div>
                  <div>
                    <label>{{ t.vehicleClass }}</label>
                    <input v-model="routeForm.vehicleType" class="input" />
                  </div>
                  <div>
                    <label>{{ t.driverPriceLabel }}</label>
                    <input v-model="routeForm.driverPrice" class="input" type="number" step="0.01" min="0" />
                  </div>
                  <div>
                    <label>{{ t.pricingCurrency }}</label>
                    <input v-model="routeForm.currency" class="input" />
                  </div>
                  <div>
                    <label>{{ t.sourceType }}</label>
                    <input v-model="routeForm.sourceType" class="input" placeholder="whatsapp" />
                  </div>
                  <div>
                    <label>{{ t.sourceLabel }}</label>
                    <input v-model="routeForm.sourceLabel" class="input" placeholder="WhatsApp, 23.04.2026 18:47" />
                  </div>
                  <div>
                    <label>{{ t.sourceStatus }}</label>
                    <select v-model="routeForm.sourceStatus" class="input">
                      <option value="approved">approved</option>
                      <option value="pending_clarification">pending_clarification</option>
                      <option value="archived">archived</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label>{{ t.sourceMessage }}</label>
                  <textarea v-model="routeForm.sourceMessage" class="input" rows="3"></textarea>
                </div>
                <div class="actions">
                  <button class="btn btn--primary" @click="saveRoute">{{ routeEditingId ? t.updateRoute : t.addRoute }}</button>
                  <button class="btn btn--ghost" @click="resetRouteForm">{{ t.cancel }}</button>
                </div>
              </div>
            </div>

            <div class="actions">
              <button class="btn btn--primary" @click="saveDriver">{{ t.save }}</button>
              <button class="btn btn--ghost" @click="editing = null">{{ t.cancel }}</button>
            </div>
          </div>
        </div>

        <div v-if="vehicleEditing" class="modal-overlay" @click="vehicleEditing = null">
          <div class="modal" @click.stop>
            <h3>{{ vehicleEditing.id ? t.editVehicle : t.addVehicle }}</h3>
            <div class="form-grid">
              <div>
                <label>{{ t.vehicleClass }} *</label>
                <input v-model="vehicleForm.vehicleClass" class="input" />
              </div>
              <div>
                <label>{{ t.plate }} *</label>
                <input v-model="vehicleForm.plateNumber" class="input" />
              </div>
              <div>
                <label>{{ t.brand }}</label>
                <input v-model="vehicleForm.brand" class="input" />
              </div>
              <div>
                <label>{{ t.model }}</label>
                <input v-model="vehicleForm.model" class="input" />
              </div>
              <div>
                <label>{{ t.year }}</label>
                <input v-model="vehicleForm.productionYear" class="input" type="number" min="1970" max="2100" />
              </div>
              <div>
                <label>{{ t.seats }}</label>
                <input v-model="vehicleForm.seats" class="input" type="number" min="1" max="60" />
              </div>
              <div>
                <label>{{ t.color }}</label>
                <input v-model="vehicleForm.color" class="input" />
              </div>
              <div>
                <label>{{ t.driver }}</label>
                <select v-model="vehicleForm.driverId" class="input">
                  <option value="">-</option>
                  <option v-for="d in driverOptions" :key="d.id" :value="d.id">{{ d.name }} ({{ d.city || '-' }})</option>
                </select>
              </div>
            </div>
            <div>
              <label>{{ t.comment }}</label>
              <textarea v-model="vehicleForm.notes" class="input" rows="3"></textarea>
            </div>
            <div class="actions">
              <button class="btn btn--primary" @click="saveVehicle">{{ t.save }}</button>
              <button class="btn btn--ghost" @click="vehicleEditing = null">{{ t.cancel }}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import navigation from '~/components/partials/nav.vue'
import adminTabs from '~/components/partials/adminTabs.vue'

export default {
  layout: 'default',
  middleware: 'staff',
  components: { navigation, adminTabs },
  data () {
    return {
      activeTab: 'drivers',
      q: '',
      rows: [],
      vehicleRows: [],
      driverOptions: [],
      supplierCompanies: [],
      supplierContacts: [],
      editing: null,
      vehicleEditing: null,
      editForm: {
        name: '',
        email: '',
        phone: '',
        country: '',
        city: '',
        commissionRate: '',
        pricingCurrency: 'EUR',
        telegramUserId: '',
        supplierCompanyId: '',
        supplierContactId: '',
        comment: ''
      },
      routeRows: [],
      routeEditingId: '',
      routeForm: {
        fromPoint: '',
        toPoint: '',
        vehicleType: '',
        driverPrice: '',
        currency: 'EUR',
        sourceType: 'whatsapp',
        sourceLabel: '',
        sourceStatus: 'approved',
        sourceMessage: ''
      },
      vehicleForm: {
        vehicleClass: '',
        brand: '',
        model: '',
        plateNumber: '',
        productionYear: '',
        color: '',
        seats: '',
        notes: '',
        driverId: ''
      }
    }
  },
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'Управление водителями',
            driversTab: 'Водители',
            vehiclesTab: 'Автомобили',
            searchDrivers: 'Поиск водителей (имя/email/город)',
            searchVehicles: 'Поиск авто (класс/марка/номер/водитель)',
            refresh: 'Обновить',
            addVehicle: 'Добавить автомобиль',
            name: 'Имя',
            email: 'Email',
            phone: 'Телефон',
            country: 'Страна',
            city: 'Город',
            commission: 'Комиссия',
            pricing: 'Закупка',
            pricingCurrency: 'Валюта',
            rating: 'Рейтинг',
            status: 'Статус',
            telegramId: 'Telegram ID',
            supplierCompany: 'Перевозчик',
            supplierContact: 'Контакт поставщика',
            actions: 'Действия',
            edit: 'Редактировать',
            activate: 'Активировать',
            deactivate: 'Деактивировать',
            delete: 'Удалить',
            editDriver: 'Редактирование водителя',
            editVehicle: 'Карточка автомобиля',
            vehicleClass: 'Класс',
            vehicleCard: 'Автомобиль',
            plate: 'Госномер',
            brand: 'Марка',
            model: 'Модель',
            year: 'Год',
            seats: 'Мест',
            color: 'Цвет',
            driver: 'Водитель',
            location: 'Локация',
            active: 'active',
            inactive: 'off',
            comment: 'Комментарий',
            routePricing: 'Закупочные тарифы',
            routePricingHint: 'Маршруты и источники цен поставщика для будущей сверки с продажной ценой.',
            noRoutes: 'Пока нет закупочных тарифов',
            fromPoint: 'Откуда',
            toPoint: 'Куда',
            driverPriceLabel: 'Закупочная цена',
            sourceType: 'Тип источника',
            sourceLabel: 'Источник',
            sourceStatus: 'Статус источника',
            sourceMessage: 'Текст / цитата источника',
            allVehicleClasses: 'Все классы',
            priceSources: 'Источники цен',
            priceSourcesHint: 'Отдельный список подтверждений, на которые потом сможет ссылаться бот и команда.',
            addRoute: 'Добавить тариф',
            updateRoute: 'Обновить тариф',
            save: 'Сохранить',
            cancel: 'Отмена'
          }
        : {
            title: 'Driver Management',
            driversTab: 'Drivers',
            vehiclesTab: 'Vehicles',
            searchDrivers: 'Search drivers (name/email/city)',
            searchVehicles: 'Search vehicles (class/brand/plate/driver)',
            refresh: 'Refresh',
            addVehicle: 'Add vehicle',
            name: 'Name',
            email: 'Email',
            phone: 'Phone',
            country: 'Country',
            city: 'City',
            commission: 'Commission',
            pricing: 'Buy rate',
            pricingCurrency: 'Currency',
            rating: 'Rating',
            status: 'Status',
            telegramId: 'Telegram ID',
            supplierCompany: 'Carrier',
            supplierContact: 'Supplier contact',
            actions: 'Actions',
            edit: 'Edit',
            activate: 'Activate',
            deactivate: 'Deactivate',
            delete: 'Delete',
            editDriver: 'Edit driver',
            editVehicle: 'Vehicle card',
            vehicleClass: 'Class',
            vehicleCard: 'Vehicle',
            plate: 'Plate',
            brand: 'Brand',
            model: 'Model',
            year: 'Year',
            seats: 'Seats',
            color: 'Color',
            driver: 'Driver',
            location: 'Location',
            active: 'active',
            inactive: 'off',
            comment: 'Comment',
            routePricing: 'Supplier rates',
            routePricingHint: 'Operational buy rates with provenance, used later for margin checks.',
            noRoutes: 'No supplier rates yet',
            fromPoint: 'From',
            toPoint: 'To',
            driverPriceLabel: 'Buy price',
            sourceType: 'Source type',
            sourceLabel: 'Source',
            sourceStatus: 'Source status',
            sourceMessage: 'Source quote',
            allVehicleClasses: 'All classes',
            priceSources: 'Price sources',
            priceSourcesHint: 'Clean provenance list the team and copilot can cite later.',
            addRoute: 'Add rate',
            updateRoute: 'Update rate',
            save: 'Save',
            cancel: 'Cancel'
          }
    },
    routeSourceEntries () {
      const grouped = new Map()
      for (const route of this.routeRows || []) {
        const key = [
          route.sourceLabel || '',
          route.sourceStatus || '',
          route.sourceQuotedAt || '',
          route.sourceMessage || ''
        ].join('|')
        const label = route.sourceLabel || (this.$store.state.language === 'ru' ? 'Без названия источника' : 'Unnamed source')
        const coverageItem = `${route.vehicleType || this.t.allVehicleClasses}: ${route.fromPoint} → ${route.toPoint}`
        if (!grouped.has(key)) {
          grouped.set(key, {
            key,
            label,
            status: route.sourceStatus || 'approved',
            quotedAt: route.sourceQuotedAt || null,
            message: route.sourceMessage || '',
            coverageItems: [coverageItem]
          })
        } else {
          grouped.get(key).coverageItems.push(coverageItem)
        }
      }
      return Array.from(grouped.values()).map((entry) => ({
        ...entry,
        coverage: entry.coverageItems.join(' • ')
      }))
    }
  },
  watch: {
    activeTab () {
      this.q = ''
      this.refreshActive()
    }
  },
  mounted () {
    this.refreshActive()
  },
  methods: {
    authHeaders () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
    async onSearch () {
      if (this.activeTab === 'drivers') {
        await this.loadDrivers()
      } else {
        await this.loadVehicles()
      }
    },
    async refreshActive () {
      if (this.activeTab === 'drivers') {
        await this.loadDrivers()
      } else {
        await Promise.all([this.loadVehicles(), this.loadDriverOptions()])
      }
    },
    async loadDrivers () {
      const res = await fetch('/api/admin/drivers', { headers: this.authHeaders() })
      const data = await res.json()
      let rows = Array.isArray(data) ? data : []
      if (this.q.trim()) {
        const q = this.q.trim().toLowerCase()
        rows = rows.filter((r) =>
          [r.name, r.email, r.city, r.country]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      }
      this.rows = rows
    },
    async loadSupplierContacts () {
      const res = await fetch('/api/admin/crm/contacts?segment=supplier_contact&limit=300', { headers: this.authHeaders() })
      const data = await res.json().catch(() => ({}))
      this.supplierContacts = Array.isArray(data.rows) ? data.rows : []
    },
    async loadSupplierCompanies () {
      const res = await fetch('/api/admin/crm/companies?limit=300', { headers: this.authHeaders() })
      const data = await res.json().catch(() => ({}))
      this.supplierCompanies = Array.isArray(data.rows) ? data.rows : []
    },
    async loadDriverOptions () {
      const res = await fetch('/api/admin/drivers', { headers: this.authHeaders() })
      const data = await res.json()
      this.driverOptions = Array.isArray(data) ? data : []
    },
    async loadVehicles () {
      const query = this.q.trim() ? `?q=${encodeURIComponent(this.q.trim())}&limit=1000` : '?limit=1000'
      const res = await fetch(`/api/admin/fleet-vehicles${query}`, { headers: this.authHeaders() })
      const data = await res.json().catch(() => ({}))
      this.vehicleRows = Array.isArray(data.rows) ? data.rows : []
    },
    async editDriver (driver) {
      const res = await fetch(`/api/admin/drivers/${driver.id}`, { headers: this.authHeaders() })
      const details = await res.json().catch(() => driver)
      this.editing = details
      this.editForm = {
        name: details.name || '',
        email: details.email || '',
        phone: details.phone || '',
        country: details.country || '',
        city: details.city || '',
        commissionRate: details.commissionRate ?? '',
        pricingCurrency: details.pricingCurrency || 'EUR',
        telegramUserId: details.telegramUserId || '',
        supplierCompanyId: details.supplierCompanyId || '',
        supplierContactId: details.supplierContactId || '',
        comment: details.comment || ''
      }
      this.routeRows = Array.isArray(details.routes) ? details.routes.filter((route) => route.isActive !== false) : []
      this.resetRouteForm()
      if (!this.supplierCompanies.length) await this.loadSupplierCompanies()
      if (!this.supplierContacts.length) await this.loadSupplierContacts()
    },
    async saveDriver () {
      if (!this.editing) return
      await fetch(`/api/admin/drivers/${this.editing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders()
        },
        body: JSON.stringify(this.editForm)
      })
      this.editing = null
      this.routeRows = []
      this.resetRouteForm()
      await this.loadDrivers()
    },
    pricingSummary (driver) {
      const routesCount = driver?._count?.routes || 0
      const currency = driver?.pricingCurrency || 'EUR'
      if (!routesCount) return '-'
      return `${routesCount} ${currency}`
    },
    resetRouteForm () {
      this.routeEditingId = ''
      this.routeForm = {
        fromPoint: '',
        toPoint: '',
        vehicleType: '',
        driverPrice: '',
        currency: this.editForm.pricingCurrency || 'EUR',
        sourceType: 'whatsapp',
        sourceLabel: '',
        sourceStatus: 'approved',
        sourceMessage: ''
      }
    },
    startRouteEdit (route) {
      this.routeEditingId = route.id
      this.routeForm = {
        fromPoint: route.fromPoint || '',
        toPoint: route.toPoint || '',
        vehicleType: route.vehicleType || '',
        driverPrice: route.driverPrice ?? '',
        currency: route.currency || this.editForm.pricingCurrency || 'EUR',
        sourceType: route.sourceType || 'whatsapp',
        sourceLabel: route.sourceLabel || '',
        sourceStatus: route.sourceStatus || 'approved',
        sourceMessage: route.sourceMessage || ''
      }
    },
    async saveRoute () {
      if (!this.editing) return
      const payload = { ...this.routeForm }
      const isEdit = !!this.routeEditingId
      const url = isEdit ? `/api/admin/drivers/routes/${this.routeEditingId}` : `/api/admin/drivers/${this.editing.id}/routes`
      const method = isEdit ? 'PUT' : 'POST'
      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders()
        },
        body: JSON.stringify(payload)
      })
      const refreshed = await fetch(`/api/admin/drivers/${this.editing.id}`, { headers: this.authHeaders() })
      const details = await refreshed.json().catch(() => ({}))
      this.editing = { ...this.editing, ...details }
      this.routeRows = Array.isArray(details.routes) ? details.routes.filter((route) => route.isActive !== false) : []
      this.resetRouteForm()
      await this.loadDrivers()
    },
    async deleteRoute (route) {
      await fetch(`/api/admin/drivers/routes/${route.id}`, {
        method: 'DELETE',
        headers: this.authHeaders()
      })
      this.routeRows = this.routeRows.filter((item) => item.id !== route.id)
      await this.loadDrivers()
    },
    formatDate (value) {
      try {
        return new Date(value).toLocaleString()
      } catch (_) {
        return value
      }
    },
    async toggleDriver (driver) {
      await fetch(`/api/admin/drivers/${driver.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders()
        },
        body: JSON.stringify({ isActive: !driver.isActive })
      })
      await this.loadDrivers()
    },
    vehicleCard (vehicle) {
      return [vehicle.brand, vehicle.model, vehicle.productionYear].filter(Boolean).join(' ')
    },
    openVehicleModal (vehicle = null) {
      this.vehicleEditing = vehicle || {}
      this.vehicleForm = {
        vehicleClass: vehicle?.vehicleClass || '',
        brand: vehicle?.brand || '',
        model: vehicle?.model || '',
        plateNumber: vehicle?.plateNumber || '',
        productionYear: vehicle?.productionYear || '',
        color: vehicle?.color || '',
        seats: vehicle?.seats || '',
        notes: vehicle?.notes || '',
        driverId: vehicle?.driverId || ''
      }
      if (!this.driverOptions.length) {
        this.loadDriverOptions()
      }
    },
    async saveVehicle () {
      const payload = { ...this.vehicleForm }
      if (!payload.driverId) payload.driverId = null
      if (!payload.productionYear) payload.productionYear = null
      if (!payload.seats) payload.seats = null

      const isEdit = !!this.vehicleEditing?.id
      const url = isEdit ? `/api/admin/fleet-vehicles/${this.vehicleEditing.id}` : '/api/admin/fleet-vehicles'
      const method = isEdit ? 'PUT' : 'POST'
      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders()
        },
        body: JSON.stringify(payload)
      })
      this.vehicleEditing = null
      await this.loadVehicles()
    },
    async deactivateVehicle (vehicle) {
      await fetch(`/api/admin/fleet-vehicles/${vehicle.id}`, {
        method: 'DELETE',
        headers: this.authHeaders()
      })
      await this.loadVehicles()
    }
  }
}
</script>

<style scoped>
.admin-section { padding-top: 150px; padding-bottom: 40px; color: #fff; }
.admin-title { margin-bottom: 12px; }
.subtabs { display: flex; gap: 8px; margin-bottom: 12px; }
.btn.active { background: #0ea5e9; color: #fff; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,.25); background: rgba(255,255,255,.1); color: #fff; }
.drivers-table, .vehicles-table { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.2); border-radius: 12px; overflow: auto; }
.table-header, .table-row { display: grid; grid-template-columns: 1.1fr 1.4fr 1fr 1fr .8fr .8fr .8fr .7fr .9fr; gap: 10px; padding: 12px; min-width: 1240px; align-items: center; }
.table-header { font-weight: 600; background: rgba(255,255,255,.08); }
.table-row { border-top: 1px solid rgba(255,255,255,.08); }
.table-header--vehicles, .table-row--vehicles { grid-template-columns: .8fr 1.2fr .9fr 1fr 1fr .7fr 1fr; min-width: 980px; }
.class-chip { display: inline-block; padding: 4px 9px; border-radius: 999px; background: rgba(14,165,233,.18); color: #d8f3ff; font-weight: 600; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.modal { width: min(980px, 96vw); max-height: 92vh; overflow: auto; background: #0f172a; border: 1px solid rgba(255,255,255,.2); border-radius: 12px; padding: 18px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.actions { display: flex; gap: 10px; margin-top: 12px; }
.route-panel { margin-top: 18px; border-top: 1px solid rgba(255,255,255,.12); padding-top: 16px; }
.route-panel__head h4 { margin: 0 0 4px; }
.route-panel__hint { color: rgba(255,255,255,.65); font-size: 13px; margin-bottom: 12px; }
.route-list { display: grid; gap: 10px; margin-bottom: 14px; }
.route-card { border: 1px solid rgba(255,255,255,.14); border-radius: 10px; padding: 12px; background: rgba(255,255,255,.04); }
.route-card__title { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.route-card__meta { display: flex; gap: 10px; flex-wrap: wrap; color: rgba(255,255,255,.7); font-size: 13px; margin-bottom: 6px; }
.route-card__message { white-space: pre-wrap; color: rgba(255,255,255,.85); font-size: 13px; margin-bottom: 8px; }
.route-card__actions { display: flex; gap: 8px; }
.source-panel { margin: 6px 0 14px; }
.source-panel__head h4 { margin: 0 0 4px; }
.source-list { display: grid; gap: 10px; margin-top: 8px; }
.source-card { border: 1px solid rgba(255,255,255,.12); border-radius: 10px; padding: 12px; background: rgba(255,255,255,.035); }
.source-card__meta { display: flex; gap: 10px; flex-wrap: wrap; color: rgba(255,255,255,.72); font-size: 13px; margin-bottom: 6px; }
.source-card__coverage { color: rgba(255,255,255,.9); font-size: 13px; margin-bottom: 6px; }
.source-card__message { white-space: pre-wrap; color: rgba(255,255,255,.82); font-size: 13px; }
.route-form { border: 1px solid rgba(255,255,255,.12); border-radius: 10px; padding: 12px; background: rgba(255,255,255,.03); }
</style>
