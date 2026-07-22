<template>
  <section class="sandbox-panel" aria-label="Песочница AI-агента">
    <header class="sandbox-head">
      <div>
        <h2>Песочница AI-агента</h2>
        <p>Проверьте ответ и решение агента на вымышленном диалоге. Отправка в WhatsApp здесь физически отключена.</p>
      </div>
      <span class="safe-badge">Без внешней отправки</span>
    </header>

    <div v-if="error" class="sandbox-error">{{ error }} <button type="button" @click="loadAgents">Повторить</button></div>
    <div class="sandbox-controls">
      <label><span>Кого проверяем</span><select v-model="agentId" class="input"><option value="">Выберите агента</option><option v-for="agent in agents" :key="agent.id" :value="agent.id">{{ agent.name }}{{ agent.publishedVersion ? ` · версия ${agent.publishedVersion.version}` : ' · только черновик' }}</option></select></label>
      <label><span>Сценарий</span><select v-model="scenario" class="input"><option v-for="item in scenarios" :key="item.key" :value="item.key">{{ item.label }}</option></select></label>
      <button class="btn btn--primary" type="button" :disabled="loading || !agentId" @click="start">{{ loading ? 'Запускаю…' : 'Начать новый тест' }}</button>
    </div>

    <div v-if="session" class="sandbox-dialog">
      <div class="sandbox-meta"><span>Тестовый заказ {{ context.order && context.order.public_reference }}</span><span>{{ context.label }}</span><span>Политика {{ policyVersion }}</span></div>
      <div class="sandbox-messages" aria-live="polite">
        <article v-for="message in messages" :key="message.id" class="sandbox-message" :class="`sandbox-message--${message.role}`">
          <small>{{ message.role === 'customer' ? 'Клиент' : 'Черновик агента' }}</small>
          <p>{{ message.bodyText }}</p>
          <div v-if="message.trace" class="sandbox-result">
            <span>{{ stateLabel(message.stateAfter) }}</span>
            <span v-if="message.extraction && message.extraction.valid">Найдено: {{ extractionLabel(message.extraction) }}</span>
            <span v-if="message.trace.safety">Риск: {{ safetyLabel(message.trace.safety.category) }}</span>
            <span>{{ message.trace.reason }}</span>
          </div>
        </article>
        <p v-if="!messages.length" class="sandbox-empty">Введите реплику клиента. Вы увидите черновик, найденные данные, новое состояние и причину решения.</p>
      </div>
      <div class="sandbox-compose">
        <textarea v-model="input" class="input" rows="3" :placeholder="suggestedMessage || 'Сообщение клиента'"></textarea>
        <button class="btn btn--primary" type="button" :disabled="loading || !input.trim()" @click="send">{{ loading ? 'Агент разбирает…' : 'Проверить реплику' }}</button>
      </div>
    </div>
    <div v-else-if="!loading" class="sandbox-empty">Выберите агента и готовый сценарий. Реальный клиент ничего не получит.</div>
  </section>
</template>

