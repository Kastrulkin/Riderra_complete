<template>
  <div>
    <navigation></navigation>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>

    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <h1 class="h2 admin-title">{{ t.title }}</h1>
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
            <div>{{ t.country }}</div>
            <div>{{ t.city }}</div>
            <div>{{ t.commission }}</div>
            <div>{{ t.rating }}</div>
            <div>{{ t.status }}</div>
            <div>{{ t.telegramId }}</div>
            <div>{{ t.actions }}</div>
          </div>
          <div v-for="driver in rows" :key="driver.id" class="table-row">
            <div>{{ driver.name }}</div>
            <div>{{ driver.email }}</div>
            <div>{{ driver.phone || '-' }}</div>
            <div>{{ driver.country || '-' }}</div>
            <div>{{ driver.city || '-' }}</div>
            <div>{{ driver.commissionRate || '-' }}%</div>
            <div>{{ driver.rating || '-' }}</div>
            <div>{{ driver.verificationStatus }}</div>
            <div>{{ driver.telegramUserId || '-' }}</div>
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
                <label>{{ t.telegramId }}</label>
                <input v-model="editForm.telegramUserId" class="input" />
              </div>
            </div>
            <div>
              <label>{{ t.comment }}</label>
              <textarea v-model="editForm.comment" class="input" rows="3"></textarea>
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
      editing: null,
      vehicleEditing: null,
      editForm: {
        country: '',
        city: '',
        commissionRate: '',
        telegramUserId: '',
        comment: ''
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
            rating: 'Рейтинг',
            status: 'Статус',
            telegramId: 'Telegram ID',
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
            rating: 'Rating',
            status: 'Status',
            telegramId: 'Telegram ID',
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
            save: 'Save',
            cancel: 'Cancel'
          }
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
    editDriver (driver) {
      this.editing = driver
      this.editForm = {
        country: driver.country || '',
        city: driver.city || '',
        commissionRate: driver.commissionRate ?? '',
        telegramUserId: driver.telegramUserId || '',
        comment: driver.comment || ''
      }
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
      await this.loadDrivers()
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
.table-header, .table-row { display: grid; grid-template-columns: 1.2fr 1.6fr 1fr .9fr .9fr .8fr .7fr .9fr 1fr 1.2fr; gap: 10px; padding: 12px; min-width: 1200px; align-items: center; }
.table-header { font-weight: 600; background: rgba(255,255,255,.08); }
.table-row { border-top: 1px solid rgba(255,255,255,.08); }
.table-header--vehicles, .table-row--vehicles { grid-template-columns: .8fr 1.2fr .9fr 1fr 1fr .7fr 1fr; min-width: 980px; }
.class-chip { display: inline-block; padding: 4px 9px; border-radius: 999px; background: rgba(14,165,233,.18); color: #d8f3ff; font-weight: 600; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.modal { width: min(760px, 96vw); background: #0f172a; border: 1px solid rgba(255,255,255,.2); border-radius: 12px; padding: 18px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.actions { display: flex; gap: 10px; margin-top: 12px; }
</style>
