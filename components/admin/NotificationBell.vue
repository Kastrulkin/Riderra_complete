<template>
  <div class="notification-bell">
    <button class="notification-bell__trigger" type="button" :aria-expanded="open ? 'true' : 'false'" aria-label="Уведомления" @click="open = !open">
      <span aria-hidden="true">◉</span><span v-if="unread" class="notification-bell__count">{{ unread > 99 ? '99+' : unread }}</span>
    </button>
    <div v-if="open" class="notification-bell__panel">
      <div class="notification-bell__head"><strong>Требуют внимания</strong><span>{{ unread }} новых</span></div>
      <div v-if="loading" class="notification-bell__empty">Обновляем…</div>
      <div v-else-if="!rows.length" class="notification-bell__empty">Новых событий нет</div>
      <button v-for="row in rows" :key="row.id" class="notification-bell__row" type="button" @click="openNotification(row)">
        <span class="notification-bell__dot" :class="`notification-bell__dot--${row.priority}`"></span>
        <span><strong>{{ row.title }}</strong><small>{{ row.details || 'Откройте, чтобы посмотреть детали' }}</small></span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  data: () => ({ open: false, rows: [], unread: 0, loading: false, timer: null }),
  mounted () { this.load(); this.timer = setInterval(this.load, 30000) },
  beforeDestroy () { if (this.timer) clearInterval(this.timer) },
  methods: {
    headers () { const token = localStorage.getItem('authToken'); return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' } },
    async load () {
      if (!this.$store.state.isAuthenticated) return
      this.loading = !this.rows.length
      try { const response = await fetch('/api/admin/notifications', { headers: this.headers() }); const data = await response.json(); if (response.ok) { this.rows = data.rows || []; this.unread = data.unread || 0 } } finally { this.loading = false }
    },
    async openNotification (row) {
      await fetch(`/api/admin/notifications/${row.id}`, { method: 'PATCH', headers: this.headers(), body: JSON.stringify({}) }).catch(() => {})
      this.open = false
      if (row.linkUrl) this.$router.push(row.linkUrl)
      await this.load()
    }
  }
}
</script>

<style scoped>
.notification-bell{position:relative}.notification-bell__trigger{position:relative;width:40px;height:40px;border:1px solid #d8dee9;border-radius:12px;background:#fff;color:#21304f;cursor:pointer}.notification-bell__count{position:absolute;right:-6px;top:-6px;min-width:20px;padding:2px 5px;border-radius:10px;background:#dc2626;color:#fff;font-size:11px;font-weight:800}.notification-bell__panel{position:absolute;right:0;top:48px;width:min(380px,90vw);max-height:480px;overflow:auto;background:#fff;border:1px solid #d8dee9;border-radius:14px;box-shadow:0 18px 45px rgba(20,32,61,.18);z-index:1000}.notification-bell__head{display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #e8edf4}.notification-bell__head span,.notification-bell__row small{color:#68758c;font-size:12px}.notification-bell__row{display:grid;grid-template-columns:9px 1fr;gap:10px;width:100%;padding:13px 16px;text-align:left;border:0;border-bottom:1px solid #eef1f5;background:#fff;cursor:pointer}.notification-bell__row:hover{background:#f7f9fc}.notification-bell__row strong,.notification-bell__row small{display:block}.notification-bell__dot{width:8px;height:8px;margin-top:5px;border-radius:50%;background:#64748b}.notification-bell__dot--high,.notification-bell__dot--urgent{background:#dc2626}.notification-bell__empty{padding:24px;text-align:center;color:#68758c}
</style>
