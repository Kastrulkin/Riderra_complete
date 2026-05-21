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

        <div class="page-head">
          <div>
            <p class="eyebrow">AI control plane</p>
            <h1>{{ t.title }}</h1>
            <p class="page-subtitle">{{ t.subtitle }}</p>
          </div>
          <div class="status-summary">
            <strong>{{ activeAgentsCount }}/{{ agents.length }}</strong>
            <span>{{ t.activeAgents }}</span>
          </div>
        </div>

        <div class="section-actions">
          <button class="btn btn--ghost" @click="startNewAgent">{{ t.newAgent }}</button>
          <button class="btn btn--primary" @click="reloadAll">{{ t.refresh }}</button>
        </div>

        <div v-if="notice" class="hint">{{ notice }}</div>

        <div class="mvp-grid">
          <article
            v-for="card in mvpAgentCards"
            :key="card.key"
            class="mvp-card"
            :class="{ 'mvp-card--active': card.enabled, 'mvp-card--system': card.system }"
          >
            <div>
              <p class="eyebrow">{{ card.layer }}</p>
              <h3>{{ card.title }}</h3>
              <p>{{ card.description }}</p>
            </div>
            <span class="status-pill" :class="card.enabled ? 'status-pill--active' : 'status-pill--disabled'">
              {{ card.status }}
            </span>
          </article>
        </div>

        <div class="layout-grid">
          <aside class="agent-sidebar card">
            <div class="section-head section-head--compact">
              <div>
                <h3>{{ t.agentList }}</h3>
                <p class="muted">{{ t.agentListHint }}</p>
              </div>
            </div>
            <button
              v-for="agent in agents"
              :key="agent.id"
              class="agent-list-item"
              :class="{ 'agent-list-item--active': agent.id === selectedAgentId }"
              @click="selectAgent(agent.id)"
            >
              <div>
                <strong>{{ agent.name }}</strong>
                <div class="muted">{{ agent.code }}</div>
              </div>
              <span class="status-pill" :class="agent.isActive ? 'status-pill--active' : 'status-pill--disabled'">
                {{ agent.isActive ? t.active : t.inactive }}
              </span>
            </button>
            <div v-if="!agents.length" class="empty">{{ t.noAgents }}</div>
          </aside>

          <main class="main-stack">
            <div class="card">
              <div class="section-head">
                <div>
                  <h3>{{ selectedAgentId ? t.editAgent : t.createAgent }}</h3>
                  <p class="muted">{{ t.agentFormHint }}</p>
                </div>
              </div>

              <div class="agent-grid">
                <input v-model="agentForm.name" class="input" :placeholder="t.name" />
                <input v-model="agentForm.code" class="input" :placeholder="t.code" :disabled="Boolean(selectedAgentId)" />
                <select v-model="agentForm.type" class="input">
                  <option value="order_completion">order_completion</option>
                  <option value="dispatch_notify">dispatch_notify</option>
                  <option value="driver_ops">driver_ops</option>
                </select>
                <select v-model="agentForm.taskType" class="input">
                  <option value="clarification">clarification</option>
                  <option value="dispatch_info">dispatch_info</option>
                </select>
                <label class="toggle"><input type="checkbox" v-model="agentForm.isActive" /> <span>{{ t.isActive }}</span></label>
                <label class="toggle"><input type="checkbox" v-model="agentForm.requiresApproval" /> <span>{{ t.requiresApproval }}</span></label>
              </div>

              <div class="preset-row">
                <button class="btn btn--tiny" @click="applyAgentPreset('clarification')">{{ t.presetClarification }}</button>
                <button class="btn btn--tiny" @click="applyAgentPreset('dispatch')">{{ t.presetDispatch }}</button>
              </div>

              <div class="agent-grid agent-grid--meta">
                <input v-model="agentForm.description" class="input" :placeholder="t.description" />
                <input v-model="agentForm.personality" class="input" :placeholder="t.personality" />
                <input v-model="agentForm.identity" class="input" :placeholder="t.identity" />
                <input v-model="agentForm.task" class="input" :placeholder="t.task" />
                <input v-model="agentForm.speechStyle" class="input" :placeholder="t.speechStyle" />
              </div>

              <div class="state-strip">
                <div>
                  <strong>{{ t.workflowStates }}</strong>
                  <p class="muted">{{ t.workflowStatesHint }}</p>
                </div>
                <div class="state-chips">
                  <span v-for="state in workflowStatePreview" :key="state" class="state-chip">{{ state }}</span>
                </div>
              </div>

              <label class="field">
                <span>{{ t.prompt }}</span>
                <textarea v-model="agentForm.promptText" class="input textarea" :placeholder="t.promptPlaceholder"></textarea>
              </label>
              <label class="field">
                <span>{{ t.workflow }}</span>
                <textarea v-model="agentForm.workflowJson" class="input textarea textarea--code"></textarea>
              </label>
              <label class="field">
                <span>{{ t.restrictions }}</span>
                <textarea v-model="agentForm.restrictionsJson" class="input textarea textarea--code"></textarea>
              </label>
              <label class="field">
                <span>{{ t.variables }}</span>
                <textarea v-model="agentForm.variablesJson" class="input textarea textarea--code"></textarea>
              </label>

              <div class="agent-actions">
                <button class="btn btn--primary" :disabled="agentSaving" @click="saveAgent">
                  {{ agentSaving ? t.saving : (selectedAgentId ? t.saveAgent : t.createAgentButton) }}
                </button>
                <button v-if="selectedAgentId" class="btn btn--danger" @click="deleteAgent">{{ t.deleteAgent }}</button>
              </div>
            </div>

            <div class="card">
              <div class="section-head section-head--compact">
                <div>
                  <h3>{{ t.whatsappTemplates }}</h3>
                  <p class="muted">{{ t.whatsappTemplatesHint }}</p>
                </div>
                <button class="btn btn--ghost" @click="addWhatsappTemplate">{{ t.addTemplate }}</button>
              </div>
              <div class="template-table">
                <div class="template-row template-row--head">
                  <span>{{ t.templateName }}</span>
                  <span>{{ t.templateLanguages }}</span>
                  <span>{{ t.templateVariables }}</span>
                  <span></span>
                </div>
                <div v-for="(template, index) in whatsappTemplates" :key="`template-${index}`" class="template-row">
                  <input v-model="template.name" class="input input--compact" placeholder="baggage_request" />
                  <input v-model="template.languagesText" class="input input--compact" placeholder="en, ru" />
                  <input v-model="template.variablesText" class="input input--compact" placeholder="booking_number, route_from" />
                  <button class="btn btn--tiny btn--ghost" @click="removeWhatsappTemplate(index)">{{ t.remove }}</button>
                </div>
                <div v-if="!whatsappTemplates.length" class="empty">{{ t.noTemplates }}</div>
              </div>
              <div class="agent-actions">
                <button class="btn btn--primary" :disabled="templateSaving" @click="saveWhatsappTemplates">
                  {{ templateSaving ? t.saving : t.saveTemplates }}
                </button>
                <span v-if="templateNotice" class="muted">{{ templateNotice }}</span>
              </div>
            </div>

            <div class="card card--advanced">
              <div class="section-head section-head--compact">
                <div>
                  <h3>{{ t.promptRegistry }}</h3>
                  <p class="muted">{{ t.promptRegistryHint }}</p>
                </div>
              </div>
              <div class="agent-grid" style="grid-template-columns: 280px 160px 1fr;">
                <select v-model="selectedPromptKey" class="input" @change="applyPromptSelection">
                  <option v-for="key in promptKeys" :key="key" :value="key">{{ key }}</option>
                </select>
                <input class="input" :value="selectedPromptVersionLabel" disabled />
                <input v-model="promptDescription" class="input" :placeholder="t.promptDescription" />
              </div>
              <label class="field">
                <span>{{ t.promptText }}</span>
                <textarea v-model="promptText" class="input textarea textarea--code"></textarea>
              </label>
              <div class="agent-actions">
                <button class="btn btn--primary" :disabled="promptSaving || !selectedPromptKey" @click="savePromptTemplate">
                  {{ promptSaving ? t.saving : t.savePromptVersion }}
                </button>
              </div>
            </div>

            <div class="card">
              <div class="section-head section-head--compact">
                <div>
                  <h3>{{ t.sandbox }}</h3>
                  <p class="muted">{{ t.sandboxHint }}</p>
                </div>
              </div>
              <textarea v-model="agentTestInput" class="input textarea" :placeholder="t.sandboxPlaceholder"></textarea>
              <div class="agent-actions">
                <button class="btn btn--ghost" :disabled="agentTesting || !selectedAgentId" @click="runAgentTest">
                  {{ agentTesting ? t.testing : t.runDryRun }}
                </button>
              </div>
              <pre v-if="agentTestOutput" class="test-output">{{ agentTestOutput }}</pre>
            </div>
          </main>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import navigation from '~/components/partials/nav.vue'
