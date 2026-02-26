<template>
  <div>
    <navigation></navigation>
    <div class="page-background"><div class="page-background__gradient"></div><div class="page-background__overlay"></div></div>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <h1 class="h2">{{ t.title }}</h1>
        <admin-tabs />

        <div class="card">
          <h3>{{ t.sheetSources }}</h3>
          <div class="grid-head"><div>{{ t.name }}</div><div>{{ t.month }}</div><div>Sheet ID</div><div>Tab</div><div>{{ t.status }}</div></div>
          <div v-for="s in sheets" :key="s.id" class="grid-row">
            <div>{{ s.name }}</div><div>{{ s.monthLabel }}</div><div>{{ s.googleSheetId }}</div><div>{{ s.tabName }}</div><div>{{ s.isActive ? 'active' : 'off' }}</div>
          </div>
        </div>

        <div class="card">
          <h3>{{ t.staffTelegram }}</h3>
          <div class="toolbar">
            <input v-model="linkForm.email" class="input" :placeholder="t.email" />
            <input v-model="linkForm.telegramUserId" class="input" :placeholder="t.telegramId" />
            <button class="btn btn--primary" @click="saveLink">{{ t.save }}</button>
          </div>
          <div class="grid-head"><div>{{ t.email }}</div><div>{{ t.roles }}</div><div>{{ t.telegramLinks }}</div></div>
          <div v-for="u in staff" :key="u.id" class="grid-row">
            <div>{{ u.email }}</div><div>{{ (u.roles || []).join(', ') || '-' }}</div><div>{{ fmtLinks(u.telegramLinks) }}</div>
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
  middleware: 'staff',
  components: { navigation, adminTabs },
  data: () => ({ sheets: [], staff: [], linkForm: { email: '', telegramUserId: '', telegramChatId: '' } }),
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? { title: 'Настройки интеграций', sheetSources: 'Google Sheets (месяц)', staffTelegram: 'Привязка Telegram сотрудников', name: 'Название', month: 'Месяц', status: 'Статус', email: 'Email сотрудника', telegramId: 'Telegram User ID', save: 'Сохранить', roles: 'Роли', telegramLinks: 'Связки Telegram' }
        : { title: 'Integration Settings', sheetSources: 'Google Sheets', staffTelegram: 'Staff Telegram links', name: 'Name', month: 'Month', status: 'Status', email: 'Staff email', telegramId: 'Telegram User ID', save: 'Save', roles: 'Roles', telegramLinks: 'Telegram links' }
    }
  },
  mounted () { this.load() },
  methods: {
    headers () { const token = localStorage.getItem('authToken'); return { Authorization: token ? `Bearer ${token}` : '' } },
    fmtLinks (links) {
      if (!links || !links.length) return '-'
      return links.map((l) => `${l.telegramUserId}${l.telegramChatId ? ` (chat ${l.telegramChatId})` : ''}`).join(', ')
    },
    async load () {
      const [sheets, staff] = await Promise.all([
        fetch('/api/admin/sheet-sources', { headers: this.headers() }).then(r => r.json()),
        fetch('/api/admin/staff-users', { headers: this.headers() }).then(r => r.json())
      ])
      this.sheets = Array.isArray(sheets) ? sheets : []
      this.staff = staff.rows || []
    },
    async saveLink () {
      await fetch('/api/admin/telegram-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.headers() },
        body: JSON.stringify(this.linkForm)
      })
      this.linkForm = { email: '', telegramUserId: '', telegramChatId: '' }
      await this.load()
    }
  }
}
</script>

<style scoped>
.admin-section{padding-top:150px;color:#fff}.card{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:12px;margin-bottom:14px}.toolbar{display:flex;gap:8px;margin:8px 0 12px}.input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff}.grid-head,.grid-row{display:grid;grid-template-columns:1.5fr 1fr 2fr 1fr 1fr;gap:10px;padding:8px;min-width:900px}.grid-head{font-weight:700;border-bottom:1px solid rgba(255,255,255,.2)}.grid-row{border-bottom:1px solid rgba(255,255,255,.08)}
</style>
