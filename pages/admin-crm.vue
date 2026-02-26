<template>
  <div>
    <navigation></navigation>
    <section class="site-section site-section--pf crm-section">
      <div class="container">
        <div class="crm-header">
          <h1 class="h2">CRM</h1>
          <div class="crm-actions">
            <button class="btn btn--primary" @click="promoteFromStaging">Promote From Staging</button>
            <button class="btn btn--ghost" @click="reload">Reload</button>
          </div>
        </div>
        <admin-tabs />

        <div class="crm-filters">
          <input v-model="query" class="input" placeholder="Search by name / email / phone" @keyup.enter="reload"/>
          <select v-model="segment" class="input" @change="reload">
            <option value="">All segments</option>
            <option value="client_company">client_company</option>
            <option value="client_contact">client_contact</option>
            <option value="supplier_company">supplier_company</option>
            <option value="supplier_contact">supplier_contact</option>
            <option value="potential_client_company">potential_client_company</option>
            <option value="potential_client_contact">potential_client_contact</option>
            <option value="potential_supplier">potential_supplier</option>
          </select>
          <select v-model="mode" class="input" @change="reload">
            <option value="companies">Companies</option>
            <option value="contacts">Contacts</option>
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
              <div>{{ (r.segments || []).map(s => s.segment).join(', ') || '-' }}</div>
              <div>{{ r._count?.links || 0 }}</div>
              <div><button class="btn btn--small" @click="openCompany(r.id)">Open</button></div>
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
              <div>{{ (r.segments || []).map(s => s.segment).join(', ') || '-' }}</div>
              <div>{{ r._count?.links || 0 }}</div>
              <div><button class="btn btn--small" @click="openContact(r.id)">Open</button></div>
            </div>
          </div>

          <div class="hint">Total: {{ total }}</div>
        </div>
      </div>
    </section>

    <div v-if="details" class="modal-overlay" @click="details=null">
      <div class="modal" @click.stop>
        <h3>{{ detailsTitle }}</h3>
        <pre class="json">{{ JSON.stringify(details, null, 2) }}</pre>
        <button class="btn btn--primary" @click="details=null">Close</button>
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
      detailsTitle: ''
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
      this.detailsTitle = `Company ${id}`
    },
    async openContact(id) {
      const res = await fetch(`/api/admin/crm/contacts/${id}`, { headers: this.authHeaders() })
      this.details = await res.json()
      this.detailsTitle = `Contact ${id}`
    },
    async promoteFromStaging() {
      if (!confirm('Promote staging CRM into production CRM?')) return
      const res = await fetch('/api/admin/crm/promote-from-staging', {
        method: 'POST',
        headers: this.authHeaders()
      })
      const data = await res.json()
      alert(JSON.stringify(data))
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
.json { white-space:pre-wrap; word-break:break-word; background:#f7f7f9; padding:12px; border-radius:8px; }
@media (max-width: 900px) {
  .crm-filters { flex-direction:column; }
  .table__row { grid-template-columns: 1fr; }
}
</style>
