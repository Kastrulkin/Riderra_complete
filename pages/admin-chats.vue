<template>
  <div>
    <navigation></navigation>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf chat-section">
      <div class="container">
        <admin-tabs />

        <div class="section-actions">
          <button class="btn btn--ghost" @click="syncFromOrders">Синхронизировать из заказов</button>
          <button class="btn btn--primary" @click="reloadAll">Обновить</button>
        </div>
        <div v-if="notice" class="hint">{{ notice }}</div>

        <div class="ops-rail">
          <div>
            <strong>Чаты — рабочая очередь.</strong>
            <p class="hint">Здесь только задачи, сообщения, SLA и статусы. Настройки агентов вынесены отдельно.</p>
          </div>
          <button class="btn btn--ghost" @click="$router.push('/admin-agents')">К AI агентам</button>
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
          <select v-model="agentFilter" class="input" @change="loadTasks">
            <option value="">Все агенты</option>
            <option value="none">Без агента</option>
            <option v-for="agent in agents" :key="agent.id" :value="agent.id">
              {{ agent.name }} ({{ agent.code }})
            </option>
          </select>
          <select v-model="ownerFilter" class="input">
            <option value="">Все владельцы</option>
            <option value="__mine">Только мои (owner)</option>
            <option value="__unassigned">Без владельца</option>
            <option v-for="owner in owners" :key="owner.id" :value="owner.id">
              {{ owner.email || owner.id }}
            </option>
          </select>
          <label class="quick-filter"><input type="checkbox" v-model="myOnly" /> Только мои</label>
          <label class="quick-filter"><input type="checkbox" v-model="urgentOnly" /> Только срочные</label>
          <select v-model="sortMode" class="input">
            <option value="priority">Приоритет (SLA + важность)</option>
            <option value="updated_desc">Сначала новые</option>
            <option value="updated_asc">Сначала старые</option>
          </select>
        </div>

        <div class="workspace">
          <aside class="queue">
            <div class="queue-head">
              <span>Очередь ({{ displayedTasks.length }})</span>
              <span class="queue-head-meta">автообновление: 20с</span>
            </div>
            <div class="queue-bulk">
              <button class="btn btn--tiny" type="button" @click="selectAllDisplayed">Выбрать все</button>
              <button class="btn btn--tiny" type="button" @click="clearSelection">Снять выбор</button>
              <button class="btn btn--tiny" type="button" :disabled="!selectedTaskIds.length || bulkLoading" @click="bulkAssignToMe">
                {{ bulkLoading ? '...' : 'Назначить на себя' }}
              </button>
              <button class="btn btn--tiny" type="button" :disabled="!selectedTaskIds.length || bulkLoading" @click="bulkMoveToHandoff">
                {{ bulkLoading ? '...' : 'В handoff' }}
              </button>
            </div>
            <button
              v-for="task in displayedTasks"
              :key="task.id"
              class="queue-item"
              :class="{ 'queue-item--active': selectedTask && selectedTask.id === task.id }"
              @click="openTask(task.id)"
            >
              <label class="queue-check" @click.stop>
                <input
                  type="checkbox"
                  :checked="isTaskSelected(task.id)"
                  @click.stop
                  @change="toggleTaskSelection(task.id, $event.target.checked)"
                />
                <span>в выборке</span>
              </label>
              <div class="queue-title">
                <span>{{ orderLabel(task.order) }}</span>
                <span class="badge">{{ taskTypeLabel(task.taskType) }}</span>
              </div>
              <div class="queue-route">{{ routeLabel(task.order) }}</div>
              <div class="queue-agent">{{ agentLabel(task) }}</div>
              <div class="queue-owner">Владелец: {{ ownerLabel(task) }}</div>
              <div class="queue-meta">
                <span class="badge badge--state">{{ stateLabel(task.state) }}</span>
                <span v-if="isTaskMine(task)" class="badge badge--mine">Моё</span>
                <span class="badge" :class="slaBadgeClass(task)">{{ slaLabel(task) }}</span>
                <span>{{ formatDate(task.updatedAt) }}</span>
                <span>msg: {{ task._count?.messages || 0 }}</span>
              </div>
            </button>
            <div v-if="!displayedTasks.length" class="empty">Нет задач по выбранным фильтрам</div>
          </aside>

          <main class="dialog">
            <div v-if="!selectedTask" class="empty empty--center">Выберите задачу в очереди</div>
            <template v-else>
              <div class="dialog-head">
                <div>
                  <h3>{{ orderLabel(selectedTask.order) }}</h3>
                  <div class="hint">{{ routeLabel(selectedTask.order) }} | {{ formatMoney(selectedTask.order?.clientPrice) }}</div>
                  <div class="hint">{{ agentLabel(selectedTask) }}</div>
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
            <div class="focus-panel">
              <div class="focus-panel__head">
                <div>
                  <h4>{{ taskFocusTitle }}</h4>
                  <div class="hint">{{ taskFocusHint }}</div>
                </div>
                <span class="badge" :class="slaBadgeClass(selectedTask)">{{ slaLabel(selectedTask) }}</span>
              </div>
              <div class="focus-panel__meta">
                <span class="badge badge--state">{{ stateLabel(selectedTask.state) }}</span>
                <span class="badge">{{ taskTypeLabel(selectedTask.taskType) }}</span>
                <span class="badge">{{ agentLabel(selectedTask) }}</span>
                <span class="badge">Владелец: {{ ownerLabel(selectedTask) }}</span>
              </div>
              <div class="focus-panel__actions">
                <button
                  class="btn btn--primary"
                  :disabled="primaryTaskActionDisabled"
                  @click="runPrimaryTaskAction"
                >
                  {{ primaryTaskActionLabel }}
                </button>
                <button class="btn btn--ghost" @click="toggleConversationAgent(selectedTask)">
                  {{ selectedTask.agentPaused ? 'Возобновить агента' : 'Пауза агента' }}
                </button>
              </div>
            </div>

            <div class="actions-block">
              <h4>Сообщение клиенту</h4>
              <div v-if="selectedTask.taskType === 'clarification'" class="quick-templates">
                <button class="btn btn--tiny" @click="applyClarificationTemplate('generic')">Общее уточнение</button>
                <button class="btn btn--tiny" @click="applyClarificationTemplate('luggage')">Уточнить багаж</button>
                <button class="btn btn--tiny" @click="applyClarificationTemplate('flight')">Уточнить рейс</button>
                <button class="btn btn--tiny" @click="applyClarificationTemplate('pickup')">Уточнить место подачи</button>
              </div>
              <textarea v-model="draftText" class="input textarea" placeholder="Черновик сообщения клиенту"></textarea>
              <div class="message-draft-actions">
                <button class="btn btn--ghost" @click="buildDraftWithAi">Собрать AI черновик</button>
                <button
                  class="btn btn--ghost"
                  :disabled="quickSendLoading || !selectedTask || selectedTask.taskType !== 'clarification'"
                  @click="sendClarificationQuick"
                >
                  {{ quickSendLoading ? 'Отправляю...' : 'Уточнение в 1 клик' }}
                </button>
                <button
                  class="btn btn--ghost"
                  :disabled="quickDispatchLoading || !selectedTask || selectedTask.taskType !== 'dispatch_info'"
                  @click="sendDispatchQuick"
                >
                  {{ quickDispatchLoading ? 'Отправляю...' : 'Детали поездки в 1 клик' }}
                </button>
                <button class="btn btn--primary" @click="createDraft">Сохранить черновик</button>
              </div>
            </div>

            <details class="actions-block" :open="selectedTask && selectedTask.state === 'customer_replied'">
              <summary class="section-summary">Ответ клиента</summary>
              <textarea v-model="inboundText" class="input textarea" placeholder="Вставьте входящее сообщение клиента"></textarea>
              <button class="btn btn--ghost" :disabled="inboundProcessing || !inboundText.trim()" @click="processInboundMessage">
                {{ inboundProcessing ? 'Обрабатываю...' : 'Разобрать ответ' }}
              </button>
            </details>

            <details class="actions-block" :open="Boolean(inboundOutcome)">
              <summary class="section-summary">Результат AI разбора</summary>
              <div v-if="inboundOutcome" class="trace-wrap">
                <div class="trace-row"><strong>Класс ответа:</strong> {{ inboundOutcome.classLabel }}</div>
                <div class="trace-row"><strong>Уверенность:</strong> {{ inboundOutcome.confidenceLabel }}</div>
                <div class="trace-row"><strong>Валидация поля:</strong> {{ inboundOutcome.validationLabel }}</div>
                <div class="trace-row"><strong>Извлеченное значение:</strong> {{ inboundOutcome.valueLabel }}</div>
                <div class="trace-row"><strong>Следующий статус:</strong> {{ stateLabel(inboundOutcome.nextState) }}</div>
                <div class="trace-row"><strong>Причина:</strong> {{ inboundOutcome.reasonLabel }}</div>
              </div>
              <div v-else class="hint">Результат появится после “Обработать ответ”.</div>
            </details>

            <details class="actions-block">
              <summary class="section-summary">Смена статуса</summary>
              <select v-model="nextState" class="input">
                <option value="">Выберите статус</option>
                <option v-for="s in transitionTargets" :key="s" :value="s">{{ stateLabel(s) }}</option>
              </select>
              <button class="btn btn--ghost" :disabled="!nextState" @click="applyTransition">Применить</button>
            </details>

            <details class="actions-block">
              <summary class="section-summary">Агент задачи</summary>
              <select v-model="selectedTaskAgentId" class="input">
                <option value="">Без агента</option>
                <option v-for="agent in agents" :key="agent.id" :value="agent.id">
                  {{ agent.name }} ({{ agent.code }}){{ agent.isActive ? '' : ' [inactive]' }}
                </option>
              </select>
              <button class="btn btn--ghost" :disabled="assigningAgent || !selectedTask" @click="assignAgentToTask">
                {{ assigningAgent ? 'Сохраняю...' : 'Применить агента' }}
              </button>
            </details>

            <details class="actions-block">
              <summary class="section-summary">Трейс шага</summary>
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
            </details>
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
    agentFilter: '',
    ownerFilter: '',
    owners: [],
    myOnly: false,
    urgentOnly: false,
    sortMode: 'priority',
    currentUserId: '',
    selectedTaskIds: [],
    bulkLoading: false,
    autoRefreshMs: 20000,
    autoRefreshTimer: null,
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
    quickDispatchLoading: false,
    selectedTaskAgentId: '',
    assigningAgent: false,
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
    },
    inboundOutcome() {
      if (!this.lastStepTrace) return null
      const classifyOutput = this.getCapabilityOutput('riderra.customer.reply.classify')
      const extractOutput = this.getCapabilityOutput('riderra.order.field.extract_validate')
      const cls = String(classifyOutput?.class || 'unclassified')
      const clsMap = {
        answer: 'Ответ',
        question: 'Вопрос',
        negative: 'Негатив',
        unclassified: 'Не классифицировано'
      }
      const conf = Number(classifyOutput?.confidence)
      const confidenceLabel = Number.isFinite(conf) ? `${Math.round(conf * 100)}%` : '—'
      const valid = extractOutput?.valid
      let validationLabel = '—'
      if (valid === true) validationLabel = 'Подтверждено'
      if (valid === false) validationLabel = 'Не подтверждено'
      const extractedValue = extractOutput?.value ?? extractOutput?.normalizedValue ?? extractOutput?.extractedValue ?? null
      return {
        classLabel: clsMap[cls] || cls,
        confidenceLabel,
        validationLabel,
        valueLabel: extractedValue == null || String(extractedValue).trim() === '' ? '—' : String(extractedValue),
        nextState: String(this.lastStepTrace.finalState || this.lastStepTrace.candidateState || ''),
        reasonLabel: String(this.lastStepTrace.decisionReason || '—')
      }
    },
    displayedTasks() {
      let rows = Array.isArray(this.tasks) ? this.tasks.slice() : []
      if (this.ownerFilter === '__mine') {
        rows = rows.filter((task) => this.isTaskMine(task))
      } else if (this.ownerFilter === '__unassigned') {
        rows = rows.filter((task) => !String(task?.assignedToUserId || '').trim())
      } else if (this.ownerFilter) {
        rows = rows.filter((task) => String(task?.assignedToUserId || '').trim() === this.ownerFilter)
      }
      if (this.myOnly) rows = rows.filter((task) => this.isTaskMine(task))
      if (this.urgentOnly) {
        rows = rows.filter((task) => {
          const code = this.getSlaMeta(task).code
          return code === 'overdue' || code === 'no_reply'
        })
      }
      rows.sort((a, b) => this.compareBySortMode(a, b))
      return rows
    },
    taskFocusTitle() {
      if (!this.selectedTask) return ''
      if (this.selectedTask.taskType === 'dispatch_info') return 'Готовим отправку клиенту'
      if (this.selectedTask.state === 'handoff_human') return 'Задача передана человеку'
      if (this.selectedTask.state === 'customer_replied') return 'Нужно разобрать ответ клиента'
      if (this.selectedTask.state === 'request_sent') return 'Ждём ответ клиента'
      return 'Нужно закрыть уточнение по заказу'
    },
    taskFocusHint() {
      if (!this.selectedTask) return ''
      const reason = String(this.selectedTask?.order?.infoReason || '').trim()
      if (this.selectedTask.state === 'customer_replied') return 'Сначала разберите входящий ответ и подтвердите поле.'
      if (this.selectedTask.state === 'request_sent') return 'Проверьте, нужен ли follow-up или передача человеку.'
      if (this.selectedTask.taskType === 'dispatch_info') return 'Отправьте подтверждённые детали поездки и зафиксируйте ответ.'
      if (reason) return `Фокус задачи: ${reason}`
      return 'Соберите короткое сообщение, получите ответ и доведите задачу до следующего статуса.'
    },
    primaryTaskActionLabel() {
      if (!this.selectedTask) return 'Действие'
      if (this.selectedTask.state === 'customer_replied') return 'Разобрать ответ'
      if (this.selectedTask.taskType === 'dispatch_info') {
        return this.quickDispatchLoading ? 'Отправляю...' : 'Отправить детали'
      }
      return this.quickSendLoading ? 'Отправляю...' : 'Отправить уточнение'
    },
    primaryTaskActionDisabled() {
      if (!this.selectedTask) return true
      if (this.selectedTask.state === 'customer_replied') return !this.inboundText.trim() || this.inboundProcessing
      if (this.selectedTask.taskType === 'dispatch_info') return this.quickDispatchLoading
      return this.quickSendLoading
    }
  },
  mounted() {
    this.initPage().catch(() => {})
  },
  beforeDestroy() {
    this.stopAutoRefresh()
  },
  methods: {
    async initPage() {
      this.currentUserId = this.extractCurrentUserId()
      await this.loadTasks()
      await this.loadAgents()
      await this.openTaskFromRouteIfNeeded()
      this.startAutoRefresh()
    },
    startAutoRefresh() {
      this.stopAutoRefresh()
      this.autoRefreshTimer = setInterval(() => {
        this.refreshQueueSilently().catch(() => {})
      }, this.autoRefreshMs)
    },
    stopAutoRefresh() {
      if (this.autoRefreshTimer) {
        clearInterval(this.autoRefreshTimer)
        this.autoRefreshTimer = null
      }
    },
    async refreshQueueSilently() {
      await this.loadTasks()
      if (this.selectedTask?.id) {
        const stillExists = this.tasks.some((task) => task.id === this.selectedTask.id)
        if (!stillExists) this.selectedTask = null
      }
    },
    headers() {
      const token = localStorage.getItem('authToken')
      return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        'Idempotency-Key': `chat-ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      }
    },
    extractCurrentUserId() {
      try {
        const token = localStorage.getItem('authToken')
        if (!token) return ''
        const payload = token.split('.')[1]
        if (!payload) return ''
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
        const decoded = JSON.parse(atob(normalized))
        return String(decoded?.id || '').trim()
      } catch (_) {
        return ''
      }
    },
    async openTaskFromRouteIfNeeded() {
      const taskId = String(this.$route?.query?.taskId || '').trim()
      if (!taskId) return
      await this.openTask(taskId)
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const key = `chat-prefill-${taskId}`
          const prefill = String(window.sessionStorage.getItem(key) || '').trim()
          if (prefill) {
            this.draftText = prefill
            this.notice = 'Открыта задача из Таблицы заказов, черновик подготовлен'
            window.sessionStorage.removeItem(key)
          }
        }
      } catch (_) {}
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
    applyAgentPreset(kind) {
      if (kind === 'clarification') {
        this.agentForm.type = 'order_completion'
        this.agentForm.taskType = 'clarification'
        this.agentForm.requiresApproval = true
        this.agentForm.promptText = [
          'Ты ассистент Riderra в тестовом режиме.',
          'Задача: вежливо и коротко уточнять только недостающие данные заказа.',
          'За одно сообщение запрашивай 1-2 критичных поля.',
          'Не выдумывай факты, при нехватке данных — спроси уточнение.',
          'Всегда указывай, что сообщение требует подтверждения оператором.'
        ].join('\n')
        this.agentForm.workflowJson = JSON.stringify({
          states: ['missing_data_detected', 'request_sent', 'customer_replied', 'field_validated', 'order_complete', 'handoff_human'],
          transitions: {
            missing_data_detected: ['request_sent', 'handoff_human'],
            request_sent: ['customer_replied', 'handoff_human'],
            customer_replied: ['field_validated', 'handoff_human'],
            field_validated: ['missing_data_detected', 'order_complete', 'handoff_human'],
            order_complete: ['closed'],
            handoff_human: ['request_sent', 'closed']
          }
        }, null, 2)
        this.agentForm.restrictionsJson = JSON.stringify({
          maxMessagesPerHour: 3,
          allowedChannels: ['telegram', 'whatsapp'],
          requireHumanApproval: true
        }, null, 2)
      } else if (kind === 'dispatch') {
        this.agentForm.type = 'dispatch_notify'
        this.agentForm.taskType = 'dispatch_info'
        this.agentForm.requiresApproval = true
        this.agentForm.promptText = [
          'Ты ассистент Riderra в тестовом режиме.',
          'Задача: отправить клиенту подтвержденные детали поездки.',
          'Укажи маршрут, дату/время, контакт водителя (если есть), и полезные инструкции.',
          'Тон: коротко, делово, без давления.',
          'Всегда добавляй дисклеймер о тестовом режиме.'
        ].join('\n')
        this.agentForm.workflowJson = JSON.stringify({
          states: ['ready_to_notify', 'notify_draft', 'notify_sent', 'notify_ack', 'handoff_human', 'closed'],
          transitions: {
            ready_to_notify: ['notify_draft', 'notify_sent', 'handoff_human'],
            notify_draft: ['notify_sent', 'handoff_human'],
            notify_sent: ['notify_ack', 'notify_no_reply', 'handoff_human'],
            notify_no_reply: ['notify_sent', 'handoff_human'],
            notify_ack: ['closed'],
            handoff_human: ['notify_draft', 'closed']
          }
        }, null, 2)
        this.agentForm.restrictionsJson = JSON.stringify({
          maxMessagesPerHour: 2,
          allowedChannels: ['telegram', 'whatsapp'],
          requireHumanApproval: true
        }, null, 2)
      }
    },
    async loadTasks() {
      const query = new URLSearchParams()
      if (this.taskType) query.set('taskType', this.taskType)
      if (this.state) query.set('state', this.state)
      if (this.agentFilter) query.set('agentId', this.agentFilter)
      query.set('limit', '300')
      const res = await fetch(`/api/admin/chats/tasks?${query.toString()}`, { headers: this.headers() })
      const data = await res.json()
      this.tasks = data.rows || []
      this.refreshOwnersFromTasks()
      this.selectedTaskIds = this.selectedTaskIds.filter((id) => this.tasks.some((task) => task.id === id))
      if (this.selectedTask?.id) {
        const exists = this.tasks.some((t) => t.id === this.selectedTask.id)
        if (!exists) this.selectedTask = null
      }
    },
    refreshOwnersFromTasks() {
      const seen = new Map()
      for (const task of this.tasks || []) {
        const owner = task?.assignedOwner
        if (!owner?.id || seen.has(owner.id)) continue
        seen.set(owner.id, { id: owner.id, email: owner.email || owner.id })
      }
      this.owners = Array.from(seen.values()).sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')))
      if (this.ownerFilter && !['__mine', '__unassigned'].includes(this.ownerFilter) && !seen.has(this.ownerFilter)) {
        this.ownerFilter = ''
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
      this.selectedTaskAgentId = this.selectedTask?.agentConfigId || ''
      this.lastStepTrace = data.lastTrace || null
      this.nextState = ''
      this.draftText = ''
      this.inboundText = ''
    },
    async assignAgentToTask() {
      if (!this.selectedTask?.id || this.assigningAgent) return
      this.assigningAgent = true
      this.notice = ''
      try {
        const response = await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/assign-agent`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            agentConfigId: this.selectedTaskAgentId || null
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось назначить агента')
        this.notice = this.selectedTaskAgentId ? 'Агент назначен на задачу' : 'Агент снят с задачи'
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка назначения агента'
      } finally {
        this.assigningAgent = false
      }
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
    async sendDispatchQuick() {
      if (!this.selectedTask?.id || this.quickDispatchLoading) return
      if (this.selectedTask.taskType !== 'dispatch_info') {
        this.notice = 'Быстрая рассылка доступна только для задач dispatch_info'
        return
      }
      this.quickDispatchLoading = true
      this.notice = ''
      try {
        const buildResponse = await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/build`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ message: this.draftText || '' })
        })
        const buildData = await buildResponse.json()
        if (!buildResponse.ok) throw new Error(buildData?.error || 'Не удалось собрать сообщение')
        const messageId = buildData?.message?.id
        if (!messageId) throw new Error('Не найден ID сообщения после сборки')

        const approveResponse = await fetch(`/api/admin/chats/messages/${messageId}/approve`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({})
        })
        const approveData = await approveResponse.json()
        if (!approveResponse.ok) throw new Error(approveData?.error || 'Не удалось одобрить сообщение')

        const sendResponse = await fetch(`/api/admin/chats/messages/${messageId}/send`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({})
        })
        const sendData = await sendResponse.json()
        if (!sendResponse.ok) throw new Error(sendData?.error || 'Не удалось отправить сообщение')

        this.notice = sendData?.runtime?.configured
          ? 'Детали поездки отправлены через OpenClaw'
          : 'Детали поездки отправлены (fallback)'
        this.draftText = ''
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка быстрой рассылки'
      } finally {
        this.quickDispatchLoading = false
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
    async runPrimaryTaskAction() {
      if (!this.selectedTask) return
      if (this.selectedTask.state === 'customer_replied') {
        await this.processInboundMessage()
        return
      }
      if (this.selectedTask.taskType === 'dispatch_info') {
        await this.sendDispatchQuick()
        return
      }
      await this.sendClarificationQuick()
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
    agentLabel(task) {
      const agent = task?.agentConfig
      if (!agent) return 'Агент: без назначения'
      const name = agent.name || agent.code || 'agent'
      return agent.isActive === false ? `Агент: ${name} (inactive)` : `Агент: ${name}`
    },
    isTaskMine(task) {
      const mineId = String(this.currentUserId || '').trim()
      const assigned = String(task?.assignedToUserId || '').trim()
      return Boolean(mineId && assigned && mineId === assigned)
    },
    ownerLabel(task) {
      const owner = task?.assignedOwner
      if (!owner?.id) return '—'
      if (this.isTaskMine(task)) return `${owner.email || owner.id} (я)`
      return owner.email || owner.id
    },
    isTaskSelected(taskId) {
      return this.selectedTaskIds.includes(taskId)
    },
    toggleTaskSelection(taskId, checked) {
      if (!taskId) return
      if (checked) {
        if (!this.selectedTaskIds.includes(taskId)) this.selectedTaskIds.push(taskId)
      } else {
        this.selectedTaskIds = this.selectedTaskIds.filter((id) => id !== taskId)
      }
    },
    selectAllDisplayed() {
      this.selectedTaskIds = this.displayedTasks.map((task) => task.id)
    },
    clearSelection() {
      this.selectedTaskIds = []
    },
    async bulkAssignToMe() {
      if (!this.selectedTaskIds.length || this.bulkLoading) return
      this.bulkLoading = true
      try {
        const response = await fetch('/api/admin/chats/tasks/bulk/assign-to-me', {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ taskIds: this.selectedTaskIds })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось назначить задачи')
        this.notice = `Назначено на вас: ${data.updated || 0}`
        await this.loadTasks()
        if (this.selectedTask?.id) await this.openTask(this.selectedTask.id)
      } catch (error) {
        this.notice = error?.message || 'Ошибка массового назначения'
      } finally {
        this.bulkLoading = false
      }
    },
    async bulkMoveToHandoff() {
      if (!this.selectedTaskIds.length || this.bulkLoading) return
      this.bulkLoading = true
      try {
        const response = await fetch('/api/admin/chats/tasks/bulk/transition', {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            taskIds: this.selectedTaskIds,
            toState: 'handoff_human',
            reason: 'bulk_handoff_from_queue'
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось перевести задачи в handoff')
        this.notice = `В handoff: ${data.updated || 0}, пропущено: ${data.skipped || 0}`
        await this.loadTasks()
        if (this.selectedTask?.id) await this.openTask(this.selectedTask.id)
      } catch (error) {
        this.notice = error?.message || 'Ошибка массового перехода'
      } finally {
        this.bulkLoading = false
      }
    },
    getSlaMeta(task) {
      const updatedMs = new Date(task?.updatedAt || 0).getTime()
      if (!Number.isFinite(updatedMs) || updatedMs <= 0) return { code: 'unknown', label: 'SLA: —', weight: 0 }
      const elapsedMin = Math.floor((Date.now() - updatedMs) / 60000)
      const state = String(task?.state || '')
      const taskType = String(task?.taskType || '')

      if (state === 'request_sent' && elapsedMin >= 60) return { code: 'no_reply', label: `Нет ответа ${elapsedMin}м`, weight: 4 }
      if (state === 'notify_sent' && elapsedMin >= 30) return { code: 'no_reply', label: `Нет ответа ${elapsedMin}м`, weight: 4 }

      const dueByState = {
        missing_data_detected: 15,
        customer_replied: 10,
        ready_to_notify: 15,
        notify_draft: 15,
        handoff_human: 20
      }
      const due = dueByState[state] || (taskType === 'clarification' ? 45 : 60)
      if (elapsedMin > due) return { code: 'overdue', label: `Просрочка +${elapsedMin - due}м`, weight: 3 }
      if (elapsedMin > Math.floor(due * 0.7)) return { code: 'warning', label: `SLA скоро (${elapsedMin}/${due}м)`, weight: 2 }
      return { code: 'ok', label: `SLA ок (${elapsedMin}м)`, weight: 1 }
    },
    slaLabel(task) {
      return this.getSlaMeta(task).label
    },
    slaBadgeClass(task) {
      const code = this.getSlaMeta(task).code
      if (code === 'no_reply' || code === 'overdue') return 'badge--sla-critical'
      if (code === 'warning') return 'badge--sla-warning'
      if (code === 'ok') return 'badge--sla-ok'
      return ''
    },
    compareBySortMode(a, b) {
      const updatedA = new Date(a?.updatedAt || 0).getTime()
      const updatedB = new Date(b?.updatedAt || 0).getTime()
      if (this.sortMode === 'updated_desc') return updatedB - updatedA
      if (this.sortMode === 'updated_asc') return updatedA - updatedB

      const slaA = this.getSlaMeta(a).weight
      const slaB = this.getSlaMeta(b).weight
      if (slaB !== slaA) return slaB - slaA
      const pA = Number(a?.priority ?? 999)
      const pB = Number(b?.priority ?? 999)
      if (pA !== pB) return pA - pB
      return updatedB - updatedA
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
    applyClarificationTemplate(template) {
      const order = this.selectedTask?.order || {}
      const orderKey = order.externalKey ? `Номер заказа: ${order.externalKey}. ` : ''
      const route = this.routeLabel(order)
      const infoReason = String(order.infoReason || '').trim()
      const base = 'Я помощник Riderra, работаю в тестовом режиме. '
      const closing = 'Спасибо! После ответа сразу подтвердим детали поездки.'
      const map = {
        generic: `${base}${orderKey}Уточните, пожалуйста, недостающие данные по поездке${route && route !== '-' ? ` (${route})` : ''}. ${infoReason ? `Нужно уточнить: ${infoReason}. ` : ''}${closing}`,
        luggage: `${base}${orderKey}Подскажите, пожалуйста, количество багажа и габариты (если есть крупные чемоданы). ${closing}`,
        flight: `${base}${orderKey}Уточните, пожалуйста, номер рейса и точное время прилета. ${closing}`,
        pickup: `${base}${orderKey}Уточните, пожалуйста, точное место подачи (адрес/терминал/вход). ${closing}`
      }
      this.draftText = map[template] || map.generic
    },
    stringifyTrace(value) {
      try {
        return JSON.stringify(value || {}, null, 2)
      } catch (_) {
        return '{}'
      }
    },
    getCapabilityOutput(name) {
      if (!this.lastStepTrace) return null
      const rows = Array.isArray(this.lastStepTrace.capabilities) ? this.lastStepTrace.capabilities : []
      const row = rows.find((item) => item && item.name === name)
      return row?.output || null
    }
  }
}
</script>

<style scoped>
.chat-section { padding-top: 140px; padding-bottom: 40px; }
.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 14px; }
.page-subtitle { margin: 6px 0 0; max-width: 760px; color: #60708f; font-size: 15px; line-height: 1.55; }
.page-actions { display: flex; gap: 8px; }
.filters { display: grid; grid-template-columns: repeat(4, minmax(180px, 1fr)); gap: 10px; margin-bottom: 12px; align-items: center; }
.quick-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #334155;
  border: 1px solid #d8d9e6;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
}
.quick-filter input { margin: 0; }
.agent-card { border: 1px solid #d8d9e6; border-radius: 12px; background: #fff; padding: 12px; margin-bottom: 12px; }
.agent-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
.agent-head h3 { margin: 0; }
.agent-head-actions { display: flex; gap: 8px; align-items: center; }
.agent-grid { display: grid; grid-template-columns: 1.2fr 1fr 180px 180px 140px 220px; gap: 8px; margin-bottom: 8px; }
.agent-grid--meta { grid-template-columns: repeat(5, minmax(160px, 1fr)); }
.preset-row { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0 10px; }
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
.queue-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-weight: 700; margin-bottom: 10px; }
.queue-head-meta { font-size: 12px; font-weight: 500; color: #64748b; }
.queue-bulk { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.queue-item { width: 100%; border: 1px solid #d6dceb; border-radius: 10px; background: #f8fbff; padding: 10px; margin-bottom: 8px; text-align: left; }
.queue-item--active { border-color: #702283; box-shadow: 0 0 0 1px #702283 inset; background: #fcf7fd; }
.queue-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #475569; margin-bottom: 6px; }
.queue-owner { color: #334155; margin-bottom: 6px; font-size: 12px; }
.queue-title { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; font-weight: 700; }
.queue-route { color: #31456f; margin-bottom: 6px; font-size: 13px; }
.queue-agent { color: #475569; margin-bottom: 6px; font-size: 12px; }
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
.quick-templates { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.btn--tiny { padding: 6px 10px; font-size: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; color: #0f172a; }
.message-actions { margin-top: 8px; display: flex; gap: 6px; }
.actions { padding: 12px; }
.focus-panel { border: 1px solid #ead7f0; border-radius: 12px; background: linear-gradient(180deg, #fff 0%, #fcf7fd 100%); padding: 12px; margin-bottom: 10px; }
.focus-panel__head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
.focus-panel__head h4 { margin: 0 0 4px; }
.focus-panel__meta { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.focus-panel__actions { display: flex; gap: 10px; flex-wrap: wrap; }
.focus-panel__actions .btn--primary { box-shadow: 0 10px 24px rgba(112, 34, 131, .18); }
.actions-block { border: 1px solid #e5eaf1; border-radius: 10px; padding: 10px; margin-bottom: 10px; }
.actions-block h4 { margin: 0 0 8px; }
.section-summary { cursor: pointer; font-weight: 800; list-style: none; margin: -10px; padding: 10px; color: #17233d; background: #fcf7fd; }
.section-summary::-webkit-details-marker { display: none; }
.actions-block[open] .section-summary { border-bottom: 1px solid #e5eaf1; }
.actions-block > :not(summary) { padding-top: 10px; }
.trace-wrap { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #1e293b; }
.trace-row { line-height: 1.35; }
.trace-row--caps { margin-top: 4px; }
.trace-cap { border: 1px solid #ead7f0; border-radius: 8px; background: #fcf7fd; padding: 8px; }
.trace-cap-name { font-weight: 700; font-size: 12px; color: #0f172a; }
.trace-cap-meta { font-size: 12px; color: #475569; margin: 4px 0; }
.trace-json { white-space: pre-wrap; word-break: break-word; background: #0b1220; color: #dbeafe; border-radius: 6px; padding: 6px; font-size: 11px; max-height: 160px; overflow: auto; margin: 0; }
.trace-time { color: #64748b; font-size: 12px; margin-top: 4px; }
.message-draft-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
.input { border: 1px solid #d8d8e6; border-radius: 8px; padding: 8px 10px; width: 100%; background: #fff; color: #1e2a44; }
.textarea { min-height: 110px; resize: vertical; margin-bottom: 8px; }
.badge { display: inline-flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 999px; padding: 2px 8px; font-size: 12px; color: #334155; background: #fff; }
.badge--state { border-color: #bae6fd; color: #0c4a6e; background: #e0f2fe; }
.badge--mine { border-color: #86efac; background: #dcfce7; color: #166534; }
.badge--sla-ok { border-color: #bbf7d0; background: #dcfce7; color: #166534; }
.badge--sla-warning { border-color: #fde68a; background: #fef3c7; color: #92400e; }
.badge--sla-critical { border-color: #fecaca; background: #fee2e2; color: #991b1b; }
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
  .filters { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .page-head,
  .page-actions,
  .queue-head,
  .dialog-head,
  .dialog-head-actions,
  .focus-panel__head,
  .focus-panel__actions,
  .message-actions,
  .message-draft-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .page-actions .btn,
  .queue-bulk .btn,
  .message-actions .btn,
  .message-draft-actions .btn {
    width: 100%;
  }

  .queue-item,
  .actions-block,
  .dialog,
  .queue,
  .actions {
    padding-left: 10px;
    padding-right: 10px;
  }
}
</style>
