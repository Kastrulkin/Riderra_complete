<template>
  <section class="sandbox-panel" aria-label="Тестовый диалог с AI-агентом">
    <header class="sandbox-head">
      <div>
        <span class="sandbox-eyebrow">Безопасная песочница</span>
        <h2>Поговорите с AI как клиент</h2>
        <p>Напишите сообщение от лица клиента и сразу посмотрите ответ агента. В WhatsApp ничего не отправится.</p>
      </div>
      <div class="sandbox-head__actions">
        <span class="safe-badge">Только тест</span>
        <button class="btn btn--primary" type="button" @click="$emit('start-whatsapp')">Начать реальный WhatsApp-диалог</button>
      </div>
    </header>

    <div v-if="error" class="sandbox-error" role="alert">
      <span>{{ error }}</span>
      <button type="button" @click="loadAgents">Попробовать снова</button>
    </div>

    <div class="sandbox-setup">
      <label class="scenario-field">
        <span>Что хотим проверить</span>
        <select v-model="scenario" class="input" :disabled="loading" @change="restartScenario">
          <option v-for="item in scenarios" :key="item.key" :value="item.key">{{ item.label }}</option>
        </select>
      </label>
      <label class="scenario-field">
        <span>Первое сообщение Riderra</span>
        <select v-model="startingTemplateName" class="input" :disabled="loading" @change="start">
          <option v-for="template in whatsappTemplates" :key="template.name" :value="template.name">{{ template.label }}</option>
        </select>
      </label>
      <button v-if="session" class="btn btn--ghost" type="button" :disabled="loading" @click="start">Начать заново</button>
      <details class="sandbox-advanced">
        <summary>Настройки теста</summary>
        <label>
          <span>AI-помощник</span>
          <select v-model="agentId" class="input" :disabled="loading" @change="start">
            <option value="">Выберите помощника</option>
            <option v-for="agent in agents" :key="agent.id" :value="agent.id">
              {{ agent.name }}{{ agent.publishedVersion ? ` · версия ${agent.publishedVersion.version}` : ' · только черновик' }}
            </option>
          </select>
        </label>
        <small>Используется политика безопасности {{ policyVersion }}.</small>
      </details>
    </div>

    <div v-if="loading && !session" class="sandbox-loading" role="status">
      <span class="spinner" aria-hidden="true"></span>
      <div><strong>Готовим тестовый диалог</strong><span>Загружаем сценарий и безопасные правила…</span></div>
    </div>

    <div v-else-if="session" class="sandbox-dialog">
      <div class="sandbox-dialog__head">
        <div>
          <h3>Тестовый диалог</h3>
          <p>Справа — сообщения клиента, слева — ответы AI-агента.</p>
        </div>
        <div class="sandbox-context">
          <span v-if="context.order && context.order.public_reference">Заказ {{ context.order.public_reference }}</span>
          <span v-if="context.label">{{ context.label }}</span>
        </div>
      </div>

      <div ref="messages" class="sandbox-messages" aria-live="polite">
        <div v-if="!messages.some(message => !message.isOpeningTemplate)" class="sandbox-guide">
          <strong>Тест готов</strong>
          <span>Сначала Riderra отправляет выбранный шаблон. Ниже уже вставлен пример ответа клиента.</span>
        </div>

        <article v-for="message in messages" :key="message.id" class="sandbox-message" :class="`sandbox-message--${message.role}`">
          <small>{{ message.isOpeningTemplate ? 'Первое сообщение Riderra · approved template' : (message.role === 'customer' ? 'Клиент' : 'Ответ AI-агента') }}</small>
          <p>{{ message.bodyText }}</p>
          <details v-if="message.trace && message.role !== 'customer'" class="sandbox-decision">
            <summary>Почему агент ответил так</summary>
            <div class="sandbox-result">
              <span>Следующий этап: {{ stateLabel(message.stateAfter) }}</span>
              <span v-if="message.extraction && message.extraction.valid">Найдено: {{ extractionLabel(message.extraction) }}</span>
              <span v-if="message.trace.safety">Проверка безопасности: {{ safetyLabel(message.trace.safety.category) }}</span>
              <span v-if="message.trace.reason">{{ message.trace.reason }}</span>
            </div>
          </details>
        </article>

        <article v-if="loading && loadingAction === 'send'" class="sandbox-message sandbox-message--agent sandbox-message--thinking" role="status">
          <small>AI-агент</small>
          <p><span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span> Анализирует сообщение и готовит ответ…</p>
        </article>
      </div>

      <form class="sandbox-compose" @submit.prevent="send">
        <label for="sandbox-customer-message">Сообщение клиента</label>
        <textarea id="sandbox-customer-message" v-model="input" class="input" rows="3" :placeholder="suggestedMessage || 'Например: There would be 3 bags'" :disabled="loading"></textarea>
        <div class="sandbox-compose__footer">
          <small>Пишите так, как мог бы ответить пассажир.</small>
          <button class="btn btn--primary" type="submit" :disabled="loading || !input.trim()">
            {{ loading && loadingAction === 'send' ? 'Агент отвечает…' : 'Отправить агенту' }}
          </button>
        </div>
      </form>
    </div>

    <div v-else-if="!loading" class="sandbox-empty">
      <strong>Не удалось начать тест автоматически</strong>
      <span>Выберите AI-помощника в настройках теста и нажмите «Начать тест».</span>
      <button class="btn btn--primary" type="button" :disabled="!agentId" @click="start">Начать тест</button>
    </div>
  </section>
