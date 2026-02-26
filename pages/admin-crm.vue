<template>
  <div>
    <navigation></navigation>
    <section class="site-section site-section--pf crm-section">
      <div class="container">
        <div class="crm-header">
          <h1 class="h2">CRM</h1>
          <div class="crm-actions">
            <button class="btn btn--primary" @click="promoteFromStaging">Импортировать из Staging</button>
            <button class="btn btn--ghost" @click="reload">Обновить</button>
          </div>
        </div>
        <admin-tabs />

        <div class="crm-filters">
          <input v-model="query" class="input" placeholder="Поиск: имя / email / телефон" @keyup.enter="reload"/>
          <select v-model="segment" class="input" @change="reload">
            <option value="">Все сегменты</option>
            <option value="client_company">Заказчик (компания)</option>
            <option value="client_contact">Заказчик (контакт)</option>
            <option value="supplier_company">Исполнитель (компания)</option>
            <option value="supplier_contact">Исполнитель (контакт)</option>
            <option value="potential_client_company">Потенциальный заказчик (компания)</option>
            <option value="potential_client_contact">Потенциальный заказчик (контакт)</option>
            <option value="potential_client_agent">Потенциальный заказчик (агент)</option>
            <option value="potential_supplier">Потенциальный исполнитель</option>
          </select>
          <select v-model="mode" class="input" @change="reload">
            <option value="companies">Компании</option>
            <option value="contacts">Контакты</option>
          </select>
        </div>

        <div v-if="loading" class="hint">Loading...</div>

        <div v-else>
          <div class="table" v-if="mode==='companies'">
            <div class="table__row table__row--head">
              <div>Name</div><div>Email</div><div>Phone</div><div>Segments</div><div>Links</div><div>Action</div>
            </div>
            <div class="table__row" v-for="r in rows" :key="r.id">
              <div>{{ r.name }}</div>
              <div>{{ r.email || '-' }}</div>
              <div>{{ r.phone || '-' }}</div>
              <div>{{ formatSegments(r.segments || []) }}</div>
              <div>{{ r._count?.links || 0 }}</div>
              <div><button class="btn btn--small" @click="openCompany(r.id)">Открыть</button></div>
            </div>
          </div>

          <div class="table" v-else>
            <div class="table__row table__row--head">
              <div>Name</div><div>Email</div><div>Phone</div><div>Segments</div><div>Links</div><div>Action</div>
            </div>
            <div class="table__row" v-for="r in rows" :key="r.id">
              <div>{{ r.fullName }}</div>
              <div>{{ r.email || '-' }}</div>
              <div>{{ r.phone || '-' }}</div>
              <div>{{ formatSegments(r.segments || []) }}</div>
              <div>{{ r._count?.links || 0 }}</div>
              <div><button class="btn btn--small" @click="openContact(r.id)">Открыть</button></div>
            </div>
          </div>

          <div class="hint">Всего: {{ total }}</div>
        </div>
      </div>
    </section>

    <div v-if="details" class="modal-overlay" @click="details=null">
      <div class="modal" @click.stop>
        <h3>{{ detailsTitle }}</h3>
        <div v-if="detailsMode==='company'" class="card-grid">
          <input v-model="form.name" class="input" placeholder="Название" />
          <input v-model="form.website" class="input" placeholder="Сайт" />
          <input v-model="form.phone" class="input" placeholder="Телефон" />
          <input v-model="form.email" class="input" placeholder="Email" />
          <input v-model="form.telegramUrl" class="input" placeholder="Telegram ссылка" />
          <input v-model="form.countryPresence" class="input" placeholder="Страна регистрации" />
          <input v-model="form.cityPresence" class="input" placeholder="Город регистрации" />
          <textarea v-model="form.comment" class="input textarea" placeholder="Комментарий"></textarea>
        </div>
        <div v-else class="card-grid">
          <input v-model="form.fullName" class="input" placeholder="Имя" />
          <input v-model="form.position" class="input" placeholder="Должность" />
          <input v-model="form.phone" class="input" placeholder="Телефон" />
          <input v-model="form.email" class="input" placeholder="Email" />
          <input v-model="form.telegramUrl" class="input" placeholder="Telegram ссылка" />
          <input v-model="form.countryPresence" class="input" placeholder="Страна регистрации" />
          <input v-model="form.cityPresence" class="input" placeholder="Город регистрации" />
          <textarea v-model="form.comment" class="input textarea" placeholder="Комментарий"></textarea>
        </div>
        <div class="segments-block">
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
        </div>

        <div v-if="detailsMode==='company'" class="links-block">
          <h4>Контакты компании</h4>
          <div class="linked-row" v-for="link in details.links || []" :key="link.id">
            <div>{{ link.contact.fullName }}</div>
            <div>{{ link.contact.email || '-' }}</div>
            <div>{{ link.contact.phone || '-' }}</div>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn--primary" @click="saveDetails">Сохранить</button>
          <button class="btn" @click="details=null">Закрыть</button>
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
      segment: '',
      rows: [],
      total: 0,
      loading: false,
      details: null,
      detailsTitle: '',
      detailsMode: 'company',
      detailsId: '',
      form: {}
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
      return list.length ? list.map((s) => this.segmentLabel(s.segment)).join(', ') : '-'
    },
    async reload() {
      this.loading = true
      try {
        const params = new URLSearchParams()
        if (this.query) params.set('q', this.query)
        if (this.segment) params.set('segment', this.segment)
        params.set('limit', '100')

        const endpoint = this.mode === 'companies' ? '/api/admin/crm/companies' : '/api/admin/crm/contacts'
        const res = await fetch(`${endpoint}?${params.toString()}`, { headers: this.authHeaders() })
        const data = await res.json()
        this.rows = data.rows || []
        this.total = data.total || 0
      } catch (error) {
        console.error(error)
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
        countryPresence: this.details.countryPresence || '',
        cityPresence: this.details.cityPresence || '',
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
        countryPresence: this.details.countryPresence || '',
        cityPresence: this.details.cityPresence || '',
        comment: this.details.comment || '',
        segments: (this.details.segments || []).map((s) => s.segment)
      }
    },
    async saveDetails() {
      const endpoint = this.detailsMode === 'company'
        ? `/api/admin/crm/companies/${this.detailsId}`
        : `/api/admin/crm/contacts/${this.detailsId}`
      await fetch(endpoint, {
        method: 'PUT',
        headers: this.authHeaders(),
        body: JSON.stringify(this.form)
      })
      if (this.detailsMode === 'company') {
        await this.openCompany(this.detailsId)
      } else {
        await this.openContact(this.detailsId)
      }
      await this.reload()
    },
    async promoteFromStaging() {
      if (!confirm('Перенести данные из временного слоя (staging) в рабочую CRM?')) return
      const res = await fetch('/api/admin/crm/promote-from-staging', {
        method: 'POST',
        headers: this.authHeaders()
      })
      const data = await res.json()
      alert(`Импорт завершён: ${JSON.stringify(data)}`)
      await this.reload()
    }
  }
}
</script>

