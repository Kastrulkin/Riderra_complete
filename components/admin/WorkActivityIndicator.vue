<template>
  <div class="work-activity">
    <transition name="work-done">
      <div v-if="celebration" class="work-complete" role="status"><b>✓</b><span><strong>Готово</strong><small>{{ celebration }}</small></span></div>
    </transition>
    <button class="work-activity__trigger" type="button" :class="{ 'work-activity__trigger--live': isLive }" :aria-expanded="open ? 'true' : 'false'" @click="open = !open">
      <span class="work-activity__orb"><i></i></span>
      <span class="work-activity__label"><strong>{{ headline }}</strong><small>{{ subline }}</small></span>
    </button>
    <section v-if="open" class="work-activity__panel" aria-label="Работа AI-агентов">
      <header><div><strong>Работа выполняется</strong><span>Только реальные действия системы</span></div><button type="button" aria-label="Закрыть" @click="open = false">×</button></header>
      <div v-if="loading" class="work-activity__state"><span class="work-activity__spinner"></span>Проверяю состояние…</div>
      <template v-else-if="available">
        <div class="work-activity__summary">
          <div><strong>{{ activity.now.active || 0 }}</strong><span>сейчас</span></div>
          <div><strong>{{ activity.day.successful || 0 }}</strong><span>готово за сутки</span></div>
          <div><strong>{{ activity.day.failed || 0 }}</strong><span>нужна проверка</span></div>
        </div>
        <div class="work-activity__feed">
          <article v-for="row in recentRows" :key="row.id"><span :class="`state state--${row.status}`"></span><div><strong>{{ activityLabel(row) }}</strong><small>{{ agentLabel(row) }} · {{ timeLabel(row.startedAt) }}</small></div></article>
          <p v-if="!recentRows.length">Новых действий пока нет. Система готова к следующей задаче.</p>
        </div>
        <nuxt-link :to="activityLink" @click.native="open = false">{{ activityLinkLabel }} →</nuxt-link>
      </template>
      <div v-else class="work-activity__state">Статус AI доступен сотрудникам с правом работы с операциями.</div>
    </section>
  </div>
</template>

<script>
export default {
  data: () => ({ open: false, loading: true, available: true, activity: { now: {}, day: {}, recent: [] }, timer: null, celebrationTimer: null, previousSuccessful: null, celebration: '' }),
  computed: {
    isLive () { return Number(this.activity.now.active || 0) > 0 },
    canAdmin () { const user = this.$store.state.user || {}; const permissions = user.permissions || []; return user.role === 'admin' || permissions.includes('*') || permissions.includes('admin.panel') },
    headline () { if (this.loading) return 'Проверяю работу'; if (!this.available) return 'Рабочий кабинет'; return this.isLive ? `AI работает: ${this.activity.now.active}` : 'Система готова' },
    subline () { if (!this.available) return 'Riderra'; return this.isLive ? 'выполняет задачи' : `${this.activity.day.successful || 0} готово сегодня` },
    activityLink () { return this.canAdmin ? '/admin-agents' : '/admin-chats' },
    activityLinkLabel () { return this.canAdmin ? 'Открыть центр AI-помощников' : 'Открыть рабочие чаты' },
    recentRows () { return (this.activity.recent || []).slice(0, 6) }
  },
  mounted () { this.load(); this.timer = setInterval(this.load, 15000); document.addEventListener('visibilitychange', this.handleVisibility) },
  beforeDestroy () { if (this.timer) clearInterval(this.timer); if (this.celebrationTimer) clearTimeout(this.celebrationTimer); document.removeEventListener('visibilitychange', this.handleVisibility) },
  methods: {
    headers () { const token = localStorage.getItem('authToken'); return { Authorization: token ? `Bearer ${token}` : '' } },
    async load () {
      if (document.hidden) return
      try {
        const response = await fetch('/api/admin/ai/activity', { headers: this.headers() })
        if (!response.ok) { this.available = false; return }
        const nextActivity = await response.json()
        const successful = Number(nextActivity?.day?.successful || 0)
        if (this.previousSuccessful !== null && successful > this.previousSuccessful) this.showCelebration(successful - this.previousSuccessful)
        this.previousSuccessful = successful
        this.activity = nextActivity; this.available = true
      } catch (_) { this.available = false } finally { this.loading = false }
    },
    handleVisibility () { if (!document.hidden) this.load() },
    showCelebration (count) {
      this.celebration = count === 1 ? 'AI-помощник завершил задачу' : `AI-помощники завершили ${count} задачи`
      if (this.celebrationTimer) clearTimeout(this.celebrationTimer)
      this.celebrationTimer = setTimeout(() => { this.celebration = '' }, 4200)
    },
    activityLabel (row) {
      const labels = { queued: 'Задача поставлена в очередь', running: 'Агент выполняет задачу', waiting_approval: 'Черновик ждёт проверки', completed: 'Задача выполнена', failed: 'Нужна помощь сотрудника', fallback: 'Использован резервный режим' }
      return labels[row.status] || 'Состояние задачи обновилось'
    },
    agentLabel (row) { return row.agentConfig?.name || 'AI-агент Riderra' },
    timeLabel (value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }
  }
}
</script>