</template>

<script>
export default {
  data: () => ({
    agents: [], agentId: '', scenario: 'baggage', session: null, context: {}, messages: [], input: '', suggestedMessage: '', loading: false, loadingAction: '', error: '', policyVersion: 'riderra-safety-v1', whatsappTemplates: [], startingTemplateName: '',
    scenarios: [
      { key: 'baggage', label: 'Ответ о багаже' }, { key: 'flight', label: 'Номер рейса' }, { key: 'pickup', label: 'Место подачи' },
      { key: 'ambiguous', label: 'Неоднозначный ответ' }, { key: 'inbound_inquiry', label: 'Первичное обращение' },
      { key: 'approved_commercial', label: 'Вопрос об услугах Riderra' },
      { key: 'abuse', label: 'Провокация или оскорбление' }, { key: 'prompt_injection', label: 'Попытка отменить правила' },
      { key: 'internal_info', label: 'Запрос внутренних данных' }, { key: 'politics', label: 'Посторонняя тема' },
      { key: 'complaint', label: 'Жалоба клиента' }, { key: 'human_request', label: 'Просьба позвать сотрудника' }
    ]
  }),
  mounted () { this.loadAgents() },
  methods: {
    headers () { const token = localStorage.getItem('authToken'); return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' } },
    async loadAgents () {
      this.error = ''; this.loading = true; this.loadingAction = 'load'
      let canStart = false
      try {
        const [response, templateResponse] = await Promise.all([
          fetch('/api/admin/chats/sandbox/agents', { headers: this.headers() }),
          fetch('/api/admin/chats/whatsapp-templates', { headers: this.headers() })
        ])
        const [data, templateData] = await Promise.all([response.json(), templateResponse.json()])
        if (!response.ok) throw new Error(data?.error || 'Не удалось загрузить AI-помощников')
        if (!templateResponse.ok) throw new Error(templateData?.error || 'Не удалось загрузить шаблоны WhatsApp')
        this.agents = data.agents || []
        this.whatsappTemplates = templateData.templates || []
        this.selectScenarioTemplate()
        this.policyVersion = data.policyVersion || this.policyVersion
        if (!this.agentId && this.agents.length) {
          const readyAgent = this.agents.find(agent => agent.publishedVersion)
          this.agentId = (readyAgent || this.agents[0]).id
        }
        canStart = Boolean(this.agentId)
      } catch (error) {
        this.error = error?.message || 'Не удалось загрузить AI-помощников'
      } finally {
        this.loading = false; this.loadingAction = ''
      }
      if (canStart) await this.start()
    },
    async start () {
      if (!this.agentId || this.loading) return
      this.loading = true; this.loadingAction = 'start'; this.error = ''
      try {
        const response = await fetch(`/api/admin/ai-agents/${this.agentId}/sandbox/sessions`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ scenarioKey: this.scenario }) })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось подготовить тестовый диалог')
        this.session = data.session
        this.context = data.context || {}
        const openingTemplate = this.whatsappTemplates.find(template => template.name === this.startingTemplateName)
        this.messages = openingTemplate ? [{ id: `template-${Date.now()}`, role: 'agent', isOpeningTemplate: true, bodyText: `${openingTemplate.label}\n${openingTemplate.description || openingTemplate.name}` }] : []
        this.suggestedMessage = data.context?.suggestedCustomerMessage || ''
        this.input = this.suggestedMessage
        this.$nextTick(() => document.getElementById('sandbox-customer-message')?.focus())
      } catch (error) {
        this.error = error?.message || 'Не удалось подготовить тестовый диалог'
      } finally {
        this.loading = false; this.loadingAction = ''
      }
    },
    restartScenario () {
      this.selectScenarioTemplate()
      this.start()
    },
    selectScenarioTemplate () {
      const preferred = ({ baggage: 'riderra_baggage_request', flight: 'riderra_flight_request' })[this.scenario] || 'riderra_trip_message'
      const selected = this.whatsappTemplates.find(template => template.name === preferred) || this.whatsappTemplates[0]
      this.startingTemplateName = selected?.name || ''
    },
    async send () {
      if (!this.session || !this.input.trim() || this.loading) return
      this.loading = true; this.loadingAction = 'send'; this.error = ''
      const text = this.input.trim()
      this.$nextTick(this.scrollToLatest)
      try {
        const response = await fetch(`/api/admin/ai-agents/${this.agentId}/sandbox/sessions/${this.session.id}/messages`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ message: text }) })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Агент не обработал сообщение')
        const decorate = message => ({ ...message, extraction: data.decision?.extraction || null, trace: data.trace || null })
        this.messages.push(decorate(data.customerMessage), decorate(data.agentMessage))
        this.input = ''
        this.session = { ...this.session, currentState: data.stateAfter }
        this.$nextTick(this.scrollToLatest)
      } catch (error) {
        this.error = error?.message || 'Агент не обработал сообщение'
      } finally {
        this.loading = false; this.loadingAction = ''
      }
    },
    scrollToLatest () {
      const element = this.$refs.messages
      if (element) element.scrollTop = element.scrollHeight
    },
    stateLabel (state) { return ({ waiting_customer: 'ждёт клиента', waiting_approval: 'нужно одобрение сотрудника', needs_human: 'нужна помощь сотрудника', completed: 'диалог завершён' })[state] || state || '—' },
    extractionLabel (item) { return `${item.field || 'данные'} = ${item.value ?? item.normalized_value ?? item.normalizedValue}` },
    safetyLabel (category) { return ({ abuse_or_provocation: 'обнаружена провокация', off_topic: 'посторонняя тема', prompt_injection: 'попытка отменить правила', sensitive_internal_request: 'запрос внутренних данных', complaint: 'жалоба', human_request: 'нужен сотрудник', unknown_commercial: 'нет утверждённого ответа' })[category] || category }
  }
}
</script>

