<template>
  <div class="work-queue">
    <div v-if="loading" class="work-empty">Загружаем рабочую очередь…</div>
    <div v-else-if="error" class="work-empty work-empty--error"><strong>Не удалось загрузить очередь</strong><span>{{ error }}</span><button class="btn btn--small" @click="load">Повторить</button></div>
    <template v-else>
      <div v-if="view === 'action'" class="work-list">
        <button v-for="item in actionItems" :key="item.key" class="work-row" type="button" @click="openItem(item)">
          <span class="work-row__source">{{ item.source }}</span><span class="work-row__main"><strong>{{ item.title }}</strong><small>{{ item.subtitle }}</small></span><span class="work-row__action">{{ item.action }} →</span>
        </button>
        <div v-if="!actionItems.length" class="work-empty"><strong>На сейчас всё обработано</strong><span>Новые письма, ответы и ошибки появятся здесь.</span></div>
      </div>
      <div v-else-if="view === 'email'" class="work-list">
        <button v-for="row in activeEmails" :key="row.id" class="work-row" type="button" :disabled="Boolean(openingDraftId)" @click="openEmail(row.id)">
          <span class="work-row__source">Почта</span><span class="work-row__main"><strong>{{ emailTitle(row) }}</strong><small>{{ emailHint(row) }}</small></span><span class="work-row__action">{{ openingDraftId === row.id ? 'Открываем…' : 'Проверить →' }}</span>
        </button>
        <div v-if="!activeEmails.length" class="work-empty">Новых заказов из почты нет</div>
      </div>
      <div v-else class="work-list">
        <button v-for="task in workspace.chats || []" :key="task.id" class="work-row" type="button" @click="$router.push(`/admin-chats?taskId=${task.id}`)">
          <span class="work-row__source">Диалог</span><span class="work-row__main"><strong>{{ chatTitle(task) }}</strong><small>{{ chatState(task.state) }}</small></span><span class="work-row__action">Открыть →</span>
        </button>
        <div v-if="!(workspace.chats || []).length" class="work-empty">Активных диалогов нет</div>
      </div>
    </template>
  </div>
</template>
<script>
export default {
  props: { view: { type: String, required: true } },
  data: () => ({ workspace: {}, loading: true, error: '', openingDraftId: '' }),
  computed: {
    activeEmails () { return (this.workspace.emailDrafts || []).filter((row) => !['quarantine', 'archived'].includes(row.queueState)) },
    actionItems () {
      const notices = (this.workspace.notifications || []).map((row) => ({ key: `n-${row.id}`, source: 'Событие', title: row.title, subtitle: row.details || '', action: 'Открыть', url: row.linkUrl || '/admin-orders' }))
      const emails = this.activeEmails.map((row) => ({ key: `e-${row.id}`, source: 'Почта', title: this.emailTitle(row), subtitle: this.emailHint(row), action: 'Проверить', url: `/admin-ai-inbox?draftId=${row.id}` }))
      const chats = (this.workspace.chats || []).map((task) => ({ key: `c-${task.id}`, source: 'Диалог', title: this.chatTitle(task), subtitle: this.chatState(task.state), action: 'Продолжить', url: `/admin-chats?taskId=${task.id}` }))
      return [...notices, ...emails, ...chats].slice(0, 100)
    }
  },
  mounted () { this.load() },
  methods: {
    headers () { const token = localStorage.getItem('authToken'); return { Authorization: token ? `Bearer ${token}` : '' } },
    async load () { this.loading = true; this.error = ''; try { const response = await fetch('/api/admin/order-workspace', { headers: this.headers() }); const data = await response.json(); if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`); this.workspace = data } catch (error) { this.error = error.message || 'Неизвестная ошибка' } finally { this.loading = false } },
    payload (row) { try { return JSON.parse(row.payloadJson || '{}') } catch (_) { return {} } },
    emailTitle (row) { const p = this.payload(row); const o = p.orderDraft || {}; return `${o.eventType === 'cancel' ? 'Отмена' : o.eventType === 'change' ? 'Изменение' : 'Новый заказ'} ${o.orderNumber || 'без номера'}` },
    emailHint (row) { const o = this.payload(row).orderDraft || {}; return [o.counterpartyName, o.pickupAt, [o.fromPoint, o.toPoint].filter(Boolean).join(' → ')].filter(Boolean).join(' · ') },
    chatTitle (task) { const o = task.order || {}; return `${o.sourceBookingId || o.sourceOrderNumber || 'Заказ'} · ${[o.fromPoint, o.toPoint].filter(Boolean).join(' → ')}` },
    chatState (state) { return ({ missing_data_detected: 'Нужно создать вопрос клиенту', request_sent: 'Ждём ответ клиента', customer_replied: 'Получен ответ клиента', pending_update_approval: 'Сохраните ответ в комментарии', handoff_human: 'Нужен сотрудник', order_complete: 'Уточнение завершено' })[state] || 'Требует внимания' },
    openItem (item) {
      if (String(item?.key || '').startsWith('e-')) this.openingDraftId = String(item.key).slice(2)
      this.$router.push(item.url).catch(() => { this.openingDraftId = '' })
    },
    openEmail (draftId) {
      this.openingDraftId = draftId
      this.$router.push(`/admin-ai-inbox?draftId=${draftId}`).catch(() => { this.openingDraftId = '' })
    }
  }
}
</script>
<style scoped>
.work-queue{background:#fff;border:1px solid #dfe5ee;border-radius:16px;overflow:hidden}.work-list{display:flex;flex-direction:column}.work-row{display:grid;grid-template-columns:90px minmax(0,1fr) auto;gap:16px;align-items:center;padding:15px 18px;border:0;border-bottom:1px solid #edf1f6;background:#fff;text-align:left;cursor:pointer}.work-row:hover{background:#f8fafc}.work-row__source{color:#65738a;font-size:12px;font-weight:800;text-transform:uppercase}.work-row__main strong,.work-row__main small{display:block}.work-row__main small{margin-top:4px;color:#65738a}.work-row__action{color:#20355f;font-weight:800}.work-empty{display:flex;flex-direction:column;gap:8px;align-items:center;padding:48px 20px;color:#65738a;text-align:center}.work-empty--error{color:#991b1b}@media(max-width:700px){.work-row{grid-template-columns:1fr;gap:6px}.work-row__action{margin-top:4px}}
</style>
