<template>
  <section class="inbox" aria-label="Входящие обращения клиентов">
    <header class="inbox__head">
      <div>
        <h1>Чаты</h1>
        <p>Отвечайте на входящие сообщения или начните новый WhatsApp-диалог</p>
      </div>
      <div class="inbox__head-actions">
        <button class="secondary" type="button" @click="$emit('open-order-chats')">Диалоги по заказам</button>
        <button class="primary" type="button" @click="toggleStartConversation">Начать WhatsApp-диалог</button>
        <button class="secondary" type="button" :disabled="loading" @click="loadAll">Обновить</button>
      </div>
    </header>

    <form v-if="showStartConversation" class="start-conversation" @submit.prevent="startConversation">
      <div class="start-conversation__head">
        <div><h2>Новое сообщение клиенту</h2><p>Укажите получателя, выберите утверждённый шаблон и отправьте его одним действием.</p></div>
        <button class="start-conversation__close" type="button" aria-label="Закрыть форму" @click="closeStartConversation">×</button>
      </div>
      <div class="start-conversation__grid">
        <label><span><b>1</b> Номер WhatsApp</span><input v-model.trim="startPhone" inputmode="tel" placeholder="+35799128950" required></label>
        <label><span>Имя клиента <small>необязательно</small></span><input v-model.trim="startName" placeholder="Например, John Smith"></label>
        <label><span><b>2</b> Первое сообщение</span><select v-model="startTemplateName" @change="resetStartTemplateVariables"><option value="">Выберите утверждённый шаблон</option><option v-for="template in whatsappTemplates" :key="template.name" :value="template.name">{{ template.label }}</option></select></label>
      </div>
      <div v-if="!whatsappTemplates.length" class="window-notice" role="status">
        <strong>Нет доступных шаблонов</strong>
        <span>Добавьте утверждённый Meta-шаблон в настройках WhatsApp — без него начать диалог нельзя.</span>
      </div>
      <div v-if="startSelectedTemplate" class="template-preview">
        <strong>Будет отправлен шаблон «{{ startSelectedTemplate.label }}»</strong>
        <span>{{ startSelectedTemplate.description || 'Утверждённый шаблон WhatsApp' }}</span>
        <code>Язык: {{ startTemplateLanguage }} · Meta: {{ startSelectedTemplate.name }}</code>
      </div>
      <div v-if="startSelectedTemplate && startSelectedTemplate.variables.length" class="template-variables">
        <label v-for="variable in startSelectedTemplate.variables" :key="variable"><span>{{ templateVariableLabel(variable) }}</span><input v-model.trim="startTemplateVariables[variable]" :placeholder="templateVariablePlaceholder(variable)"></label>
      </div>
      <div class="start-conversation__submit">
        <small><b>3</b> Сообщение уйдёт на {{ normalizedStartPhone || 'указанный номер' }}. После отправки диалог откроется во вкладке «В работе».</small>
        <button type="submit" :disabled="busy || !canStartConversation">{{ busy ? 'Отправляем в WhatsApp…' : 'Отправить и начать диалог' }}</button>
      </div>
    </form>

    <nav class="views" aria-label="Разделы чатов">
      <button v-for="item in views" :key="item.key" type="button" :class="{ active: view === item.key }" @click="changeView(item.key)">
        {{ item.label }} <span v-if="item.key === 'new' && unread">{{ unread }}</span>
      </button>
    </nav>

    <div v-if="banner" class="banner" :class="`banner--${banner.kind}`" role="status">
      <span>{{ banner.text }}</span>
      <button v-if="banner.retry" type="button" @click="loadAll">Повторить</button>
    </div>

    <div class="toolbar">
      <input v-model.trim="search" type="search" placeholder="Найти по имени или номеру" aria-label="Поиск обращений" @input="scheduleLoad">
      <select v-model="assignee" aria-label="Ответственный" @change="loadList">
        <option value="">Все ответственные</option>
        <option value="me">Мои</option>
        <option value="unassigned">Без ответственного</option>
        <option v-for="person in staff" :key="person.id" :value="person.id">{{ person.email }}</option>
      </select>
    </div>

    <div class="workspace" :class="{ 'workspace--dialog': selected }">
      <aside class="list" aria-label="Список обращений">
        <div v-if="loading && !rows.length" class="state"><span class="spinner"></span>Загружаем обращения…</div>
        <div v-else-if="!rows.length" class="state state--empty">
          <strong>{{ emptyTitle }}</strong>
          <span>{{ emptyText }}</span>
          <button v-if="view === 'work'" class="state__action" type="button" @click="$emit('open-order-chats')">Открыть диалоги по заказам</button>
        </div>
        <button v-for="row in rows" :key="row.id" type="button" class="conversation" :class="{ active: selected && selected.id === row.id, unread: row.unreadCount > 0 }" @click="open(row.id)">
          <div class="conversation__top">
            <strong>{{ customerLabel(row) }}</strong>
            <time>{{ shortTime(row.lastMessageAt || row.updatedAt) }}</time>
          </div>
          <p>{{ row.lastMessage ? row.lastMessage.bodyText : 'Сообщений пока нет' }}</p>
          <div class="conversation__meta">
            <span>WhatsApp</span>
            <span>{{ statusLabel(row) }}</span>
            <span>{{ ownerLabel(row) }}</span>
            <b v-if="row.unreadCount">{{ row.unreadCount }}</b>
          </div>
          <small v-if="row.order">Заказ {{ orderNumber(row.order) }}</small>
        </button>
      </aside>

      <main class="dialog" aria-live="polite">
        <div v-if="detailLoading" class="state"><span class="spinner"></span>Открываем диалог…</div>
        <div v-else-if="!selected" class="state state--empty">
          <strong>Выберите обращение</strong>
          <span>Здесь появится история и следующее действие.</span>
        </div>
        <template v-else>
          <header class="dialog__head">
            <button class="back" type="button" aria-label="Вернуться к списку" @click="selected = null">←</button>
            <div>
              <h2>{{ customerLabel(selected) }}</h2>
              <p>WhatsApp · {{ selected.customerActorId }}</p>
            </div>
            <span class="status">{{ statusLabel(selected) }}</span>
          </header>

          <section class="customer-panel">
            <div><span>Ответственный</span><strong>{{ ownerLabel(selected) }}</strong></div>
            <select :value="selected.assignedToUserId || ''" aria-label="Назначить ответственного" @change="assign($event.target.value)">
              <option value="">Не назначен</option>
              <option v-for="person in staff" :key="person.id" :value="person.id">{{ person.email }}</option>
            </select>
            <div v-if="selected.order" class="linked-order">Связано с заказом {{ orderNumber(selected.order) }}</div>
          </section>

          <div class="messages" ref="messages">
            <article v-for="message in selected.messages" :key="message.id" class="message" :class="`message--${message.direction}`">
              <p>{{ message.bodyText }}</p>
              <footer>
                <time>{{ messageTime(message.createdAt) }}</time>
                <span v-if="message.direction === 'outbound'">{{ deliveryLabel(message) }}</span>
              </footer>
              <div v-if="message.deliveryProblem" class="send-error">
                <strong>{{ message.deliveryProblem.title }}</strong>
                <span>{{ message.deliveryProblem.action }}</span>
                <button type="button" :disabled="busy" @click="retryMessage(message)">Повторить отправку</button>
              </div>
              <div v-if="message.direction === 'outbound' && message.approvalStatus === 'pending_human'" class="approval">
                <template v-if="freeTextAllowed">
                  <span>Проверьте точный текст перед отправкой</span>
                  <button type="button" :disabled="busy" @click="approveAndSend(message)">{{ busy ? 'Отправляем…' : 'Одобрить и отправить' }}</button>
                </template>
                <template v-else>
                  <span>Обычный текст уже нельзя отправить: 24-часовое окно закрыто.</span>
                  <button type="button" :disabled="busy || selected.state === 'spam'" @click="openTemplateComposer">Выбрать шаблон ниже</button>
                </template>
              </div>
            </article>
          </div>

          <div v-if="selected.state === 'new'" class="primary-action">
            <div><strong>Новое обращение</strong><span>Возьмите его в работу, чтобы команда видела ответственного.</span></div>
            <button type="button" :disabled="busy" @click="take">Взять в работу</button>
          </div>

          <form ref="composer" class="composer" @submit.prevent="sendReplyNow">
            <div class="composer-mode" role="group" aria-label="Способ отправки">
              <button type="button" :class="{ active: replyMode === 'text' }" :disabled="!freeTextAllowed" @click="replyMode = 'text'">Обычное сообщение</button>
              <button type="button" :class="{ active: replyMode === 'template' }" @click="selectTemplateMode">Шаблон WhatsApp</button>
            </div>

            <div v-if="!freeTextAllowed" class="window-notice" role="status">
              <strong>24-часовое окно закрыто</strong>
              <span>WhatsApp разрешает отправить только утверждённый шаблон.</span>
            </div>

            <template v-if="replyMode === 'template'">
              <label class="composer-field">
                <span>Шаблон сообщения</span>
                <select v-model="templateName" :disabled="selected.state === 'spam'" @change="resetTemplateVariables">
                  <option value="">Выберите утверждённый шаблон</option>
                  <option v-for="template in whatsappTemplates" :key="template.name" :value="template.name">{{ template.label }}</option>
                </select>
              </label>
              <div v-if="selectedTemplate" class="template-preview">
                <strong>{{ selectedTemplate.label }}</strong>
                <span>{{ selectedTemplate.description || 'Утверждённый шаблон WhatsApp' }}</span>
                <code>{{ selectedTemplate.name }} · {{ templateLanguage }}</code>
              </div>
              <div v-if="selectedTemplate && selectedTemplate.variables.length" class="template-variables">
                <label v-for="variable in selectedTemplate.variables" :key="variable">
                  <span>{{ templateVariableLabel(variable) }}</span>
                  <input v-model.trim="templateVariables[variable]" :placeholder="templateVariablePlaceholder(variable)" :disabled="selected.state === 'spam'">
                </label>
              </div>
            </template>
            <textarea v-else v-model="replyText" :disabled="selected.state === 'spam' || !freeTextAllowed" rows="3" placeholder="Напишите ответ клиенту" aria-label="Ответ клиенту"></textarea>

            <div class="composer-submit">
              <small>{{ replyMode === 'template' ? 'Будет отправлен выбранный approved template.' : 'Сообщение отправится сразу после нажатия.' }}</small>
              <button type="submit" :disabled="busy || !canSendReply">{{ busy ? 'Отправляем…' : (replyMode === 'template' ? 'Отправить шаблон' : 'Отправить сообщение') }}</button>
            </div>
          </form>

          <section class="actions">
            <button v-if="!selected.order" type="button" @click="showLink = !showLink">Связать с заказом</button>
            <button v-if="!selected.order" type="button" @click="showCreate = !showCreate">Создать заказ</button>
            <button type="button" @click="setStatus('closed')">Закрыть</button>
            <button class="danger" type="button" @click="setStatus('spam')">Спам</button>
          </section>

          <section v-if="showLink && !selected.order" class="action-panel">
            <h3>Связать с существующим заказом</h3>
            <input v-model.trim="orderSearch" placeholder="Номер заказа, имя или телефон" @input="scheduleOrderSearch">
            <button v-for="order in orderResults" :key="order.id" type="button" class="order-result" @click="linkOrder(order.id)">
              <strong>{{ orderNumber(order) }}</strong><span>{{ formatDate(order.pickupAt) }} · {{ order.fromPoint }} → {{ order.toPoint }}</span>
            </button>
            <p v-if="orderSearch.length >= 2 && !orderResults.length">Совпадений не найдено.</p>
          </section>

          <form v-if="showCreate && !selected.order" class="action-panel create-order" @submit.prevent="createOrder">
            <h3>Создать черновик заказа</h3>
            <p>После создания добавьте заказ в Google Sheet — таблица остаётся источником истины.</p>
            <label>Место подачи<input v-model.trim="newOrder.fromPoint" required></label>
            <label>Куда<input v-model.trim="newOrder.toPoint" required></label>
            <label>Дата и время<input v-model="newOrder.pickupAt" type="datetime-local"></label>
            <label>Тип автомобиля<input v-model.trim="newOrder.vehicleType"></label>
            <button type="submit" :disabled="busy">Создать и связать</button>
          </form>
        </template>
      </main>
    </div>
  </section>