import adminTabs from '~/components/partials/adminTabs.vue'

const emptyAgentForm = () => ({
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
})

export default {
  middleware: 'staff',
  components: { navigation, adminTabs },
  data: () => ({
    notice: '',
    agents: [],
    selectedAgentId: '',
    agentSaving: false,
    agentTesting: false,
    agentTestInput: '',
    agentTestOutput: '',
    promptTemplates: [],
    promptKeys: ['order_missing_data_prompt', 'reply_interpretation_prompt', 'esim_offer_prompt', 'followup_prompt', 'whatsapp_template_registry'],
    selectedPromptKey: 'order_missing_data_prompt',
    selectedPromptVersionLabel: '-',
    promptText: '',
    promptDescription: '',
    promptSaving: false,
    whatsappTemplates: [],
    templateSaving: false,
    templateNotice: '',
    agentForm: emptyAgentForm()
  }),
  computed: {
    activeAgentsCount () {
      return (this.agents || []).filter((agent) => agent.isActive !== false).length
    },
    mvpAgentCards () {
      const hasType = (type) => (this.agents || []).some((agent) => agent.type === type && agent.isActive !== false)
      return [
        {
          key: 'order_completion',
          layer: this.t.customerLayer,
          title: 'order_completion',
          description: this.t.orderCompletionAgent,
          enabled: hasType('order_completion'),
          status: hasType('order_completion') ? this.t.active : this.t.inactive
        },
        {
          key: 'dispatch_notify',
          layer: this.t.deliveryLayer,
          title: 'dispatch_notify',
          description: this.t.dispatchNotifyAgent,
          enabled: hasType('dispatch_notify'),
          status: hasType('dispatch_notify') ? this.t.active : this.t.inactive
        },
        {
          key: 'policy_guard',
          layer: this.t.guardLayer,
          title: 'policy_guard',
          description: this.t.policyGuardAgent,
          enabled: true,
          system: true,
          status: this.t.systemLayer
        }
      ]
    },
    workflowStatePreview () {
      const parsed = this.parseJsonMaybe(this.agentForm.workflowJson)
      const fallback = this.agentForm.type === 'dispatch_notify'
        ? ['idle', 'triggered', 'template_required', 'sent', 'failed', 'completed']
        : ['idle', 'triggered', 'template_required', 'awaiting_customer_reply', 'free_text_allowed', 'needs_human_review', 'completed']
      if (!parsed) return fallback
      const candidates = []
      if (Array.isArray(parsed.states)) candidates.push(...parsed.states)
      if (Array.isArray(parsed.steps)) candidates.push(...parsed.steps)
      if (Array.isArray(parsed.workflow)) candidates.push(...parsed.workflow)
      if (Array.isArray(parsed)) candidates.push(...parsed)
      const normalized = candidates
        .map((state) => typeof state === 'string' ? state : (state?.name || state?.state || state?.key || ''))
        .map((state) => String(state || '').trim())
        .filter(Boolean)
      return normalized.length ? normalized.slice(0, 12) : fallback
    },
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'AI агенты', subtitle: 'Отдельный экран для настройки агентов. Чаты остаются рабочей очередью без технического шума.',
            activeAgents: 'активно', customerLayer: 'клиентский контур', deliveryLayer: 'контур уведомлений', guardLayer: 'runtime guard',
            orderCompletionAgent: 'Запрашивает недостающие данные заказа через шаблоны и ждёт ответ клиента.',
            dispatchNotifyAgent: 'Отправляет подтверждённые детали поездки, водителя и полезные инструкции.',
            policyGuardAgent: 'Обязательный системный слой: блокирует free text вне 24h, неизвестные templates и рискованные действия.',
            systemLayer: 'Системный',
            refresh: 'Обновить', newAgent: 'Новый агент', agentList: 'Агенты', agentListHint: 'Все активные и архивные конфиги.',
            active: 'Активен', inactive: 'Отключён', noAgents: 'Пока нет агентов.', editAgent: 'Настройка агента', createAgent: 'Создание агента',
            agentFormHint: 'Здесь живут prompt, workflow и ограничения. Это не ежедневный экран оператора.', name: 'Название', code: 'Код',
            isActive: 'Активен', requiresApproval: 'Только через approval', presetClarification: 'Пресет: Уточнения', presetDispatch: 'Пресет: Рассылка',
            description: 'Описание', personality: 'Personality', identity: 'Identity', task: 'Task', speechStyle: 'Speech style', prompt: 'Prompt',
            workflowStates: 'Состояния workflow', workflowStatesHint: 'Быстрый предпросмотр без чтения JSON.',
            promptPlaceholder: 'Системный prompt агента', workflow: 'Workflow (JSON)', restrictions: 'Ограничения (JSON)', variables: 'Переменные (JSON)',
            saving: 'Сохраняю...', saveAgent: 'Сохранить агента', createAgentButton: 'Создать агента', deleteAgent: 'Удалить агента',
            whatsappTemplates: 'WhatsApp templates', whatsappTemplatesHint: 'Только approved Meta templates. Free text разрешён только после входящего ответа в 24h окне.',
            addTemplate: 'Добавить template', remove: 'Удалить', templateName: 'Template', templateLanguages: 'Языки', templateVariables: 'Variables',
            noTemplates: 'Нет templates. Добавьте approved templates из Meta.', saveTemplates: 'Сохранить templates',
            promptRegistry: 'Prompt Registry', promptRegistryHint: 'Версионные шаблоны для runtime.', promptDescription: 'Описание prompt',
            promptText: 'Текст prompt', savePromptVersion: 'Сохранить новую версию', sandbox: 'Sandbox test', sandboxHint: 'Dry-run без отправки в боевой канал.',
            sandboxPlaceholder: 'Тестовое сообщение для агента', testing: 'Тестирую...', runDryRun: 'Запустить dry_run тест'
          }
        : {
            title: 'AI agents', subtitle: 'A separate place for agent configuration. Chats stay operational and clean.',
            activeAgents: 'active', customerLayer: 'customer flow', deliveryLayer: 'notification flow', guardLayer: 'runtime guard',
            orderCompletionAgent: 'Requests missing order details via templates and waits for customer replies.',
            dispatchNotifyAgent: 'Sends confirmed trip details, driver information and useful instructions.',
            policyGuardAgent: 'Mandatory system layer: blocks free text outside 24h, unknown templates and risky actions.',
            systemLayer: 'System',
            refresh: 'Refresh', newAgent: 'New agent', agentList: 'Agents', agentListHint: 'All active and archived configs.', active: 'Active', inactive: 'Inactive',
            noAgents: 'No agents yet.', editAgent: 'Edit agent', createAgent: 'Create agent', agentFormHint: 'Prompt, workflow and restrictions live here.',
            name: 'Name', code: 'Code', isActive: 'Active', requiresApproval: 'Approval only', presetClarification: 'Preset: Clarification',
            presetDispatch: 'Preset: Dispatch', description: 'Description', personality: 'Personality', identity: 'Identity', task: 'Task', speechStyle: 'Speech style',
            workflowStates: 'Workflow states', workflowStatesHint: 'Quick preview without reading JSON.',
            prompt: 'Prompt', promptPlaceholder: 'System prompt', workflow: 'Workflow (JSON)', restrictions: 'Restrictions (JSON)', variables: 'Variables (JSON)',
            saving: 'Saving...', saveAgent: 'Save agent', createAgentButton: 'Create agent', deleteAgent: 'Delete agent', promptRegistry: 'Prompt registry',
            whatsappTemplates: 'WhatsApp templates', whatsappTemplatesHint: 'Approved Meta templates only. Free text is allowed only after inbound reply within 24h.',
            addTemplate: 'Add template', remove: 'Remove', templateName: 'Template', templateLanguages: 'Languages', templateVariables: 'Variables',
            noTemplates: 'No templates yet. Add approved Meta templates.', saveTemplates: 'Save templates',
            promptRegistryHint: 'Versioned templates for runtime.', promptDescription: 'Prompt description', promptText: 'Prompt text', savePromptVersion: 'Save new version',
            sandbox: 'Sandbox test', sandboxHint: 'Dry-run without sending to a live channel.', sandboxPlaceholder: 'Test message for the agent', testing: 'Testing...', runDryRun: 'Run dry_run'
          }
    }
  },
  mounted () {
    this.reloadAll()
  },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' }
    },
    async reloadAll () {
      this.notice = ''
      await Promise.all([this.loadAgents(), this.loadPrompts(), this.loadWhatsappTemplates()])
    },
    async loadAgents () {
      const res = await fetch('/api/admin/chats/agents', { headers: this.headers() })
      const data = await res.json()
      this.agents = data.rows || []
      if (this.selectedAgentId && !this.agents.some((a) => a.id === this.selectedAgentId)) this.startNewAgent()
      if (!this.selectedAgentId && this.agents.length) this.selectAgent(this.agents[0].id)
    },
    selectAgent (id) {
      this.selectedAgentId = id
      this.applyAgentSelection()
    },
    applyAgentSelection () {
      const selected = this.agents.find((a) => a.id === this.selectedAgentId)
      if (!selected) return this.startNewAgent()
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
      this.agentTestInput = ''
      this.agentTestOutput = ''
    },
    startNewAgent () {
      this.selectedAgentId = ''
      this.agentForm = emptyAgentForm()
      this.agentTestInput = ''
      this.agentTestOutput = ''
    },
    async saveAgent () {
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
        const res = await fetch(url, { method, headers: this.headers(), body: JSON.stringify(payload) })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Не удалось сохранить агента')
        await this.loadAgents()
        if (!this.selectedAgentId && data?.agent?.id) this.selectedAgentId = data.agent.id
        this.applyAgentSelection()
        this.notice = creating ? 'Агент создан' : 'Агент сохранён'
      } catch (error) {
        this.notice = error?.message || 'Ошибка сохранения агента'
      } finally {
        this.agentSaving = false
      }
    },
    async deleteAgent () {
      if (!this.selectedAgentId) return
      const res = await fetch(`/api/admin/chats/agents/${this.selectedAgentId}`, {
        method: 'DELETE',
        headers: this.headers()
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        this.notice = data?.error || 'Не удалось удалить агента'
        return
      }
      this.notice = 'Агент удалён'
      this.startNewAgent()
      await this.loadAgents()
    },
    async runAgentTest () {
      if (!this.selectedAgentId || this.agentTesting) return
      this.agentTesting = true
      try {
        const response = await fetch(`/api/admin/ai-agents/${this.selectedAgentId}/test`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ dry_run: true, message: this.agentTestInput || 'Проверка тестового запуска агента', conversation_history: [] })
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
    parseJsonMaybe (value) {
      try {
        return value ? JSON.parse(value) : null
      } catch (_) {
        return null
      }
    },
    applyAgentPreset (kind) {
      if (kind === 'clarification') {
        this.agentForm.type = 'order_completion'
        this.agentForm.taskType = 'clarification'
        this.agentForm.requiresApproval = true
        this.agentForm.promptText = [
          'You are Riderra assistant working in test mode.',
          'Default customer-facing language is English unless order.lang is explicitly ru.',
          'Task: politely and briefly ask only for the missing booking details.',
          'Ask for 1-2 critical fields per message.',
          'Do not invent facts. If context is missing, ask a clarification.',
          'Every outbound message must remain Draft -> Approval -> Execute.'
        ].join('\n')
      } else {
        this.agentForm.type = 'dispatch_notify'
        this.agentForm.taskType = 'dispatch_info'
        this.agentForm.requiresApproval = true
        this.agentForm.promptText = [
          'You are Riderra assistant working in test mode.',
          'Default customer-facing language is English unless order.lang is explicitly ru.',
          'Task: send confirmed trip details to the customer.',
          'Include route, date/time, driver contact if available, and useful instructions.',
          'Tone: short, clear, businesslike, no pressure.',
          'Every outbound message must remain Draft -> Approval -> Execute.'
        ].join('\n')
      }
    },
    async loadPrompts () {
      try {
        const res = await fetch('/api/admin/prompts', { headers: this.headers() })
        const data = await res.json()
        this.promptTemplates = data.prompts || []
        this.applyPromptSelection()
      } catch (_) {}
    },
    applyPromptSelection () {
      const key = this.selectedPromptKey
      const row = (this.promptTemplates || []).find((x) => x.key === key)
      this.selectedPromptVersionLabel = row ? `v${row.prompt_version || 1}` : 'new'
      this.promptText = row?.content || ''
      this.promptDescription = row?.description || ''
    },
    async savePromptTemplate () {
      if (!this.selectedPromptKey || this.promptSaving) return
      this.promptSaving = true
      try {
        const response = await fetch(`/api/admin/prompts/${encodeURIComponent(this.selectedPromptKey)}`, {
          method: 'PUT',
          headers: this.headers(),
          body: JSON.stringify({ content: this.promptText || '', description: this.promptDescription || null })
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
    csvToArray (value) {
      return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    },
    templateForUi (template = {}) {
      return {
        name: template.name || '',
        label: template.label || template.name || '',
        description: template.description || '',
        languagesText: Array.isArray(template.languages)
          ? template.languages.join(', ')
          : (template.language || ''),
        variablesText: Array.isArray(template.variables) ? template.variables.join(', ') : ''
      }
    },
    async loadWhatsappTemplates () {
      try {
        const response = await fetch('/api/admin/chats/whatsapp-templates', { headers: this.headers() })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Failed to load WhatsApp templates')
        this.whatsappTemplates = (data.templates || []).map(this.templateForUi)
      } catch (error) {
        this.templateNotice = error?.message || 'WhatsApp templates load failed'
      }
    },
    addWhatsappTemplate () {
      this.whatsappTemplates.push(this.templateForUi({
        name: '',
        languages: ['en'],
        variables: ['booking_number', 'route_from', 'route_to']
      }))
    },
    removeWhatsappTemplate (index) {
      this.whatsappTemplates.splice(index, 1)
    },
    async saveWhatsappTemplates () {
      if (this.templateSaving) return
      this.templateSaving = true
      this.templateNotice = ''
      try {
        const templates = this.whatsappTemplates
          .map((template) => ({
            name: String(template.name || '').trim(),
            label: String(template.label || template.name || '').trim(),
            description: String(template.description || '').trim(),
            languages: this.csvToArray(template.languagesText),
            variables: this.csvToArray(template.variablesText)
          }))
          .filter((template) => template.name)
        const response = await fetch('/api/admin/chats/whatsapp-templates', {
          method: 'PUT',
          headers: this.headers(),
          body: JSON.stringify({ templates })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось сохранить WhatsApp templates')
        this.whatsappTemplates = (data.templates || templates).map(this.templateForUi)
        this.templateNotice = `Saved v${data.prompt_version || '?'}`
        await this.loadPrompts()
      } catch (error) {
        this.templateNotice = error?.message || 'Ошибка сохранения WhatsApp templates'
      } finally {
        this.templateSaving = false
      }
    }
  }
}
</script>

<style scoped>
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 14px;
}

.page-subtitle {
  margin: 6px 0 0;
  max-width: 760px;
  color: #60708f;
  font-size: 15px;
  line-height: 1.55;
}

.eyebrow {
  margin: 0 0 8px;
  color: #7a2f8f;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.status-summary {
  min-width: 132px;
  padding: 14px 18px;
  border: 1px solid #d8e0ee;
  border-radius: 20px;
  background: rgba(255,255,255,0.92);
  text-align: right;
}

.status-summary strong {
  display: block;
  color: #17233f;
  font-size: 28px;
  line-height: 1;
}

.status-summary span {
  color: #64748b;
  font-weight: 700;
}

.mvp-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 16px 0 20px;
}

.mvp-card {
  display: flex;
  min-height: 172px;
  justify-content: space-between;
  gap: 14px;
  padding: 22px;
  border: 1px solid #d8e0ee;
  border-radius: 24px;
  background: rgba(255,255,255,0.94);
  box-shadow: 0 18px 48px rgba(16,24,40,0.06);
}

.mvp-card--active {
  border-color: rgba(45, 190, 123, 0.34);
  background: linear-gradient(135deg, rgba(240,253,244,0.98), rgba(255,255,255,0.94));
}

.mvp-card--system {
  border-color: rgba(219, 39, 119, 0.24);
  background: linear-gradient(135deg, rgba(253,242,248,0.98), rgba(255,255,255,0.94));
}

.mvp-card h3 {
  margin: 0 0 8px;
}

.mvp-card p:not(.eyebrow) {
  margin: 0;
  color: #64748b;
  line-height: 1.45;
}

.layout-grid {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 20px;
}

.card {
  background: rgba(255,255,255,0.96);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 24px 60px rgba(16,24,40,0.08);
}

.agent-sidebar {
  display: grid;
  gap: 12px;
  align-content: start;
}

.agent-list-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  width: 100%;
  border: 1px solid #d8e0ee;
  border-radius: 16px;
  background: #fff;
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
}

.agent-list-item--active {
  border-color: #2b6eff;
  box-shadow: 0 10px 24px rgba(43,110,255,0.12);
}

.main-stack {
  display: grid;
  gap: 20px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.section-head--compact {
  margin-bottom: 12px;
}

.agent-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.agent-grid--meta {
  margin-top: 14px;
}

.state-strip {
  display: grid;
  grid-template-columns: minmax(180px, 260px) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #d8e0ee;
  border-radius: 18px;
  background: #f8fafc;
}

.state-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.state-chip {
  padding: 7px 10px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #d8e0ee;
  color: #22304f;
  font-size: 12px;
  font-weight: 800;
}

.field {
  display: block;
  margin-top: 16px;
}

.field span,
.muted {
  color: #64748b;
}

.input,
.textarea {
  width: 100%;
  margin-top: 6px;
  padding: 14px 16px;
  border: 1px solid #d8e0ee;
  border-radius: 14px;
  background: #fff;
}

.textarea {
  min-height: 140px;
  resize: vertical;
}

.textarea--code,
.test-output {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.input--compact {
  margin-top: 0;
  padding: 10px 12px;
  border-radius: 12px;
}

.template-table {
  display: grid;
  gap: 8px;
}

.template-row {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) minmax(120px, 180px) minmax(220px, 1.4fr) 100px;
  gap: 10px;
  align-items: center;
}

.template-row--head {
  color: #64748b;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-top: 16px;
}

.preset-row,
.agent-actions,
.page-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.test-output {
  margin-top: 12px;
  padding: 14px;
  border-radius: 14px;
  background: #0f172a;
  color: #e2e8f0;
  white-space: pre-wrap;
}

.btn {
  border: none;
  border-radius: 14px;
  padding: 12px 18px;
  cursor: pointer;
  font-weight: 700;
  background: #eef2ff;
  color: #1f3b70;
}

.btn--primary { background: #1f4fff; color: #fff; }
.btn--ghost { background: #fff; border: 1px solid #d8e0ee; }
.btn--danger { background: #b42318; color: #fff; }
.btn--tiny, .status-pill { padding: 7px 10px; border-radius: 999px; font-size: 12px; }
.status-pill--active { background: #ecfdf3; color: #166534; }
.status-pill--disabled { background: #fef2f2; color: #991b1b; }
.empty, .hint { color: #64748b; }

@media (max-width: 980px) {
  .page-head, .page-actions { flex-direction: column; align-items: stretch; }
  .layout-grid, .agent-grid, .mvp-grid, .state-strip, .template-row { grid-template-columns: 1fr; }
  .status-summary { text-align: left; }
}
</style>
