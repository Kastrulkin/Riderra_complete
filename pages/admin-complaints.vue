<template>
  <div class="complaints-page">
    <section class="site-section site-section--pf">
      <div class="container">
        <admin-tabs :sticky="false" />

        <header class="page-head">
          <div>
            <p class="eyebrow">Контроль качества</p>
            <h1>Жалобы</h1>
            <p>Соберите подтверждённые факты, проверьте правила заказчика и ответьте в одной цепочке.</p>
          </div>
          <button class="btn btn--primary" type="button" @click="manualOpen = true">Создать жалобу</button>
        </header>

        <div class="summary-strip">
          <div><strong>{{ counts.new || 0 }}</strong><span>новых</span></div>
          <div :class="{ danger: counts.overdue }"><strong>{{ counts.overdue || 0 }}</strong><span>просрочено</span></div>
          <div><strong>{{ counts.total || 0 }}</strong><span>в работе</span></div>
        </div>

        <nav class="view-tabs" aria-label="Очереди жалоб">
          <button v-for="item in views" :key="item.value" type="button" :class="{ active: view === item.value }" @click="changeView(item.value)">{{ item.label }}</button>
        </nav>

        <div class="filters">
          <input v-model="search" class="input" placeholder="Номер заказа, заявитель или суть" @keyup.enter="loadList" />
          <button class="btn btn--ghost" type="button" @click="loadList">Найти</button>
        </div>

        <div v-if="error" class="notice notice--error" role="alert">{{ error }}</div>
        <div v-if="notice" class="notice" role="status">{{ notice }}</div>

        <div class="workspace">
          <aside class="case-list" :class="{ 'case-list--hidden-mobile': selected }">
            <div v-if="loading" class="empty-state"><span class="spinner"></span><strong>Собираем жалобы…</strong><p>Проверяем письма и сроки ответа.</p></div>
            <div v-else-if="!complaints.length" class="empty-state"><strong>В этом разделе всё обработано</strong><p>Новые жалобы из почты появятся здесь автоматически.</p></div>
            <button v-for="item in complaints" :key="item.id" type="button" class="case-row" :class="{ active: selected && selected.id === item.id, overdue: isOverdue(item) }" @click="openCase(item.id)">
              <div class="case-row__top"><span class="severity" :class="`severity--${item.severity}`">{{ severityLabel(item.severity) }}</span><time>{{ relativeDue(item) }}</time></div>
              <strong>{{ item.summary }}</strong>
              <span>{{ orderLabel(item.order) }}</span>
              <small>{{ item.complainantName || item.complainantEmail || 'Заявитель не определён' }} · {{ ownerLabel(item) }}</small>
            </button>
          </aside>

          <main class="case-detail" :class="{ 'case-detail--visible-mobile': selected }">
            <button v-if="selected" class="mobile-back" type="button" @click="closeCase">← К списку</button>
            <div v-if="detailLoading" class="empty-state"><span class="spinner"></span><strong>Собираем материалы…</strong><p>Поднимаем заказ, переписку и историю изменений.</p></div>
            <div v-else-if="!selected" class="empty-state"><strong>Выберите жалобу</strong><p>Справа появятся факты, подтверждения и следующее действие.</p></div>
            <template v-else>
              <header class="case-hero">
                <div>
                  <div class="case-hero__meta"><span class="status">{{ statusLabel(selected.status) }}</span><span v-if="selected.isEscalated" class="severity severity--critical">Эскалация</span><span :class="{ overdue: isOverdue(selected) }">{{ relativeDue(selected) }}</span></div>
                  <h2>{{ selected.summary }}</h2>
                  <p>{{ nextActionText }}</p>
                </div>
                <button v-if="!selected.assignedToUserId" class="btn btn--primary" :disabled="saving" @click="takeCase">Взять в работу</button>
                <div v-else class="case-actions">
                  <button v-if="selected.status !== 'waiting_info'" class="btn btn--ghost" type="button" :disabled="saving" @click="changeStatus('waiting_info')">Ждём информацию</button>
                  <button v-if="selected.canSupervise" class="btn btn--ghost" type="button" :disabled="saving" @click="changeStatus(selected.status, !selected.isEscalated)">{{ selected.isEscalated ? 'Снять эскалацию' : 'Эскалировать' }}</button>
                  <button v-if="selected.canSupervise && selected.status !== 'closed'" class="btn btn--ghost" type="button" :disabled="saving" @click="changeStatus('closed')">Закрыть</button>
                </div>
              </header>

              <section class="order-context">
                <div><span>Заказ</span><strong>{{ orderLabel(selected.order) }}</strong></div>
                <div><span>Поездка</span><strong>{{ tripLabel(selected.order) }}</strong></div>
                <div><span>Водитель</span><strong>{{ selected.order && (selected.order.driverNameRaw || selected.order.driver && selected.order.driver.name) || 'Не определён' }}</strong></div>
                <div><span>Ответственный</span><strong>{{ selected.assignedToUser && selected.assignedToUser.email || 'Не назначен' }}</strong></div>
                <nuxt-link v-if="selected.order" class="order-link" :to="{ path: '/admin-orders', query: { orderId: selected.order.id } }">Открыть подробности заказа →</nuxt-link>
              </section>

              <section v-if="!selected.order" class="action-card action-card--warning">
                <div><strong>Нужно определить поездку</strong><p>Автоматическое сопоставление не дало однозначного результата.</p></div>
                <div v-if="selected.matchCandidates && selected.matchCandidates.length" class="match-candidates">
                  <button v-for="candidate in selected.matchCandidates" :key="candidate.id" type="button" @click="matchOrderId = candidate.id; matchOrder()"><strong>{{ candidate.orderNumber || 'Без номера' }}</strong><span>{{ formatDate(candidate.pickupAt) }} · {{ candidate.fromPoint }} → {{ candidate.toPoint }}</span><small>{{ candidate.reason }} · {{ candidate.score }}%</small></button>
                </div>
                <input v-model="matchOrderId" class="input" placeholder="ID заказа, если его нет в вариантах" />
                <button class="btn btn--primary" :disabled="!matchOrderId || saving" @click="matchOrder">Связать</button>
              </section>

              <section class="contract-card">
                <div class="section-title"><div><span>1</span><div><h3>Правила заказчика</h3><p>Проверяем договорные условия до оценки действий водителя.</p></div></div><button class="text-button" type="button" @click="rulesOpen = !rulesOpen">{{ rulesOpen ? 'Скрыть' : 'Показать' }}</button></div>
                <div v-if="selected.contractRule" class="contract-summary"><strong>{{ selected.contractRule.title }} · версия {{ selected.contractRule.version }}</strong><span>Ожидание: {{ selected.contractRule.waitingMinutes || 'не задано' }} мин</span><span>Допуск прибытия: {{ selected.contractRule.arrivalToleranceMin || 'не задан' }} мин</span></div>
                <div v-else class="missing-box">Для {{ selected.order && selected.order.counterpartyName || 'этого заказчика' }} правила ещё не добавлены. Ответ можно подготовить, но договорные утверждения в него не попадут.</div>
                <div v-if="rulesOpen" class="rule-details">
                  <template v-if="selected.contractRule">
                    <div><strong>Обязательные действия</strong><ul><li v-for="item in selected.contractRule.requiredActions" :key="item">{{ ruleActionLabel(item) }}</li></ul></div>
                    <div><strong>Разрешённые формулировки</strong><ul><li v-for="item in selected.contractRule.approvedStatements" :key="item">{{ item }}</li></ul></div>
                    <p v-if="selected.contractRule.notes">{{ selected.contractRule.notes }}</p>
                  </template>
                  <button v-if="selected.canEditRules" class="btn btn--ghost" type="button" @click="ruleEditorOpen = true">Добавить новую версию правил</button>
                </div>
              </section>

              <section class="investigation-card">
                <div class="section-title"><div><span>2</span><div><h3>Что произошло</h3><p>Шаг {{ investigationStep + 1 }} из 5 · {{ investigationStepLabel }}</p></div></div><span class="completion">{{ investigationCompletion }}%</span></div>
                <div class="investigation-grid">
                  <template v-if="investigationStep === 0"><label><span>Водитель приехал</span><input v-model="investigation.arrivedAt" class="input" type="datetime-local" /></label><label><span>Водитель уехал</span><input v-model="investigation.departedAt" class="input" type="datetime-local" /></label><label class="wide"><span>Где именно ждал</span><input v-model="investigation.pickupPoint" class="input" placeholder="Терминал, выход, адрес или точка встречи" /></label></template>
                  <label v-if="investigationStep === 1" class="wide"><span>Что сообщил водитель</span><textarea v-model="investigation.driverExplanation" class="input" placeholder="Кратко и по фактам"></textarea></label>
                  <template v-if="investigationStep === 2"><label class="wide"><span>Звонки пассажиру</span><textarea v-model="callsText" class="input" placeholder="Каждая попытка с новой строки: время — результат"></textarea></label><label class="wide"><span>Сообщения пассажиру</span><textarea v-model="messagesText" class="input" placeholder="Время — канал — результат"></textarea></label></template>
                  <template v-if="investigationStep === 3"><label class="wide"><span>Связь с диспетчером или заказчиком</span><textarea v-model="investigation.dispatcherContact" class="input"></textarea></label><label class="wide"><span>Итог для пассажира</span><textarea v-model="investigation.passengerOutcome" class="input"></textarea></label></template>
                  <div v-if="investigationStep === 4" class="wide review-facts"><strong>Проверьте перед сохранением</strong><p>Прибытие: {{ investigation.arrivedAt || 'не указано' }} · отъезд: {{ investigation.departedAt || 'не указано' }}</p><p>Звонков: {{ callsText.split('\n').filter(Boolean).length }} · сообщений: {{ messagesText.split('\n').filter(Boolean).length }}</p></div>
                </div>
                <div v-if="selected.missingInvestigation && selected.missingInvestigation.length" class="missing-box"><strong>Осталось подтвердить:</strong> {{ selected.missingInvestigation.join(', ') }}</div>
                <div class="step-actions"><button v-if="investigationStep" class="btn btn--ghost" type="button" @click="investigationStep--">Назад</button><button v-if="investigationStep < 4" class="btn btn--primary" type="button" @click="investigationStep++">Дальше</button><button v-else class="btn btn--primary" :disabled="saving || !selected.assignedToUserId" @click="saveInvestigation">{{ saving ? 'Сохраняем…' : 'Сохранить хронологию' }}</button></div>
              </section>

              <section class="evidence-card">
                <div class="section-title"><div><span>3</span><div><h3>Подтверждения</h3><p>Скриншоты звонков, сообщений, геолокация и Tracking History.</p></div></div></div>
                <div class="evidence-list">
                  <button v-for="item in selected.evidence" :key="item.id" class="evidence-item" type="button" @click="openEvidence(item)"><strong>{{ item.title }}</strong><span>{{ item.type }} · {{ formatDate(item.createdAt) }}</span></button>
                  <span v-if="!selected.evidence.length" class="muted">Подтверждений пока нет</span>
                </div>
                <div class="evidence-add">
                  <input v-model="evidenceTitle" class="input" placeholder="Например: скриншот звонков водителя" />
                  <select v-model="evidenceType" class="input"><option value="document">Документ или скриншот</option><option value="tracking_csv">EasyTaxi Tracking History</option><option value="internal_note">Текстовое подтверждение</option></select>
                  <label class="file-picker"><span>{{ evidenceFile ? evidenceFile.name : 'Выбрать скриншот или файл' }}</span><input ref="evidenceFile" type="file" accept="image/*,.pdf,.csv,.txt" @change="selectEvidenceFile" /></label>
                  <textarea v-model="evidenceText" class="input" placeholder="Или вставьте сюда CSV / текстовое описание."></textarea>
                  <button class="btn btn--ghost" :disabled="(!evidenceTitle && !evidenceFile) || saving || uploading" @click="addEvidence">{{ uploading ? 'Загружаем…' : 'Добавить' }}</button>
                </div>
                <div class="integration-state"><span class="pulse"></span><div><strong>EasyTaxi: ручной сбор данных</strong><p>API Tracking History пока не подключён. Вставьте CSV или заполните время прибытия и отъезда выше.</p></div></div>
              </section>

              <section class="response-card">
                <div class="section-title"><div><span>4</span><div><h3>Ответ заявителю</h3><p>Riderra использует только подтверждённую хронологию и разрешённые правила договора.</p></div></div></div>
                <button v-if="!responseDraft" class="btn btn--primary" :disabled="saving || !selected.assignedToUserId" @click="prepareResponse">Подготовить ответ</button>
                <template v-else>
                  <div class="email-preview"><div><strong>Кому:</strong> {{ selected.complainantEmail || 'email не указан' }}</div><div><strong>Тема:</strong> {{ responseDraft.subject }}</div></div>
                  <textarea v-model="responseText" class="input response-text"></textarea>
                  <div class="approval-row"><div><strong>Проверьте перед отправкой</strong><p>{{ selected.evidence.filter(item => item.objectKey).length ? `К письму будут приложены файлы: ${selected.evidence.filter(item => item.objectKey).length}.` : 'Приложенных файлов нет.' }} Отправка необратима.</p></div><button class="btn btn--primary" :disabled="saving || !selected.complainantEmail" @click="sendResponse">{{ saving ? 'Отправляем…' : responseDraft.deliveryStatus === 'failed' ? 'Повторить отправку' : 'Подтвердить и отправить' }}</button></div>
                </template>
              </section>

              <details class="timeline-card">
                <summary>Вся история и переписка</summary>
                <div class="timeline">
                  <article v-for="entry in timeline" :key="entry.key"><time>{{ formatDate(entry.at) }}</time><div><strong>{{ entry.title }}</strong><p>{{ entry.text }}</p></div></article>
                </div>
              </details>

              <details class="technical-card"><summary>Технические детали</summary><p>ID жалобы: {{ selected.id }}</p><p>Источник: {{ selected.source }}</p><p>Сопоставление: {{ selected.matchReason || 'нет' }} · {{ Math.round((selected.matchConfidence || 0) * 100) }}%</p></details>
            </template>
          </main>
        </div>
      </div>
    </section>

    <div v-if="manualOpen" class="modal" role="dialog" aria-modal="true" aria-label="Создать жалобу" @click.self="manualOpen = false"><form class="modal-card" @submit.prevent="createManual"><h2>Создать жалобу</h2><label><span>ID заказа</span><input v-model="manual.orderId" class="input" /></label><label><span>Кто обратился</span><input v-model="manual.complainantName" class="input" /></label><label><span>Email</span><input v-model="manual.complainantEmail" class="input" type="email" /></label><label><span>Кратко о жалобе</span><textarea v-model="manual.summary" class="input" required></textarea></label><div class="modal-actions"><button class="btn btn--ghost" type="button" @click="manualOpen = false">Отмена</button><button class="btn btn--primary">Создать</button></div></form></div>

    <div v-if="ruleEditorOpen" class="modal" role="dialog" aria-modal="true" aria-label="Правила договора" @click.self="ruleEditorOpen = false"><form class="modal-card" @submit.prevent="saveRule"><h2>Новая версия правил</h2><p class="muted">Перенесите точные условия из договора. Riderra будет сверять с ними хронологию.</p><label><span>Заказчик</span><input v-model="ruleForm.counterpartyName" class="input" required /></label><div class="two-cols"><label><span>Минут ожидания</span><input v-model.number="ruleForm.waitingMinutes" class="input" type="number" min="0" /></label><label><span>Допуск прибытия, мин</span><input v-model.number="ruleForm.arrivalToleranceMin" class="input" type="number" min="0" /></label></div><label><span>Обязательные действия</span><select v-model="ruleForm.requiredActions" class="input" multiple><option value="call_passenger">Позвонить пассажиру</option><option value="message_passenger">Написать пассажиру</option><option value="contact_dispatcher">Связаться с диспетчером</option><option value="location_proof">Подтвердить геолокацию</option></select></label><label><span>Разрешённые формулировки — по одной на строку</span><textarea v-model="approvedText" class="input"></textarea></label><label><span>Договор / файл-основание</span><input v-model="ruleForm.sourceDocumentName" class="input" placeholder="Например: Booking.com SLA 2026.pdf, раздел 4.2" required /></label><label><span>Комментарий</span><textarea v-model="ruleForm.notes" class="input"></textarea></label><div class="modal-actions"><button class="btn btn--ghost" type="button" @click="ruleEditorOpen = false">Отмена</button><button class="btn btn--primary">Опубликовать версию</button></div></form></div>
  </div>