</template>

<script>
export default {
  data: () => ({
    views: [
      { key: 'new', label: 'Новые обращения' },
      { key: 'work', label: 'В работе' },
      { key: 'linked', label: 'Связаны с заказами' },
      { key: 'closed', label: 'Закрытые' }
    ],
    view: 'new', unread: 0, rows: [], staff: [], selected: null,
    loading: true, detailLoading: false, busy: false, search: '', assignee: '', replyText: '', replyMode: 'text',
    whatsappTemplates: [], templateName: '', templateVariables: {}, composerInquiryId: '',
    showStartConversation: false, startPhone: '', startName: '', startTemplateName: '', startTemplateVariables: {}, startAttemptKey: '',
    banner: null, timer: null, searchTimer: null, orderTimer: null, pollTimer: null,
    showLink: false, showCreate: false, orderSearch: '', orderResults: [],
    newOrder: { fromPoint: '', toPoint: '', pickupAt: '', vehicleType: 'standard' }
  }),
  computed: {
    emptyTitle () { return this.view === 'new' ? 'Новых обращений нет' : 'В этом разделе пока пусто' },
    emptyText () {
      if (this.view === 'new') return 'Когда новый клиент напишет в WhatsApp, обращение появится здесь.'
      if (this.view === 'work') return 'Здесь находятся только обращения без заказа. Переписка по поездкам доступна в «Диалогах по заказам».'
      return 'Попробуйте другой раздел или фильтр.'
    },
    freeTextAllowed () { return this.selected?.replyPolicy?.freeTextAllowed === true },
    selectedTemplate () { return this.whatsappTemplates.find(template => template.name === this.templateName) || null },
    templateLanguage () { return this.selectedTemplate?.language || this.selectedTemplate?.languages?.[0] || 'en' },
    startSelectedTemplate () { return this.whatsappTemplates.find(template => template.name === this.startTemplateName) || null },
    startTemplateLanguage () { return this.startSelectedTemplate?.language || this.startSelectedTemplate?.languages?.[0] || 'en' },
    normalizedStartPhone () { return this.startPhone.replace(/[\s()-]/g, '') },
    templateVariablesComplete () {
      if (!this.selectedTemplate) return false
      return (this.selectedTemplate.variables || []).every(variable => String(this.templateVariables[variable] || '').trim())
    },
    canSendReply () {
      if (!this.selected || this.selected.state === 'spam') return false
      return this.replyMode === 'template' ? this.templateVariablesComplete : (this.freeTextAllowed && Boolean(this.replyText.trim()))
    },
    canStartConversation () {
      if (!/^\+[1-9]\d{9,14}$/.test(this.startPhone.replace(/[\s()-]/g, '')) || !this.startSelectedTemplate) return false
      return (this.startSelectedTemplate.variables || []).every(variable => String(this.startTemplateVariables[variable] || '').trim())
    }
  },
  mounted () {
    this.initialize()
    this.pollTimer = setInterval(() => this.refreshSilently(), 15000)
  },
  beforeDestroy () {
    clearTimeout(this.searchTimer); clearTimeout(this.orderTimer); clearInterval(this.pollTimer)
  },
  methods: {
    headers (fixedKey = '') {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json', 'Idempotency-Key': fixedKey || `inquiry-ui-${Date.now()}-${Math.random().toString(36).slice(2)}` }
    },
    async request (url, options = {}) {
      const response = await fetch(url, { ...options, headers: { ...this.headers(options.fixedKey), ...(options.headers || {}) } })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Не удалось выполнить действие')
      return data
    },
    async initialize () {
      try {
        const [count, staff, templateRegistry] = await Promise.all([
          this.request('/api/admin/chats/inquiries/unread-count'),
          this.request('/api/admin/chats/inquiries/staff'),
          this.request('/api/admin/chats/whatsapp-templates')
        ])
        this.unread = count.unread || 0; this.staff = staff.rows || []; this.whatsappTemplates = templateRegistry.templates || []
        const requested = String(this.$route.query.inquiry || '')
        this.view = this.$route.query.chatView || (this.unread ? 'new' : 'work')
        await this.loadList()
        if (requested) await this.open(requested)
      } catch (error) { this.showError(error) } finally { this.loading = false }
    },
    async loadAll () { this.loading = true; this.banner = null; try { await Promise.all([this.loadCount(), this.loadList()]); if (this.selected) await this.open(this.selected.id) } catch (error) { this.showError(error) } finally { this.loading = false } },
    async refreshSilently () { try { await Promise.all([this.loadCount(), this.loadList(false)]); if (this.selected) await this.open(this.selected.id, false) } catch (_) { this.banner = { kind: 'warning', text: 'Связь прервана. Новые сообщения появятся после восстановления.', retry: true } } },
    async loadCount () { const data = await this.request('/api/admin/chats/inquiries/unread-count'); this.unread = data.unread || 0; window.dispatchEvent(new CustomEvent('riderra:inquiry-unread', { detail: { unread: this.unread } })) },
    async loadList (showLoading = true) {
      if (showLoading) this.loading = true
      try {
        const query = new URLSearchParams({ view: this.view }); if (this.search) query.set('search', this.search); if (this.assignee) query.set('assignee', this.assignee)
        const data = await this.request(`/api/admin/chats/inquiries?${query}`); this.rows = data.rows || []
      } finally { if (showLoading) this.loading = false }
    },
    async changeView (view) { this.view = view; this.selected = null; this.showLink = false; this.showCreate = false; await this.$router.replace({ query: { ...this.$route.query, chatView: view, inquiry: undefined } }); await this.loadList() },
    scheduleLoad () { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.loadList(), 300) },
    async open (id, showLoading = true) {
      if (showLoading) this.detailLoading = true
      try {
        const data = await this.request(`/api/admin/chats/inquiries/${id}`); this.selected = data.inquiry
        this.syncReplyMode()
        await this.request(`/api/admin/chats/inquiries/${id}/read`, { method: 'POST', body: '{}' })
        this.unread = Math.max(0, this.unread - Number(this.selected.unreadCount || 0)); this.selected.unreadCount = 0; window.dispatchEvent(new CustomEvent('riderra:inquiry-unread', { detail: { unread: this.unread } }))
        await this.$router.replace({ query: { ...this.$route.query, chatView: this.view, inquiry: id } }).catch(() => {})
        this.$nextTick(() => { if (this.$refs.messages) this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight })
      } catch (error) { this.showError(error) } finally { this.detailLoading = false }
    },
    async take () { const id = this.selected.id; await this.update({ take: true }, 'Обращение назначено вам'); this.view = 'work'; await this.$router.replace({ query: { ...this.$route.query, chatView: 'work', inquiry: id } }).catch(() => {}); await this.loadList(false); await this.open(id, false) },
    async assign (assignedToUserId) { await this.update({ assignedToUserId }, 'Ответственный обновлён') },
    async setStatus (status) { await this.update({ status }, status === 'spam' ? 'Обращение отмечено как спам' : 'Обращение закрыто'); this.selected = null; await this.loadList() },
    async update (body, success) { this.busy = true; try { await this.request(`/api/admin/chats/inquiries/${this.selected.id}`, { method: 'PATCH', body: JSON.stringify(body) }); this.banner = { kind: 'success', text: success }; await this.open(this.selected.id); await this.loadList(false) } catch (error) { this.showError(error) } finally { this.busy = false } },
    toggleStartConversation () {
      if (this.showStartConversation) return this.closeStartConversation()
      this.openStartConversation()
    },
    openStartConversation () {
      this.showStartConversation = true
      this.startAttemptKey = `inquiry-start-${Date.now()}-${Math.random().toString(36).slice(2)}`
      if (!this.startTemplateName && this.whatsappTemplates.length) this.startTemplateName = this.whatsappTemplates[0].name
      this.$nextTick(() => this.$el.querySelector('.start-conversation input')?.focus())
    },
    closeStartConversation () {
      this.showStartConversation = false
      this.startAttemptKey = ''
    },
    resetStartTemplateVariables () { this.startTemplateVariables = {} },
    async startConversation () {
      if (!this.canStartConversation || this.busy) return
      this.busy = true; this.banner = null
      const phone = this.normalizedStartPhone
      const delivery = { mode: 'template', templateName: this.startSelectedTemplate.name, language: this.startTemplateLanguage, variables: { ...this.startTemplateVariables } }
      try {
        const created = await this.request('/api/admin/chats/inquiries/start', {
          method: 'POST',
          fixedKey: this.startAttemptKey || `inquiry-start-${phone}-${this.startSelectedTemplate.name}`,
          body: JSON.stringify({ phone, customerDisplayName: this.startName, delivery })
        })
        const sent = await this.request(`/api/admin/chats/messages/${created.message.id}/send`, {
          method: 'POST',
          fixedKey: `inquiry-send-${created.message.id}`,
          body: JSON.stringify({ delivery })
        })
        this.banner = { kind: 'success', text: sent.alreadySent ? 'Шаблон уже был отправлен. Дубль не создан.' : 'WhatsApp принял шаблон. Теперь ждём ответа клиента.' }
        this.showStartConversation = false
        this.startPhone = ''; this.startName = ''; this.startTemplateVariables = {}; this.startAttemptKey = ''
        this.view = 'work'
        await this.$router.replace({ query: { ...this.$route.query, chatView: 'work', inquiry: created.task.id } }).catch(() => {})
        await this.loadList(false)
        await this.open(created.task.id, false)
      } catch (error) {
        this.showError(error)
      } finally {
        this.busy = false
      }
    },
    syncReplyMode () {
      const inquiryChanged = this.composerInquiryId !== this.selected?.id
      if (inquiryChanged) {
        this.composerInquiryId = this.selected?.id || ''
        this.replyText = ''
        this.templateVariables = {}
        this.replyMode = this.freeTextAllowed ? 'text' : 'template'
      }
      if (!this.freeTextAllowed) this.selectTemplateMode()
    },
    selectTemplateMode () {
      this.replyMode = 'template'
      if (!this.templateName && this.whatsappTemplates.length) this.templateName = this.whatsappTemplates[0].name
      this.prefillTemplateVariables()
    },
    openTemplateComposer () {
      this.selectTemplateMode()
      this.$nextTick(() => this.$refs.composer?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
    },
    resetTemplateVariables () {
      this.templateVariables = {}
      this.prefillTemplateVariables()
    },
    prefillTemplateVariables () {
      if (!this.selectedTemplate) return
      const values = { ...this.templateVariables }
      const pickupAt = this.selected?.order?.pickupAt
      for (const variable of this.selectedTemplate.variables || []) {
        if (values[variable]) continue
        if (variable === 'pickup_date' && pickupAt) values[variable] = this.formatTemplateDate(pickupAt)
      }
      this.templateVariables = values
    },
    async sendReplyNow () {
      if (!this.canSendReply || this.busy) return
      this.busy = true; this.banner = null
      const inquiryId = this.selected.id
      const templateMode = this.replyMode === 'template'
      const delivery = templateMode ? {
        mode: 'template',
        templateName: this.selectedTemplate.name,
        language: this.templateLanguage,
        variables: { ...this.templateVariables }
      } : null
      const bodyText = templateMode ? `WhatsApp template: ${this.selectedTemplate.label}` : this.replyText.trim()
      try {
        const draft = await this.request(`/api/admin/chats/inquiries/${inquiryId}/reply`, {
          method: 'POST',
          fixedKey: `inquiry-reply-send-${inquiryId}-${Date.now()}`,
          body: JSON.stringify({ bodyText, delivery, sendNow: true })
        })
        const result = await this.request(`/api/admin/chats/messages/${draft.message.id}/send`, {
          method: 'POST',
          fixedKey: `inquiry-send-${draft.message.id}`,
          body: JSON.stringify(delivery ? { delivery } : {})
        })
        this.banner = { kind: 'success', text: result.alreadySent ? 'Сообщение уже было отправлено. Дубль не создан.' : 'WhatsApp принял сообщение. Ждём доставку.' }
        this.replyText = ''
        await this.open(inquiryId, false)
        await this.loadList(false)
      } catch (error) {
        this.showError(error)
        await this.open(inquiryId, false)
      } finally {
        this.busy = false
      }
    },
    async approveAndSend (message) { this.busy = true; try { await this.request(`/api/admin/chats/messages/${message.id}/approve`, { method: 'POST', body: '{}' }); await this.sendApproved(message) } catch (error) { this.showError(error) } finally { this.busy = false } },
    async sendApproved (message) { this.busy = true; try { const data = await this.request(`/api/admin/chats/messages/${message.id}/send`, { method: 'POST', fixedKey: `inquiry-send-${message.id}`, body: '{}' }); this.banner = { kind: 'success', text: data.alreadySent ? 'Сообщение уже было отправлено. Дубль не создан.' : 'WhatsApp принял сообщение. Ждём доставку.' }; await this.open(this.selected.id); await this.loadList(false) } catch (error) { this.showError(error); await this.open(this.selected.id, false) } finally { this.busy = false } },
    async retryMessage (message) {
      this.busy = true
      try {
        const draft = await this.request(`/api/admin/chats/inquiries/${this.selected.id}/reply`, { method: 'POST', fixedKey: `inquiry-retry-draft-${message.id}`, body: JSON.stringify({ bodyText: message.bodyText }) })
        await this.request(`/api/admin/chats/messages/${draft.message.id}/approve`, { method: 'POST', body: '{}' })
        await this.sendApproved(draft.message)
      } catch (error) { this.showError(error); await this.open(this.selected.id, false) } finally { this.busy = false }
    },
    scheduleOrderSearch () { clearTimeout(this.orderTimer); this.orderTimer = setTimeout(() => this.searchOrders(), 300) },
    async searchOrders () { if (this.orderSearch.length < 2) { this.orderResults = []; return } try { const data = await this.request(`/api/admin/chats/inquiries/orders?q=${encodeURIComponent(this.orderSearch)}`); this.orderResults = data.rows || [] } catch (error) { this.showError(error) } },
    async linkOrder (orderId) { this.busy = true; try { await this.request(`/api/admin/chats/inquiries/${this.selected.id}/link-order`, { method: 'POST', body: JSON.stringify({ orderId }) }); this.banner = { kind: 'success', text: 'Диалог связан с заказом и доступен в его истории.' }; this.selected = null; await this.changeView('linked') } catch (error) { this.showError(error) } finally { this.busy = false } },
    async createOrder () { this.busy = true; try { const data = await this.request(`/api/admin/chats/inquiries/${this.selected.id}/create-order`, { method: 'POST', body: JSON.stringify(this.newOrder) }); this.banner = { kind: 'success', text: data.sourceOfTruthNotice }; this.selected = null; await this.changeView('linked') } catch (error) { this.showError(error) } finally { this.busy = false } },
    showError (error) { this.banner = { kind: 'error', text: error.message || 'Произошла ошибка', retry: true } },
    templateVariableLabel (name) { return ({ city: 'Город поездки', pickup_date: 'Дата подачи', customer_name: 'Имя клиента', booking_number: 'Номер заказа' })[name] || name },
    templateVariablePlaceholder (name) { return ({ city: 'Например, Helsinki', pickup_date: 'Например, 24 July', customer_name: 'Например, John', booking_number: 'Например, 9GP7HC-1' })[name] || 'Введите значение' },
    formatTemplateDate (value) { return value ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(value)) : '' },
    customerLabel (row) { return row.customerDisplayName || row.customerActorId || 'Клиент' },
    ownerLabel (row) { return row.assignedOwner?.email || 'Не назначен' },
    statusLabel (row) { if (row.order && !['closed', 'spam'].includes(row.state)) return 'Связано с заказом'; return ({ new: 'Новое', in_progress: 'В работе', waiting_customer: 'Ждём клиента', linked_order: 'Связано с заказом', closed: 'Закрыто', spam: 'Спам' })[row.state] || row.state },
    deliveryLabel (message) { return ({ accepted: 'Принято WhatsApp', delivered: 'Доставлено', read: 'Прочитано', failed: 'Не отправлено' })[message.deliveryStatus] || (message.approvalStatus === 'pending_human' ? 'Ждёт одобрения' : 'Черновик') },
    orderNumber (order) { return order.sourceOrderNumber || order.sourceBookingId || order.sourceInternalOrderNumber || order.id },
    shortTime (value) { if (!value) return ''; const date = new Date(value); return date.toLocaleDateString('ru-RU') === new Date().toLocaleDateString('ru-RU') ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) },
    messageTime (value) { return new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) },
    formatDate (value) { return value ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Дата не указана' }
  }
}
</script>