<style scoped lang="scss">
.crm-section { padding-top: 140px; padding-bottom: 40px; }
.crm-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.crm-actions { display:flex; gap:10px; }
.crm-filters { display:flex; gap:10px; margin-bottom:12px; }
.input { border:1px solid #d8d8e6; border-radius:8px; padding:8px 10px; min-width:220px; }
.table { width:100%; }
.table__row { display:grid; grid-template-columns: 2fr 1.5fr 1fr 2fr 0.5fr 0.8fr; gap:8px; border-bottom:1px solid #eee; padding:8px 0; }
.table__row--head { font-weight:700; }
.hint { margin-top:10px; color:#777; }
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1200; }
.modal { width:min(900px,90vw); max-height:80vh; overflow:auto; background:#fff; border-radius:12px; padding:18px; }
.card-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:10px 0; }
.textarea { min-height:90px; resize:vertical; }
.segments-block { margin: 10px 0 12px; border-top: 1px solid #ececf4; padding-top: 10px; }
.segments-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.segment-item { display:flex; align-items:center; gap:8px; font-size:14px; color:#2f3e60; }
.links-block { margin:12px 0; border-top:1px solid #ececf4; padding-top:10px; }
.linked-row { display:grid; grid-template-columns:1.5fr 1fr 1fr; gap:8px; padding:6px 0; border-bottom:1px solid #f1f1f7; }
.actions { display:flex; gap:10px; }
@media (max-width: 900px) {
  .crm-filters { flex-direction:column; }
  .table__row { grid-template-columns: 1fr; }
  .card-grid { grid-template-columns:1fr; }
  .segments-grid { grid-template-columns:1fr; }
  .linked-row { grid-template-columns:1fr; }
}
</style>
