<template>
  <div class="notification-bell">
    <button class="notification-bell__trigger" type="button" :aria-expanded="open ? 'true' : 'false'" :aria-label="unread ? `Уведомления: ${unread} новых` : 'Уведомления'" @click="open = !open">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg><span v-if="unread" class="notification-bell__count">{{ unread > 99 ? '99+' : unread }}</span>
    </button>
    <transition name="notification-panel">
      <div v-if="open" class="notification-bell__panel">
        <div class="notification-bell__head"><strong>Требуют внимания</strong><span>{{ unread }} новых</span></div>
        <div v-if="loading" class="notification-bell__empty"><i class="notification-bell__spinner"></i>Проверяю события…</div>
        <div v-else-if="!rows.length" class="notification-bell__empty notification-bell__empty--ok"><b>✓</b><strong>Всё спокойно</strong><span>Новых событий нет</span></div>
        <button v-for="row in rows" :key="row.id" class="notification-bell__row" type="button" @click="openNotification(row)">
          <span class="notification-bell__dot" :class="`notification-bell__dot--${row.priority}`"></span>
          <span><strong>{{ row.title }}</strong><small>{{ row.details || 'Откройте, чтобы посмотреть детали' }}</small></span>
        </button>
      </div>
    </transition>
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
.notification-bell{position:relative}.notification-bell__trigger{position:relative;display:grid;place-items:center;width:40px;height:40px;border:1px solid #dfe4ec;border-radius:11px;background:#fff;color:#21304f;cursor:pointer;transition:background-color .16s ease,box-shadow .16s ease,transform .15s ease}.notification-bell__trigger:hover{background:#f7f9fb;box-shadow:0 4px 12px rgba(28,41,66,.1)}.notification-bell__trigger:active{transform:scale(.96)}.notification-bell__trigger svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.notification-bell__count{position:absolute;right:-5px;top:-5px;min-width:19px;padding:2px 5px;border:2px solid #fff;border-radius:11px;background:#d92d20;color:#fff;font-size:10px;font-weight:800;font-variant-numeric:tabular-nums}.notification-bell__panel{position:absolute;right:0;top:49px;width:min(380px,92vw);max-height:480px;overflow:auto;background:#fff;border:1px solid #e1e6ee;border-radius:14px;box-shadow:0 18px 45px rgba(28,41,66,.16);z-index:1000}.notification-panel-enter-active,.notification-panel-leave-active{transition:opacity .18s ease,transform .18s ease}.notification-panel-enter,.notification-panel-leave-to{opacity:0;transform:translateY(-6px)}.notification-bell__head{display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #edf0f4}.notification-bell__head span,.notification-bell__row small{color:#68758c;font-size:11px}.notification-bell__row{display:grid;grid-template-columns:9px 1fr;gap:10px;width:100%;padding:13px 16px;text-align:left;border:0;border-bottom:1px solid #eef1f5;background:#fff;cursor:pointer;transition:background-color .16s ease}.notification-bell__row:hover{background:#f7f9fc}.notification-bell__row strong,.notification-bell__row small{display:block}.notification-bell__dot{width:8px;height:8px;margin-top:5px;border-radius:50%;background:#64748b}.notification-bell__dot--high,.notification-bell__dot--urgent{background:#d92d20}.notification-bell__empty{display:flex;align-items:center;justify-content:center;gap:8px;padding:24px;text-align:center;color:#68758c}.notification-bell__empty--ok{display:grid}.notification-bell__empty--ok b{display:grid;place-items:center;width:34px;height:34px;margin:auto;border-radius:50%;background:#eaf8ef;color:#248253;font-size:18px}.notification-bell__empty--ok strong{color:#28364f}.notification-bell__empty--ok span{font-size:11px}.notification-bell__spinner{width:16px;height:16px;border:2px solid #dce3ec;border-top-color:#28456f;border-radius:50%;animation:notificationSpin .8s linear infinite}@keyframes notificationSpin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.notification-bell__spinner{animation:none}.notification-panel-enter-active,.notification-panel-leave-active{transition:none}}
</style>