<style scoped>
.inbox{--ink:#17233d;--muted:#667085;--line:#dfe4ec;--surface:#fff;--soft:#f6f8fb;--accent:#243b73;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden}.inbox__head{display:flex;align-items:center;justify-content:space-between;padding:24px 26px 18px}.inbox__head h1{margin:0;font-size:30px}.inbox__head p{margin:5px 0 0;color:var(--muted)}button,input,select,textarea{font:inherit}.secondary,.actions button,.back{border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:10px;padding:9px 14px;cursor:pointer}.views{display:flex;gap:4px;padding:0 20px;border-bottom:1px solid var(--line);overflow:auto}.views button{white-space:nowrap;border:0;border-bottom:3px solid transparent;background:transparent;padding:13px 14px;color:var(--muted);font-weight:700;cursor:pointer}.views button.active{color:var(--ink);border-color:var(--accent)}.views span{display:inline-grid;place-items:center;min-width:21px;height:21px;margin-left:5px;padding:0 5px;border-radius:11px;background:#d92d20;color:#fff;font-size:12px}.banner{display:flex;justify-content:space-between;gap:12px;margin:14px 20px 0;padding:11px 14px;border-radius:10px;background:#eef4ff}.banner--error{background:#fff1f0;color:#912018}.banner--warning{background:#fffaeb;color:#7a2e0e}.banner--success{background:#ecfdf3;color:#05603a}.banner button{border:0;background:transparent;text-decoration:underline;color:inherit;cursor:pointer}.toolbar{display:grid;grid-template-columns:minmax(240px,1fr) 260px;gap:10px;padding:16px 20px}.toolbar input,.toolbar select,.customer-panel select,.action-panel input,.composer textarea,.composer select,.composer input,.create-order input{width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;background:#fff;padding:10px 12px;color:var(--ink)}.workspace{display:grid;grid-template-columns:minmax(300px,38%) 1fr;min-height:620px;border-top:1px solid var(--line)}.list{border-right:1px solid var(--line);background:var(--soft);max-height:720px;overflow:auto}.conversation{display:block;width:100%;padding:15px 18px;border:0;border-bottom:1px solid var(--line);background:transparent;text-align:left;color:var(--ink);cursor:pointer}.conversation.active{background:#fff;box-shadow:inset 3px 0 var(--accent)}.conversation.unread{background:#eef4ff}.conversation__top,.conversation__meta{display:flex;align-items:center;gap:8px}.conversation__top{justify-content:space-between}.conversation__top time,.conversation p,.conversation__meta,.conversation small{color:var(--muted)}.conversation p{margin:7px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.conversation__meta{font-size:12px;flex-wrap:wrap}.conversation__meta b{margin-left:auto;display:grid;place-items:center;min-width:22px;height:22px;border-radius:11px;background:var(--accent);color:#fff}.conversation small{display:block;margin-top:7px}.dialog{display:flex;flex-direction:column;min-width:0;min-height:620px;background:#fff}.dialog__head{display:flex;align-items:center;gap:12px;padding:18px 22px;border-bottom:1px solid var(--line)}.dialog__head h2{margin:0;font-size:20px}.dialog__head p{margin:3px 0 0;color:var(--muted)}.status{margin-left:auto;border-radius:16px;background:#eef4ff;padding:6px 10px;font-size:12px;font-weight:700}.back{display:none}.customer-panel{display:flex;align-items:center;gap:14px;padding:12px 22px;background:var(--soft);border-bottom:1px solid var(--line)}.customer-panel div{display:grid;gap:2px}.customer-panel span{font-size:12px;color:var(--muted)}.customer-panel select{width:auto;margin-left:auto}.linked-order{font-size:13px;color:#05603a}.messages{flex:1;min-height:260px;max-height:460px;overflow:auto;padding:22px;background:#f8fafc}.message{max-width:76%;margin:0 0 12px;padding:11px 13px;border:1px solid var(--line);border-radius:14px 14px 14px 4px;background:#fff}.message--outbound{margin-left:auto;border-radius:14px 14px 4px 14px;background:#eef4ff}.message p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.message footer{display:flex;gap:10px;justify-content:flex-end;margin-top:6px;color:var(--muted);font-size:11px}.approval,.send-error{display:grid;gap:7px;margin-top:10px;padding-top:9px;border-top:1px solid var(--line);font-size:12px}.approval button,.send-error button,.primary-action button,.composer button,.action-panel>button,.create-order button{border:0;border-radius:9px;background:var(--accent);color:#fff;padding:9px 13px;font-weight:700;cursor:pointer}.send-error{color:#912018}.send-error button{background:#b42318}.primary-action{display:flex;align-items:center;justify-content:space-between;gap:15px;margin:14px 20px;padding:13px 15px;border-radius:12px;background:#eef4ff}.primary-action div{display:grid;gap:3px}.primary-action span{font-size:13px;color:var(--muted)}.composer{display:grid;gap:10px;padding:14px 20px;border-top:1px solid var(--line)}.composer textarea{resize:vertical;min-height:78px}.composer small{color:var(--muted)}.composer-mode{display:inline-flex;justify-self:start;gap:4px;padding:3px;border-radius:10px;background:#eef2f7}.composer-mode button{border:0;background:transparent;color:#5d6c82;padding:7px 10px}.composer-mode button.active{background:#fff;color:var(--ink);box-shadow:0 1px 4px rgba(23,35,61,.12)}.window-notice{display:grid;gap:3px;padding:10px 12px;border-radius:10px;background:#fff7ed;color:#9a3412;font-size:13px}.composer-field,.template-variables label{display:grid;gap:5px;color:#34425e;font-size:13px;font-weight:700}.template-preview{display:grid;gap:3px;padding:11px 12px;border:1px solid #d9e2ef;border-radius:10px;background:#f8fafc}.template-preview span{color:var(--muted);font-size:13px}.template-preview code{color:#64748b;font-size:11px}.template-variables{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.composer-submit{display:flex;align-items:center;justify-content:space-between;gap:14px}.actions{display:flex;gap:8px;flex-wrap:wrap;padding:0 20px 18px}.actions .danger{color:#b42318}.action-panel{display:grid;gap:10px;margin:0 20px 18px;padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--soft)}.action-panel h3,.action-panel p{margin:0}.action-panel p{color:var(--muted);font-size:13px}.order-result{display:grid!important;gap:3px;text-align:left!important;background:#fff!important;color:var(--ink)!important;border:1px solid var(--line)!important}.order-result span{color:var(--muted);font-size:12px}.create-order{grid-template-columns:1fr 1fr}.create-order h3,.create-order p,.create-order button{grid-column:1/-1}.create-order label{display:grid;gap:5px;font-size:13px;font-weight:700}.state{display:flex;align-items:center;justify-content:center;gap:10px;min-height:180px;padding:30px;color:var(--muted);text-align:center}.state--empty{flex-direction:column}.spinner{width:18px;height:18px;border:2px solid var(--line);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid rgba(36,59,115,.28);outline-offset:2px}button:disabled{opacity:.55;cursor:not-allowed}
.inbox__head-actions{display:flex;gap:8px}.primary,.start-conversation__submit button{border:0;border-radius:10px;background:var(--accent);color:#fff;padding:10px 14px;font-weight:800;cursor:pointer}.start-conversation{display:grid;gap:12px;margin:0 20px 16px;padding:16px;border:1px solid #cbd8eb;border-radius:14px;background:#f7faff}.start-conversation__head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.start-conversation__head h2{margin:0;color:var(--ink);font-size:18px}.start-conversation__head p{margin:4px 0 0;color:var(--muted);font-size:13px}.start-conversation__close{border:0;background:transparent;color:#64748b;font-size:24px;line-height:1;cursor:pointer}.start-conversation__grid{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:10px}.start-conversation label{display:grid;gap:5px;color:#34425e;font-size:13px;font-weight:700}.start-conversation label small{color:var(--muted);font-weight:500}.start-conversation input,.start-conversation select{width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;background:#fff;padding:10px 12px;color:var(--ink)}.start-conversation__submit{display:flex;align-items:center;justify-content:space-between;gap:14px}.start-conversation__submit small{color:var(--muted)}
.state__action{margin-top:4px;border:0;border-radius:9px;background:var(--accent);color:#fff;padding:9px 13px;font-weight:700;cursor:pointer}
@media(max-width:760px){.inbox{border-radius:0;border-left:0;border-right:0}.inbox__head{align-items:flex-start;flex-direction:column;padding:18px}.inbox__head h1{font-size:26px}.inbox__head-actions{width:100%}.inbox__head-actions button{flex:1}.start-conversation{margin:0 12px 14px;padding:14px}.start-conversation__grid{grid-template-columns:1fr}.start-conversation__submit{align-items:stretch;flex-direction:column}.start-conversation__submit button{width:100%}.toolbar{grid-template-columns:1fr;padding:12px}.workspace{display:block;min-height:560px}.list{border-right:0;max-height:none}.workspace--dialog .list{display:none}.dialog{display:none;min-height:560px}.workspace--dialog .dialog{display:flex}.back{display:block;padding:7px 10px}.dialog__head{padding:13px}.dialog__head .status{font-size:11px}.customer-panel{align-items:flex-start;flex-wrap:wrap;padding:11px 14px}.customer-panel select{width:100%;margin:0}.messages{padding:14px;max-height:none}.message{max-width:88%}.primary-action{align-items:flex-start;flex-direction:column;margin:10px 12px}.composer{padding:12px}.composer-mode{display:grid;grid-template-columns:1fr 1fr;width:100%}.composer-mode button{min-width:0}.template-variables{grid-template-columns:1fr}.composer-submit{align-items:stretch;flex-direction:column}.composer-submit small{max-width:none}.composer-submit button{width:100%}.actions{padding:0 12px 14px}.action-panel{margin:0 12px 14px}.create-order{grid-template-columns:1fr}.views{padding:0 8px}}
</style>
