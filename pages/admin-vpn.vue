<template>
  <div>
    <navigation />
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>

    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <div class="hero-card">
          <div>
            <p class="eyebrow">{{ t.section }}</p>
            <h1 class="h2">{{ t.title }}</h1>
            <p class="hero-copy">{{ t.subtitle }}</p>
          </div>
          <div class="hero-actions">
            <button class="btn btn--primary" @click="openCreateGrant">{{ t.addAccess }}</button>
            <button class="btn" @click="reloadAll">{{ t.refresh }}</button>
          </div>
        </div>

        <admin-tabs />

        <div v-if="notice.text" class="notice" :class="notice.type === 'error' ? 'notice--error' : 'notice--ok'">
          {{ notice.text }}
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">{{ t.active }}</div>
            <div class="stat-value">{{ stats.active }}</div>
            <div class="stat-hint">{{ t.readyToUse }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ t.pending }}</div>
            <div class="stat-value">{{ stats.pending }}</div>
            <div class="stat-hint">{{ t.waitingApply }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ t.disabled }}</div>
            <div class="stat-value">{{ stats.disabled }}</div>
            <div class="stat-hint">{{ t.revokedAccess }}</div>
          </div>
          <div class="stat-card stat-card--accent">
            <div class="stat-label">{{ t.profileReady }}</div>
            <div class="stat-value">{{ profile.serverHost || '—' }}</div>
            <div class="stat-hint">{{ profile.serverPort ? `${t.port}: ${profile.serverPort}` : t.profileHint }}</div>
          </div>
        </div>

        <div class="content-grid">
          <div class="card">
            <div class="section-head">
              <div>
                <h3>{{ t.serverProfile }}</h3>
                <p class="muted">{{ t.serverProfileHint }}</p>
              </div>
              <button class="btn btn--small btn--primary" :disabled="savingProfile" @click="saveProfile">
                {{ savingProfile ? t.saving : t.saveProfile }}
              </button>
            </div>

            <div class="form-grid">
              <div>
                <label>{{ t.profileName }}</label>
                <input v-model="profileDraft.name" class="input" :placeholder="t.profileName" />
              </div>
              <div>
                <label>{{ t.server }}</label>
                <input v-model="profileDraft.serverHost" class="input" :placeholder="t.serverExample" />
              </div>
              <div>
                <label>{{ t.port }}</label>
                <input v-model.number="profileDraft.serverPort" class="input" type="number" min="1" max="65535" />
              </div>
              <div>
                <label>{{ t.serverName }}</label>
                <input v-model="profileDraft.serverName" class="input" :placeholder="t.serverNameExample" />
              </div>
              <div>
                <label>{{ t.publicKey }}</label>
                <input v-model="profileDraft.publicKey" class="input" :placeholder="t.publicKey" />
              </div>
              <div>
                <label>{{ t.shortId }}</label>
                <input v-model="profileDraft.shortId" class="input" :placeholder="t.shortId" />
              </div>
              <div>
                <label>{{ t.fingerprint }}</label>
                <input v-model="profileDraft.fingerprint" class="input" :placeholder="'chrome'" />
              </div>
              <div>
                <label>{{ t.flow }}</label>
                <input v-model="profileDraft.flow" class="input" :placeholder="'xtls-rprx-vision'" />
              </div>
              <div class="form-grid__wide">
                <label>{{ t.notes }}</label>
                <textarea v-model="profileDraft.notes" class="input textarea" :placeholder="t.profileNotesHint"></textarea>
              </div>
            </div>
          </div>

          <div class="card card--summary">
            <div class="section-head">
              <div>
                <h3>{{ t.quickActions }}</h3>
                <p class="muted">{{ t.quickActionsHint }}</p>
              </div>
            </div>

            <div class="quick-stack">
              <button class="quick-action" @click="openCreateGrant">
                <span class="quick-action__title">{{ t.issueNewAccess }}</span>
                <span class="quick-action__copy">{{ t.issueNewAccessHint }}</span>
              </button>
              <button class="quick-action" @click="openInstructionByStatus('pending')">
                <span class="quick-action__title">{{ t.checkPending }}</span>
                <span class="quick-action__copy">{{ t.checkPendingHint }}</span>
              </button>
              <button class="quick-action" @click="openInstructionByStatus('disabled')">
                <span class="quick-action__title">{{ t.offboardFlow }}</span>
                <span class="quick-action__copy">{{ t.offboardFlowHint }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="section-head">
            <div>
              <h3>{{ t.accessList }}</h3>
              <p class="muted">{{ t.accessListHint }}</p>
            </div>
            <div class="toolbar">
              <input v-model.trim="search" class="input input--search" :placeholder="t.searchPlaceholder" @keyup.enter="reloadAccess" />
              <select v-model="statusFilter" class="input select-input" @change="reloadAccess">
                <option value="">{{ t.allStatuses }}</option>
                <option value="active">{{ t.active }}</option>
                <option value="pending">{{ t.pending }}</option>
                <option value="disabled">{{ t.disabled }}</option>
              </select>
              <button class="btn" @click="reloadAccess">{{ t.searchAction }}</button>
            </div>
          </div>

          <div v-if="loadingAccess" class="empty-state">{{ t.loading }}</div>
          <div v-else-if="!rows.length" class="empty-state">
            <h4>{{ t.emptyTitle }}</h4>
            <p>{{ t.emptyCopy }}</p>
            <button class="btn btn--primary" @click="openCreateGrant">{{ t.addFirstAccess }}</button>
          </div>
          <div v-else class="table-wrap">
            <div class="vpn-table vpn-table--head">
              <div>{{ t.employee }}</div>
              <div>{{ t.device }}</div>
              <div>UUID</div>
              <div>{{ t.issuedAt }}</div>
              <div>{{ t.status }}</div>
              <div>{{ t.syncState }}</div>
              <div>{{ t.actions }}</div>
            </div>
            <div v-for="row in rows" :key="row.id" class="vpn-table vpn-table--row">
              <div>
                <div class="cell-title">{{ row.employeeName }}</div>
                <div class="muted">{{ row.employeeEmail || row.employeeLogin || '—' }}</div>
              </div>
              <div>
                <div class="cell-title">{{ row.deviceName }}</div>
                <div class="muted">{{ row.comment || '—' }}</div>
              </div>
              <div>
                <div class="mono">{{ shortUuid(row.uuid) }}</div>
                <div class="muted">{{ row.connectionLabel || row.employeeName }}</div>
              </div>
              <div>{{ formatDate(row.issuedAt) }}</div>
              <div><span class="status-pill" :class="`status-pill--${row.status}`">{{ statusLabel(row.status) }}</span></div>
              <div><span class="sync-pill" :class="`sync-pill--${row.syncState}`">{{ syncLabel(row.syncState) }}</span></div>
              <div class="row-actions">
                <button class="btn btn--small btn--primary" @click="openGrant(row)">{{ t.open }}</button>
                <button class="btn btn--small" @click="copyConnection(row)">{{ t.copy }}</button>
                <button class="btn btn--small" @click="openInstruction(row)">{{ t.instruction }}</button>
                <button class="btn btn--small" @click="rotateGrant(row)">{{ t.rotate }}</button>
                <button
                  class="btn btn--small"
                  :class="row.status === 'disabled' ? 'btn--primary' : 'btn--danger'"
                  @click="toggleGrant(row)"
                >
                  {{ row.status === 'disabled' ? t.activate : t.disable }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="grantModal.open" class="modal-overlay" @click="closeGrantModal">
      <div class="modal modal--wide" @click.stop>
        <div class="section-head">
          <div>
            <h3>{{ grantModal.mode === 'create' ? t.addAccess : t.editAccess }}</h3>
            <p class="muted">{{ grantModal.mode === 'create' ? t.createGrantHint : t.editGrantHint }}</p>
          </div>
          <button class="btn btn--small" @click="closeGrantModal">{{ t.close }}</button>
        </div>

        <div class="form-grid">
          <div class="form-grid__wide">
            <label>{{ t.employeeDirectory }}</label>
            <input v-model="grantStaffLookup" class="input" list="vpn-staff-list" :placeholder="t.staffLookupPlaceholder" @change="applyStaffSuggestion" />
            <datalist id="vpn-staff-list">
              <option v-for="s in staffOptions" :key="s.id" :value="staffDisplayValue(s)">{{ staffRolesLabel(s) }}</option>
            </datalist>
          </div>
          <div>
            <label>{{ t.employee }}</label>
            <input v-model="grantForm.employeeName" class="input" :placeholder="t.employeeNamePlaceholder" />
          </div>
          <div>
            <label>Email</label>
            <input v-model="grantForm.employeeEmail" class="input" :placeholder="'name@riderra.com'" />
          </div>
          <div>
            <label>{{ t.login }}</label>
            <input v-model="grantForm.employeeLogin" class="input" :placeholder="t.loginPlaceholder" />
          </div>
          <div>
            <label>{{ t.device }}</label>
            <input v-model="grantForm.deviceName" class="input" :placeholder="t.devicePlaceholder" />
          </div>
          <div>
            <label>UUID</label>
            <div class="inline-control">
              <input v-model="grantForm.uuid" class="input" :placeholder="t.uuidPlaceholder" />
              <button class="btn btn--small" @click="generateUuid">{{ t.generate }}</button>
            </div>
          </div>
          <div>
            <label>{{ t.status }}</label>
            <select v-model="grantForm.status" class="input select-input">
              <option value="active">{{ t.active }}</option>
              <option value="pending">{{ t.pending }}</option>
              <option value="disabled">{{ t.disabled }}</option>
            </select>
          </div>
          <div>
            <label>{{ t.syncState }}</label>
            <select v-model="grantForm.syncState" class="input select-input">
              <option value="pending">{{ t.pendingApply }}</option>
              <option value="applied">{{ t.applied }}</option>
              <option value="error">{{ t.error }}</option>
            </select>
          </div>
          <div class="form-grid__wide">
            <label>{{ t.connectionLabel }}</label>
            <input v-model="grantForm.connectionLabel" class="input" :placeholder="t.connectionLabelHint" />
          </div>
          <div class="form-grid__wide">
            <label>{{ t.comment }}</label>
            <textarea v-model="grantForm.comment" class="input textarea" :placeholder="t.commentPlaceholder"></textarea>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn--primary" :disabled="savingGrant" @click="saveGrant">{{ savingGrant ? t.saving : t.save }}</button>
          <button class="btn" @click="closeGrantModal">{{ t.cancel }}</button>
        </div>
      </div>
    </div>

    <div v-if="detailPanel.open" class="drawer-overlay" @click="closeDetailPanel">
      <aside class="drawer" @click.stop>
        <div class="section-head">
          <div>
            <h3>{{ detailPanel.row.employeeName }}</h3>
            <p class="muted">{{ detailPanel.row.deviceName }} · {{ detailPanel.row.employeeEmail || detailPanel.row.employeeLogin || '—' }}</p>
          </div>
          <button class="btn btn--small" @click="closeDetailPanel">{{ t.close }}</button>
        </div>

        <div class="detail-block">
          <div class="detail-grid">
            <div><span class="detail-label">UUID</span><span class="mono">{{ detailPanel.row.uuid }}</span></div>
            <div><span class="detail-label">{{ t.status }}</span><span>{{ statusLabel(detailPanel.row.status) }}</span></div>
            <div><span class="detail-label">{{ t.issuedAt }}</span><span>{{ formatDate(detailPanel.row.issuedAt) }}</span></div>
            <div><span class="detail-label">{{ t.syncState }}</span><span>{{ syncLabel(detailPanel.row.syncState) }}</span></div>
          </div>
          <div v-if="detailPanel.row.lastSyncError" class="notice notice--error">{{ detailPanel.row.lastSyncError }}</div>
        </div>

        <div class="detail-block">
          <div class="section-head section-head--compact">
            <div>
              <h4>{{ t.connectionParams }}</h4>
              <p class="muted">{{ t.connectionParamsHint }}</p>
            </div>
            <button class="btn btn--small" @click="copyInstruction(detailPanel.instruction)">{{ t.copyAll }}</button>
          </div>

          <div class="params-list">
            <div class="param-row"><span>{{ t.server }}</span><strong>{{ detailPanel.instruction.server }}</strong></div>
            <div class="param-row"><span>{{ t.port }}</span><strong>{{ detailPanel.instruction.port }}</strong></div>
            <div class="param-row"><span>UUID</span><strong class="mono">{{ detailPanel.instruction.uuid }}</strong></div>
            <div class="param-row"><span>{{ t.publicKey }}</span><strong class="mono">{{ detailPanel.instruction.publicKey }}</strong></div>
            <div class="param-row"><span>{{ t.shortId }}</span><strong class="mono">{{ detailPanel.instruction.shortId }}</strong></div>
            <div class="param-row"><span>{{ t.serverName }}</span><strong>{{ detailPanel.instruction.serverName }}</strong></div>
          </div>

          <label class="detail-label detail-label--textarea">{{ t.connectionUri }}</label>
          <textarea class="input textarea textarea--compact mono" :value="detailPanel.instruction.uri" readonly></textarea>

          <label class="detail-label detail-label--textarea">{{ t.instruction }}</label>
          <textarea class="input textarea mono" :value="detailPanel.instructionText" readonly></textarea>
        </div>

        <div class="modal-actions modal-actions--drawer">
          <button class="btn btn--primary" @click="copyConnection(detailPanel.row)">{{ t.copy }}</button>
          <button class="btn" @click="openEditFromDrawer">{{ t.editAccess }}</button>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import navigation from '~/components/partials/nav.vue'
import adminTabs from '~/components/partials/adminTabs.vue'

const emptyGrantForm = () => ({
  employeeName: '',
  employeeEmail: '',
  employeeLogin: '',
  deviceName: '',
  uuid: '',
  status: 'pending',
  syncState: 'pending',
  comment: '',
  connectionLabel: ''
})

export default {
  middleware: 'staff',
  components: { navigation, adminTabs },
  data: () => ({
    profile: {},
    profileDraft: {
      name: '',
      serverHost: '',
      serverPort: 443,
      serverName: '',
      publicKey: '',
      shortId: '',
      fingerprint: 'chrome',
      flow: 'xtls-rprx-vision',
      notes: ''
    },
    rows: [],
    staffOptions: [],
    loadingAccess: false,
    savingProfile: false,
    savingGrant: false,
    search: '',
    statusFilter: '',
    grantStaffLookup: '',
    notice: { type: 'ok', text: '' },
    grantModal: {
      open: false,
      mode: 'create',
      rowId: null
    },
    grantForm: emptyGrantForm(),
    detailPanel: {
      open: false,
      row: null,
      instruction: {},
      instructionText: ''
    }
  }),
  computed: {
    stats () {
      return this.rows.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1
        return acc
      }, { active: 0, pending: 0, disabled: 0 })
    },
    t () {
      return this.$store.state.language === 'ru'
        ? {
            section: 'Служебный доступ',
            title: 'Корпоративный VPN',
            subtitle: 'Выдача, перевыпуск и отключение VPN-доступов сотрудников в одном внутреннем экране.',
            addAccess: 'Выдать доступ',
            refresh: 'Обновить',
            active: 'Active',
            pending: 'Pending',
            disabled: 'Disabled',
            readyToUse: 'Готово к использованию',
            waitingApply: 'Ждут применения на VPN-сервере',
            revokedAccess: 'Отключённые доступы',
            profileReady: 'Профиль подключения',
            profileHint: 'Заполните хост, ключ и shortId',
            serverProfile: 'Параметры корпоративного VPN',
            serverProfileHint: 'Это общий профиль сервера Xray/VLESS REALITY. Дальше мы выдаём сотрудникам отдельные UUID.',
            saving: 'Сохраняем...',
            saveProfile: 'Сохранить профиль',
            profileName: 'Название профиля',
            server: 'Сервер',
            serverExample: 'vpn.riderra.com',
            port: 'Порт',
            serverName: 'serverName / SNI',
            serverNameExample: 'cdn.cloudflare.com',
            publicKey: 'publicKey',
            shortId: 'shortId',
            fingerprint: 'fingerprint',
            flow: 'Flow',
            notes: 'Комментарий',
            profileNotesHint: 'Например: для macOS / iOS используем v2rayTun, выдаём только личные UUID.',
            quickActions: 'Операционные сценарии',
            quickActionsHint: 'Самые частые действия по доступам — без долгих переходов.',
            issueNewAccess: 'Выдать доступ новому сотруднику',
            issueNewAccessHint: 'Открыть форму, подставить данные сотрудника и сгенерировать UUID.',
            checkPending: 'Открыть ожидающие',
            checkPendingHint: 'Быстро посмотреть доступы, которые ещё не применены на сервере.',
            offboardFlow: 'Отключение при увольнении',
            offboardFlowHint: 'Открыть отключённые и перевыпущенные доступы, чтобы проверить offboarding.',
            accessList: 'Выданные доступы',
            accessListHint: 'Поиск по сотруднику, устройству, логину или UUID. Все действия доступны прямо из списка.',
            searchPlaceholder: 'Найти по сотруднику, email, логину, устройству или UUID',
            allStatuses: 'Все статусы',
            searchAction: 'Найти',
            loading: 'Загрузка...',
            emptyTitle: 'Пока нет выданных VPN-доступов',
            emptyCopy: 'Добавьте первый доступ для сотрудника, а затем уже подключайте реальную автоматическую синхронизацию с Xray.',
            addFirstAccess: 'Выдать первый доступ',
            employee: 'Сотрудник',
            device: 'Устройство',
            issuedAt: 'Дата выдачи',
            status: 'Статус',
            syncState: 'Синхронизация',
            actions: 'Действия',
            open: 'Открыть',
            copy: 'Копировать',
            copyAll: 'Копировать всё',
            instruction: 'Инструкция',
            rotate: 'Перевыпустить',
            activate: 'Активировать',
            disable: 'Отключить',
            close: 'Закрыть',
            editAccess: 'Изменить доступ',
            createGrantHint: 'Новый UUID и привязка доступа к конкретному устройству сотрудника.',
            editGrantHint: 'Меняем устройство, статус или комментарий без потери истории выдачи.',
            employeeDirectory: 'Справочник сотрудников',
            staffLookupPlaceholder: 'Начните вводить email или имя сотрудника',
            employeeNamePlaceholder: 'Например, Александр Демьянов',
            login: 'Логин',
            loginPlaceholder: 'Например, demyanov@riderra.com',
            devicePlaceholder: 'Например, MacBook Air / iPhone 15',
            uuidPlaceholder: 'UUID доступа',
            generate: 'Сгенерировать',
            pendingApply: 'Ожидает применения',
            applied: 'Применено',
            error: 'Ошибка',
            connectionLabel: 'Подпись подключения',
            connectionLabelHint: 'Например, Riderra • Demyanov • MacBook',
            commentPlaceholder: 'Когда выдан, для чего, ограничения по устройству и любые заметки.',
            save: 'Сохранить',
            cancel: 'Отмена',
            connectionParams: 'Параметры подключения',
            connectionParamsHint: 'Готовый комплект для отправки сотруднику.',
            connectionUri: 'Готовый URI',
            employeeDirectoryEmpty: 'Сотрудник не найден в справочнике',
            readyInstructionMissing: 'Сначала заполните профиль VPN сервера.',
            copySuccess: 'Параметры скопированы.',
            saveSuccess: 'Изменения сохранены.',
            disableSuccess: 'Доступ отключён.',
            activateSuccess: 'Доступ активирован.',
            rotateSuccess: 'UUID перевыпущен.',
            serverProfileRequired: 'Для инструкции нужно заполнить сервер, publicKey, shortId и serverName.',
            noRowsForStatus: 'Нет доступов в выбранном статусе.',
            applyPending: 'pending',
            applyApplied: 'applied',
            applyError: 'error'
          }
        : {
            section: 'Internal Access',
            title: 'Corporate VPN',
            subtitle: 'Issue, rotate and revoke staff VPN access in one internal screen.',
            addAccess: 'Issue access',
            refresh: 'Refresh',
            active: 'Active',
            pending: 'Pending',
            disabled: 'Disabled',
            readyToUse: 'Ready to use',
            waitingApply: 'Waiting to apply on VPN server',
            revokedAccess: 'Revoked access',
            profileReady: 'Connection profile',
            profileHint: 'Fill host, key and shortId',
            serverProfile: 'Corporate VPN profile',
            serverProfileHint: 'These are the shared Xray/VLESS REALITY server settings. Staff get individual UUIDs below.',
            saving: 'Saving...',
            saveProfile: 'Save profile',
            profileName: 'Profile name',
            server: 'Server',
            serverExample: 'vpn.riderra.com',
            port: 'Port',
            serverName: 'serverName / SNI',
            serverNameExample: 'cdn.cloudflare.com',
            publicKey: 'publicKey',
            shortId: 'shortId',
            fingerprint: 'fingerprint',
            flow: 'Flow',
            notes: 'Notes',
            profileNotesHint: 'Example: for macOS / iOS use v2rayTun, issue only personal UUIDs.',
            quickActions: 'Operational shortcuts',
            quickActionsHint: 'Most frequent access operations without extra clicks.',
            issueNewAccess: 'Issue access to a new employee',
            issueNewAccessHint: 'Open the form, prefill the employee, and generate a UUID.',
            checkPending: 'Open pending access',
            checkPendingHint: 'Review access grants that still need to be applied on the server.',
            offboardFlow: 'Offboarding flow',
            offboardFlowHint: 'Open disabled and rotated access to verify offboarding was completed.',
            accessList: 'Issued access',
            accessListHint: 'Search by employee, device, login or UUID. Most actions are available inline.',
            searchPlaceholder: 'Search by employee, email, login, device or UUID',
            allStatuses: 'All statuses',
            searchAction: 'Search',
            loading: 'Loading...',
            emptyTitle: 'No VPN access has been issued yet',
            emptyCopy: 'Add the first staff access now, then wire real Xray sync after the UI and data model are in place.',
            addFirstAccess: 'Issue first access',
            employee: 'Employee',
            device: 'Device',
            issuedAt: 'Issued',
            status: 'Status',
            syncState: 'Sync',
            actions: 'Actions',
            open: 'Open',
            copy: 'Copy',
            copyAll: 'Copy all',
            instruction: 'Instruction',
            rotate: 'Rotate',
            activate: 'Activate',
            disable: 'Disable',
            close: 'Close',
            editAccess: 'Edit access',
            createGrantHint: 'Create a new UUID and bind it to a specific staff device.',
            editGrantHint: 'Adjust device, status or notes without losing the issued-at history.',
            employeeDirectory: 'Staff directory',
            staffLookupPlaceholder: 'Start typing employee name or email',
            employeeNamePlaceholder: 'For example, Alex Demyanov',
            login: 'Login',
            loginPlaceholder: 'For example, demyanov@riderra.com',
            devicePlaceholder: 'For example, MacBook Air / iPhone 15',
            uuidPlaceholder: 'Access UUID',
            generate: 'Generate',
            pendingApply: 'Pending apply',
            applied: 'Applied',
            error: 'Error',
            connectionLabel: 'Connection label',
            connectionLabelHint: 'For example, Riderra • Demyanov • MacBook',
            commentPlaceholder: 'Issued when, what for, device limits, and any notes.',
            save: 'Save',
            cancel: 'Cancel',
            connectionParams: 'Connection parameters',
            connectionParamsHint: 'Ready-to-send package for the employee.',
            connectionUri: 'Connection URI',
            employeeDirectoryEmpty: 'Employee not found in directory',
            readyInstructionMissing: 'Fill the VPN server profile first.',
            copySuccess: 'Connection copied.',
            saveSuccess: 'Changes saved.',
            disableSuccess: 'Access disabled.',
            activateSuccess: 'Access activated.',
            rotateSuccess: 'UUID rotated.',
            serverProfileRequired: 'Fill server, publicKey, shortId and serverName first.',
            noRowsForStatus: 'No access grants in this status.',
            applyPending: 'pending',
            applyApplied: 'applied',
            applyError: 'error'
          }
    }
  },
  mounted () {
    this.reloadAll()
  },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
    async fetchJson (url, options = {}) {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers(),
          ...(options.headers || {})
        }
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`)
      return body
    },
    async reloadAll () {
      await Promise.all([this.loadProfile(), this.loadAccess(), this.loadStaff()])
    },
    async loadProfile () {
      const body = await this.fetchJson('/api/admin/vpn/profile')
      this.profile = body.profile || {}
      this.profileDraft = {
        name: this.profile.name || '',
        serverHost: this.profile.serverHost || '',
        serverPort: this.profile.serverPort || 443,
        serverName: this.profile.serverName || '',
        publicKey: this.profile.publicKey || '',
        shortId: this.profile.shortId || '',
        fingerprint: this.profile.fingerprint || 'chrome',
        flow: this.profile.flow || 'xtls-rprx-vision',
        notes: this.profile.notes || ''
      }
    },
    async loadAccess () {
      this.loadingAccess = true
      try {
        const query = new URLSearchParams()
        if (this.search) query.set('q', this.search)
        if (this.statusFilter) query.set('status', this.statusFilter)
        const suffix = query.toString() ? `?${query.toString()}` : ''
        const body = await this.fetchJson(`/api/admin/vpn/access${suffix}`)
        this.rows = Array.isArray(body.rows) ? body.rows : []
        if (body.profile) this.profile = body.profile
      } finally {
        this.loadingAccess = false
      }
    },
    async loadStaff () {
      const body = await this.fetchJson('/api/admin/staff-users')
      this.staffOptions = (body.rows || []).map((row) => ({
        id: row.id,
        email: row.email,
        roles: row.roles || []
      }))
    },
    async reloadAccess () {
      await this.loadAccess()
    },
    async saveProfile () {
      if (!this.profileDraft.serverHost || !this.profileDraft.publicKey || !this.profileDraft.shortId || !this.profileDraft.serverName) {
        this.setNotice('error', this.t.serverProfileRequired)
        return
      }
      this.savingProfile = true
      try {
        const body = await this.fetchJson('/api/admin/vpn/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': this.makeIdempotencyKey('vpn-profile') },
          body: JSON.stringify(this.profileDraft)
        })
        this.profile = body.profile || {}
        this.setNotice('ok', this.t.saveSuccess)
      } catch (error) {
        this.setNotice('error', error.message)
      } finally {
        this.savingProfile = false
      }
    },
    openCreateGrant () {
      this.grantModal = { open: true, mode: 'create', rowId: null }
      this.grantForm = emptyGrantForm()
      this.grantStaffLookup = ''
      this.generateUuid()
    },
    openGrant (row) {
      this.detailPanel = {
        open: true,
        row,
        instruction: row.connection || {},
        instructionText: this.buildInstructionText(row.connection || {})
      }
    },
    openEditFromDrawer () {
      const row = this.detailPanel.row
      this.closeDetailPanel()
      this.openEditGrant(row)
    },
    openEditGrant (row) {
      this.grantModal = { open: true, mode: 'edit', rowId: row.id }
      this.grantForm = {
        employeeName: row.employeeName || '',
        employeeEmail: row.employeeEmail || '',
        employeeLogin: row.employeeLogin || '',
        deviceName: row.deviceName || '',
        uuid: row.uuid || '',
        status: row.status || 'pending',
        syncState: row.syncState || 'pending',
        comment: row.comment || '',
        connectionLabel: row.connectionLabel || ''
      }
      this.grantStaffLookup = ''
    },
    closeGrantModal () {
      this.grantModal = { open: false, mode: 'create', rowId: null }
      this.grantForm = emptyGrantForm()
      this.grantStaffLookup = ''
    },
    closeDetailPanel () {
      this.detailPanel = { open: false, row: null, instruction: {}, instructionText: '' }
    },
    async saveGrant () {
      if (!this.grantForm.employeeName || !this.grantForm.deviceName || !this.grantForm.uuid) {
        this.setNotice('error', 'employeeName, deviceName and UUID are required')
        return
      }
      this.savingGrant = true
      try {
        const isEdit = this.grantModal.mode === 'edit' && this.grantModal.rowId
        const body = await this.fetchJson(
          isEdit ? `/api/admin/vpn/access/${this.grantModal.rowId}` : '/api/admin/vpn/access',
          {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': this.makeIdempotencyKey(isEdit ? 'vpn-access-update' : 'vpn-access-create') },
            body: JSON.stringify(this.grantForm)
          }
        )
        this.upsertRow(body.row)
        this.setNotice('ok', this.t.saveSuccess)
        this.closeGrantModal()
      } catch (error) {
        this.setNotice('error', error.message)
      } finally {
        this.savingGrant = false
      }
    },
    async rotateGrant (row) {
      try {
        const body = await this.fetchJson(`/api/admin/vpn/access/${row.id}/rotate`, {
          method: 'POST',
          headers: { 'Idempotency-Key': this.makeIdempotencyKey(`vpn-rotate-${row.id}`) }
        })
        this.upsertRow(body.row)
        this.setNotice('ok', this.t.rotateSuccess)
      } catch (error) {
        this.setNotice('error', error.message)
      }
    },
    async toggleGrant (row) {
      try {
        const action = row.status === 'disabled' ? 'activate' : 'disable'
        const body = await this.fetchJson(`/api/admin/vpn/access/${row.id}/${action}`, {
          method: 'POST',
          headers: { 'Idempotency-Key': this.makeIdempotencyKey(`vpn-${action}-${row.id}`) }
        })
        this.upsertRow(body.row)
        this.setNotice('ok', row.status === 'disabled' ? this.t.activateSuccess : this.t.disableSuccess)
      } catch (error) {
        this.setNotice('error', error.message)
      }
    },
    async openInstruction (row) {
      try {
        const body = await this.fetchJson(`/api/admin/vpn/access/${row.id}/instruction`)
        this.detailPanel = {
          open: true,
          row: body.row || row,
          instruction: body.instruction || {},
          instructionText: this.buildInstructionText(body.instruction || {})
        }
      } catch (error) {
        this.setNotice('error', error.message)
      }
    },
    async copyConnection (row) {
      const instruction = row.connection || {}
      if (!instruction.uri) {
        this.setNotice('error', this.t.readyInstructionMissing)
        return
      }
      await this.copyText(instruction.uri)
      this.setNotice('ok', this.t.copySuccess)
    },
    async copyInstruction (instruction) {
      await this.copyText(this.buildInstructionText(instruction))
      this.setNotice('ok', this.t.copySuccess)
    },
    async copyText (value) {
      const text = String(value || '')
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return
      }
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    },
    generateUuid () {
      if (globalThis.crypto?.randomUUID) {
        this.grantForm.uuid = globalThis.crypto.randomUUID()
        return
      }
      this.grantForm.uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const rand = Math.random() * 16 | 0
        const value = char === 'x' ? rand : ((rand & 0x3) | 0x8)
        return value.toString(16)
      })
    },
    shortUuid (uuid) {
      const value = String(uuid || '')
      return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : '—'
    },
    formatDate (value) {
      if (!value) return '—'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '—'
      return new Intl.DateTimeFormat(this.$store.state.language === 'ru' ? 'ru-RU' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    },
    statusLabel (status) {
      return status === 'active' ? this.t.active : (status === 'disabled' ? this.t.disabled : this.t.pending)
    },
    syncLabel (state) {
      if (state === 'applied') return this.t.applied
      if (state === 'error') return this.t.error
      return this.t.pendingApply
    },
    makeIdempotencyKey (prefix) {
      return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    },
    upsertRow (row) {
      if (!row) return
      const idx = this.rows.findIndex((item) => item.id === row.id)
      if (idx >= 0) this.$set(this.rows, idx, row)
      else this.rows.unshift(row)
      if (this.detailPanel.open && this.detailPanel.row?.id === row.id) {
        this.detailPanel = {
          open: true,
          row,
          instruction: row.connection || this.detailPanel.instruction,
          instructionText: this.buildInstructionText(row.connection || this.detailPanel.instruction)
        }
      }
    },
    setNotice (type, text) {
      this.notice = { type, text }
      if (text) {
        clearTimeout(this.noticeTimer)
        this.noticeTimer = setTimeout(() => {
          this.notice = { type: 'ok', text: '' }
        }, 3500)
      }
    },
    staffDisplayValue (staff) {
      return `${staff.email || ''}`.trim()
    },
    staffRolesLabel (staff) {
      return (staff.roles || []).join(', ')
    },
    applyStaffSuggestion () {
      const raw = String(this.grantStaffLookup || '').trim().toLowerCase()
      const found = this.staffOptions.find((staff) => String(staff.email || '').trim().toLowerCase() === raw)
      if (!found) return
      this.grantForm.employeeEmail = found.email || ''
      this.grantForm.employeeLogin = found.email || ''
      if (!this.grantForm.employeeName && found.email) {
        this.grantForm.employeeName = found.email.split('@')[0]
      }
      if (!this.grantForm.connectionLabel && found.email) {
        this.grantForm.connectionLabel = `Riderra • ${found.email}`
      }
    },
    buildInstructionText (instruction) {
      if (!instruction?.uri) return ''
      const steps = this.$store.state.language === 'ru'
        ? [
            '1. Установите подходящий VLESS/Reality клиент на устройство.',
            '2. Импортируйте URI или внесите параметры вручную.',
            '3. Проверьте, что включены Reality / Vision и fingerprint chrome.',
            '4. После подключения откройте https://ifconfig.me и проверьте IP.'
          ]
        : [
            '1. Install a VLESS/Reality client on the device.',
            '2. Import the URI or enter the values manually.',
            '3. Make sure Reality / Vision and the chrome fingerprint are enabled.',
            '4. After connecting, open https://ifconfig.me and verify the IP.'
          ]
      return [
        `Server: ${instruction.server || '—'}`,
        `Port: ${instruction.port || '—'}`,
        `UUID: ${instruction.uuid || '—'}`,
        `publicKey: ${instruction.publicKey || '—'}`,
        `shortId: ${instruction.shortId || '—'}`,
        `serverName: ${instruction.serverName || '—'}`,
        '',
        `URI: ${instruction.uri || '—'}`,
        '',
        ...steps
      ].join('\n')
    },
    openInstructionByStatus (status) {
      const row = this.rows.find((item) => item.status === status)
      if (!row) {
        this.setNotice('error', this.t.noRowsForStatus)
        return
      }
      this.openInstruction(row)
    }
  }
}
</script>

<style scoped>
.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  padding: 28px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, rgba(11, 18, 32, 0.94), rgba(20, 78, 128, 0.9));
  border-radius: 20px;
  color: #fff;
  box-shadow: 0 30px 70px rgba(15, 23, 42, 0.18);
}

.eyebrow {
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 12px;
  opacity: 0.78;
}

.hero-copy {
  max-width: 680px;
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.82);
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.stat-card {
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 18px 35px rgba(15, 23, 42, 0.08);
}

.stat-card--accent {
  background: linear-gradient(145deg, rgba(14, 165, 233, 0.11), rgba(59, 130, 246, 0.08));
}

.stat-label {
  font-size: 13px;
  color: #475569;
}

.stat-value {
  margin-top: 6px;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
}

.stat-hint {
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
  gap: 16px;
  margin-bottom: 18px;
}

.card {
  padding: 22px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
}

.card--summary {
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.96));
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.section-head--compact {
  margin-bottom: 12px;
}

.muted {
  color: #64748b;
  font-size: 13px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-grid label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.form-grid__wide {
  grid-column: 1 / -1;
}

.textarea {
  min-height: 96px;
  resize: vertical;
}

.quick-stack {
  display: grid;
  gap: 12px;
}

.quick-action {
  width: 100%;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: #fff;
  text-align: left;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.quick-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(15, 23, 42, 0.08);
}

.quick-action__title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.quick-action__copy {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.input--search {
  min-width: 300px;
}

.select-input {
  min-width: 180px;
}

.empty-state {
  padding: 30px 18px;
  text-align: center;
  color: #64748b;
  border: 1px dashed rgba(148, 163, 184, 0.45);
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.7);
}

.vpn-table {
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) minmax(160px, 1fr) minmax(140px, 0.9fr) 120px 110px 130px minmax(260px, 1.5fr);
  gap: 12px;
  align-items: center;
}

.vpn-table--head {
  padding: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.vpn-table--row {
  padding: 16px 0;
  border-top: 1px solid rgba(226, 232, 240, 0.85);
}

.cell-title {
  font-weight: 700;
  color: #0f172a;
}

.mono {
  font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
}

.status-pill,
.sync-pill,
.scope-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-pill--active {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.status-pill--pending {
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
}

.status-pill--disabled {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.sync-pill--pending {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.sync-pill--applied {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.sync-pill--error {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.row-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.notice {
  padding: 12px 14px;
  margin-bottom: 14px;
  border-radius: 12px;
  font-size: 14px;
}

.notice--ok {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.notice--error {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.inline-control {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.modal-overlay,
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 90;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.modal {
  width: min(920px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  padding: 22px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 35px 80px rgba(15, 23, 42, 0.22);
}

.modal--wide {
  width: min(980px, 100%);
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 18px;
}

.drawer {
  width: min(620px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  padding: 22px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 35px 80px rgba(15, 23, 42, 0.22);
}

.detail-block {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(226, 232, 240, 0.85);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.detail-grid > div {
  display: grid;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.detail-label--textarea {
  display: block;
  margin-bottom: 6px;
}

.params-list {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}

.param-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.95);
}

.textarea--compact {
  min-height: 86px;
}

@media (max-width: 1200px) {
  .stats-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .vpn-table {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .vpn-table--head {
    display: none;
  }

  .vpn-table--row {
    padding: 16px;
    border: 1px solid rgba(226, 232, 240, 0.85);
    border-radius: 16px;
    margin-bottom: 12px;
  }
}

@media (max-width: 767px) {
  .hero-card,
  .section-head,
  .hero-actions,
  .toolbar,
  .modal-actions,
  .modal-actions--drawer {
    flex-direction: column;
  }

  .form-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .input--search,
  .select-input {
    min-width: 0;
    width: 100%;
  }

  .card,
  .modal,
  .drawer,
  .hero-card {
    padding: 18px;
  }
}
</style>