<script>
export default {
  data: () => ({
    agents: [], agentId: '', scenario: 'baggage', session: null, context: {}, messages: [], input: '', suggestedMessage: '', loading: false, error: '', policyVersion: 'riderra-safety-v1',
    scenarios: [
      { key: 'baggage', label: 'Багаж: понятный ответ' }, { key: 'flight', label: 'Номер рейса' }, { key: 'pickup', label: 'Место подачи' },
      { key: 'ambiguous', label: 'Неоднозначный ответ' }, { key: 'inbound_inquiry', label: 'Первичное обращение' },
      { key: 'approved_commercial', label: 'Разрешённый вопрос об услугах' },
      { key: 'abuse', label: 'Безопасность: оскорбление' }, { key: 'prompt_injection', label: 'Безопасность: отмена правил' },
      { key: 'internal_info', label: 'Безопасность: внутренние данные' }, { key: 'politics', label: 'Безопасность: посторонняя тема' },
      { key: 'complaint', label: 'Передача: жалоба' }, { key: 'human_request', label: 'Передача: просьба о сотруднике' }
    ]
  }),
  mounted () { this.loadAgents() },
  methods: {
    headers () { const token = localStorage.getItem('authToken'); return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' } },
    async loadAgents () {
      this.error = ''
      try {
        const response = await fetch('/api/admin/chats/sandbox/agents', { headers: this.headers() })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось загрузить агентов')
        this.agents = data.agents || []
        this.policyVersion = data.policyVersion || this.policyVersion
        if (!this.agentId && this.agents.length) {
          const readyAgent = this.agents.find(agent => agent.publishedVersion)
          this.agentId = (readyAgent || this.agents[0]).id
        }
      } catch (error) { this.error = error?.message || 'Не удалось загрузить агентов' }
    },
    async start () {
      if (!this.agentId || this.loading) return
      this.loading = true; this.error = ''
      try {
        const response = await fetch(`/api/admin/ai-agents/${this.agentId}/sandbox/sessions`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ scenarioKey: this.scenario }) })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось запустить тест')
        this.session = data.session; this.context = data.context || {}; this.messages = []; this.suggestedMessage = data.context?.suggestedCustomerMessage || ''; this.input = this.suggestedMessage
      } catch (error) { this.error = error?.message || 'Не удалось запустить тест' } finally { this.loading = false }
    },
    async send () {
      if (!this.session || !this.input.trim() || this.loading) return
      this.loading = true; this.error = ''; const text = this.input.trim()
      try {
        const response = await fetch(`/api/admin/ai-agents/${this.agentId}/sandbox/sessions/${this.session.id}/messages`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ message: text }) })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Агент не обработал реплику')
        const decorate = message => ({ ...message, extraction: data.decision?.extraction || null, trace: data.trace || null })
        this.messages.push(decorate(data.customerMessage), decorate(data.agentMessage)); this.input = ''; this.session = { ...this.session, currentState: data.stateAfter }
      } catch (error) { this.error = error?.message || 'Агент не обработал реплику' } finally { this.loading = false }
    },
    stateLabel (state) { return ({ waiting_customer: 'Ждёт клиента', waiting_approval: 'Ждёт одобрения', needs_human: 'Нужна помощь сотрудника', completed: 'Завершено' })[state] || state || '—' },
    extractionLabel (item) { return `${item.field || 'данные'} = ${item.value ?? item.normalized_value ?? item.normalizedValue}` },
    safetyLabel (category) { return ({ abuse_or_provocation: 'провокация', off_topic: 'посторонняя тема', prompt_injection: 'попытка отменить правила', sensitive_internal_request: 'внутренние данные', complaint: 'жалоба', human_request: 'нужен сотрудник', unknown_commercial: 'нет утверждённого ответа' })[category] || category }
  }
}
</script>

<style scoped>
.sandbox-panel{display:grid;gap:16px;margin:16px 0 20px;padding:18px;border:1px solid #d8e0ee;border-radius:18px;background:#fff}.sandbox-head{display:flex;justify-content:space-between;gap:16px}.sandbox-head h2{margin:0;color:#17233f;font-size:21px}.sandbox-head p{margin:5px 0 0;color:#64748b}.safe-badge{align-self:start;border-radius:999px;background:#ecfdf5;color:#166534;padding:7px 10px;font-size:12px;font-weight:800}.sandbox-controls{display:grid;grid-template-columns:minmax(180px,1fr) minmax(180px,1fr) auto;gap:10px;align-items:end}.sandbox-controls label{display:grid;gap:5px;color:#475569;font-size:12px;font-weight:800}.input{width:100%;box-sizing:border-box;border:1px solid #d8e0ee;border-radius:12px;background:#fff;color:#17233f;padding:11px 12px}.sandbox-dialog{display:grid;gap:12px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;padding:14px}.sandbox-meta,.sandbox-result{display:flex;flex-wrap:wrap;gap:7px;color:#64748b;font-size:12px}.sandbox-meta span,.sandbox-result span{border-radius:999px;background:#fff;padding:5px 8px}.sandbox-messages{display:grid;gap:9px;max-height:420px;overflow:auto}.sandbox-message{max-width:78%;border:1px solid #d8e0ee;border-radius:14px;background:#fff;padding:11px 13px}.sandbox-message--customer{justify-self:end;background:#eef4ff}.sandbox-message p{margin:4px 0;color:#17233f;white-space:pre-wrap}.sandbox-message small{color:#64748b;font-weight:800}.sandbox-compose{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:end}.sandbox-error{border-radius:12px;background:#fef2f2;color:#991b1b;padding:11px}.sandbox-error button{border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer}.sandbox-empty{margin:0;color:#64748b;text-align:center;padding:20px}.btn{border:1px solid #cad5e5;border-radius:12px;background:#fff;color:#17233f;padding:11px 14px;font-weight:800;cursor:pointer}.btn--primary{border-color:#18244a;background:#18244a;color:#fff}.btn:disabled{opacity:.55;cursor:not-allowed}@media(max-width:760px){.sandbox-head{display:grid}.sandbox-controls,.sandbox-compose{grid-template-columns:1fr}.sandbox-message{max-width:92%}.safe-badge{justify-self:start}}
</style>