<style scoped>
.work-activity{position:relative}.work-activity__trigger{display:flex;align-items:center;gap:8px;border:1px solid #dfe4ec;border-radius:11px;background:#fff;padding:6px 10px;color:#17233d;cursor:pointer}.work-activity__trigger:hover{background:#f7f9fb}.work-activity__orb{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:#eef2f8}.work-activity__orb i{width:8px;height:8px;border-radius:50%;background:#47a36b}.work-activity__trigger--live .work-activity__orb{background:#eaf8ef}.work-activity__trigger--live .work-activity__orb i{animation:workPulse 1.45s ease-in-out infinite;box-shadow:0 0 0 0 rgba(71,163,107,.38)}.work-activity__label{display:grid;text-align:left}.work-activity__label strong{font-size:11px}.work-activity__label small{color:#7a879b;font-size:9px}.work-activity__panel{position:absolute;right:0;top:49px;width:min(390px,92vw);border:1px solid #e1e6ee;border-radius:14px;background:#fff;padding:14px;box-shadow:0 18px 45px rgba(28,41,66,.16);z-index:1000}.work-activity__panel header{display:flex;justify-content:space-between;gap:10px}.work-activity__panel header div{display:grid}.work-activity__panel header span{color:#7a879b;font-size:11px}.work-activity__panel header button{border:0;background:transparent;color:#64748b;font-size:22px;cursor:pointer}.work-activity__summary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:13px 0}.work-activity__summary div{display:grid;border-radius:10px;background:#f5f7fa;padding:10px}.work-activity__summary strong{font-size:19px}.work-activity__summary span{color:#7a879b;font-size:10px}.work-activity__feed{display:grid;gap:3px}.work-activity__feed article{display:grid;grid-template-columns:9px 1fr;gap:9px;align-items:start;padding:8px 4px}.work-activity__feed article div{display:grid}.work-activity__feed article strong{font-size:12px}.work-activity__feed article small,.work-activity__feed p{color:#7a879b;font-size:10px}.state{width:8px;height:8px;margin-top:3px;border-radius:50%;background:#94a3b8}.state--running,.state--queued{background:#3b82f6}.state--completed,.state--waiting_approval{background:#47a36b}.state--failed{background:#d92d20}.work-activity__panel>a{display:block;margin-top:10px;border-top:1px solid #edf0f4;padding-top:11px;color:#28456f;text-decoration:none;font-size:12px;font-weight:800}.work-activity__state{display:flex;align-items:center;gap:8px;padding:25px 8px;color:#718096;font-size:12px}.work-activity__spinner{width:16px;height:16px;border:2px solid #dce3ec;border-top-color:#28456f;border-radius:50%;animation:workSpin .8s linear infinite}.work-complete{position:fixed;right:22px;top:82px;display:flex;align-items:center;gap:10px;min-width:280px;border:1px solid #bee3cd;border-radius:13px;background:#fff;padding:12px 14px;box-shadow:0 18px 45px rgba(28,41,66,.16)}.work-complete b{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#eaf8ef;color:#248253}.work-complete span{display:grid}.work-complete strong{font-size:13px}.work-complete small{color:#66748b;font-size:11px}.work-done-enter-active,.work-done-leave-active{transition:opacity .22s ease,transform .22s ease}.work-done-enter,.work-done-leave-to{opacity:0;transform:translateY(-8px) scale(.98)}@keyframes workSpin{to{transform:rotate(360deg)}}@keyframes workPulse{50%{transform:scale(1.2);box-shadow:0 0 0 7px rgba(71,163,107,0)}}@media(max-width:760px){.work-activity__label{display:none}.work-activity__trigger{padding:5px}.work-complete{left:12px;right:12px;top:72px;min-width:0}}@media(prefers-reduced-motion:reduce){.work-activity__trigger--live .work-activity__orb i,.work-activity__spinner{animation:none}.work-done-enter-active,.work-done-leave-active{transition:none}}
</style>
