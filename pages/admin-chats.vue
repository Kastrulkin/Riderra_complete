<template>
  <div>
    <navigation></navigation>
    <section class="site-section site-section--pf chat-section">
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="h2">Чаты</h1>
            <p class="hint">Очередь по заказам: уточнения и готовая рассылка клиенту.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn--ghost" @click="syncFromOrders">Синхронизировать из заказов</button>
            <button class="btn btn--primary" @click="reloadAll">Обновить</button>
          </div>
        </div>
        <div v-if="notice" class="hint">{{ notice }}</div>

        <admin-tabs />

        <div class="agent-card">
          <div class="agent-head">
            <h3>Настройки агента Copilot</h3>
            <div class="agent-head-actions">
              <select v-model="selectedAgentId" class="input compact" @change="applyAgentSelection">
                <option value="">Новый агент</option>
                <option v-for="agent in agents" :key="agent.id" :value="agent.id">
                  {{ agent.name }} ({{ agent.code }})
                </option>
              </select>
              <button class="btn btn--ghost" @click="startNewAgent">Создать нового</button>
            </div>
          </div>

          <div class="agent-grid">
            <input v-model="agentForm.name" class="input" placeholder="Название агента" />
            <input v-model="agentForm.code" class="input" placeholder="Код (например copilot_main)" :disabled="Boolean(selectedAgentId)" />
            <select v-model="agentForm.taskType" class="input">
              <option value="clarification">clarification</option>
              <option value="dispatch_info">dispatch_info</option>
            </select>
            <label class="toggle"><input type="checkbox" v-model="agentForm.isActive" /> <span>Активен</span></label>
            <label class="toggle"><input type="checkbox" v-model="agentForm.requiresApproval" /> <span>Только через approval</span></label>
          </div>

          <label class="field">
            <span>Prompt</span>
            <textarea v-model="agentForm.promptText" class="input textarea" placeholder="Системный prompt агента"></textarea>
          </label>
          <label class="field">
            <span>Workflow (JSON: состояния и переходы)</span>
            <textarea v-model="agentForm.workflowJson" class="input textarea textarea--code" placeholder='{"states":["missing_data_detected","request_sent"],"transitions":{"missing_data_detected":["request_sent"]}}'></textarea>
          </label>
          <label class="field">
            <span>Ограничения (JSON)</span>
            <textarea v-model="agentForm.constraintsJson" class="input textarea textarea--code" placeholder='{"maxMessagesPerHour":3,"allowedChannels":["telegram"],"requireHumanApproval":true}'></textarea>
          </label>
          <div class="agent-actions">
            <button class="btn btn--primary" :disabled="agentSaving" @click="saveAgent">
              {{ agentSaving ? 'Сохраняю...' : (selectedAgentId ? 'Сохранить агента' : 'Создать агента') }}
            </button>
          </div>
        </div>

        <div class="filters">
          <select v-model="taskType" class="input" @change="loadTasks">
            <option value="">Все типы</option>
            <option value="clarification">Нужно уточнение</option>
            <option value="dispatch_info">Готово к рассылке</option>
          </select>
          <select v-model="state" class="input" @change="loadTasks">
            <option value="">Все статусы</option>
            <option v-for="s in availableStates" :key="s" :value="s">{{ stateLabel(s) }}</option>
          </select>
        </div>

        <div class="workspace">
          <aside class="queue">
            <div class="queue-head">Очередь ({{ tasks.length }})</div>
            <button
              v-for="task in tasks"
              :key="task.id"
              class="queue-item"
              :class="{ 'queue-item--active': selectedTask && selectedTask.id === task.id }"
              @click="openTask(task.id)"
            >
              <div class="queue-title">
                <span>{{ orderLabel(task.order) }}</span>
                <span class="badge">{{ taskTypeLabel(task.taskType) }}</span>
              </div>
              <div class="queue-route">{{ routeLabel(task.order) }}</div>
              <div class="queue-meta">
                <span class="badge badge--state">{{ stateLabel(task.state) }}</span>
                <span>{{ formatDate(task.updatedAt) }}</span>
                <span>msg: {{ task._count?.messages || 0 }}</span>
              </div>
            </button>
            <div v-if="!tasks.length" class="empty">Нет задач по выбранным фильтрам</div>
          </aside>

          <main class="dialog">
            <div v-if="!selectedTask" class="empty empty--center">Выберите задачу в очереди</div>
            <template v-else>
              <div class="dialog-head">
                <div>
                  <h3>{{ orderLabel(selectedTask.order) }}</h3>
                  <div class="hint">{{ routeLabel(selectedTask.order) }} | {{ formatMoney(selectedTask.order?.clientPrice) }}</div>
                </div>
                <span class="badge badge--state">{{ stateLabel(selectedTask.state) }}</span>
              </div>

              <div class="messages">
                <div v-for="message in selectedTask.messages || []" :key="message.id" class="message" :class="`message--${message.direction}`">
                  <div class="message-head">
                    <span>{{ directionLabel(message.direction) }}</span>
                    <span>{{ sourceLabel(message.source) }}</span>
                    <span v-if="message.approvalStatus" class="badge">{{ approvalLabel(message.approvalStatus) }}</span>
                    <span>{{ formatDate(message.createdAt) }}</span>
                  </div>
                  <div class="message-body">{{ message.bodyText }}</div>
                  <div class="message-actions">
                    <button class="btn btn--small" @click="approveMessage(message.id)" v-if="message.approvalStatus === 'pending_human'">Одобрить</button>
                    <button class="btn btn--small btn--warn" @click="rejectMessage(message.id)" v-if="message.approvalStatus === 'pending_human'">Отклонить</button>
                    <button class="btn btn--small btn--primary" @click="sendMessage(message.id)" v-if="canSend(message)">Отправить</button>
                  </div>
                </div>
                <div v-if="!(selectedTask.messages || []).length" class="empty">Сообщений пока нет</div>
              </div>
            </template>
          </main>

          <aside class="actions" v-if="selectedTask">
            <div class="actions-block">
              <h4>Новое сообщение</h4>
              <textarea v-model="draftText" class="input textarea" placeholder="Черновик сообщения клиенту"></textarea>
              <button class="btn btn--primary" @click="createDraft">Создать черновик</button>
            </div>

            <div class="actions-block">
              <h4>Смена статуса</h4>
              <select v-model="nextState" class="input">
                <option value="">Выберите статус</option>
                <option v-for="s in transitionTargets" :key="s" :value="s">{{ stateLabel(s) }}</option>
              </select>
              <button class="btn btn--ghost" :disabled="!nextState" @click="applyTransition">Применить</button>
            </div>
          </aside>
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
    tasks: [],
    selectedTask: null,
    taskType: '',
    state: '',
    draftText: '',
    nextState: '',
    notice: '',
    agents: [],
    selectedAgentId: '',
    agentSaving: false,
    agentForm: {
      name: '',
      code: '',
      taskType: 'clarification',
      promptText: '',
      workflowJson: '',
      constraintsJson: '',
      isActive: true,
      requiresApproval: true
    }
  }),
  computed: {
    availableStates() {
      return [
        'missing_data_detected',
        'request_sent',
        'customer_replied',
        'field_validated',
        'field_rejected',
        'order_complete',
        'ready_to_notify',
        'notify_draft',
        'notify_sent',
        'notify_ack',
        'notify_no_reply',
        'handoff_human',
        'closed'
      ]
    },
    transitionTargets() {
      const map = {
        missing_data_detected: ['request_sent', 'handoff_human', 'closed'],
        request_sent: ['customer_replied', 'handoff_human', 'closed'],
        customer_replied: ['field_validated', 'field_rejected', 'handoff_human'],
        field_validated: ['missing_data_detected', 'order_complete', 'handoff_human'],
        field_rejected: ['request_sent', 'handoff_human'],
        order_complete: ['ready_to_notify', 'closed'],
        ready_to_notify: ['notify_draft', 'notify_sent', 'handoff_human', 'closed'],
        notify_draft: ['notify_sent', 'handoff_human', 'closed'],
        notify_sent: ['notify_ack', 'notify_no_reply', 'handoff_human', 'closed'],
        notify_ack: ['closed'],
        notify_no_reply: ['notify_sent', 'handoff_human', 'closed'],
        handoff_human: ['request_sent', 'notify_draft', 'closed'],
        closed: []
      }
      const state = this.selectedTask ? this.selectedTask.state : ''
      return map[state] || []
    }
  },
  mounted() {
    this.loadTasks()
    this.loadAgents()
  },
  methods: {
    headers() {
      const token = localStorage.getItem('authToken')
      return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        'Idempotency-Key': `chat-ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      }
    },
    async reloadAll() {
      this.notice = ''
      await this.loadTasks()
      await this.loadAgents()
      if (this.selectedTask?.id) await this.openTask(this.selectedTask.id)
    },
    async loadAgents() {
      const res = await fetch('/api/admin/chats/agents', { headers: this.headers() })
      const data = await res.json()
      this.agents = data.rows || []
      if (this.selectedAgentId && !this.agents.some((a) => a.id === this.selectedAgentId)) {
        this.startNewAgent()
      }
    },
    applyAgentSelection() {
      if (!this.selectedAgentId) {
        this.startNewAgent()
        return
      }
      const selected = this.agents.find((a) => a.id === this.selectedAgentId)
      if (!selected) return
      this.agentForm = {
        name: selected.name || '',
        code: selected.code || '',
        taskType: selected.taskType || 'clarification',
        promptText: selected.promptText || '',
        workflowJson: selected.workflowJson || '',
        constraintsJson: selected.constraintsJson || '',
        isActive: selected.isActive !== false,
        requiresApproval: selected.requiresApproval !== false
      }
    },
    startNewAgent() {
      this.selectedAgentId = ''
      this.agentForm = {
        name: '',
        code: '',
        taskType: 'clarification',
        promptText: '',
        workflowJson: '',
        constraintsJson: '',
        isActive: true,
        requiresApproval: true
      }
    },
    async saveAgent() {
      if (this.agentSaving) return
      this.agentSaving = true
      this.notice = ''
      try {
        const creating = !this.selectedAgentId
        const payload = {
          name: this.agentForm.name.trim(),
          code: this.agentForm.code.trim(),
          taskType: this.agentForm.taskType,
          promptText: this.agentForm.promptText.trim(),
          workflowJson: this.agentForm.workflowJson.trim() || null,
          constraintsJson: this.agentForm.constraintsJson.trim() || null,
          isActive: this.agentForm.isActive,
          requiresApproval: this.agentForm.requiresApproval
        }
        const method = this.selectedAgentId ? 'PUT' : 'POST'
        const url = this.selectedAgentId ? `/api/admin/chats/agents/${this.selectedAgentId}` : '/api/admin/chats/agents'
        const res = await fetch(url, {
          method,
          headers: this.headers(),
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Не удалось сохранить агента')
        await this.loadAgents()
        if (!this.selectedAgentId && data?.agent?.id) this.selectedAgentId = data.agent.id
        this.applyAgentSelection()
        this.notice = creating ? 'Агент создан' : 'Агент сохранен'
      } catch (error) {
        this.notice = error?.message || 'Ошибка сохранения агента'
      } finally {
        this.agentSaving = false
      }
    },
    async loadTasks() {
      const query = new URLSearchParams()
      if (this.taskType) query.set('taskType', this.taskType)
      if (this.state) query.set('state', this.state)
      query.set('limit', '300')
      const res = await fetch(`/api/admin/chats/tasks?${query.toString()}`, { headers: this.headers() })
      const data = await res.json()
      this.tasks = data.rows || []
      if (this.selectedTask?.id) {
        const exists = this.tasks.some((t) => t.id === this.selectedTask.id)
        if (!exists) this.selectedTask = null
      }
    },
    async openTask(id) {
      const res = await fetch(`/api/admin/chats/tasks/${id}`, { headers: this.headers() })
      const data = await res.json()
      this.selectedTask = data.task || null
      this.nextState = ''
      this.draftText = ''
    },
    async syncFromOrders() {
      await fetch('/api/admin/chats/sync-from-orders', {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({})
      })
      await this.reloadAll()
      this.notice = 'Очередь синхронизирована из заказов'
    },
    async createDraft() {
      if (!this.selectedTask || !this.draftText.trim()) return
      await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/messages`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          direction: 'outbound',
          source: 'operator',
          channel: 'telegram',
          bodyText: this.draftText.trim(),
          approvalStatus: 'pending_human'
        })
      })
      this.draftText = ''
      await this.openTask(this.selectedTask.id)
      await this.loadTasks()
    },
    async applyTransition() {
      if (!this.selectedTask || !this.nextState) return
      await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/transition`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ toState: this.nextState })
      })
      await this.openTask(this.selectedTask.id)
      await this.loadTasks()
    },
    async approveMessage(id) {
      await fetch(`/api/admin/chats/messages/${id}/approve`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({})
      })
      await this.openTask(this.selectedTask.id)
    },
    async rejectMessage(id) {
      await fetch(`/api/admin/chats/messages/${id}/reject`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({})
      })
      await this.openTask(this.selectedTask.id)
    },
    async sendMessage(id) {
      await fetch(`/api/admin/chats/messages/${id}/send`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({})
      })
      await this.openTask(this.selectedTask.id)
      await this.loadTasks()
    },
    canSend(message) {
      return message.direction === 'outbound' && (message.approvalStatus === 'approved' || message.approvalStatus === null)
    },
    taskTypeLabel(code) {
      return code === 'dispatch_info' ? 'Рассылка' : 'Уточнение'
    },
    stateLabel(code) {
      const map = {
        missing_data_detected: 'Нужно уточнить',
        request_sent: 'Запрос отправлен',
        customer_replied: 'Клиент ответил',
        field_validated: 'Поле подтверждено',
        field_rejected: 'Поле отклонено',
        order_complete: 'Заказ заполнен',
        ready_to_notify: 'Готово к рассылке',
        notify_draft: 'Черновик рассылки',
        notify_sent: 'Рассылка отправлена',
        notify_ack: 'Клиент подтвердил',
        notify_no_reply: 'Нет ответа',
        handoff_human: 'Передано человеку',
        closed: 'Закрыто'
      }
      return map[code] || code
    },
    directionLabel(code) {
      const map = { inbound: 'Входящее', outbound: 'Исходящее', internal: 'Внутреннее' }
      return map[code] || code
    },
    sourceLabel(code) {
      const map = { operator: 'Оператор', openclaw: 'OpenClaw', customer: 'Клиент', system: 'Система' }
      return map[code] || code
    },
    approvalLabel(code) {
      const map = {
        pending_human: 'Ожидает одобрения',
        approved: 'Одобрено',
        rejected: 'Отклонено',
        expired: 'Истекло',
        sent: 'Отправлено'
      }
      return map[code] || code
    },
    orderLabel(order) {
      if (!order) return '-'
      return order.externalKey || order.id
    },
    routeLabel(order) {
      if (!order) return '-'
      const parts = []
      if (order.fromPoint) parts.push(order.fromPoint)
      if (order.toPoint) parts.push(order.toPoint)
      return parts.length ? parts.join(' -> ') : '-'
    },
    formatDate(value) {
      if (!value) return '-'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
    },
    formatMoney(value) {
      const n = Number(value)
      return Number.isFinite(n) ? `${n.toFixed(2)} EUR` : '-'
    }
  }
}
</script>

<style scoped>
.chat-section { padding-top: 140px; padding-bottom: 40px; }
.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 14px; }
.page-actions { display: flex; gap: 8px; }
.filters { display: flex; gap: 10px; margin-bottom: 12px; }
.agent-card { border: 1px solid #d8d9e6; border-radius: 12px; background: #fff; padding: 12px; margin-bottom: 12px; }
.agent-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
.agent-head h3 { margin: 0; }
.agent-head-actions { display: flex; gap: 8px; align-items: center; }
.agent-grid { display: grid; grid-template-columns: 1.2fr 1fr 180px 140px 220px; gap: 8px; margin-bottom: 8px; }
.compact { min-width: 280px; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.field span { font-size: 13px; color: #334155; }
.toggle { display: inline-flex; align-items: center; gap: 6px; color: #334155; border: 1px solid #d8d9e6; border-radius: 8px; padding: 8px; }
.textarea--code { font-family: Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 12px; min-height: 96px; }
.agent-actions { display: flex; justify-content: flex-end; }
.workspace { display: grid; grid-template-columns: 340px 1fr 320px; gap: 12px; }
.queue, .dialog, .actions { background: #fff; border: 1px solid #d8d9e6; border-radius: 12px; min-height: 620px; }
.queue { padding: 10px; overflow: auto; }
.queue-head { font-weight: 700; margin-bottom: 10px; }
.queue-item { width: 100%; border: 1px solid #d6dceb; border-radius: 10px; background: #f8fbff; padding: 10px; margin-bottom: 8px; text-align: left; }
.queue-item--active { border-color: #0ea5e9; box-shadow: 0 0 0 1px #0ea5e9 inset; }
.queue-title { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; font-weight: 700; }
.queue-route { color: #31456f; margin-bottom: 6px; font-size: 13px; }
.queue-meta { display: flex; gap: 8px; flex-wrap: wrap; color: #64748b; font-size: 12px; }
.dialog { padding: 12px; display: flex; flex-direction: column; }
.dialog-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; border-bottom: 1px solid #edf1f6; padding-bottom: 10px; margin-bottom: 10px; }
.messages { overflow: auto; display: flex; flex-direction: column; gap: 8px; }
.message { border: 1px solid #e5eaf1; border-radius: 10px; padding: 8px 10px; background: #fff; }
.message--outbound { background: #f0f9ff; border-color: #bae6fd; }
.message--inbound { background: #f8fafc; }
.message-head { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; color: #64748b; font-size: 12px; margin-bottom: 6px; }
.message-body { white-space: pre-wrap; color: #1f2937; }
.message-actions { margin-top: 8px; display: flex; gap: 6px; }
.actions { padding: 12px; }
.actions-block { border: 1px solid #e5eaf1; border-radius: 10px; padding: 10px; margin-bottom: 10px; }
.actions-block h4 { margin: 0 0 8px; }
.input { border: 1px solid #d8d8e6; border-radius: 8px; padding: 8px 10px; width: 100%; background: #fff; color: #1e2a44; }
.textarea { min-height: 110px; resize: vertical; margin-bottom: 8px; }
.badge { display: inline-flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 999px; padding: 2px 8px; font-size: 12px; color: #334155; background: #fff; }
.badge--state { border-color: #bae6fd; color: #0c4a6e; background: #e0f2fe; }
.hint { color: #64748b; }
.empty { color: #64748b; padding: 14px; }
.empty--center { margin: auto; }
@media (max-width: 1300px) {
  .agent-grid { grid-template-columns: 1fr; }
  .agent-head { flex-direction: column; align-items: flex-start; }
  .agent-head-actions { width: 100%; flex-direction: column; align-items: stretch; }
  .compact { min-width: 0; width: 100%; }
  .workspace { grid-template-columns: 1fr; }
  .queue, .dialog, .actions { min-height: auto; }
}
</style>
