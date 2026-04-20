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
            <button class="btn" @click="reloadAll">{{ t.refresh }}</button>
          </div>
        </div>

        <admin-tabs />

        <div v-if="notice.text" class="notice" :class="notice.type === 'error' ? 'notice--error' : 'notice--ok'">
          {{ notice.text }}
        </div>

        <div class="content-grid content-grid--vpn">
          <details class="card technical-card">
            <summary class="technical-card__summary">
              <div>
                <h3>{{ t.serverProfile }}</h3>
                <p class="muted">{{ profileSummaryText() }}</p>
              </div>
              <span class="technical-card__toggle">{{ t.openTechnical }}</span>
            </summary>

            <div class="technical-card__body">
              <p class="muted technical-card__hint">{{ t.serverProfileHint }}</p>
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
              </div>
              <div class="technical-card__actions">
                <button class="btn btn--small btn--primary" :disabled="savingProfile" @click="saveProfile">
                  {{ savingProfile ? t.saving : t.saveProfile }}
                </button>
              </div>
            </div>
          </details>

          <div class="card card--summary">
            <div class="section-head section-head--compact">
              <div>
                <h3>{{ t.packages }}</h3>
                <p class="muted">{{ t.packagesHint }}</p>
              </div>
            </div>
            <div class="summary-stack">
              <div class="summary-item">
                <strong>{{ t.computer }}</strong>
                <p>{{ t.computerHint }}</p>
              </div>
              <div class="summary-item">
                <strong>{{ t.phone }}</strong>
                <p>{{ t.phoneHint }}</p>
              </div>
              <div class="summary-item summary-item--warning">
                <strong>{{ t.binaryHintTitle }}</strong>
                <p>{{ t.binaryHint }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="section-head">
            <div>
              <h3>{{ t.staffRoster }}</h3>
              <p class="muted">{{ t.staffRosterHint }}</p>
            </div>
          </div>

          <div v-if="loadingAccess || loadingStaff" class="empty-state">{{ t.loading }}</div>
          <div v-else class="roster-wrap">
            <div class="roster-table roster-table--head">
              <div>{{ t.employee }}</div>
              <div>{{ t.computer }}</div>
              <div>{{ t.phone }}</div>
            </div>

            <div v-for="staff in staffVpnRows" :key="staff.key" class="roster-table roster-table--row">
              <div>
                <div class="cell-title">{{ staff.displayName }}</div>
                <div class="muted">{{ staff.email }}</div>
              </div>

              <div>
                <div class="device-card">
                  <div class="device-card__top">
                    <div>
                      <div class="cell-title">{{ t.computer }}</div>
                      <div class="muted">{{ deviceNameText(staff.computer, 'computer') }}</div>
                    </div>
                    <span v-if="staff.computer" class="status-pill" :class="`status-pill--${staff.computer.status}`">{{ statusLabel(staff.computer.status) }}</span>
                    <span v-else class="status-pill status-pill--pending">{{ t.noAccess }}</span>
                  </div>

                  <div class="device-meta" v-if="staff.computer">
                    <span class="mono">{{ shortUuid(staff.computer.uuid) }}</span>
                    <span>{{ formatDate(staff.computer.issuedAt) }}</span>
                  </div>

                  <div class="slot-controls">
                    <select
                      class="input select-input"
                      :value="selectedSlotPlatform(staff, 'computer', staff.computer)"
                      @change="setSlotPlatform(staff, 'computer', $event.target.value)"
                    >
                      <option v-for="option in platformOptions('computer')" :key="option.value" :value="option.value">{{ option.label }}</option>
                    </select>

                    <button
                      v-if="staff.computer"
                      class="btn btn--small btn--ghost"
                      :disabled="staff.computer.platform === selectedSlotPlatform(staff, 'computer', staff.computer)"
                      @click="saveSlotPlatform(staff, 'computer', staff.computer)"
                    >
                      {{ t.savePlatform }}
                    </button>

                    <button
                      v-if="staff.computer && canDownloadPlatform(selectedSlotPlatform(staff, 'computer', staff.computer))"
                      class="btn btn--small btn--primary"
                      @click="downloadSlotPackage(staff, 'computer', staff.computer)"
                    >
                      {{ t.downloadArchive }}
                    </button>

                    <button
                      v-if="!staff.computer"
                      class="btn btn--small btn--primary"
                      @click="openCreateForSlot(staff, 'computer')"
                    >
                      {{ t.issueAccess }}
                    </button>
                  </div>

                  <details v-if="staff.computer" class="more-actions">
                    <summary class="btn btn--small">{{ t.more }}</summary>
                    <div class="more-actions__menu">
                      <button class="btn btn--small" @click="openInstruction(staff.computer)">{{ t.open }}</button>
                      <button class="btn btn--small" @click="copyConnection(staff.computer)">{{ t.copy }}</button>
                      <button class="btn btn--small" @click="rotateGrant(staff.computer)">{{ t.rotate }}</button>
                      <button class="btn btn--small" @click="openEditGrant(staff.computer)">{{ t.edit }}</button>
                      <button
                        class="btn btn--small"
                        :class="staff.computer.status === 'disabled' ? 'btn--primary' : 'btn--danger'"
                        @click="toggleGrant(staff.computer)"
                      >
                        {{ staff.computer.status === 'disabled' ? t.activate : t.disable }}
                      </button>
                    </div>
                  </details>
                </div>
              </div>

              <div>
                <div class="device-card">
                  <div class="device-card__top">
                    <div>
                      <div class="cell-title">{{ t.phone }}</div>
                      <div class="muted">{{ deviceNameText(staff.phone, 'phone') }}</div>
                    </div>
                    <span v-if="staff.phone" class="status-pill" :class="`status-pill--${staff.phone.status}`">{{ statusLabel(staff.phone.status) }}</span>
                    <span v-else class="status-pill status-pill--pending">{{ t.noAccess }}</span>
                  </div>

                  <div class="device-meta" v-if="staff.phone">
                    <span class="mono">{{ shortUuid(staff.phone.uuid) }}</span>
                    <span>{{ formatDate(staff.phone.issuedAt) }}</span>
                  </div>

                  <div class="slot-controls">
                    <select
                      class="input select-input"
                      :value="selectedSlotPlatform(staff, 'phone', staff.phone)"
                      @change="setSlotPlatform(staff, 'phone', $event.target.value)"
                    >
                      <option v-for="option in platformOptions('phone')" :key="option.value" :value="option.value">{{ option.label }}</option>
                    </select>

                    <button
                      v-if="staff.phone"
                      class="btn btn--small btn--ghost"
                      :disabled="staff.phone.platform === selectedSlotPlatform(staff, 'phone', staff.phone)"
                      @click="saveSlotPlatform(staff, 'phone', staff.phone)"
                    >
                      {{ t.savePlatform }}
                    </button>

                    <button
                      v-if="!staff.phone"
                      class="btn btn--small btn--primary"
                      @click="openCreateForSlot(staff, 'phone')"
                    >
                      {{ t.issueAccess }}
                    </button>
                  </div>

                  <details v-if="staff.phone" class="more-actions">
                    <summary class="btn btn--small">{{ t.more }}</summary>
                    <div class="more-actions__menu">
                      <button class="btn btn--small" @click="openInstruction(staff.phone)">{{ t.open }}</button>
                      <button class="btn btn--small" @click="copyConnection(staff.phone)">{{ t.copy }}</button>
                      <button class="btn btn--small" @click="rotateGrant(staff.phone)">{{ t.rotate }}</button>
                      <button class="btn btn--small" @click="openEditGrant(staff.phone)">{{ t.edit }}</button>
                      <button
                        class="btn btn--small"
                        :class="staff.phone.status === 'disabled' ? 'btn--primary' : 'btn--danger'"
                        @click="toggleGrant(staff.phone)"
                      >
                        {{ staff.phone.status === 'disabled' ? t.activate : t.disable }}
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="grantModal.open" class="modal-overlay" @click="closeGrantModal">
      <div class="modal" @click.stop>
        <div class="section-head">
          <div>
            <h3>{{ grantModal.mode === 'create' ? t.addAccess : t.editAccess }}</h3>
            <p class="muted">{{ grantModal.mode === 'create' ? t.createGrantHint : t.editGrantHint }}</p>
          </div>
          <button class="btn btn--small" @click="closeGrantModal">{{ t.close }}</button>
        </div>

        <div class="form-grid">
          <div>
            <label>{{ t.employee }}</label>
            <input v-model="grantForm.employeeName" class="input" readonly />
          </div>
          <div>
            <label>Email</label>
            <input v-model="grantForm.employeeEmail" class="input" readonly />
          </div>
          <div>
            <label>{{ t.deviceType }}</label>
            <input class="input" :value="deviceKindLabel(grantForm.deviceKind)" readonly />
          </div>
          <div>
            <label>{{ t.device }}</label>
            <input v-model="grantForm.deviceName" class="input" :placeholder="t.devicePlaceholder" />
          </div>
          <div>
            <label>{{ t.platform }}</label>
            <select v-model="grantForm.platform" class="input select-input">
              <option v-for="option in platformOptions(grantForm.deviceKind || 'computer')" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div>
            <label>{{ t.status }}</label>
            <select v-model="grantForm.status" class="input select-input">
              <option value="active">{{ t.active }}</option>
              <option value="pending">{{ t.pending }}</option>
              <option value="disabled">{{ t.disabled }}</option>
            </select>
          </div>
          <div class="form-grid__wide">
            <label>UUID</label>
            <div class="inline-control">
              <input v-model="grantForm.uuid" class="input" :placeholder="t.uuidPlaceholder" />
              <button class="btn btn--small" @click="generateUuid">{{ t.generate }}</button>
            </div>
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
            <p class="muted">{{ deviceKindLabel(detailPanel.row.deviceKind) }} · {{ detailPanel.row.deviceName }} · {{ detailPanel.row.employeeEmail || detailPanel.row.employeeLogin || '—' }}</p>
          </div>
          <button class="btn btn--small" @click="closeDetailPanel">{{ t.close }}</button>
        </div>

        <div class="detail-block">
          <div class="detail-grid">
            <div><span class="detail-label">UUID</span><span class="mono">{{ detailPanel.row.uuid }}</span></div>
            <div><span class="detail-label">{{ t.status }}</span><span>{{ statusLabel(detailPanel.row.status) }}</span></div>
            <div><span class="detail-label">{{ t.issuedAt }}</span><span>{{ formatDate(detailPanel.row.issuedAt) }}</span></div>
            <div><span class="detail-label">{{ t.platform }}</span><span>{{ platformLabel(detailPanel.row.platform) }}</span></div>
          </div>
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
          <button
            v-if="canDownloadPlatform(detailPanel.row.platform)"
            class="btn"
            @click="downloadPackage(detailPanel.row, detailPanel.row.platform)"
          >
            {{ t.downloadArchive }}
          </button>
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
  deviceKind: 'computer',
  deviceName: '',
  platform: 'macos',
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
    loadingStaff: false,
    savingProfile: false,
    savingGrant: false,
    slotSelections: {},
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
    t () {
      return this.$store.state.language === 'ru'
        ? {
            section: 'Служебный доступ',
            title: 'Корпоративный VPN',
            subtitle: 'Список сотрудников такой же, как в настройках: на каждого отдельно ведём доступ для компьютера и телефона.',
            refresh: 'Обновить',
            saving: 'Сохраняем...',
            serverProfile: 'Профиль VPN-сервера',
            serverProfileHint: 'Общие параметры VLESS + REALITY для всех сотрудников.',
            saveProfile: 'Сохранить профиль',
            profileName: 'Название профиля',
            server: 'Сервер',
            serverExample: '92.118.234.170',
            port: 'Порт',
            serverName: 'serverName / SNI',
            serverNameExample: 'www.microsoft.com',
            publicKey: 'publicKey',
            shortId: 'shortId',
            packages: 'Пакеты доступа',
            packagesHint: 'Архив формируется персонально по UUID сотрудника. Для компьютера доступно скачивание готового пакета.',
            computer: 'Компьютер',
            phone: 'Телефон',
            computerHint: 'Выбираем macOS или Windows — после этого появляется кнопка скачивания архива.',
            phoneHint: 'Для телефона храним отдельный UUID, платформу и можем быстро отключить или перевыпустить доступ.',
            binaryHintTitle: 'Что ещё нужно для скачивания',
            binaryHint: 'На сервере должны быть заданы пути к бинарникам sing-box. Если их нет, система покажет понятную ошибку вместо битого архива.',
            openTechnical: 'Технические параметры',
            staffRoster: 'Сотрудники Riderra',
            staffRosterHint: 'Фиксированный внутренний список сотрудников. На каждого — два слота: телефон и компьютер.',
            loading: 'Загрузка...',
            employee: 'Сотрудник',
            noAccess: 'Нет доступа',
            issuedAt: 'Дата выдачи',
            status: 'Статус',
            device: 'Устройство',
            deviceType: 'Тип устройства',
            platform: 'Платформа',
            issueAccess: 'Выдать доступ',
            savePlatform: 'Сохранить платформу',
            downloadArchive: 'Скачать архив',
            more: 'Ещё',
            open: 'Открыть',
            copy: 'Копировать',
            rotate: 'Перевыпустить',
            edit: 'Изменить',
            editAccess: 'Изменить доступ',
            activate: 'Активировать',
            disable: 'Отключить',
            active: 'Active',
            pending: 'Pending',
            disabled: 'Disabled',
            addAccess: 'Выдать доступ',
            createGrantHint: 'Выдаём персональный UUID для выбранного слота сотрудника.',
            editGrantHint: 'Меняем платформу, имя устройства, статус или комментарий.',
            devicePlaceholder: 'Например, MacBook Air / iPhone 15',
            uuidPlaceholder: 'UUID доступа',
            generate: 'Сгенерировать',
            comment: 'Комментарий',
            commentPlaceholder: 'Заметки по устройству, дате выдачи или ограничениям.',
            save: 'Сохранить',
            cancel: 'Отмена',
            close: 'Закрыть',
            connectionParams: 'Параметры подключения',
            connectionParamsHint: 'Готовый комплект для отправки сотруднику.',
            copyAll: 'Копировать всё',
            connectionUri: 'Готовый URI',
            readyInstructionMissing: 'Сначала заполните профиль VPN сервера.',
            copySuccess: 'Параметры скопированы.',
            saveSuccess: 'Изменения сохранены.',
            disableSuccess: 'Доступ отключён.',
            activateSuccess: 'Доступ активирован.',
            rotateSuccess: 'UUID перевыпущен.',
            serverProfileRequired: 'Для инструкции нужно заполнить сервер, publicKey, shortId и serverName.',
            computerLabel: 'Компьютер',
            phoneLabel: 'Телефон'
          }
        : {
            section: 'Internal Access',
            title: 'Corporate VPN',
            subtitle: 'The staff list mirrors Settings: each employee has dedicated computer and phone access slots.',
            refresh: 'Refresh',
            saving: 'Saving...',
            serverProfile: 'VPN server profile',
            serverProfileHint: 'Shared VLESS + REALITY parameters for all staff.',
            saveProfile: 'Save profile',
            profileName: 'Profile name',
            server: 'Server',
            serverExample: '92.118.234.170',
            port: 'Port',
            serverName: 'serverName / SNI',
            serverNameExample: 'www.microsoft.com',
            publicKey: 'publicKey',
            shortId: 'shortId',
            packages: 'Access packages',
            packagesHint: 'Archives are generated per employee UUID. Computer access can be downloaded as a ready-to-run package.',
            computer: 'Computer',
            phone: 'Phone',
            computerHint: 'Pick macOS or Windows and the archive download becomes available.',
            phoneHint: 'Phone access keeps its own UUID and platform so you can revoke or rotate it separately.',
            binaryHintTitle: 'What download still needs',
            binaryHint: 'The server must know where the sing-box binaries live. If not configured, the UI returns a clear error instead of a broken archive.',
            openTechnical: 'Technical settings',
            staffRoster: 'Riderra staff',
            staffRosterHint: 'A fixed internal list of employees. Each employee gets two slots: phone and computer.',
            loading: 'Loading...',
            employee: 'Employee',
            noAccess: 'No access',
            issuedAt: 'Issued',
            status: 'Status',
            device: 'Device',
            deviceType: 'Device type',
            platform: 'Platform',
            issueAccess: 'Issue access',
            savePlatform: 'Save platform',
            downloadArchive: 'Download archive',
            more: 'More',
            open: 'Open',
            copy: 'Copy',
            rotate: 'Rotate',
            edit: 'Edit',
            editAccess: 'Edit access',
            activate: 'Activate',
            disable: 'Disable',
            active: 'Active',
            pending: 'Pending',
            disabled: 'Disabled',
            addAccess: 'Issue access',
            createGrantHint: 'Issue a personal UUID for the selected employee slot.',
            editGrantHint: 'Adjust platform, device name, status or notes.',
            devicePlaceholder: 'For example, MacBook Air / iPhone 15',
            uuidPlaceholder: 'Access UUID',
            generate: 'Generate',
            comment: 'Comment',
            commentPlaceholder: 'Notes about the device, issue date or restrictions.',
            save: 'Save',
            cancel: 'Cancel',
            close: 'Close',
            connectionParams: 'Connection parameters',
            connectionParamsHint: 'Ready to send to the employee.',
            copyAll: 'Copy all',
            connectionUri: 'Connection URI',
            readyInstructionMissing: 'Fill the VPN server profile first.',
            copySuccess: 'Connection copied.',
            saveSuccess: 'Changes saved.',
            disableSuccess: 'Access disabled.',
            activateSuccess: 'Access activated.',
            rotateSuccess: 'UUID rotated.',
            serverProfileRequired: 'Fill server, publicKey, shortId and serverName first.',
            computerLabel: 'Computer',
            phoneLabel: 'Phone'
          }
    },
    staffVpnRows () {
      return this.staffOptions
        .map((staff) => {
          const grants = this.rows.filter((row) => this.rowBelongsToStaff(row, staff))
          const computer = this.pickGrantForKind(grants, 'computer')
          const phone = this.pickGrantForKind(grants, 'phone')
          return {
            key: staff.id || staff.email,
            displayName: staff.displayName || (staff.email ? staff.email.split('@')[0] : '—'),
            email: staff.email || '—',
            roles: staff.roles || [],
            rolesLabel: (staff.roles || []).join(', '),
            computer,
            phone
          }
        })
        .sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || ''), this.$store.state.language === 'ru' ? 'ru' : 'en'))
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
      this.syncSlotSelections()
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
        shortId: this.profile.shortId || ''
      }
    },
    async loadAccess () {
      this.loadingAccess = true
      try {
        const body = await this.fetchJson('/api/admin/vpn/access')
        this.rows = Array.isArray(body.rows) ? body.rows : []
        if (body.profile) this.profile = body.profile
      } finally {
        this.loadingAccess = false
      }
    },
    async loadStaff () {
      this.loadingStaff = true
      try {
        const body = await this.fetchJson('/api/admin/staff-users')
        this.staffOptions = (body.rows || []).map((row) => ({
          id: row.id,
          displayName: row.displayName || row.email,
          email: row.email,
          roles: row.roles || []
        }))
      } finally {
        this.loadingStaff = false
      }
    },
    syncSlotSelections () {
      const next = {}
      this.staffVpnRows.forEach((staff) => {
        ;['computer', 'phone'].forEach((kind) => {
          const access = staff[kind]
          next[this.slotKey(staff, kind)] = access?.platform || this.defaultPlatformForKind(kind)
        })
      })
      this.slotSelections = next
    },
    rowBelongsToStaff (row, staff) {
      const email = String(staff.email || '').trim().toLowerCase()
      const rowEmail = String(row.employeeEmail || '').trim().toLowerCase()
      const rowLogin = String(row.employeeLogin || '').trim().toLowerCase()
      return Boolean(email) && (rowEmail === email || rowLogin === email)
    },
    inferDeviceKind (row) {
      if (row?.deviceKind === 'computer' || row?.deviceKind === 'phone') return row.deviceKind
      const text = String(row?.deviceName || '').trim().toLowerCase()
      if (/(iphone|android|phone|телефон|ios|ipad)/.test(text)) return 'phone'
      return 'computer'
    },
    pickGrantForKind (grants, kind) {
      if (!Array.isArray(grants) || !grants.length) return null
      const direct = grants.find((row) => this.inferDeviceKind(row) === kind)
      return direct || null
    },
    slotKey (staff, kind) {
      return `${staff.email || staff.key}:${kind}`
    },
    defaultPlatformForKind (kind) {
      return kind === 'phone' ? 'ios' : 'macos'
    },
    profileSummaryText () {
      const host = String(this.profileDraft.serverHost || '').trim()
      const port = this.profileDraft.serverPort || 443
      const serverName = String(this.profileDraft.serverName || '').trim()
      const shortId = String(this.profileDraft.shortId || '').trim()
      if (!host || !serverName || !shortId) {
        return this.$store.state.language === 'ru'
          ? 'Профиль ещё не заполнен полностью.'
          : 'Profile is not configured yet.'
      }
      return `${host}:${port} · ${serverName} · shortId ${shortId}`
    },
    platformOptions (kind) {
      if (kind === 'phone') {
        return [
          { value: 'ios', label: 'iPhone / iOS' },
          { value: 'android', label: 'Android' }
        ]
      }
      return [
        { value: 'macos', label: 'macOS' },
        { value: 'windows', label: 'Windows' }
      ]
    },
    selectedSlotPlatform (staff, kind, access) {
      const key = this.slotKey(staff, kind)
      return this.slotSelections[key] || access?.platform || this.defaultPlatformForKind(kind)
    },
    setSlotPlatform (staff, kind, value) {
      this.$set(this.slotSelections, this.slotKey(staff, kind), value)
    },
    canDownloadPlatform (platform) {
      return ['macos', 'windows'].includes(String(platform || '').trim().toLowerCase())
    },
    deviceKindLabel (kind) {
      return kind === 'phone' ? this.t.phoneLabel : this.t.computerLabel
    },
    deviceNameText (access, kind) {
      if (access?.deviceName) return access.deviceName
      return kind === 'phone' ? 'iPhone / Android' : 'Mac / Windows'
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
    openCreateForSlot (staff, kind) {
      this.grantModal = { open: true, mode: 'create', rowId: null }
      this.grantForm = {
        ...emptyGrantForm(),
        employeeName: staff.displayName,
        employeeEmail: staff.email,
        employeeLogin: staff.email,
        deviceKind: kind,
        deviceName: kind === 'phone' ? 'Personal phone' : 'Work computer',
        platform: this.selectedSlotPlatform(staff, kind)
      }
      this.generateUuid()
    },
    openEditGrant (row) {
      this.grantModal = { open: true, mode: 'edit', rowId: row.id }
      this.grantForm = {
        employeeName: row.employeeName || '',
        employeeEmail: row.employeeEmail || '',
        employeeLogin: row.employeeLogin || '',
        deviceKind: this.inferDeviceKind(row),
        deviceName: row.deviceName || '',
        platform: row.platform || this.defaultPlatformForKind(this.inferDeviceKind(row)),
        uuid: row.uuid || '',
        status: row.status || 'pending',
        syncState: row.syncState || 'pending',
        comment: row.comment || '',
        connectionLabel: row.connectionLabel || ''
      }
    },
    closeGrantModal () {
      this.grantModal = { open: false, mode: 'create', rowId: null }
      this.grantForm = emptyGrantForm()
    },
    openGrant (row) {
      this.detailPanel = {
        open: true,
        row,
        instruction: row.connection || {},
        instructionText: this.buildInstructionText(row.connection || {})
      }
    },
    closeDetailPanel () {
      this.detailPanel = { open: false, row: null, instruction: {}, instructionText: '' }
    },
    openEditFromDrawer () {
      const row = this.detailPanel.row
      this.closeDetailPanel()
      this.openEditGrant(row)
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
        this.syncSlotSelections()
        this.setNotice('ok', this.t.saveSuccess)
        this.closeGrantModal()
      } catch (error) {
        this.setNotice('error', error.message)
      } finally {
        this.savingGrant = false
      }
    },
    buildGrantPayload (row, overrides = {}) {
      return {
        employeeName: row.employeeName,
        employeeEmail: row.employeeEmail,
        employeeLogin: row.employeeLogin,
        deviceKind: this.inferDeviceKind(row),
        deviceName: row.deviceName,
        platform: row.platform,
        uuid: row.uuid,
        status: row.status,
        syncState: row.syncState,
        comment: row.comment || '',
        connectionLabel: row.connectionLabel || '',
        ...overrides
      }
    },
    async updateGrantRecord (row, overrides = {}) {
      const body = await this.fetchJson(`/api/admin/vpn/access/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': this.makeIdempotencyKey(`vpn-access-update-${row.id}`) },
        body: JSON.stringify(this.buildGrantPayload(row, overrides))
      })
      this.upsertRow(body.row)
      this.syncSlotSelections()
      return body.row
    },
    async saveSlotPlatform (staff, kind, row) {
      try {
        const platform = this.selectedSlotPlatform(staff, kind, row)
        await this.updateGrantRecord(row, { platform, deviceKind: kind })
        this.setNotice('ok', this.t.saveSuccess)
      } catch (error) {
        this.setNotice('error', error.message)
      }
    },
    async downloadSlotPackage (staff, kind, row) {
      try {
        const platform = this.selectedSlotPlatform(staff, kind, row)
        let effectiveRow = row
        if (row.platform !== platform) {
          effectiveRow = await this.updateGrantRecord(row, { platform, deviceKind: kind })
        }
        await this.downloadPackage(effectiveRow, platform)
      } catch (error) {
        this.setNotice('error', error.message)
      }
    },
    async downloadPackage (row, platform) {
      try {
        const token = localStorage.getItem('authToken')
        const response = await fetch(`/api/admin/vpn/access/${row.id}/package?platform=${encodeURIComponent(platform)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body.error || `HTTP ${response.status}`)
        }
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        const disposition = response.headers.get('Content-Disposition') || ''
        const match = disposition.match(/filename=\"?([^\";]+)\"?/) 
        link.href = url
        link.download = match && match[1] ? match[1] : `${row.employeeName || 'employee'}-${platform}.zip`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        this.setNotice('error', error.message)
      }
    },
    async rotateGrant (row) {
      try {
        const body = await this.fetchJson(`/api/admin/vpn/access/${row.id}/rotate`, {
          method: 'POST',
          headers: { 'Idempotency-Key': this.makeIdempotencyKey(`vpn-rotate-${row.id}`) }
        })
        this.upsertRow(body.row)
        this.syncSlotSelections()
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
        this.syncSlotSelections()
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
    platformLabel (platform) {
      if (platform === 'windows') return 'Windows'
      if (platform === 'macos') return 'macOS'
      if (platform === 'ios') return 'iPhone / iOS'
      if (platform === 'android') return 'Android'
      return '—'
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
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 24px 60px rgba(16, 24, 40, 0.08);
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
  color: #6b7280;
}

.hero-actions {
  display: flex;
  gap: 12px;
}

.content-grid {
  display: grid;
  gap: 20px;
  margin: 20px 0;
}

.content-grid--vpn {
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
}

.card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 24px 60px rgba(16, 24, 40, 0.08);
}

.technical-card {
  padding: 0;
  overflow: hidden;
}

.technical-card__summary {
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  cursor: pointer;
}

.technical-card__summary::-webkit-details-marker {
  display: none;
}

.technical-card__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid #d7e0ef;
  background: #f8fbff;
  color: #21385f;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.technical-card__body {
  padding: 0 24px 24px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.technical-card__hint {
  margin: 16px 0 18px;
}

.technical-card__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.section-head h3,
.section-head h4,
.cell-title {
  margin: 0;
  color: #12224a;
}

.section-head--compact {
  margin-bottom: 12px;
}

.form-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form-grid__wide {
  grid-column: span 3;
}

label,
.detail-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #31456a;
}