</template>

<script>
import adminTabs from '~/components/partials/adminTabs.vue'

export default {
  layout: 'admin',
  middleware: 'staff',
  components: { adminTabs },
  data: () => ({
    views: [{ value: 'new', label: 'Новые' }, { value: 'working', label: 'В работе' }, { value: 'waiting', label: 'Ждём информацию' }, { value: 'ready', label: 'Ответ готов' }, { value: 'closed', label: 'Закрытые' }],
    view: 'new', search: '', counts: {}, complaints: [], selected: null, loading: true, detailLoading: false, saving: false, uploading: false, error: '', notice: '', matchOrderId: '', evidenceFile: null, investigationStep: 0,
    investigation: { arrivedAt: '', departedAt: '', pickupPoint: '', calls: [], messages: [], dispatcherContact: '', driverExplanation: '', passengerOutcome: '', operatorNotes: '' },
    callsText: '', messagesText: '', evidenceTitle: '', evidenceType: 'document', evidenceText: '', responseDraft: null, responseText: '', rulesOpen: true,
    manualOpen: false, manual: { orderId: '', complainantName: '', complainantEmail: '', summary: '' },
    ruleEditorOpen: false, ruleForm: { counterpartyName: '', waitingMinutes: 60, arrivalToleranceMin: 15, requiredActions: ['call_passenger', 'message_passenger', 'contact_dispatcher'], sourceDocumentName: '', notes: '' }, approvedText: ''
  }),
  computed: {
    nextActionText () {
      if (!this.selected.order) return 'Сначала свяжите жалобу с поездкой.'
      if (!this.selected.assignedToUserId) return 'Возьмите жалобу в работу — после этого можно собирать факты.'
      if (this.selected.missingInvestigation && this.selected.missingInvestigation.length) return `Соберите недостающие факты: ${this.selected.missingInvestigation.join(', ')}.`
      if (!this.responseDraft) return 'Факты собраны. Подготовьте ответ заявителю.'
      return 'Проверьте письмо и подтвердите отправку.'
    },
    investigationCompletion () {
      const values = [this.investigation.arrivedAt, this.investigation.departedAt, this.investigation.pickupPoint, this.investigation.driverExplanation, this.callsText || this.messagesText]
      return Math.round(values.filter(Boolean).length / values.length * 100)
    },
    investigationStepLabel () { return ['Время и место', 'Объяснение водителя', 'Звонки и сообщения', 'Связь с диспетчером и итог', 'Проверка фактов'][this.investigationStep] },
    timeline () {
      if (!this.selected) return []
      const result = []
      ;(this.selected.messages || []).forEach(item => result.push({ key: `m-${item.id}`, at: item.createdAt, title: item.direction === 'inbound' ? `Письмо от ${item.sender || 'заявителя'}` : 'Ответ Riderra', text: item.bodyText }))
      ;(this.selected.activities || []).forEach(item => result.push({ key: `a-${item.id}`, at: item.createdAt, title: item.title, text: item.details || '' }))
      ;(this.selected.order?.chatTasks || []).forEach(task => (task.messages || []).forEach(item => result.push({ key: `c-${item.id}`, at: item.createdAt, title: item.direction === 'inbound' ? 'Сообщение клиента' : 'Сообщение Riderra', text: item.bodyText })))
      ;(this.selected.order?.providerTripEvents || []).forEach(item => result.push({ key: `p-${item.id}`, at: item.occurredAt, title: `EasyTaxi: ${item.eventType}`, text: item.driverName || '' }))
      ;(this.selected.order?.changeLogs || []).forEach(item => result.push({ key: `o-${item.id}`, at: item.createdAt, title: 'Изменение заказа', text: [item.reason, item.actorEmail].filter(Boolean).join(' · ') }))
      ;(this.selected.order?.statusHistory || []).forEach(item => result.push({ key: `s-${item.id}`, at: item.createdAt, title: `Статус заказа: ${item.status}`, text: item.comment || '' }))
      if (this.selected.order?.sourceComment) result.push({ key: 'source-comment', at: this.selected.order.createdAt, title: 'Комментарий из Google Sheets', text: this.selected.order.sourceComment })
      if (this.selected.order?.comment) result.push({ key: 'local-comment', at: this.selected.order.updatedAt, title: 'Внутренний комментарий заказа', text: this.selected.order.comment })
      return result.sort((a, b) => new Date(a.at) - new Date(b.at))
    }
  },
  mounted () { this.view = String(this.$route.query.view || 'new'); if (this.$route.query.createForOrder) { this.manual.orderId = String(this.$route.query.createForOrder); this.manualOpen = true } this.loadAll() },
  methods: {
    token () { return localStorage.getItem('authToken') || '' },
    async api (url, options = {}) { const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token()}`, ...(options.headers || {}) } }); const data = await response.json().catch(() => ({})); if (!response.ok) { const error = new Error(data.error || 'Не удалось выполнить действие'); error.data = data; throw error } return data },
    async loadAll () { await Promise.all([this.loadCounts(), this.loadList()]); const id = this.$route.query.complaintId; if (id) await this.openCase(id) },
    async loadCounts () { try { this.counts = await this.api('/api/admin/complaints/counts') } catch (_) {} },
    async loadList () { this.loading = true; this.error = ''; try { const data = await this.api(`/api/admin/complaints?view=${encodeURIComponent(this.view)}&search=${encodeURIComponent(this.search)}`); this.complaints = data.complaints || [] } catch (error) { this.error = error.message } finally { this.loading = false } },
    async openCase (id) { const changed = !this.selected || this.selected.id !== id; this.detailLoading = true; this.error = ''; try { const data = await this.api(`/api/admin/complaints/${id}`); this.selected = data.complaint; if (changed) this.investigationStep = 0; this.setInvestigation(this.selected.investigation); this.responseDraft = [...(this.selected.messages || [])].reverse().find(item => item.direction === 'outbound' && item.approvalStatus === 'pending_human') || null; this.responseText = this.responseDraft?.bodyText || ''; this.ruleForm.counterpartyName = this.selected.order?.counterpartyName || ''; this.$router.replace({ query: { ...this.$route.query, complaintId: id, view: this.view } }).catch(() => {}) } catch (error) { this.error = error.message } finally { this.detailLoading = false } },
    closeCase () { this.selected = null; const query = { ...this.$route.query }; delete query.complaintId; this.$router.replace({ query }).catch(() => {}) },
    changeView (value) { this.view = value; this.closeCase(); this.loadList() },
    setInvestigation (value = {}) { this.investigation = { arrivedAt: this.localInput(value.arrivedAt), departedAt: this.localInput(value.departedAt), pickupPoint: value.pickupPoint || '', calls: value.calls || [], messages: value.messages || [], dispatcherContact: value.dispatcherContact || '', driverExplanation: value.driverExplanation || '', passengerOutcome: value.passengerOutcome || '', operatorNotes: value.operatorNotes || '' }; this.callsText = this.investigation.calls.join('\n'); this.messagesText = this.investigation.messages.join('\n') },
    localInput (value) { if (!value) return ''; return String(value).slice(0, 16) },
    async mutate (url, body, method = 'POST') { this.saving = true; this.error = ''; try { return await this.api(url, { method, body: JSON.stringify(body || {}) }) } catch (error) { this.error = error.message; throw error } finally { this.saving = false } },
    async takeCase () { try { await this.mutate(`/api/admin/complaints/${this.selected.id}/take`); await this.openCase(this.selected.id); await this.loadList() } catch (_) {} },
    async changeStatus (status, isEscalated = this.selected.isEscalated) { try { await this.mutate(`/api/admin/complaints/${this.selected.id}`, { status, isEscalated }, 'PATCH'); await this.openCase(this.selected.id); await this.loadAll() } catch (_) {} },
    async matchOrder () { try { await this.mutate(`/api/admin/complaints/${this.selected.id}/match`, { orderId: this.matchOrderId }); await this.openCase(this.selected.id) } catch (_) {} },
    async saveInvestigation () { try { const payload = { ...this.investigation, calls: this.callsText.split('\n').map(x => x.trim()).filter(Boolean), messages: this.messagesText.split('\n').map(x => x.trim()).filter(Boolean) }; const data = await this.mutate(`/api/admin/complaints/${this.selected.id}/investigation`, payload); this.notice = data.missing.length ? `Сохранено. Осталось: ${data.missing.join(', ')}` : 'Хронология сохранена — можно готовить ответ.'; await this.openCase(this.selected.id) } catch (_) {} },
    selectEvidenceFile (event) { this.evidenceFile = event.target.files && event.target.files[0] || null; if (this.evidenceFile && !this.evidenceTitle) this.evidenceTitle = this.evidenceFile.name },
    async addEvidence () { if (this.evidenceFile) return this.uploadEvidence(); try { await this.mutate(`/api/admin/complaints/${this.selected.id}/evidence`, { title: this.evidenceTitle, type: this.evidenceType, contentText: this.evidenceText }); this.evidenceTitle = ''; this.evidenceText = ''; await this.openCase(this.selected.id) } catch (_) {} },
    async uploadEvidence () { this.uploading = true; this.error = ''; try { const response = await fetch(`/api/admin/complaints/${this.selected.id}/evidence/upload`, { method: 'POST', headers: { Authorization: `Bearer ${this.token()}`, 'Content-Type': this.evidenceFile.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(this.evidenceFile.name), 'X-Evidence-Title': encodeURIComponent(this.evidenceTitle || this.evidenceFile.name), 'X-Evidence-Type': this.evidenceType }, body: this.evidenceFile }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Не удалось загрузить файл'); this.evidenceFile = null; this.evidenceTitle = ''; if (this.$refs.evidenceFile) this.$refs.evidenceFile.value = ''; this.notice = 'Файл сохранён и будет приложен к ответу.'; await this.openCase(this.selected.id) } catch (error) { this.error = error.message } finally { this.uploading = false } },
    async openEvidence (item) { if (item.contentText) { this.notice = item.contentText.slice(0, 500); return } try { const data = await this.api(`/api/admin/complaints/${this.selected.id}/evidence/${item.id}/url`, { method: 'POST' }); window.open(data.url, '_blank', 'noopener') } catch (error) { this.error = error.message } },
    async prepareResponse () { try { const data = await this.mutate(`/api/admin/complaints/${this.selected.id}/response/prepare`); this.responseDraft = data.message; this.responseText = data.message.bodyText; await this.openCase(this.selected.id) } catch (error) { if (error.data?.missing) this.notice = `Сначала заполните: ${error.data.missing.join(', ')}` } },
    async sendResponse () { if (!window.confirm('Отправить это письмо заявителю?')) return; try { await this.mutate(`/api/admin/complaints/${this.selected.id}/response/send`, { messageId: this.responseDraft.id, bodyText: this.responseText }); this.notice = 'Ответ отправлен и сохранён в истории.'; await this.openCase(this.selected.id); await this.loadAll() } catch (_) {} },
    async createManual () { try { const data = await this.mutate('/api/admin/complaints', this.manual); this.manualOpen = false; this.manual = { orderId: '', complainantName: '', complainantEmail: '', summary: '' }; this.view = 'new'; await this.loadList(); await this.openCase(data.complaint.id) } catch (_) {} },
    async saveRule () { try { await this.mutate('/api/admin/complaint-rules', { ...this.ruleForm, approvedStatements: this.approvedText.split('\n').map(x => x.trim()).filter(Boolean) }); this.ruleEditorOpen = false; this.notice = 'Новая версия правил опубликована.'; await this.openCase(this.selected.id) } catch (_) {} },
    orderLabel (order) { return order ? (order.sourceOrderNumber || order.sourceBookingId || order.sourceInternalOrderNumber || order.id) : 'Поездка не определена' },
    tripLabel (order) { return order ? `${this.formatDate(order.pickupAt)} · ${order.fromPoint} → ${order.toPoint}` : '—' },
    ownerLabel (item) { return item.assignedToUser?.email || 'без ответственного' },
    isOverdue (item) { return !item.firstRespondedAt && item.status !== 'closed' && new Date(item.firstResponseDueAt) < new Date() },
    relativeDue (item) { if (item.firstRespondedAt) return 'первый ответ отправлен'; const minutes = Math.round((new Date(item.firstResponseDueAt) - new Date()) / 60000); if (minutes < 0) return `просрочено на ${Math.abs(minutes)} мин`; if (minutes < 60) return `осталось ${minutes} мин`; return `осталось ${Math.ceil(minutes / 60)} ч` },
    formatDate (value) { if (!value) return '—'; return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(value)) },
    severityLabel (value) { return ({ low: 'Низкая', normal: 'Обычная', high: 'Высокая', critical: 'Критическая' })[value] || value },
    statusLabel (value) { return ({ new: 'Новая', needs_match: 'Нужно сопоставить', investigating: 'Расследование', waiting_info: 'Ждём информацию', response_ready: 'Ответ готов', response_sent: 'Ответ отправлен', closed: 'Закрыта' })[value] || value },
    ruleActionLabel (value) { return ({ call_passenger: 'Позвонить пассажиру', message_passenger: 'Написать пассажиру', contact_dispatcher: 'Связаться с диспетчером', location_proof: 'Подтвердить геолокацию' })[value] || value }
  }
}
</script>

<style scoped>
.complaints-page{color:var(--staff-ink)}.page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin:28px 0 18px}.eyebrow{margin:0 0 4px;color:var(--staff-accent);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.page-head h1{margin:0;font-size:32px}.page-head p{margin:6px 0 0;color:var(--staff-muted)}.summary-strip{display:flex;gap:10px;margin-bottom:14px}.summary-strip div{display:flex;align-items:baseline;gap:7px;border:1px solid var(--staff-line);border-radius:12px;background:#fff;padding:10px 14px}.summary-strip strong{font-size:22px}.summary-strip span{color:var(--staff-muted);font-size:12px}.summary-strip .danger strong{color:var(--staff-danger)}.view-tabs{display:flex;gap:4px;border:1px solid var(--staff-line);border-radius:12px;background:var(--staff-soft);padding:4px}.view-tabs button{border:0;border-radius:8px;background:transparent;padding:10px 14px;color:var(--staff-muted);font-weight:700;cursor:pointer}.view-tabs button.active{background:#fff;color:var(--staff-ink);box-shadow:0 1px 3px rgba(23,35,61,.08)}.filters{display:grid;grid-template-columns:1fr auto;gap:8px;margin:12px 0}.input{width:100%;border:1px solid var(--staff-line);border-radius:9px;background:#fff;padding:10px 12px;color:var(--staff-ink)}textarea.input{min-height:82px;resize:vertical}.workspace{display:grid;grid-template-columns:340px minmax(0,1fr);min-height:680px;border:1px solid var(--staff-line);border-radius:15px;background:#fff;overflow:hidden}.case-list{border-right:1px solid var(--staff-line);background:#fafbfc}.case-row{display:grid;width:100%;gap:6px;border:0;border-bottom:1px solid var(--staff-line);background:transparent;padding:15px;text-align:left;cursor:pointer}.case-row:hover,.case-row.active{background:#eef3fb}.case-row.overdue{border-left:3px solid var(--staff-danger)}.case-row__top{display:flex;justify-content:space-between;gap:8px}.case-row time,.case-row span,.case-row small{color:var(--staff-muted);font-size:12px}.severity,.status{display:inline-flex;width:max-content;border-radius:99px;background:#eef2f7;padding:4px 8px;color:#43506a;font-size:11px;font-weight:800}.severity--high{background:#fff1dc;color:#925209}.severity--critical{background:#fee9e7;color:var(--staff-danger)}.case-detail{padding:18px;overflow:hidden}.empty-state{display:grid;place-items:center;align-content:center;min-height:300px;padding:30px;text-align:center;color:var(--staff-muted)}.empty-state p{margin:5px 0}.spinner{width:24px;height:24px;margin-bottom:10px;border:3px solid #d9e1ed;border-top-color:var(--staff-accent);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.case-hero{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid var(--staff-line);padding-bottom:16px}.case-hero h2{margin:8px 0 4px;font-size:23px}.case-hero p{margin:0;color:var(--staff-muted)}.case-hero__meta,.case-actions{display:flex;align-items:center;flex-wrap:wrap;gap:7px;font-size:12px}.case-actions{justify-content:flex-end}.overdue{color:var(--staff-danger)!important}.order-context{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0;border:1px solid var(--staff-line);border-radius:12px;padding:13px}.order-context div{display:grid;gap:3px}.order-context span{color:var(--staff-muted);font-size:11px}.order-context strong{font-size:13px}.order-link{grid-column:1/-1;color:var(--staff-accent);font-size:12px;font-weight:700;text-decoration:none}.contract-card,.investigation-card,.evidence-card,.response-card,.timeline-card,.technical-card,.action-card{margin-top:12px;border:1px solid var(--staff-line);border-radius:12px;padding:14px}.action-card p{margin:4px 0;color:var(--staff-muted)}.match-candidates{display:grid;gap:7px;margin:10px 0}.match-candidates button{display:grid;gap:3px;border:1px solid var(--staff-line);border-radius:9px;background:#fff;padding:10px;text-align:left;cursor:pointer}.match-candidates span,.match-candidates small{color:var(--staff-muted);font-size:12px}.section-title,.section-title>div{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.section-title>div>span{display:grid;flex:0 0 26px;width:26px;height:26px;place-items:center;border-radius:50%;background:var(--staff-accent);color:#fff;font-size:12px;font-weight:800}.section-title h3{margin:1px 0 2px;font-size:17px}.section-title p{margin:0;color:var(--staff-muted);font-size:12px}.text-button{border:0;background:transparent;color:var(--staff-accent);font-weight:700;cursor:pointer}.contract-summary{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:12px;border-radius:9px;background:#f3f6fa;padding:11px;font-size:12px}.rule-details{display:grid;gap:10px;margin-top:12px}.rule-details ul{margin:6px 0;padding-left:19px}.missing-box{margin-top:10px;border-radius:9px;background:#fff7e8;padding:10px;color:#76511c;font-size:12px}.investigation-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}.investigation-grid label,.modal-card label{display:grid;gap:5px}.investigation-grid label>span,.modal-card label>span{font-size:12px;font-weight:700}.investigation-grid .wide{grid-column:1/-1}.completion{border-radius:99px;background:#e6f7ed;padding:5px 9px;color:#207349;font-size:11px;font-weight:800}.evidence-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;margin:14px 0}.evidence-item{display:grid;gap:4px;border:1px solid var(--staff-line);border-radius:9px;background:#fff;padding:10px;text-align:left}.evidence-item span,.muted{color:var(--staff-muted);font-size:11px}.evidence-add{display:grid;grid-template-columns:1fr 220px auto;gap:8px}.evidence-add textarea{grid-column:1/-1}.file-picker{display:flex;grid-column:1/-1;align-items:center;justify-content:center;min-height:52px;border:1px dashed var(--staff-line);border-radius:9px;background:#fafbfc;color:var(--staff-accent);font-size:13px;font-weight:800;cursor:pointer}.file-picker input{position:absolute;width:1px;height:1px;opacity:0}.integration-state{display:flex;gap:10px;margin-top:12px;border-radius:9px;background:#f3f6fa;padding:10px}.integration-state p{margin:2px 0;color:var(--staff-muted);font-size:12px}.pulse{width:9px;height:9px;margin-top:5px;border-radius:50%;background:#d38a29}.email-preview{display:grid;gap:5px;margin:14px 0;border-radius:9px;background:#f3f6fa;padding:10px;font-size:12px}.response-text{min-height:290px!important;font-family:inherit;line-height:1.5}.approval-row{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-top:10px}.approval-row p{margin:2px 0;color:var(--staff-muted);font-size:12px}.timeline-card summary,.technical-card summary{cursor:pointer;font-weight:800}.timeline{display:grid;margin-top:12px}.timeline article{display:grid;grid-template-columns:130px 1fr;gap:12px;border-top:1px solid var(--staff-line);padding:10px 0}.timeline time{color:var(--staff-muted);font-size:11px}.timeline p{margin:4px 0;white-space:pre-wrap}.notice{margin:10px 0;border-radius:9px;background:#e9f2ff;padding:10px;color:#23436d}.notice--error{background:#fee9e7;color:var(--staff-danger)}.btn{border:1px solid var(--staff-line);border-radius:9px;padding:10px 14px;font-weight:800;cursor:pointer}.btn--primary{border-color:var(--staff-accent);background:var(--staff-accent);color:#fff}.btn--ghost{background:#fff;color:var(--staff-ink)}.btn:disabled{cursor:not-allowed;opacity:.5}.modal{position:fixed;z-index:1100;inset:0;display:grid;place-items:center;background:rgba(18,29,50,.46);padding:20px}.modal-card{display:grid;width:min(560px,100%);max-height:90vh;gap:12px;overflow:auto;border-radius:14px;background:#fff;padding:20px}.modal-card h2{margin:0}.modal-actions{display:flex;justify-content:flex-end;gap:8px}.two-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mobile-back{display:none}
@media(max-width:900px){.workspace{grid-template-columns:290px minmax(0,1fr)}.order-context{grid-template-columns:1fr 1fr}.evidence-add{grid-template-columns:1fr}.evidence-add textarea{grid-column:auto}}
@media(max-width:700px){.page-head{align-items:flex-start;flex-direction:column}.summary-strip{overflow:auto}.view-tabs{overflow:auto}.workspace{display:block;min-height:560px}.case-list{border-right:0}.case-list--hidden-mobile{display:none}.case-detail{display:none;padding:12px}.case-detail--visible-mobile{display:block}.mobile-back{display:block;margin-bottom:10px;border:0;background:transparent;color:var(--staff-accent);font-weight:700}.case-hero,.approval-row{align-items:flex-start;flex-direction:column}.order-context,.investigation-grid,.two-cols{grid-template-columns:1fr}.investigation-grid .wide{grid-column:auto}.timeline article{grid-template-columns:1fr}.filters{grid-template-columns:1fr auto}}
@media(prefers-reduced-motion:reduce){.spinner{animation:none}}
.step-actions{display:flex;justify-content:flex-end;gap:8px}.review-facts{border-radius:9px;background:#f3f6fa;padding:12px}.review-facts p{margin:5px 0;color:var(--staff-muted)}
</style>
