<template>
  <div>
    <navigation></navigation>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf chat-section">
      <div class="container">
        <div class="page-head">
          <div>
            <h1 class="h2">{{ t.title }}</h1>
            <p class="page-subtitle">{{ t.subtitle }}</p>
          </div>
          <div class="page-actions">
            <button class="btn btn--ghost" @click="startNewAgent">{{ t.newAgent }}</button>
            <button class="btn btn--primary" @click="reloadAll">{{ t.refresh }}</button>
          </div>
        </div>

        <admin-tabs />

        <div v-if="notice" class="hint">{{ notice }}</div>

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
    promptKeys: ['order_missing_data_prompt', 'reply_interpretation_prompt', 'esim_offer_prompt', 'followup_prompt'],
    selectedPromptKey: 'order_missing_data_prompt',
    selectedPromptVersionLabel: '-',
    promptText: '',
    promptDescription: '',
    promptSaving: false,
    agentForm: emptyAgentForm()
  }),
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'AI агенты', subtitle: 'Отдельный экран для настройки агентов. Чаты остаются рабочей очередью без технического шума.',
            refresh: 'Обновить', newAgent: 'Новый агент', agentList: 'Агенты', agentListHint: 'Все активные и архивные конфиги.',
            active: 'Активен', inactive: 'Отключён', noAgents: 'Пока нет агентов.', editAgent: 'Настройка агента', createAgent: 'Создание агента',
            agentFormHint: 'Здесь живут prompt, workflow и ограничения. Это не ежедневный экран оператора.', name: 'Название', code: 'Код',
            isActive: 'Активен', requiresApproval: 'Только через approval', presetClarification: 'Пресет: Уточнения', presetDispatch: 'Пресет: Рассылка',
            description: 'Описание', personality: 'Personality', identity: 'Identity', task: 'Task', speechStyle: 'Speech style', prompt: 'Prompt',
            promptPlaceholder: 'Системный prompt агента', workflow: 'Workflow (JSON)', restrictions: 'Ограничения (JSON)', variables: 'Переменные (JSON)',
            saving: 'Сохраняю...', saveAgent: 'Сохранить агента', createAgentButton: 'Создать агента', deleteAgent: 'Удалить агента',
            promptRegistry: 'Prompt Registry', promptRegistryHint: 'Версионные шаблоны для runtime.', promptDescription: 'Описание prompt',
            promptText: 'Текст prompt', savePromptVersion: 'Сохранить новую версию', sandbox: 'Sandbox test', sandboxHint: 'Dry-run без отправки в боевой канал.',
            sandboxPlaceholder: 'Тестовое сообщение для агента', testing: 'Тестирую...', runDryRun: 'Запустить dry_run тест'
          }
        : {
            title: 'AI agents', subtitle: 'A separate place for agent configuration. Chats stay operational and clean.',
            refresh: 'Refresh', newAgent: 'New agent', agentList: 'Agents', agentListHint: 'All active and archived configs.', active: 'Active', inactive: 'Inactive',
            noAgents: 'No agents yet.', editAgent: 'Edit agent', createAgent: 'Create agent', agentFormHint: 'Prompt, workflow and restrictions live here.',
            name: 'Name', code: 'Code', isActive: 'Active', requiresApproval: 'Approval only', presetClarification: 'Preset: Clarification',
            presetDispatch: 'Preset: Dispatch', description: 'Description', personality: 'Personality', identity: 'Identity', task: 'Task', speechStyle: 'Speech style',
            prompt: 'Prompt', promptPlaceholder: 'System prompt', workflow: 'Workflow (JSON)', restrictions: 'Restrictions (JSON)', variables: 'Variables (JSON)',
            saving: 'Saving...', saveAgent: 'Save agent', createAgentButton: 'Create agent', deleteAgent: 'Delete agent', promptRegistry: 'Prompt registry',
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
      await Promise.all([this.loadAgents(), this.loadPrompts()])
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
    applyAgentPreset (kind) {
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
      } else {
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
  .layout-grid, .agent-grid { grid-template-columns: 1fr; }
}
</style>
