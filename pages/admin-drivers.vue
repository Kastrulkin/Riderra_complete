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

        <div class="toolbar">
          <input v-model="q" class="input" :placeholder="t.search" @input="loadDrivers" />
          <button class="btn btn--primary" @click="loadDrivers">{{ t.refresh }}</button>
        </div>

        <div class="drivers-table">
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
      q: '',
      rows: [],
      editing: null,
      editForm: {
        country: '',
        city: '',
        commissionRate: '',
        telegramUserId: '',
        comment: ''
      }
    }
  },
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'Управление водителями',
            search: 'Поиск (имя/email/город)',
            refresh: 'Обновить',
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
            editDriver: 'Редактирование водителя',
            comment: 'Комментарий',
            save: 'Сохранить',
            cancel: 'Отмена'
          }
        : {
            title: 'Driver Management',
            search: 'Search (name/email/city)',
            refresh: 'Refresh',
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
            editDriver: 'Edit driver',
            comment: 'Comment',
            save: 'Save',
            cancel: 'Cancel'
          }
    }
  },
  mounted () {
    this.loadDrivers()
  },
  methods: {
    authHeaders () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
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
    }
  }
}
</script>

<style scoped>
.admin-section { padding-top: 150px; padding-bottom: 40px; color: #fff; }
.admin-title { margin-bottom: 12px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,.25); background: rgba(255,255,255,.1); color: #fff; }
.drivers-table { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.2); border-radius: 12px; overflow: auto; }
.table-header, .table-row { display: grid; grid-template-columns: 1.2fr 1.6fr 1fr .9fr .9fr .8fr .7fr .9fr 1fr 1.2fr; gap: 10px; padding: 12px; min-width: 1200px; align-items: center; }
.table-header { font-weight: 600; background: rgba(255,255,255,.08); }
.table-row { border-top: 1px solid rgba(255,255,255,.08); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.modal { width: min(700px, 95vw); background: #0f172a; border: 1px solid rgba(255,255,255,.2); border-radius: 12px; padding: 18px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.actions { display: flex; gap: 10px; margin-top: 12px; }
</style>
