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
          <div class="toolbar">
            <input v-model="sheetForm.name" class="input" :placeholder="t.sheetName" />
            <input v-model="sheetForm.monthLabel" class="input" :placeholder="t.sheetMonth" />
            <input v-model="sheetForm.googleSheetId" class="input" :placeholder="t.sheetId" />
            <input v-model="sheetForm.tabName" class="input" :placeholder="t.sheetTab" />
            <button class="btn btn--primary" @click="createSheetSource">{{ t.add }}</button>
          </div>

          <div class="grid-head six-cols">
            <div>{{ t.name }}</div><div>{{ t.month }}</div><div>Sheet ID</div><div>Tab</div><div>{{ t.status }}</div><div>{{ t.actions }}</div>
          </div>
          <div v-for="s in sheets" :key="s.id" class="grid-row six-cols">
            <div>{{ s.name }}</div>
            <div>{{ s.monthLabel }}</div>
            <div>{{ s.googleSheetId }}</div>
            <div>{{ s.tabName }}</div>
            <div>{{ s.isActive ? 'active' : 'off' }}</div>
            <div class="row-actions">
              <button class="btn btn--small btn--primary" @click="syncSheet(s.id)">{{ t.sync }}</button>
              <button class="btn btn--small" @click="toggleSheet(s)">{{ s.isActive ? t.deactivate : t.activate }}</button>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>{{ t.staffTelegram }}</h3>
          <div class="toolbar">
            <input v-model="linkForm.email" class="input" :placeholder="t.email" />
            <input v-model="linkForm.telegramUserId" class="input" :placeholder="t.telegramId" />
            <button class="btn btn--primary" @click="saveLink">{{ t.save }}</button>
          </div>
          <div class="grid-head three-cols"><div>{{ t.email }}</div><div>{{ t.roles }}</div><div>{{ t.telegramLinks }}</div></div>
          <div v-for="u in staff" :key="u.id" class="grid-row three-cols">
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
  data: () => ({
    sheets: [],
    staff: [],
    linkForm: { email: '', telegramUserId: '', telegramChatId: '' },
    sheetForm: { name: '', monthLabel: '', googleSheetId: '', tabName: 'таблица' }
  }),
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'Настройки интеграций',
            sheetSources: 'Google Sheets (месяц)',
            staffTelegram: 'Привязка Telegram сотрудников',
            name: 'Название',
            month: 'Месяц',
            status: 'Статус',
            actions: 'Действия',
            email: 'Email сотрудника',
            telegramId: 'Telegram User ID',
            save: 'Сохранить',
            roles: 'Роли',
            telegramLinks: 'Связки Telegram',
            sheetName: 'Имя источника',
            sheetMonth: 'Метка месяца (например 2025-01)',
            sheetId: 'Google Sheet ID',
            sheetTab: 'Имя вкладки (таблица)',
            add: 'Добавить',
            sync: 'Синхронизировать',
            activate: 'Активировать',
            deactivate: 'Выключить'
          }
        : {
            title: 'Integration Settings',
            sheetSources: 'Google Sheets',
            staffTelegram: 'Staff Telegram links',
            name: 'Name',
            month: 'Month',
            status: 'Status',
            actions: 'Actions',
            email: 'Staff email',
            telegramId: 'Telegram User ID',
            save: 'Save',
            roles: 'Roles',
            telegramLinks: 'Telegram links',
            sheetName: 'Source name',
            sheetMonth: 'Month label (e.g. 2025-01)',
            sheetId: 'Google Sheet ID',
            sheetTab: 'Tab name',
            add: 'Add',
            sync: 'Sync now',
            activate: 'Activate',
            deactivate: 'Disable'
          }
    }
  },
  mounted () { this.load() },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
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
    async createSheetSource () {
      await fetch('/api/admin/sheet-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.headers() },
        body: JSON.stringify(this.sheetForm)
      })
      this.sheetForm = { name: '', monthLabel: '', googleSheetId: '', tabName: 'таблица' }
      await this.load()
    },
    async syncSheet (id) {
      await fetch(`/api/admin/sheet-sources/${id}/sync`, {
        method: 'POST',
        headers: this.headers()
      })
      await this.load()
    },
    async toggleSheet (sheet) {
      await fetch(`/api/admin/sheet-sources/${sheet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.headers() },
        body: JSON.stringify({ isActive: !sheet.isActive })
      })
      await this.load()
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
.admin-section { padding-top: 150px; color: #17233d; }
.card { background: #fff; border: 1px solid #d8d8e6; border-radius: 12px; padding: 12px; margin-bottom: 14px; box-shadow: 0 8px 20px rgba(16, 24, 40, 0.06); }
.toolbar { display: flex; gap: 8px; margin: 8px 0 12px; flex-wrap: wrap; }
.input {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #c8ccdc;
  background: #fff;
  color: #1f2b46;
}
.input::placeholder { color: #7a8197; }
.input:focus { outline: none; border-color: #2f80ed; box-shadow: 0 0 0 3px rgba(47, 128, 237, 0.15); }
.grid-head, .grid-row { gap: 10px; padding: 8px; min-width: 1040px; }
.three-cols { display: grid; grid-template-columns: 1.4fr 1.2fr 1.4fr; }
.six-cols { display: grid; grid-template-columns: 1fr 1fr 2fr .8fr .7fr 1.2fr; }
.grid-head { font-weight: 700; border-bottom: 1px solid #e4e7f0; color: #1d2c4a; }
.grid-row { border-bottom: 1px solid #f0f2f7; color: #2f3e60; }
.row-actions { display: flex; gap: 6px; align-items: center; }
</style>
