<template>
  <div>
    <navigation></navigation>
    <section class="site-section site-section--pf matrix-section">
      <div class="container">
        <h1 class="h2">Матрица направлений</h1>
        <admin-tabs />

        <div class="toolbar">
          <input v-model="q" class="input" placeholder="Поиск по стране/городу" @input="applyFilter" />
          <button class="btn btn--primary" @click="load">Обновить</button>
        </div>

        <div class="table-wrap">
          <div class="table-head">
            <div>Страна</div><div>Город</div><div>Заказчики</div><div>Исполнители</div>
          </div>
          <div
            class="table-row"
            v-for="row in groupedRows"
            :key="`${row.country}::${row.city}`"
          >
            <div class="country-cell" :class="{ 'country-cell--empty': !row.showCountry }">
              {{ row.showCountry ? row.country : '' }}
            </div>
            <div>
              <div class="city-name">{{ row.city }}</div>
              <div v-if="row.needOutreach" class="outreach-note">{{ row.needOutreach }}</div>
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
              <div v-else class="muted">Нет заказчиков</div>
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
              <div v-else class="muted">Нет исполнителей</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="companyModal.open" class="modal-overlay" @click="companyModal.open = false">
      <div class="modal" @click.stop>
        <h3>{{ companyForm.name || 'Карточка компании' }}</h3>
        <div class="grid two-cols">
          <input v-model="companyForm.name" class="input" placeholder="Название" />
          <input v-model="companyForm.website" class="input" placeholder="Сайт" />
          <input v-model="companyForm.phone" class="input" placeholder="Телефон" />
          <input v-model="companyForm.email" class="input" placeholder="Email" />
          <input v-model="companyForm.telegramUrl" class="input" placeholder="Telegram ссылка" />
          <input v-model="companyForm.countryPresence" class="input" placeholder="Страны присутствия" />
          <input v-model="companyForm.cityPresence" class="input" placeholder="Города присутствия" />
          <textarea v-model="companyForm.comment" class="input textarea" placeholder="Комментарий"></textarea>
        </div>
        <div class="row-actions">
          <button class="btn btn--primary" @click="saveCompany">Сохранить</button>
          <button class="btn" @click="companyModal.open = false">Закрыть</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import navigation from '~/components/partials/nav.vue'
import adminTabs from '~/components/partials/adminTabs.vue'

export default {
  middleware: 'crm',
  components: { navigation, adminTabs },
  data: () => ({
    rows: [],
    filtered: [],
    q: '',
    companyModal: { open: false, id: '' },
    companyForm: {}
  }),
  computed: {
    groupedRows () {
      const out = []
      let currentCountry = ''
      for (const row of this.filtered) {
        const showCountry = row.country !== currentCountry
        currentCountry = row.country
        let needOutreach = ''
        if (row.clientsCount > 0 && row.suppliersCount === 0) needOutreach = 'Нужно предложить направление исполнителям'
        if (row.suppliersCount > 0 && row.clientsCount === 0) needOutreach = 'Нужно предложить направление заказчикам'
        out.push({ ...row, showCountry, needOutreach })
      }
      return out
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
      this.filtered = this.rows.filter((r) => `${r.country} ${r.city}`.toLowerCase().includes(q))
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
        countryPresence: company.countryPresence || '',
        cityPresence: company.cityPresence || '',
        comment: company.comment || ''
      }
    },
    async saveCompany () {
      await fetch(`/api/admin/crm/companies/${this.companyModal.id}`, {
        method: 'PUT',
        headers: this.authHeaders(),
        body: JSON.stringify(this.companyForm)
      })
      await this.load()
    }
  }
}
</script>

<style scoped>
.matrix-section { padding-top: 140px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 12px; }
.input { border: 1px solid #d8d8e6; border-radius: 8px; padding: 8px 10px; min-width: 220px; width: 100%; }
.textarea { min-height: 90px; resize: vertical; }
.table-wrap { background: #fff; border: 1px solid #d8d8e6; border-radius: 12px; overflow: auto; }
.table-head, .table-row { display: grid; grid-template-columns: 190px 220px 1fr 1fr; gap: 10px; min-width: 1100px; padding: 10px 12px; }
.table-head { font-weight: 700; border-bottom: 1px solid #e5e7ef; }
.table-row { border-bottom: 1px solid #f0f2f8; }
.country-cell { font-weight: 700; color: #263b64; }
.country-cell--empty { color: transparent; }
.city-name { font-weight: 600; color: #20314f; }
.entity-cell { min-height: 36px; }
.entity-list { display: flex; flex-wrap: wrap; gap: 6px; }
.entity-pill {
  border: 1px solid #d2d9eb;
  background: #f8fbff;
  color: #2a3f66;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
}
.entity-pill--client { border-color: #b9daf7; background: #eef7ff; }
.entity-pill--supplier { border-color: #bce6d4; background: #effaf5; }
.outreach-note { margin-top: 4px; font-size: 12px; color: #975a16; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1200; }
.modal { width: min(900px, 92vw); max-height: 86vh; overflow: auto; background: #fff; border-radius: 12px; padding: 16px; }
.card-row { display: flex; justify-content: space-between; align-items: center; border: 1px solid #e5e7ef; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
.name { font-weight: 700; }
.muted { color: #6b7280; font-size: 13px; }
.grid.two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0; }
</style>