.input,
.textarea,
.select-input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid #d8e0ee;
  background: #fff;
  font-size: 15px;
  color: #12224a;
}

.textarea {
  min-height: 110px;
  resize: vertical;
}

.textarea--compact {
  min-height: 72px;
}

.notice {
  margin: 16px 0;
  padding: 14px 16px;
  border-radius: 14px;
  font-weight: 600;
}

.notice--ok {
  background: #ecfdf3;
  color: #166534;
}

.notice--error {
  background: #fef2f2;
  color: #991b1b;
}

.summary-stack {
  display: grid;
  gap: 14px;
}

.summary-item {
  padding: 16px 18px;
  border-radius: 18px;
  background: #f6f8fc;
}

.summary-item p {
  margin: 8px 0 0;
  color: #5f6f8d;
  line-height: 1.5;
}

.summary-item--warning {
  background: #fff8eb;
}

.roster-wrap {
  overflow-x: auto;
}

.roster-table {
  display: grid;
  grid-template-columns: minmax(220px, 0.95fr) minmax(360px, 1.2fr) minmax(360px, 1.2fr);
  gap: 16px;
  align-items: stretch;
}

.roster-table--head {
  margin-bottom: 12px;
  padding: 0 4px;
  font-size: 13px;
  font-weight: 800;
  color: #31456a;
}

