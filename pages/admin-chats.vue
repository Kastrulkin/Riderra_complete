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
            <select v-model="agentForm.type" class="input">
              <option value="order_completion">order_completion</option>
              <option value="dispatch_notify">dispatch_notify</option>
              <option value="driver_ops">driver_ops</option>
            </select>
            <select v-model="agentForm.taskType" class="input">
              <option value="clarification">clarification</option>
              <option value="dispatch_info">dispatch_info</option>
            </select>
            <label class="toggle"><input type="checkbox" v-model="agentForm.isActive" /> <span>Активен</span></label>
            <label class="toggle"><input type="checkbox" v-model="agentForm.requiresApproval" /> <span>Только через approval</span></label>
          </div>
          <div class="agent-grid agent-grid--meta">
            <input v-model="agentForm.description" class="input" placeholder="Описание агента" />
            <input v-model="agentForm.personality" class="input" placeholder="Personality" />
            <input v-model="agentForm.identity" class="input" placeholder="Identity" />
            <input v-model="agentForm.task" class="input" placeholder="Task" />
            <input v-model="agentForm.speechStyle" class="input" placeholder="Speech style" />
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
            <textarea v-model="agentForm.restrictionsJson" class="input textarea textarea--code" placeholder='{"maxMessagesPerHour":3,"allowedChannels":["telegram"],"requireHumanApproval":true}'></textarea>
          </label>
          <label class="field">
            <span>Переменные (JSON)</span>
            <textarea v-model="agentForm.variablesJson" class="input textarea textarea--code" placeholder='{"company_name":"Riderra","timezone":"Europe/Moscow"}'></textarea>
          </label>
          <label class="field">
            <span>Sandbox test (dry_run)</span>
            <textarea v-model="agentTestInput" class="input textarea" placeholder="Тестовое сообщение для агента"></textarea>
            <div class="agent-actions">
              <button class="btn btn--ghost" :disabled="agentTesting || !selectedAgentId" @click="runAgentTest">
                {{ agentTesting ? 'Тестирую...' : 'Запустить dry_run тест' }}
              </button>
            </div>
            <pre v-if="agentTestOutput" class="test-output">{{ agentTestOutput }}</pre>
          </label>
          <div class="agent-actions">
            <button class="btn btn--primary" :disabled="agentSaving" @click="saveAgent">
              {{ agentSaving ? 'Сохраняю...' : (selectedAgentId ? 'Сохранить агента' : 'Создать агента') }}
            </button>
          </div>
        </div>

        <div class="agent-card">
          <div class="agent-head">
            <h3>Prompt Registry</h3>
          </div>
          <div class="agent-grid" style="grid-template-columns: 280px 160px 1fr;">
            <select v-model="selectedPromptKey" class="input" @change="applyPromptSelection">
              <option v-for="key in promptKeys" :key="key" :value="key">{{ key }}</option>
            </select>
            <input class="input" :value="selectedPromptVersionLabel" disabled />
            <input v-model="promptDescription" class="input" placeholder="Описание prompt" />
          </div>
          <label class="field">
            <span>Текст prompt</span>
            <textarea v-model="promptText" class="input textarea textarea--code" placeholder="Введите рабочий prompt"></textarea>
          </label>
          <div class="agent-actions">
            <button class="btn btn--primary" :disabled="promptSaving || !selectedPromptKey" @click="savePromptTemplate">
              {{ promptSaving ? 'Сохраняю...' : 'Сохранить новую версию' }}
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
                <div class="dialog-head-actions">
                  <span class="badge badge--state">{{ stateLabel(selectedTask.state) }}</span>
                  <button class="btn btn--small" @click="toggleConversationAgent(selectedTask)">
                    {{ selectedTask.agentPaused ? 'Возобновить агента' : 'Пауза агента' }}
                  </button>
                </div>
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
              <div class="message-draft-actions">
                <button class="btn btn--ghost" @click="buildDraftWithAi">AI черновик</button>
                <button
                  class="btn btn--ghost"
                  :disabled="quickSendLoading || !selectedTask || selectedTask.taskType !== 'clarification'"
                  @click="sendClarificationQuick"
                >
                  {{ quickSendLoading ? 'Отправляю...' : 'Уточнение в 1 клик' }}
                </button>
                <button class="btn btn--primary" @click="createDraft">Создать черновик</button>
              </div>
            </div>

            <div class="actions-block">
              <h4>Ответ клиента</h4>
              <textarea v-model="inboundText" class="input textarea" placeholder="Вставьте входящее сообщение клиента"></textarea>
              <button class="btn btn--ghost" :disabled="inboundProcessing || !inboundText.trim()" @click="processInboundMessage">
                {{ inboundProcessing ? 'Обрабатываю...' : 'Обработать ответ (AI classify/extract)' }}
              </button>
            </div>

            <div class="actions-block">
              <h4>Смена статуса</h4>
              <select v-model="nextState" class="input">
                <option value="">Выберите статус</option>
                <option v-for="s in transitionTargets" :key="s" :value="s">{{ stateLabel(s) }}</option>
              </select>
              <button class="btn btn--ghost" :disabled="!nextState" @click="applyTransition">Применить</button>
            </div>

            <div class="actions-block">
              <h4>Трейс шага</h4>
              <div v-if="lastStepTrace" class="trace-wrap">
                <div class="trace-row"><strong>Откуда:</strong> {{ stateLabel(lastStepTrace.fromState) }}</div>
                <div class="trace-row"><strong>Кандидат:</strong> {{ stateLabel(lastStepTrace.candidateState) }}</div>
                <div class="trace-row"><strong>Итог:</strong> {{ stateLabel(lastStepTrace.finalState) }}</div>
                <div class="trace-row"><strong>Почему:</strong> {{ lastStepTrace.decisionReason || '-' }}</div>
                <div class="trace-row trace-row--caps"><strong>Capabilities:</strong></div>
                <div v-for="cap in lastStepTrace.capabilities || []" :key="cap.name" class="trace-cap">
                  <div class="trace-cap-name">{{ cap.name }}</div>
                  <div class="trace-cap-meta">
                    runtime: {{ cap.runtime?.configured ? 'configured' : 'fallback' }},
                    ok: {{ cap.runtime?.ok ? 'yes' : 'no' }},
                    status: {{ cap.runtime?.status || 0 }}
                  </div>
                  <pre class="trace-json">{{ stringifyTrace(cap.output) }}</pre>
                </div>
                <div class="trace-row trace-time">{{ formatDate(lastStepTrace.createdAt) }}</div>
              </div>
              <div v-else class="hint">Трейс появится после обработки входящего ответа.</div>
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
    agentTesting: false,
    agentTestInput: '',
    agentTestOutput: '',
    promptTemplates: [],
    promptKeys: ['order_missing_data_prompt', 'reply_interpretation_prompt', 'esim_offer_prompt', 'followup_prompt'],
    selectedPromptKey: 'order_missing_data_prompt',
    selectedPromptVersionLabel: '-',
    promptText: '',
    promptDescription: '',
    promptSaving: false,
    inboundText: '',
    inboundProcessing: false,
    quickSendLoading: false,
    lastStepTrace: null,
    agentForm: {
      name: '',
      code: '',
      type: 'order_completion',
      description: '',
      personality: '',
      identity: '',
      task: '',
      speechStyle: '',
      taskType: 'clarification',
      promptText: '',
      workflowJson: '',
      restrictionsJson: '',
      constraintsJson: '',
      variablesJson: '',
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
    this.loadPrompts()
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
        type: selected.type || 'order_completion',
        description: selected.description || '',
        personality: selected.personality || '',
        identity: selected.identity || '',
        task: selected.task || '',
        speechStyle: selected.speechStyle || '',
        taskType: selected.taskType || 'clarification',
        promptText: selected.promptText || '',
        workflowJson: selected.workflow || selected.workflowJson || '',
        restrictionsJson: JSON.stringify(selected.restrictions || {}, null, 2),
        constraintsJson: JSON.stringify(selected.constraints || {}, null, 2),
        variablesJson: JSON.stringify(selected.variables || {}, null, 2),
        isActive: selected.isActive !== false,
        requiresApproval: selected.requiresApproval !== false
      }
    },
    startNewAgent() {
      this.selectedAgentId = ''
      this.agentForm = {
        name: '',
        code: '',
        type: 'order_completion',
        description: '',
        personality: '',
        identity: '',
        task: '',
        speechStyle: '',
        taskType: 'clarification',
        promptText: '',
        workflowJson: '',
        restrictionsJson: '',
        constraintsJson: '',
        variablesJson: '',
        isActive: true,
        requiresApproval: true
      }
      this.agentTestInput = ''
      this.agentTestOutput = ''
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
          type: this.agentForm.type,
          description: this.agentForm.description.trim() || null,
          personality: this.agentForm.personality.trim() || null,
          identity: this.agentForm.identity.trim() || null,
          task: this.agentForm.task.trim() || null,
          speechStyle: this.agentForm.speechStyle.trim() || null,
          taskType: this.agentForm.taskType,
          promptText: this.agentForm.promptText.trim(),
          workflowJson: this.agentForm.workflowJson.trim() || null,
          restrictions: this.agentForm.restrictionsJson.trim() || null,
          constraintsJson: this.agentForm.constraintsJson.trim() || null,
          variables: this.agentForm.variablesJson.trim() || null,
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
    async runAgentTest() {
      if (!this.selectedAgentId || this.agentTesting) return
      this.agentTesting = true
      this.notice = ''
      try {
        const response = await fetch(`/api/admin/ai-agents/${this.selectedAgentId}/test`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            dry_run: true,
            message: this.agentTestInput || 'Проверка тестового запуска агента',
            conversation_history: []
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Ошибка dry_run теста')
        this.agentTestOutput = JSON.stringify(data, null, 2)
      } catch (error) {
        this.agentTestOutput = JSON.stringify({ error: error?.message || 'Ошибка теста' }, null, 2)
      } finally {
        this.agentTesting = false
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
    async loadPrompts() {
      try {
        const res = await fetch('/api/admin/prompts', { headers: this.headers() })
        const data = await res.json()
        this.promptTemplates = data.prompts || []
        this.applyPromptSelection()
      } catch (_) {}
    },
    applyPromptSelection() {
      const key = this.selectedPromptKey
      const row = (this.promptTemplates || []).find((x) => x.key === key)
      this.selectedPromptVersionLabel = row ? `v${row.prompt_version || 1}` : 'new'
      this.promptText = row?.content || ''
      this.promptDescription = row?.description || ''
    },
    async savePromptTemplate() {
      if (!this.selectedPromptKey || this.promptSaving) return
      this.promptSaving = true
      try {
        const response = await fetch(`/api/admin/prompts/${encodeURIComponent(this.selectedPromptKey)}`, {
          method: 'PUT',
          headers: this.headers(),
          body: JSON.stringify({
            content: this.promptText || '',
            description: this.promptDescription || null
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось сохранить prompt')
        this.notice = `Prompt ${this.selectedPromptKey} сохранен, версия v${data.prompt_version || '?'}`
        await this.loadPrompts()
      } catch (error) {
        this.notice = error?.message || 'Ошибка сохранения prompt'
      } finally {
        this.promptSaving = false
      }
    },
    async openTask(id) {
      const res = await fetch(`/api/admin/chats/tasks/${id}`, { headers: this.headers() })
      const data = await res.json()
      this.selectedTask = data.task || null
      this.lastStepTrace = data.lastTrace || null
      this.nextState = ''
      this.draftText = ''
      this.inboundText = ''
    },
    async buildDraftWithAi() {
      if (!this.selectedTask?.id) return
      try {
        const response = await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/build`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            message: this.draftText || ''
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось собрать AI-черновик')
        this.notice = data?.runtime?.configured
          ? 'AI-черновик добавлен (OpenClaw)'
          : 'AI-черновик добавлен (локальный fallback)'
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка AI-черновика'
      }
    },
    async sendClarificationQuick() {
      if (!this.selectedTask?.id || this.quickSendLoading) return
      if (this.selectedTask.taskType !== 'clarification') {
        this.notice = 'Быстрая отправка доступна только для уточнений'
        return
      }
      this.quickSendLoading = true
      this.notice = ''
      try {
        const buildResponse = await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/build`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ message: this.draftText || '' })
        })
        const buildData = await buildResponse.json()
        if (!buildResponse.ok) throw new Error(buildData?.error || 'Не удалось собрать уточнение')
        const messageId = buildData?.message?.id
        if (!messageId) throw new Error('Не найден ID сообщения после сборки')

        const approveResponse = await fetch(`/api/admin/chats/messages/${messageId}/approve`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({})
        })
        const approveData = await approveResponse.json()
        if (!approveResponse.ok) throw new Error(approveData?.error || 'Не удалось одобрить уточнение')

        const sendResponse = await fetch(`/api/admin/chats/messages/${messageId}/send`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({})
        })
        const sendData = await sendResponse.json()
        if (!sendResponse.ok) throw new Error(sendData?.error || 'Не удалось отправить уточнение')

        this.notice = sendData?.runtime?.configured
          ? 'Уточнение отправлено через OpenClaw'
          : 'Уточнение отправлено (fallback)'
        this.draftText = ''
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка быстрой отправки уточнения'
      } finally {
        this.quickSendLoading = false
      }
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
    async toggleConversationAgent(task) {
      if (!task || !task.id) return
      try {
        const response = await fetch(`/api/conversations/${task.id}/toggle-agent`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({})
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось переключить агента')
        this.notice = data.agent_paused ? 'Агент поставлен на паузу' : 'Агент возобновлен'
        await this.openTask(task.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка переключения агента'
      }
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
    async processInboundMessage() {
      if (!this.selectedTask?.id || this.inboundProcessing || !this.inboundText.trim()) return
      this.inboundProcessing = true
      try {
        const response = await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/inbound`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ bodyText: this.inboundText.trim() })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось обработать входящее')
        const cls = data?.classification?.class || '-'
        const next = data?.taskState || '-'
        this.notice = `Входящее обработано: class=${cls}, state=${next}`
        this.lastStepTrace = data?.trace || null
        this.inboundText = ''
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка обработки входящего'
      } finally {
        this.inboundProcessing = false
      }
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
    },
    stringifyTrace(value) {
      try {
        return JSON.stringify(value || {}, null, 2)
      } catch (_) {
        return '{}'
      }
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
.agent-grid { display: grid; grid-template-columns: 1.2fr 1fr 180px 180px 140px 220px; gap: 8px; margin-bottom: 8px; }
.agent-grid--meta { grid-template-columns: repeat(5, minmax(160px, 1fr)); }
.compact { min-width: 280px; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.field span { font-size: 13px; color: #334155; }
.toggle { display: inline-flex; align-items: center; gap: 6px; color: #334155; border: 1px solid #d8d9e6; border-radius: 8px; padding: 8px; }
.textarea--code { font-family: Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 12px; min-height: 96px; }
.agent-actions { display: flex; justify-content: flex-end; }
.test-output { white-space: pre-wrap; background: #0b1220; color: #e2e8f0; border-radius: 8px; padding: 10px; font-size: 12px; max-height: 220px; overflow: auto; }
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
.dialog-head-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
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
.trace-wrap { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #1e293b; }
.trace-row { line-height: 1.35; }
.trace-row--caps { margin-top: 4px; }
.trace-cap { border: 1px solid #d8e1ef; border-radius: 8px; background: #f8fbff; padding: 8px; }
.trace-cap-name { font-weight: 700; font-size: 12px; color: #0f172a; }
.trace-cap-meta { font-size: 12px; color: #475569; margin: 4px 0; }
.trace-json { white-space: pre-wrap; word-break: break-word; background: #0b1220; color: #dbeafe; border-radius: 6px; padding: 6px; font-size: 11px; max-height: 160px; overflow: auto; margin: 0; }
.trace-time { color: #64748b; font-size: 12px; margin-top: 4px; }
.message-draft-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
.input { border: 1px solid #d8d8e6; border-radius: 8px; padding: 8px 10px; width: 100%; background: #fff; color: #1e2a44; }
.textarea { min-height: 110px; resize: vertical; margin-bottom: 8px; }
.badge { display: inline-flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 999px; padding: 2px 8px; font-size: 12px; color: #334155; background: #fff; }
.badge--state { border-color: #bae6fd; color: #0c4a6e; background: #e0f2fe; }
.hint { color: #64748b; }
.empty { color: #64748b; padding: 14px; }
.empty--center { margin: auto; }
@media (max-width: 1300px) {
  .agent-grid { grid-template-columns: 1fr; }
  .agent-grid--meta { grid-template-columns: 1fr; }
  .agent-head { flex-direction: column; align-items: flex-start; }
  .agent-head-actions { width: 100%; flex-direction: column; align-items: stretch; }
  .compact { min-width: 0; width: 100%; }
  .workspace { grid-template-columns: 1fr; }
  .queue, .dialog, .actions { min-height: auto; }
}
</style>