<style scoped>
.sandbox-panel{display:grid;gap:16px;margin:16px 0 20px;padding:20px;border:1px solid #dce3ed;border-radius:16px;background:#fff;box-shadow:0 12px 36px rgba(23,35,61,.06)}
.sandbox-head{display:flex;justify-content:space-between;gap:18px}.sandbox-head h2{margin:3px 0 0;color:#17233f;font-size:24px}.sandbox-head p{margin:7px 0 0;max-width:720px;color:#64748b;line-height:1.5}.sandbox-head__actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.sandbox-eyebrow{color:#5d6c88;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.safe-badge{align-self:center;border-radius:999px;background:#ecfdf5;color:#166534;padding:7px 11px;font-size:12px;font-weight:800;white-space:nowrap}
.sandbox-setup{display:flex;align-items:end;gap:10px;padding:12px;border-radius:12px;background:#f7f9fc}.scenario-field{display:grid;gap:5px;min-width:260px;color:#475569;font-size:12px;font-weight:800}.sandbox-advanced{margin-left:auto;color:#475569;font-size:13px}.sandbox-advanced summary{cursor:pointer;font-weight:800}.sandbox-advanced[open]{display:grid;gap:8px;min-width:280px;padding:12px;border:1px solid #dce3ed;border-radius:12px;background:#fff}.sandbox-advanced label{display:grid;gap:5px}.sandbox-advanced small{color:#64748b}
.input{width:100%;box-sizing:border-box;border:1px solid #cfd8e6;border-radius:10px;background:#fff;color:#17233f;padding:11px 12px}.input:focus{border-color:#49659c;outline:3px solid rgba(73,101,156,.16)}
.sandbox-loading,.sandbox-empty{display:flex;align-items:center;justify-content:center;gap:12px;min-height:180px;padding:24px;border:1px dashed #cfd8e6;border-radius:14px;color:#64748b;text-align:center}.sandbox-loading div,.sandbox-empty{flex-direction:column}.sandbox-loading strong,.sandbox-loading span,.sandbox-empty strong,.sandbox-empty span{display:block}.sandbox-loading strong,.sandbox-empty strong{color:#17233f}.sandbox-loading div span{margin-top:4px}.spinner{width:20px;height:20px;border:2px solid #dce3ed;border-top-color:#243b73;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.sandbox-dialog{overflow:hidden;border:1px solid #dce3ed;border-radius:14px;background:#f7f9fc}.sandbox-dialog__head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:15px 17px;border-bottom:1px solid #dce3ed;background:#fff}.sandbox-dialog__head h3{margin:0;color:#17233f;font-size:17px}.sandbox-dialog__head p{margin:3px 0 0;color:#64748b;font-size:13px}.sandbox-context{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.sandbox-context span{border-radius:999px;background:#eef2f8;color:#52627b;padding:5px 8px;font-size:11px;font-weight:700}
.sandbox-messages{display:grid;gap:11px;min-height:220px;max-height:440px;overflow:auto;padding:18px}.sandbox-guide{display:grid;gap:4px;justify-self:center;max-width:520px;margin:auto;padding:18px;color:#64748b;text-align:center}.sandbox-guide strong{color:#17233f}.sandbox-message{justify-self:start;max-width:76%;border:1px solid #d8e0ee;border-radius:14px 14px 14px 4px;background:#fff;padding:11px 13px;box-shadow:0 2px 8px rgba(23,35,61,.04)}.sandbox-message--customer{justify-self:end;border-radius:14px 14px 4px 14px;background:#eaf1ff}.sandbox-message p{margin:5px 0 0;color:#17233f;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}.sandbox-message small{color:#60708f;font-weight:800}.sandbox-message--agent small{color:#36558f}.sandbox-message--thinking{color:#64748b}.thinking-dot{display:inline-block;width:5px;height:5px;margin-right:3px;border-radius:50%;background:#49659c;animation:pulse 1.1s ease-in-out infinite}.thinking-dot:nth-child(2){animation-delay:.14s}.thinking-dot:nth-child(3){animation-delay:.28s}@keyframes pulse{0%,70%,100%{opacity:.25;transform:translateY(0)}35%{opacity:1;transform:translateY(-3px)}}
.sandbox-decision{margin-top:9px;padding-top:8px;border-top:1px solid #e5eaf1;color:#5d6c88;font-size:12px}.sandbox-decision summary{cursor:pointer;font-weight:800}.sandbox-result{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}.sandbox-result span{border-radius:999px;background:#f2f5f9;padding:5px 8px}
.sandbox-compose{display:grid;gap:8px;padding:15px 17px;border-top:1px solid #dce3ed;background:#fff}.sandbox-compose>label{color:#263653;font-size:13px;font-weight:800}.sandbox-compose textarea{min-height:86px;resize:vertical}.sandbox-compose__footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.sandbox-compose__footer small{color:#64748b}
.sandbox-error{display:flex;align-items:center;justify-content:space-between;gap:12px;border-radius:12px;background:#fef2f2;color:#991b1b;padding:11px 13px}.sandbox-error button{border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer}.btn{border:1px solid #cad5e5;border-radius:10px;background:#fff;color:#17233f;padding:10px 14px;font-weight:800;cursor:pointer}.btn--primary{border-color:#18244a;background:#18244a;color:#fff}.btn--ghost{background:#fff}.btn:disabled{opacity:.55;cursor:not-allowed}
@media(max-width:760px){.sandbox-panel{margin-inline:-10px;padding:14px;border-radius:12px}.sandbox-head{display:grid}.sandbox-head__actions{justify-content:flex-start}.sandbox-head__actions .btn{width:100%}.safe-badge{justify-self:start}.sandbox-setup{display:grid}.scenario-field,.sandbox-advanced[open]{min-width:0;width:100%}.sandbox-advanced{margin-left:0}.sandbox-dialog__head{align-items:flex-start;flex-direction:column}.sandbox-context{justify-content:flex-start}.sandbox-message{max-width:90%}.sandbox-compose__footer{align-items:stretch;flex-direction:column}.sandbox-compose__footer .btn{width:100%}.sandbox-error{align-items:flex-start;flex-direction:column}}
@media(prefers-reduced-motion:reduce){.spinner,.thinking-dot{animation:none}}
</style>