.roster-table--row {
  padding: 18px 0;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.device-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid #dbe4f2;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.device-card__top,
.device-meta,
.slot-controls,
.slot-actions,
.param-row,
.modal-actions,
.inline-control,
.detail-grid {
  display: flex;
  gap: 10px;
}

.device-card__top,
.param-row {
  justify-content: space-between;
  align-items: flex-start;
}

.device-meta {
  flex-wrap: wrap;
  font-size: 13px;
  color: #5f6f8d;
}

.slot-controls,
.slot-actions,
.modal-actions {
  flex-wrap: wrap;
}

.slot-controls {
  align-items: center;
}

.slot-controls .select-input {
  flex: 1 1 180px;
}

.more-actions {
  position: relative;
}

.more-actions summary {
  list-style: none;
}

.more-actions summary::-webkit-details-marker {
  display: none;
}

.more-actions__menu {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
  border: 1px solid #dbe4f2;
  border-radius: 14px;
  background: #f8fbff;
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
  background: #ecfdf3;
  color: #166534;
}

.status-pill--pending {
  background: #eff6ff;
  color: #1d4ed8;
}

.status-pill--disabled {
  background: #fef2f2;
  color: #991b1b;
}

.scope-pill,
.sync-pill {
  background: #eef2ff;
  color: #3b4bb8;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
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

.btn--small {
  padding: 9px 12px;
  font-size: 13px;
}

.btn--primary {
  background: #1f4fff;
  color: #fff;
}

.btn--ghost {
  background: #f8fbff;
  color: #21385f;
  border: 1px solid #d7e0ef;
}

.btn--danger {
  background: #b42318;
  color: #fff;
}

.btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: #64748b;
}

.modal-overlay,
.drawer-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.35);
  z-index: 50;
  padding: 24px;
}

.modal,
.drawer {
  width: min(900px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  background: #fff;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.25);
}

.drawer {
  width: min(720px, 100%);
}

.detail-block {
  margin-top: 18px;
}

.detail-grid {
  flex-wrap: wrap;
}

.detail-grid > div {
  min-width: 220px;
  flex: 1 1 220px;
  padding: 14px;
  border-radius: 16px;
  background: #f8fafc;
}

.params-list {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
}

.param-row {
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fafc;
}

@media (max-width: 1100px) {
  .content-grid--vpn,
  .form-grid,
  .roster-table {
    grid-template-columns: 1fr;
  }

  .form-grid__wide {
    grid-column: span 1;
  }

  .hero-card,
  .section-head {
    flex-direction: column;
  }

  .technical-card__summary {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
