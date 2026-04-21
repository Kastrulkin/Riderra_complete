<template>
  <div>
    <navigation />
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>

    <section class="site-section site-section--pf admin-overview">
      <div class="container">
        <div class="hero-card">
          <div>
            <p class="eyebrow">{{ t.section }}</p>
            <h1 class="h2">{{ t.title }}</h1>
            <p class="hero-copy">{{ t.subtitle }}</p>
          </div>
          <div class="hero-actions">
            <button class="btn" @click="reloadAll">{{ loading ? t.loading : t.refresh }}</button>
          </div>
        </div>

        <admin-tabs />

        <div v-if="notice" class="notice">{{ notice }}</div>

        <div class="overview-grid">
          <div class="stat-card stat-card--accent">
            <span class="stat-card__label">{{ t.needAction }}</span>
            <strong class="stat-card__value">{{ stats.needAction }}</strong>
            <span class="stat-card__hint">{{ t.needActionHint }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-card__label">{{ t.needsInfo }}</span>
            <strong class="stat-card__value">{{ stats.needsInfo }}</strong>
            <span class="stat-card__hint">{{ t.needsInfoHint }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-card__label">{{ t.unassigned }}</span>
            <strong class="stat-card__value">{{ stats.unassigned }}</strong>
            <span class="stat-card__hint">{{ t.unassignedHint }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-card__label">{{ t.pendingChats }}</span>
            <strong class="stat-card__value">{{ stats.pendingChats }}</strong>
            <span class="stat-card__hint">{{ t.pendingChatsHint }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-card__label">{{ t.aiDrafts }}</span>
            <strong class="stat-card__value">{{ stats.aiDrafts }}</strong>
            <span class="stat-card__hint">{{ t.aiDraftsHint }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-card__label">{{ t.conflicts }}</span>
            <strong class="stat-card__value">{{ stats.conflicts }}</strong>
            <span class="stat-card__hint">{{ t.conflictsHint }}</span>
          </div>
        </div>

        <div class="workspace-grid">
          <div class="card">
            <div class="section-head">
              <div>
                <h3>{{ t.todayQueue }}</h3>
                <p class="muted">{{ t.todayQueueHint }}</p>
              </div>
            </div>
            <div class="task-stack">
              <button class="task-row" @click="$router.push('/admin-orders')">
                <div>
                  <strong>{{ t.needsInfo }}</strong>
                  <p>{{ t.openNeedsInfo }}</p>
                </div>
                <span class="badge">{{ stats.needsInfo }}</span>
              </button>
              <button class="task-row" @click="$router.push('/admin-orders')">
                <div>
                  <strong>{{ t.unassigned }}</strong>
                  <p>{{ t.openUnassigned }}</p>
                </div>
                <span class="badge">{{ stats.unassigned }}</span>
              </button>
              <button class="task-row" @click="$router.push('/admin-chats')">
                <div>
                  <strong>{{ t.pendingChats }}</strong>
                  <p>{{ t.openPendingChats }}</p>
                </div>
                <span class="badge">{{ stats.pendingChats }}</span>
              </button>
              <button class="task-row" @click="$router.push('/admin-ai-inbox')">
                <div>
                  <strong>{{ t.aiDrafts }}</strong>
                  <p>{{ t.openAiDrafts }}</p>
                </div>
                <span class="badge">{{ stats.aiDrafts }}</span>
              </button>
            </div>
          </div>

          <div class="card">
            <div class="section-head">
              <div>
                <h3>{{ t.quickActions }}</h3>
                <p class="muted">{{ t.quickActionsHint }}</p>
              </div>
            </div>
            <div class="quick-grid">
              <button class="quick-action" @click="$router.push('/admin-orders')">
                <strong>{{ t.goOrders }}</strong>
                <span>{{ t.goOrdersHint }}</span>
              </button>
              <button class="quick-action" @click="$router.push('/admin-chats')">
                <strong>{{ t.goChats }}</strong>
                <span>{{ t.goChatsHint }}</span>
              </button>
              <button class="quick-action" @click="$router.push('/admin-crm')">
                <strong>{{ t.goCrm }}</strong>
                <span>{{ t.goCrmHint }}</span>
              </button>
              <button class="quick-action" @click="$router.push('/admin-pricing')">
                <strong>{{ t.goPricing }}</strong>
                <span>{{ t.goPricingHint }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="workspace-grid">
          <div class="card">
            <div class="section-head">
              <div>
                <h3>{{ t.transparency }}</h3>
                <p class="muted">{{ t.transparencyHint }}</p>
              </div>
            </div>
            <div class="meta-list">
              <div class="meta-row"><span>{{ t.activeSheet }}</span><strong>{{ activeSheetLabel }}</strong></div>
              <div class="meta-row"><span>{{ t.totalOrders }}</span><strong>{{ stats.totalOrders }}</strong></div>
              <div class="meta-row"><span>{{ t.totalClients }}</span><strong>{{ stats.totalClients }}</strong></div>
              <div class="meta-row"><span>{{ t.totalContacts }}</span><strong>{{ stats.totalContacts }}</strong></div>
              <div class="meta-row"><span>{{ t.pricingRows }}</span><strong>{{ stats.pricingRows }}</strong></div>
            </div>
          </div>

          <div class="card">
            <div class="section-head">
              <div>
                <h3>{{ t.recentRisk }}</h3>
                <p class="muted">{{ t.recentRiskHint }}</p>
              </div>
            </div>
            <div v-if="riskItems.length" class="risk-stack">
              <div v-for="item in riskItems" :key="item.key" class="risk-item">
                <strong>{{ item.title }}</strong>
                <p>{{ item.copy }}</p>
              </div>
            </div>
            <div v-else class="empty-state">{{ t.noRisks }}</div>
          </div>
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
    loading: false,
    notice: '',
    sheetView: null,
    chatTasks: [],
    aiDrafts: [],
    pricingRows: [],
    crmCompaniesTotal: 0,
    crmContactsTotal: 0,
    pricingConflicts: []
  }),
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            section: 'Рабочий кабинет',
            title: 'Обзор работы сотрудника',
            subtitle: 'Здесь видно, что требует действия сейчас: заказы, уточнения, чаты и риски по данным.',
            refresh: 'Обновить',
            loading: 'Обновляю...',
            needAction: 'Требуют действия',
            needActionHint: 'Главный фокус на сейчас',
            needsInfo: 'Нужны уточнения',
            needsInfoHint: 'Заказы с недостающими данными',
            unassigned: 'Без водителя',
            unassignedHint: 'Нужно распределить',
            pendingChats: 'Чаты в работе',
            pendingChatsHint: 'Ожидают ответа или отправки',
            aiDrafts: 'AI черновики',
            aiDraftsHint: 'Требуют подтверждения',
            conflicts: 'Конфликты',
            conflictsHint: 'Цена или маржа под риском',
            todayQueue: 'Сегодняшняя очередь',
            todayQueueHint: 'Открывайте только то, что реально требует внимания.',
            openNeedsInfo: 'Перейти к заказам с недостающими данными.',
            openUnassigned: 'Проверить заказы без назначенного водителя.',
            openPendingChats: 'Открыть живую очередь сообщений.',
            openAiDrafts: 'Разобрать новые черновики перед созданием заказа.',
            quickActions: 'Быстрые переходы',
            quickActionsHint: 'Самые нужные рабочие разделы без поиска по меню.',
            goOrders: 'Открыть заказы',
            goOrdersHint: 'Основной операционный экран',
            goChats: 'Открыть чаты',
            goChatsHint: 'Уточнения и рассылка',
            goCrm: 'Открыть CRM',
            goCrmHint: 'Клиенты и исполнители',
            goPricing: 'Открыть прайс',
            goPricingHint: 'Цены и конфликты',
            transparency: 'Прозрачность процесса',
            transparencyHint: 'Быстрый срез по источникам и объёму данных.',
            activeSheet: 'Активная таблица',
            totalOrders: 'Строк в заказах',
            totalClients: 'Компаний в CRM',
            totalContacts: 'Контактов в CRM',
            pricingRows: 'Строк прайса',
            recentRisk: 'Сигналы риска',
            recentRiskHint: 'Что может сломать операционку или деньги.',
            noRisks: 'Явных сигналов риска сейчас нет.',
            riskNeedsInfo: 'Есть заказы с незакрытыми уточнениями.',
            riskUnassigned: 'Есть заказы без назначенного водителя.',
            riskChats: 'Есть чат-задачи, которые не доведены до следующего шага.',
            riskPricing: 'Есть конфликты по цене или марже.'
          }
        : {
            section: 'Workspace',
            title: 'Staff overview',
            subtitle: 'See what needs action now: orders, clarifications, chats, and pricing risks.',
            refresh: 'Refresh',
            loading: 'Refreshing...',
            needAction: 'Needs action',
            needActionHint: 'Main focus right now',
            needsInfo: 'Needs clarification',
            needsInfoHint: 'Orders with missing data',
            unassigned: 'No driver',
            unassignedHint: 'Needs dispatching',
            pendingChats: 'Active chats',
            pendingChatsHint: 'Waiting for reply or send',
            aiDrafts: 'AI drafts',
            aiDraftsHint: 'Require confirmation',
            conflicts: 'Conflicts',
            conflictsHint: 'Price or margin at risk',
            todayQueue: 'Today’s queue',
            todayQueueHint: 'Open only the things that truly need attention.',
            openNeedsInfo: 'Go to orders with missing data.',
            openUnassigned: 'Review orders without drivers.',
            openPendingChats: 'Open the live message queue.',
            openAiDrafts: 'Review new drafts before creating orders.',
            quickActions: 'Quick actions',
            quickActionsHint: 'The most useful areas without menu hunting.',
            goOrders: 'Open orders',
            goOrdersHint: 'Main operations screen',
            goChats: 'Open chats',
            goChatsHint: 'Clarifications and notifications',
            goCrm: 'Open CRM',
            goCrmHint: 'Clients and suppliers',
            goPricing: 'Open pricing',
            goPricingHint: 'Prices and conflicts',
            transparency: 'Process visibility',
            transparencyHint: 'Quick snapshot of sources and data volume.',
            activeSheet: 'Active sheet',
            totalOrders: 'Order rows',
            totalClients: 'CRM companies',
            totalContacts: 'CRM contacts',
            pricingRows: 'Pricing rows',
            recentRisk: 'Risk signals',
            recentRiskHint: 'What may break operations or money.',
            noRisks: 'No obvious risk signals right now.',
            riskNeedsInfo: 'There are orders with open clarifications.',
            riskUnassigned: 'There are orders without an assigned driver.',
            riskChats: 'There are chat tasks that are not resolved.',
            riskPricing: 'There are price or margin conflicts.'
          }
    },
    stats () {
      const rows = this.sheetView?.rows || []
      const needsInfo = rows.filter((row) => row.needsInfo).length
      const unassigned = rows.filter((row) => !String(row.driver || '').trim()).length
      const pendingChats = (this.chatTasks || []).filter((task) => !['closed', 'notify_ack'].includes(String(task.state || ''))).length
      const aiDrafts = (this.aiDrafts || []).length
      const conflicts = (this.pricingConflicts || []).length
      return {
        totalOrders: rows.length,
        needsInfo,
        unassigned,
        pendingChats,
        aiDrafts,
        conflicts,
        totalClients: this.crmCompaniesTotal,
        totalContacts: this.crmContactsTotal,
        pricingRows: (this.pricingRows || []).length,
        needAction: needsInfo + unassigned + pendingChats + aiDrafts + conflicts
      }
    },
    activeSheetLabel () {
      const source = this.sheetView?.source
      if (!source) return '—'
      return source.name || source.monthLabel || source.googleSheetId || '—'
    },
    riskItems () {
      const items = []
      if (this.stats.needsInfo) items.push({ key: 'needs-info', title: this.t.needsInfo, copy: this.t.riskNeedsInfo })
      if (this.stats.unassigned) items.push({ key: 'unassigned', title: this.t.unassigned, copy: this.t.riskUnassigned })
      if (this.stats.pendingChats) items.push({ key: 'pending-chats', title: this.t.pendingChats, copy: this.t.riskChats })
      if (this.stats.conflicts) items.push({ key: 'conflicts', title: this.t.conflicts, copy: this.t.riskPricing })
      return items
    }
  },
  mounted () {
    this.reloadAll()
  },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    },
    async safeJson (url) {
      const response = await fetch(url, { headers: this.headers() })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`)
      return body
    },
    async reloadAll () {
      this.loading = true
      this.notice = ''
      const tasks = [
        this.safeJson('/api/admin/orders-sheet-view').then((body) => { this.sheetView = body }).catch(() => { this.sheetView = { rows: [], source: null } }),
        this.safeJson('/api/admin/chats/tasks?limit=200').then((body) => { this.chatTasks = body.rows || [] }).catch(() => { this.chatTasks = [] }),
        this.safeJson('/api/admin/ops/drafts?status=pending&parsedType=openclaw_order_draft').then((body) => { this.aiDrafts = body.rows || [] }).catch(() => { this.aiDrafts = [] }),
        this.safeJson('/api/admin/crm/companies?limit=1').then((body) => { this.crmCompaniesTotal = body.total || 0 }).catch(() => { this.crmCompaniesTotal = 0 }),
        this.safeJson('/api/admin/crm/contacts?limit=1').then((body) => { this.crmContactsTotal = body.total || 0 }).catch(() => { this.crmContactsTotal = 0 }),
        this.safeJson('/api/admin/pricing/cities?limit=500').then((body) => { this.pricingRows = body.rows || [] }).catch(() => { this.pricingRows = [] }),
        this.safeJson('/api/admin/pricing/conflicts').then((body) => { this.pricingConflicts = body.rows || [] }).catch(() => { this.pricingConflicts = [] })
      ]
      try {
        await Promise.all(tasks)
      } catch (_) {
        this.notice = 'Часть данных не загрузилась, но кабинет работает.'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.admin-overview {
  position: relative;
}

.page-background {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.page-background__gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top left, rgba(14, 165, 233, 0.18), transparent 35%), radial-gradient(circle at top right, rgba(21, 49, 109, 0.14), transparent 40%);
}

.hero-card,
.card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  box-shadow: 0 24px 60px rgba(16, 24, 40, 0.08);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  padding: 28px;
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #2f68ff;
}

.hero-copy,
.muted {
  color: #64748b;
}

.hero-actions {
  display: flex;
  gap: 12px;
}

.notice {
  margin: 0 0 18px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff7ed;
  color: #9a3412;
  font-weight: 600;
}

.overview-grid,
.workspace-grid,
.quick-grid {
  display: grid;
  gap: 16px;
}

.overview-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
  margin-bottom: 20px;
}

.workspace-grid {
  grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
  margin-bottom: 20px;
}

.stat-card,
.card {
  padding: 22px;
}

.stat-card {
  display: grid;
  gap: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
}

.stat-card--accent {
  background: linear-gradient(135deg, #15316d 0%, #2b6eff 100%);
  color: #fff;
  border-color: transparent;
}

.stat-card__label {
  font-size: 13px;
  font-weight: 700;
  color: inherit;
}

.stat-card__value {
  font-size: 34px;
  line-height: 1;
}

.stat-card__hint {
  font-size: 13px;
  color: inherit;
  opacity: 0.78;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.task-stack,
.meta-list,
.risk-stack {
  display: grid;
  gap: 12px;
}

.task-row,
.quick-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 16px 18px;
  border: 1px solid #dbe4f2;
  border-radius: 18px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.task-row p,
.quick-action span,
.risk-item p {
  margin: 6px 0 0;
  color: #64748b;
}

.quick-grid {
  grid-template-columns: 1fr 1fr;
}

.quick-action {
  display: grid;
  justify-content: start;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: #eef2ff;
  color: #31456a;
  font-weight: 800;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fafc;
}

.risk-item {
  padding: 14px 16px;
  border-radius: 16px;
  background: #fff7ed;
}

.empty-state {
  padding: 18px;
  border-radius: 16px;
  background: #f8fafc;
  color: #64748b;
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

@media (max-width: 1200px) {
  .overview-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .hero-card,
  .section-head,
  .workspace-grid,
  .quick-grid,
  .overview-grid {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .hero-actions,
  .task-row,
  .quick-action,
  .meta-row {
    width: 100%;
  }

  .hero-actions .btn,
  .quick-action,
  .task-row {
    justify-content: space-between;
  }

  .meta-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}

@media (max-width: 640px) {
  .hero-card,
  .card {
    padding: 18px;
  }

  .quick-action,
  .task-row {
    padding: 14px;
  }
}
</style>
