<template>
  <div>
    <div class="page-background"><div class="page-background__gradient"></div><div class="page-background__overlay"></div></div>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <admin-tabs />

        <div class="settings-overview">
          <div v-for="card in overviewCards" :key="card.key" class="overview-card" :class="`overview-card--${card.tone}`">
            <div class="overview-card__value">{{ card.value }}</div>
            <div class="overview-card__label">{{ card.label }}</div>
            <div class="overview-card__hint">{{ card.hint }}</div>
          </div>
        </div>

        <div class="section-switch">
          <button
            v-for="section in sections"
            :key="section.key"
            type="button"
            class="section-pill"
            :class="{ 'section-pill--active': activeSection === section.key }"
            @click="activeSection = section.key"
          >
            <span>{{ section.label }}</span>
            <small>{{ section.hint }}</small>
          </button>
        </div>

        <div v-if="activeSection === 'sources'" class="settings-card">
          <div class="card-head">
            <div>
              <h3>{{ t.sheetSources }}</h3>
              <p class="card-hint">{{ t.sheetSourcesHint }}</p>
            </div>
          </div>

          <div class="email-ingest-card">
            <div class="email-ingest-card__head">
              <div>
                <strong>{{ t.emailIngestTitle }}</strong>
                <p class="card-hint">{{ t.emailIngestHint }}</p>
              </div>
              <span class="scope-pill" :class="{ 'scope-pill--warn': !emailIngest.tokenConfigured }">
                {{ emailIngest.tokenConfigured ? t.emailIngestReady : t.emailIngestNotReady }}
              </span>
            </div>
            <div class="email-ingest-grid">
              <div class="entity-stack">
                <span class="muted">{{ t.emailIngestInbox }}</span>
                <strong>{{ emailIngest.technicalInbox || 'riderratech@gmail.com' }}</strong>
              </div>
              <div class="entity-stack">
                <span class="muted">{{ t.emailIngestEndpoint }}</span>
                <strong class="cell-wrap">{{ emailIngest.internalUrl || '-' }}</strong>
              </div>
            </div>
          </div>

          <div class="geo-zone-card">
            <div class="geo-zone-card__head">
              <div>
                <strong>{{ t.geoZonesTitle }}</strong>
                <p class="card-hint">{{ t.geoZonesHint }}</p>
              </div>
              <span class="scope-pill" :class="{ 'scope-pill--warn': !geoZoneImport.configured }">
                {{ geoZoneImport.configured ? t.geoZonesLoaded : t.geoZonesEmpty }}
              </span>
            </div>
            <div v-if="geoZoneNotice.text" class="notice" :class="geoZoneNotice.type === 'error' ? 'notice--error' : 'notice--ok'">
              {{ geoZoneNotice.text }}
            </div>
            <div class="geo-zone-upload">
              <input
                ref="geoZoneFile"
                type="file"
                class="input geo-zone-upload__file"
                accept=".kml,.kmz,.csv,.geojson,.json"
                @change="onGeoZoneFileChange"
              />
              <button class="btn btn--primary" :disabled="geoZoneUploading || !geoZoneFile" @click="uploadGeoZoneFile">
                {{ geoZoneUploading ? t.geoZonesUploading : t.geoZonesUpload }}
              </button>
            </div>
            <div class="geo-zone-meta">
              <div class="entity-stack">
                <span class="muted">{{ t.geoZonesLatestFile }}</span>
                <strong>{{ latestGeoZone.originalFileName || '-' }}</strong>
              </div>
              <div class="entity-stack">
                <span class="muted">{{ t.geoZonesUpdatedAt }}</span>
                <strong>{{ formatDateTime(latestGeoZone.uploadedAt) }}</strong>
              </div>
              <div class="entity-stack">
                <span class="muted">{{ t.geoZonesCount }}</span>
                <strong>{{ latestGeoZone.zoneCount != null ? latestGeoZone.zoneCount : '-' }}</strong>
              </div>
              <div class="entity-stack">
                <span class="muted">{{ t.geoZonesFormat }}</span>
                <strong>{{ latestGeoZone.format || '-' }}</strong>
              </div>
            </div>
            <div v-if="latestGeoZone.sampleZones && latestGeoZone.sampleZones.length" class="geo-zone-sample">
              <span v-for="zone in latestGeoZone.sampleZones" :key="zone" class="scope-pill">{{ zone }}</span>
            </div>
            <p v-if="latestGeoZone.warnings && latestGeoZone.warnings.length" class="card-hint card-hint--warn">
              {{ latestGeoZone.warnings.join(' ') }}
            </p>
          </div>

          <div v-if="sheetNotice.text" class="notice" :class="sheetNotice.type === 'error' ? 'notice--error' : 'notice--ok'">
            {{ sheetNotice.text }}
          </div>
          <div class="form-grid">
            <input v-model="sheetForm.name" class="input" :placeholder="t.sheetName" />
            <input v-model="sheetForm.monthLabel" class="input" :placeholder="t.sheetMonth" />
            <input v-model="sheetForm.googleSheetId" class="input form-grid__wide" :placeholder="t.sheetId" />
            <input v-model="sheetForm.tabName" class="input" :placeholder="t.sheetTab" />
            <input v-model="sheetForm.detailsTabName" class="input" :placeholder="t.detailsTab" />
          </div>
          <div class="inline-actions">
            <button class="btn btn--primary" @click="createSheetSource">{{ t.add }}</button>
          </div>

          <div class="ops-table">
            <div class="ops-table__head ops-table__head--sources">
              <div>{{ t.name }}</div><div>{{ t.month }}</div><div>Sheet ID</div><div>Tab</div><div>{{ t.detailsTab }}</div><div>{{ t.status }}</div><div>{{ t.actions }}</div>
            </div>
            <div v-for="s in sheets" :key="s.id" class="ops-table__row ops-table__row--sources">
              <div class="entity-stack">
                <strong>{{ s.name }}</strong>
                <span class="muted">{{ shortSheetId(s.googleSheetId) }}</span>
              </div>
              <div>{{ s.monthLabel }}</div>
              <div class="cell-wrap" :title="s.googleSheetId">{{ shortSheetId(s.googleSheetId) }}</div>
              <div>{{ s.tabName }}</div>
              <div>{{ s.detailsTabName || 'подробности' }}</div>
              <div class="entity-stack">
                <strong>{{ s.isCurrent ? t.currentSheet : t.inactiveSheet }}</strong>
                <span class="muted" v-if="s.lastSyncStatus">{{ s.lastSyncStatus }}</span>
                <span class="muted muted--error" v-if="s.lastSyncError">{{ s.lastSyncError }}</span>
              </div>
              <div class="row-actions">
                <button class="btn btn--small btn--primary" :disabled="syncingSheetId === s.id" @click="syncSheet(s.id)">
                  {{ syncingSheetId === s.id ? t.syncing : t.sync }}
                </button>
                <button class="btn btn--small" @click="openMapping(s)">{{ t.mapping }}</button>
                <button v-if="!s.isCurrent" class="btn btn--small" @click="toggleSheet(s)">{{ t.makeCurrent }}</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeSection === 'staff'" class="settings-card">
          <div class="card-head">
            <div>
              <h3>{{ t.staffTelegram }}</h3>
              <p class="card-hint">{{ t.staffTelegramHint }}</p>
            </div>
          </div>
          <div v-if="staffNotice.text" class="notice" :class="staffNotice.type === 'error' ? 'notice--error' : 'notice--ok'">
            {{ staffNotice.text }}
          </div>
          <div class="ops-table">
            <div class="ops-table__head ops-table__head--staff" :class="{ 'ops-table__head--staff-private': !canViewStaffRoles }">
              <div>{{ t.staffMember }}</div>
              <div v-if="canViewStaffRoles">{{ t.roles }}</div>
              <div>{{ t.telegramId }}</div>
              <div>{{ t.actions }}</div>
            </div>
            <div v-for="u in staff" :key="u.id" class="ops-table__row ops-table__row--staff" :class="{ 'ops-table__row--staff-private': !canViewStaffRoles }">
              <div class="staff-identity">
                <strong>{{ u.displayName || u.email }}</strong>
                <span class="muted">{{ u.email }}</span>
              </div>
              <div v-if="canViewStaffRoles">{{ (u.roles || []).join(', ') || '-' }}</div>
              <div>
                <input v-model="staffDrafts[u.id]" class="input" :placeholder="t.telegramId" />
              </div>
              <div class="row-actions row-actions--stack row-actions--stack-tight">
                <button class="btn btn--small btn--primary" @click="saveStaffLink(u)">{{ t.save }}</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeSection === 'access' && canViewStaffRoles" class="settings-card">
          <div class="card-head">
            <div>
              <h3>{{ t.accessScopes }}</h3>
              <p class="card-hint">{{ t.accessScopesHint }}</p>
            </div>
          </div>
          <div v-if="staffNotice.text" class="notice" :class="staffNotice.type === 'error' ? 'notice--error' : 'notice--ok'">
            {{ staffNotice.text }}
          </div>
          <div class="ops-table ops-table--access">
            <div class="ops-table__head ops-table__head--access">
              <div>{{ t.staffMember }}</div>
              <div>{{ t.accessAreas }}</div>
              <div>{{ t.actions }}</div>
            </div>
            <div v-for="u in staff" :key="`${u.id}-access`" class="ops-table__row ops-table__row--access">
              <div class="staff-identity">
                <strong>{{ u.displayName || u.email }}</strong>
                <span class="muted">{{ u.email }}</span>
                <span class="muted">{{ t.globalScope }}</span>
              </div>
              <div class="access-area-picker">
                <label
                  v-for="opt in teamOptions"
                  :key="`${u.id}-${opt.value}`"
                  class="access-area-option"
                  :class="{
                    'access-area-option--selected': isAccessAreaSelected(u.id, opt.value),
                    'access-area-option--all': opt.value === 'all'
                  }"
                >
                  <input
                    type="checkbox"
                    :checked="isAccessAreaSelected(u.id, opt.value)"
                    @change="toggleAccessArea(u.id, opt.value, $event.target.checked)"
                  />
                  <span class="access-area-option__body">
                    <strong>{{ opt.label }}</strong>
                    <small>{{ opt.hint }}</small>
                  </span>
                </label>
                <span class="access-area-summary">{{ accessAreaSummary(u.id) }}</span>
              </div>
              <div class="row-actions row-actions--stack row-actions--stack-tight">
                <button
                  class="btn btn--small btn--primary"
                  :disabled="savingAccessId === u.id || !hasSelectedAccessAreas(u.id)"
                  @click="saveStaffAbac(u)"
                >
                  {{ savingAccessId === u.id ? t.savingAccess : t.saveScopes }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="mappingModal.open" class="modal-overlay" @click="closeMapping">
      <div class="modal" @click.stop>
        <h3>{{ t.mappingTitle }}: {{ mappingModal.sourceName }}</h3>
        <p class="card-hint">{{ t.mappingHint }}</p>
        <div class="map-grid">
          <div class="map-row" v-for="f in mappingFields" :key="f.key">
            <div class="map-label">{{ f.label }}</div>
            <input v-model="mapDraft[f.key]" class="input" :placeholder="f.placeholder" />
          </div>
        </div>
        <div class="row-actions">
          <button class="btn btn--primary" @click="saveMapping">{{ t.save }}</button>
          <button class="btn" @click="closeMapping">{{ t.close }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import adminTabs from '~/components/partials/adminTabs.vue'

export default {
  layout: 'admin',
  middleware: 'staff',
  components: { adminTabs },
  data: () => ({
    activeSection: 'sources',
    sheets: [],
    staff: [],
    currentUserEmail: '',
    emailIngest: {
      technicalInbox: 'riderratech@gmail.com',
      internalUrl: '',
      tokenConfigured: false
    },
    geoZoneImport: {
      configured: false,
      latest: null
    },
    geoZoneFile: null,
    geoZoneUploading: false,
    sheetForm: { name: '', monthLabel: '', googleSheetId: '', tabName: 'таблица', detailsTabName: 'подробности' },
    staffDrafts: {},
    abacDrafts: {},
    savingAccessId: null,
    syncingSheetId: null,
    sheetNotice: { type: 'ok', text: '' },
    geoZoneNotice: { type: 'ok', text: '' },
    staffNotice: { type: 'ok', text: '' },
    mappingModal: { open: false, sourceId: '', sourceName: '' },
    mapDraft: {
      contractor: '', orderNumber: '', date: '', fromPoint: '', toPoint: '',
      sum: '', driver: '', comment: '', internalOrderNumber: '', vehicleType: '',
      status: '', passengers: '', luggage: '', lang: ''
    }
  }),
  computed: {
    sections () {
      const list = this.$store.state.language === 'ru'
        ? [
            { key: 'sources', label: 'Источники', hint: 'Google Sheets и маппинг' },
            { key: 'staff', label: 'Сотрудники и Telegram', hint: 'Привязка людей' },
            { key: 'access', label: 'Права доступа', hint: 'Области работы' }
          ]
        : [
            { key: 'sources', label: 'Sources', hint: 'Google Sheets and mapping' },
            { key: 'staff', label: 'Staff and Telegram', hint: 'Link people' },
            { key: 'access', label: 'Access', hint: 'Work areas' }
          ]
      return this.canViewStaffRoles ? list : list.filter((section) => section.key !== 'access')
    },
    overviewCards () {
      const activeSheets = this.sheets.filter((sheet) => sheet.isCurrent).length
      const mappedSheets = this.sheets.filter((sheet) => String(sheet.columnMapping || '').trim()).length
      const telegramLinked = this.staff.filter((user) => String((user.telegramLinks && user.telegramLinks[0] && user.telegramLinks[0].telegramUserId) || '').trim()).length
      const teamScoped = this.staff.filter((user) => {
        const teams = Array.isArray(user.abacTeams) ? user.abacTeams : []
        return teams.length && !teams.includes('all')
      }).length
      const cards = this.$store.state.language === 'ru'
        ? [
            { key: 'sheets', value: this.sheets.length, label: 'Источников', hint: 'Подключённые месячные таблицы', tone: 'neutral' },
            { key: 'active', value: activeSheets, label: 'Актуальная таблица', hint: 'Показывается в заказах и синхронизируется', tone: activeSheets ? 'ok' : 'warn' },
            { key: 'mapped', value: mappedSheets, label: 'С маппингом', hint: 'Колонки связаны с Riderra', tone: mappedSheets ? 'info' : 'warn' },
            { key: 'staff', value: this.staff.length, label: 'Сотрудников', hint: 'Стартовый roster кабинета', tone: 'neutral' },
            { key: 'telegram', value: telegramLinked, label: 'С Telegram ID', hint: 'Готовы к командам и уведомлениям', tone: telegramLinked ? 'ok' : 'warn' },
            { key: 'scoped', value: teamScoped, label: 'Ограниченный доступ', hint: 'Выбраны конкретные области работы', tone: teamScoped ? 'info' : 'neutral' }
          ]
        : [
            { key: 'sheets', value: this.sheets.length, label: 'Sources', hint: 'Connected monthly sheets', tone: 'neutral' },
            { key: 'active', value: activeSheets, label: 'Current sheet', hint: 'Shown in orders and synchronized', tone: activeSheets ? 'ok' : 'warn' },
            { key: 'mapped', value: mappedSheets, label: 'Mapped', hint: 'Columns linked to Riderra', tone: mappedSheets ? 'info' : 'warn' },
            { key: 'staff', value: this.staff.length, label: 'Staff', hint: 'Current portal roster', tone: 'neutral' },
            { key: 'telegram', value: telegramLinked, label: 'With Telegram ID', hint: 'Ready for commands and alerts', tone: telegramLinked ? 'ok' : 'warn' },
            { key: 'scoped', value: teamScoped, label: 'Scoped', hint: 'Team-specific access', tone: teamScoped ? 'info' : 'neutral' }
          ]
      return this.canViewStaffRoles ? cards : cards.filter((card) => card.key !== 'scoped')
    },
    latestGeoZone () {
      return this.geoZoneImport.latest || {}
    },
    mappingFields () {
      return [
        { key: 'contractor', label: 'Контрагент', placeholder: 'Контрагент' },
        { key: 'orderNumber', label: 'Номер заказа', placeholder: 'Номер заказа' },
        { key: 'date', label: 'Дата', placeholder: 'Дата' },
        { key: 'fromPoint', label: 'Откуда', placeholder: 'Откуда' },
        { key: 'toPoint', label: 'Куда', placeholder: 'Куда' },
        { key: 'sum', label: 'Сумма', placeholder: 'Сумма' },
        { key: 'driver', label: 'Водитель', placeholder: 'Водитель' },
        { key: 'comment', label: 'Комментарий', placeholder: 'Комментарий' },
        { key: 'internalOrderNumber', label: 'Внутренний номер заказа', placeholder: 'Внутренний номер заказа' },
        { key: 'vehicleType', label: 'Тип авто', placeholder: 'Тип авто / Класс' },
        { key: 'status', label: 'Статус', placeholder: 'Статус' },
        { key: 'passengers', label: 'Пассажиры', placeholder: 'Пассажиры' },
        { key: 'luggage', label: 'Багаж', placeholder: 'Багаж' },
        { key: 'lang', label: 'Язык', placeholder: 'Язык' }
      ]
    },
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'Настройки интеграций',
            subtitle: 'Здесь собраны только служебные настройки: откуда брать данные, кого связали с Telegram и кому какие команды доступны.',
            sheetSources: 'Источники заказов',
            sheetSourcesHint: 'Подключение месячных Google Sheets, синхронизация и маппинг колонок для таблицы заказов Riderra.',
            emailIngestTitle: 'Техническая почта для AI Inbox',
            emailIngestHint: 'Сюда пересылаются письма с заказами. Внутренний endpoint принимает raw email и превращает его в pending draft для проверки в AI Inbox.',
            emailIngestReady: 'Контур готов',
            emailIngestNotReady: 'Нужен token',
            emailIngestInbox: 'Технический ящик',
            emailIngestEndpoint: 'Internal endpoint',
            geoZonesTitle: 'Геозоны EasyTaxi / ETO',
            geoZonesHint: 'Загрузите KML, CSV или GeoJSON с зонами. Riderra сохранит файл как текущий источник геозон для будущего матчинга адресов и цен.',
            geoZonesLoaded: 'Файл загружен',
            geoZonesEmpty: 'Файл не загружен',
            geoZonesUpload: 'Загрузить геозоны',
            geoZonesUploading: 'Загрузка...',
            geoZonesLatestFile: 'Последний файл',
            geoZonesUpdatedAt: 'Обновлено',
            geoZonesCount: 'Зон в файле',
            geoZonesFormat: 'Формат',
            staffTelegram: 'Сотрудники и Telegram',
            staffTelegramHint: 'Привязка Telegram User ID к сотрудникам, чтобы команды и уведомления попадали нужным людям.',
            accessScopes: 'Права доступа',
            accessScopesHint: 'Выберите области Riderra, с которыми может работать сотрудник. Доступ задаётся по разделам работы, а не по отдельным командам.',
            name: 'Название',
            month: 'Месяц',
            status: 'Статус',
            actions: 'Действия',
            staffMember: 'Сотрудник',
            telegramId: 'Telegram User ID',
            syncing: 'Синхронизация...',
            save: 'Сохранить',
            roles: 'Роли',
            globalScope: 'Globe - все города',
            accessAreas: 'Области работы',
            saveScopes: 'Сохранить доступ',
            savingAccess: 'Сохраняем...',
            sheetName: 'Имя источника',
            sheetMonth: 'Метка месяца (например 2025-01)',
            sheetId: 'Google Sheet ID',
            sheetTab: 'Имя вкладки (таблица)',
            detailsTab: 'Имя вкладки (подробности)',
            add: 'Добавить',
            sync: 'Синхронизировать',
            mapping: 'Маппинг',
            mappingTitle: 'Маппинг колонок',
            mappingHint: 'Если структура таблицы меняется, здесь можно без кода указать, какая колонка Google Sheet во что должна попадать.',
            activate: 'Активировать',
            deactivate: 'Выключить',
            currentSheet: 'Актуальная',
            inactiveSheet: 'Неактуальная',
            makeCurrent: 'Сделать актуальной',
            close: 'Закрыть'
          }
        : {
            title: 'Integration Settings',
            subtitle: 'Operational settings only: data sources, Telegram links, and access scopes.',
            sheetSources: 'Order sources',
            sheetSourcesHint: 'Monthly Google Sheets, sync control, and order column mapping.',
            emailIngestTitle: 'Technical inbox for AI Inbox',
            emailIngestHint: 'Forwarded order emails land here. The internal endpoint converts raw email into a pending draft for review in AI Inbox.',
            emailIngestReady: 'Ready',
            emailIngestNotReady: 'Token missing',
            emailIngestInbox: 'Technical inbox',
            emailIngestEndpoint: 'Internal endpoint',
            geoZonesTitle: 'EasyTaxi / ETO geo zones',
            geoZonesHint: 'Upload KML, CSV or GeoJSON with zones. Riderra stores it as the current geo-zone source for future address and pricing matching.',
            geoZonesLoaded: 'File loaded',
            geoZonesEmpty: 'No file yet',
            geoZonesUpload: 'Upload zones',
            geoZonesUploading: 'Uploading...',
            geoZonesLatestFile: 'Latest file',
            geoZonesUpdatedAt: 'Updated at',
            geoZonesCount: 'Zones in file',
            geoZonesFormat: 'Format',
            staffTelegram: 'Staff and Telegram',
            staffTelegramHint: 'Link Telegram User IDs so commands and alerts reach the right staff members.',
            accessScopes: 'Access scopes',
            accessScopesHint: 'Choose the Riderra work areas this employee can use. Access is assigned by work area, not by individual commands.',
            name: 'Name',
            month: 'Month',
            status: 'Status',
            actions: 'Actions',
            staffMember: 'Staff member',
            telegramId: 'Telegram User ID',
            syncing: 'Syncing...',
            save: 'Save',
            roles: 'Roles',
            globalScope: 'Globe - all cities',
            accessAreas: 'Work areas',
            saveScopes: 'Save access',
            savingAccess: 'Saving...',
            sheetName: 'Source name',
            sheetMonth: 'Month label (e.g. 2025-01)',
            sheetId: 'Google Sheet ID',
            sheetTab: 'Tab name',
            detailsTab: 'Details tab name',
            add: 'Add',
            sync: 'Sync now',
            mapping: 'Mapping',
            mappingTitle: 'Column Mapping',
            mappingHint: 'Use this when the Google Sheet structure changes and Riderra fields need a new column mapping.',
            activate: 'Activate',
            deactivate: 'Disable',
            currentSheet: 'Current',
            inactiveSheet: 'Inactive',
            makeCurrent: 'Make current',
            close: 'Close'
          }
    },
    teamOptions () {
      const isRu = this.$store.state.language === 'ru'
      return [
        { value: 'all', label: isRu ? 'Все области' : 'All areas', hint: isRu ? 'Полный доступ к рабочим разделам' : 'Full access to all work areas' },
        { value: 'coordination', label: isRu ? 'Заказы и координация' : 'Orders and coordination', hint: isRu ? 'Заказы, уточнения и согласования' : 'Orders, clarifications and coordination' },
        { value: 'dispatch', label: isRu ? 'Водители и диспетчеризация' : 'Drivers and dispatch', hint: isRu ? 'Назначения и работа с водителями' : 'Assignments and driver operations' },
        { value: 'ops_control', label: isRu ? 'Операционная работа' : 'Operations', hint: isRu ? 'Чаты, очереди, ошибки и контроль' : 'Chats, queues, errors and control' },
        { value: 'finance', label: isRu ? 'Финансы' : 'Finance', hint: isRu ? 'Финансовые данные и расчёты' : 'Financial data and settlements' },
        { value: 'pricing', label: isRu ? 'Цены' : 'Pricing', hint: isRu ? 'Прайс-листы и направления' : 'Price lists and routes' },
        { value: 'sales', label: isRu ? 'Клиенты и продажи' : 'Customers and sales', hint: isRu ? 'CRM, клиенты и обращения' : 'CRM, customers and inquiries' },
        { value: 'audit', label: isRu ? 'Аудит и контроль' : 'Audit and control', hint: isRu ? 'Проверки и история действий' : 'Reviews and activity history' }
      ]
    },
    canViewStaffRoles () {
      return String(this.currentUserEmail || '').trim().toLowerCase() === 'demyanov@riderra.com'
    }
  },
  mounted () { this.load() },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
    shortSheetId (value) {
      const raw = String(value || '').trim()
      const m = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
      if (m && m[1]) return m[1]
      return raw
    },
    async jsonRequest (url, options = {}) {
      const response = await fetch(url, options)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.details || body.error || `HTTP ${response.status}`)
      }
      return body
    },
    async load () {
      const [me, sheets, staff, emailIngest, geoZoneImport] = await Promise.all([
        this.jsonRequest('/api/auth/me', { headers: this.headers() }).catch(() => ({})),
        this.jsonRequest('/api/admin/sheet-sources', { headers: this.headers() }),
        this.jsonRequest('/api/admin/staff-users', { headers: this.headers() }),
        this.jsonRequest('/api/admin/email-ingest/status', { headers: this.headers() }),
        this.jsonRequest('/api/admin/geo-zones/import/status', { headers: this.headers() }).catch(() => ({ configured: false, latest: null }))
      ])
      this.currentUserEmail = me?.user?.email || ''
      if (this.activeSection === 'access' && !this.canViewStaffRoles) this.activeSection = 'sources'
      this.sheets = Array.isArray(sheets) ? sheets : []
      this.staff = staff.rows || []
      this.emailIngest = emailIngest || this.emailIngest
      this.geoZoneImport = geoZoneImport || this.geoZoneImport
      this.staffDrafts = this.staff.reduce((acc, user) => {
        acc[user.id] = (user.telegramLinks && user.telegramLinks[0] && user.telegramLinks[0].telegramUserId) || ''
        return acc
      }, {})
      this.abacDrafts = this.staff.reduce((acc, user) => {
        const teams = Array.isArray(user.abacTeams) ? user.abacTeams : []
        acc[user.id] = {
          teams: teams.length ? (teams.includes('all') ? ['all'] : [...new Set(teams)]) : ['all']
        }
        return acc
      }, {})
    },
    formatDateTime (value) {
      if (!value) return '-'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '-'
      return date.toLocaleString(this.$store.state.language === 'ru' ? 'ru-RU' : 'en-US')
    },
    onGeoZoneFileChange (event) {
      this.geoZoneFile = event.target.files && event.target.files[0] ? event.target.files[0] : null
      this.geoZoneNotice = { type: 'ok', text: '' }
    },
    async uploadGeoZoneFile () {
      if (!this.geoZoneFile) {
        this.geoZoneNotice = { type: 'error', text: this.$store.state.language === 'ru' ? 'Выберите файл геозон.' : 'Choose a geo-zone file.' }
        return
      }
      this.geoZoneUploading = true
      this.geoZoneNotice = { type: 'ok', text: '' }
      try {
        const form = new FormData()
        form.append('file', this.geoZoneFile)
        const response = await fetch('/api/admin/geo-zones/import', {
          method: 'POST',
          headers: this.headers(),
          body: form
        })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`)
        this.geoZoneImport = { configured: true, latest: body.latest || null }
        this.geoZoneFile = null
        if (this.$refs.geoZoneFile) this.$refs.geoZoneFile.value = ''
        const count = body.latest && body.latest.zoneCount != null ? body.latest.zoneCount : 0
        this.geoZoneNotice = {
          type: 'ok',
          text: this.$store.state.language === 'ru'
            ? `Геозоны загружены. Найдено зон: ${count}.`
            : `Geo zones uploaded. Zones found: ${count}.`
        }
      } catch (error) {
        this.geoZoneNotice = { type: 'error', text: `${this.$store.state.language === 'ru' ? 'Ошибка загрузки' : 'Upload failed'}: ${error.message}` }
      } finally {
        this.geoZoneUploading = false
      }
    },
    async createSheetSource () {
      this.sheetNotice = { type: 'ok', text: '' }
      try {
        const payload = { ...this.sheetForm, googleSheetId: this.shortSheetId(this.sheetForm.googleSheetId) }
        await this.jsonRequest('/api/admin/sheet-sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...this.headers() },
          body: JSON.stringify(payload)
        })
        this.sheetForm = { name: '', monthLabel: '', googleSheetId: '', tabName: 'таблица', detailsTabName: 'подробности' }
        await this.load()
        this.sheetNotice = { type: 'ok', text: 'Источник добавлен.' }
      } catch (error) {
        this.sheetNotice = { type: 'error', text: `Ошибка добавления: ${error.message}` }
      }
    },
    async syncSheet (id) {
      this.sheetNotice = { type: 'ok', text: '' }
      this.syncingSheetId = id
      try {
        const data = await this.jsonRequest(`/api/admin/sheet-sources/${id}/sync`, {
          method: 'POST',
          headers: this.headers()
        })
        await this.load()
        const stats = data.stats || {}
        this.sheetNotice = {
          type: 'ok',
          text: `Синхронизировано: total=${stats.total || 0}, created=${stats.created || 0}, updated=${stats.updated || 0}, errors=${stats.errors || 0}`
        }
      } catch (error) {
        this.sheetNotice = { type: 'error', text: `Ошибка синхронизации: ${error.message}` }
      } finally {
        this.syncingSheetId = null
      }
    },
    async toggleSheet (sheet) {
      this.sheetNotice = { type: 'ok', text: '' }
      try {
        await this.jsonRequest(`/api/admin/sheet-sources/${sheet.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...this.headers() },
          body: JSON.stringify({ isActive: true })
        })
        await this.load()
      } catch (error) {
        this.sheetNotice = { type: 'error', text: `Ошибка изменения статуса: ${error.message}` }
      }
    },
    parseMapping (raw) {
      if (!raw) return {}
      try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch (_) {
        return {}
      }
    },
    openMapping (sheet) {
      const parsed = this.parseMapping(sheet.columnMapping)
      this.mapDraft = {
        contractor: parsed.contractor || '',
        orderNumber: parsed.orderNumber || '',
        date: parsed.date || '',
        fromPoint: parsed.fromPoint || '',
        toPoint: parsed.toPoint || '',
        sum: parsed.sum || '',
        driver: parsed.driver || '',
        comment: parsed.comment || '',
        internalOrderNumber: parsed.internalOrderNumber || '',
        vehicleType: parsed.vehicleType || '',
        status: parsed.status || '',
        passengers: parsed.passengers || '',
        luggage: parsed.luggage || '',
        lang: parsed.lang || ''
      }
      this.mappingModal = { open: true, sourceId: sheet.id, sourceName: sheet.name || sheet.monthLabel || sheet.id }
    },
    closeMapping () {
      this.mappingModal = { open: false, sourceId: '', sourceName: '' }
    },
    async saveMapping () {
      this.sheetNotice = { type: 'ok', text: '' }
      try {
        await this.jsonRequest(`/api/admin/sheet-sources/${this.mappingModal.sourceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...this.headers() },
          body: JSON.stringify({ columnMapping: this.mapDraft })
        })
        await this.load()
        this.closeMapping()
        this.sheetNotice = { type: 'ok', text: 'Маппинг сохранён.' }
      } catch (error) {
        this.sheetNotice = { type: 'error', text: `Ошибка сохранения маппинга: ${error.message}` }
      }
    },
    async saveStaffLink (user) {
      this.staffNotice = { type: 'ok', text: '' }
      const telegramUserId = String(this.staffDrafts[user.id] || '').trim()
      if (!telegramUserId) {
        this.staffNotice = { type: 'error', text: `Для ${user.email} заполните Telegram User ID.` }
        return
      }
      try {
        await this.jsonRequest('/api/admin/telegram-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...this.headers() },
          body: JSON.stringify({ email: user.email, telegramUserId })
        })
        await this.load()
        this.staffNotice = { type: 'ok', text: `Сохранено для ${user.email}.` }
      } catch (error) {
        this.staffNotice = { type: 'error', text: `Ошибка сохранения: ${error.message}` }
      }
    },
    async saveStaffAbac (user) {
      this.staffNotice = { type: 'ok', text: '' }
      const draft = this.abacDrafts[user.id] || { teams: ['all'] }
      const teams = Array.isArray(draft.teams) ? draft.teams.filter(Boolean) : []
      if (!teams.length) {
        this.staffNotice = {
          type: 'error',
          text: this.$store.state.language === 'ru'
            ? `Выберите хотя бы одну область для ${user.email}.`
            : `Choose at least one work area for ${user.email}.`
        }
        return
      }
      this.savingAccessId = user.id
      try {
        const result = await this.jsonRequest(`/api/admin/staff-users/${user.id}/abac`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...this.headers() },
          body: JSON.stringify({
            countries: 'all',
            cities: 'all',
            teams
          })
        })
        const savedTeams = Array.isArray(result?.user?.abacTeams) && result.user.abacTeams.length
          ? result.user.abacTeams
          : teams
        this.$set(this.abacDrafts, user.id, {
          teams: savedTeams.includes('all') ? ['all'] : [...new Set(savedTeams)]
        })
        this.staffNotice = {
          type: 'ok',
          text: this.$store.state.language === 'ru'
            ? `Доступ сохранён для ${user.email}.`
            : `Access saved for ${user.email}.`
        }
      } catch (error) {
        this.staffNotice = { type: 'error', text: `Ошибка сохранения доступа: ${error.message}` }
      } finally {
        this.savingAccessId = null
      }
    },
    isAccessAreaSelected (userId, value) {
      const teams = this.abacDrafts[userId] && Array.isArray(this.abacDrafts[userId].teams)
        ? this.abacDrafts[userId].teams
        : ['all']
      return teams.includes(value)
    },
    hasSelectedAccessAreas (userId) {
      const teams = this.abacDrafts[userId] && Array.isArray(this.abacDrafts[userId].teams)
        ? this.abacDrafts[userId].teams
        : []
      return teams.length > 0
    },
    toggleAccessArea (userId, value, checked) {
      const current = this.abacDrafts[userId] && Array.isArray(this.abacDrafts[userId].teams)
        ? this.abacDrafts[userId].teams
        : ['all']
      let teams
      if (value === 'all') {
        teams = checked ? ['all'] : []
      } else if (checked) {
        teams = [...new Set(current.filter((team) => team !== 'all').concat(value))]
      } else {
        teams = current.filter((team) => team !== value)
      }
      this.$set(this.abacDrafts, userId, { teams })
    },
    accessAreaSummary (userId) {
      const draft = this.abacDrafts[userId] || { teams: [] }
      const teams = Array.isArray(draft.teams) ? draft.teams : []
      if (teams.includes('all')) return this.$store.state.language === 'ru' ? 'Полный доступ' : 'Full access'
      if (!teams.length) return this.$store.state.language === 'ru' ? 'Выберите хотя бы одну область' : 'Choose at least one area'
      return this.$store.state.language === 'ru'
        ? `Выбрано областей: ${teams.length}`
        : `${teams.length} areas selected`
    }
  }
}
</script>

<style scoped>
.admin-section { padding-top: 150px; color: #17233d; }
.page-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:14px; }
.page-subtitle { margin:6px 0 0; max-width:760px; color:#60708f; font-size:15px; line-height:1.55; }
.settings-overview { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:12px; margin-bottom:16px; }
.overview-card { padding:14px 16px; border-radius:16px; border:1px solid #d8e0ef; background:linear-gradient(180deg,#fff 0%,#f8fbff 100%); box-shadow:0 12px 28px rgba(16,30,67,.06); }
.overview-card__value { font-size:28px; font-weight:800; color:#17233d; }
.overview-card__label { margin-top:4px; font-size:14px; font-weight:700; color:#223356; }
.overview-card__hint { margin-top:6px; font-size:12px; line-height:1.4; color:#6b7280; }
.overview-card--warn { border-color:#fde68a; background:linear-gradient(180deg,#fffdf4 0%,#fff8dc 100%); }
.overview-card--critical { border-color:#fecaca; background:linear-gradient(180deg,#fff8f8 0%,#ffefef 100%); }
.overview-card--ok { border-color:#bbf7d0; background:linear-gradient(180deg,#f7fff9 0%,#edfff3 100%); }
.overview-card--info { border-color:#bfdbfe; background:linear-gradient(180deg,#f7fbff 0%,#ecf5ff 100%); }
.section-switch { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:14px; }
.section-pill { display:grid; gap:4px; text-align:left; padding:12px 14px; border-radius:16px; border:1px solid #d6deee; background:#fff; color:#223356; }
.section-pill small { color:#6b7280; font-size:12px; }
.section-pill--active { background:linear-gradient(135deg,#ff017a 0%,#702283 100%); border-color:transparent; color:#fff; box-shadow:0 18px 34px rgba(112,34,131,.24); }
.section-pill--active small { color:rgba(255,255,255,.78); }
.settings-card { background:#fff; border:1px solid #d8d8e6; border-radius:16px; padding:16px; margin-bottom:14px; box-shadow:0 8px 20px rgba(16,24,40,.06); }
.email-ingest-card { display:grid; gap:12px; border:1px solid #e6ebf5; border-radius:14px; padding:14px; background:linear-gradient(180deg,#fff 0%,#f8fbff 100%); margin-bottom:14px; }
.email-ingest-card__head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
.email-ingest-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
.geo-zone-card { display:grid; gap:12px; border:1px solid #e4e8f2; border-radius:14px; padding:14px; background:#fff; margin-bottom:14px; }
.geo-zone-card__head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
.geo-zone-upload { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center; }
.geo-zone-upload__file { padding:8px 10px; }
.geo-zone-meta { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; padding:12px; border-radius:12px; background:#f8fbff; border:1px solid #e6ebf5; }
.geo-zone-sample { display:flex; flex-wrap:wrap; gap:8px; }
.card-head { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; margin-bottom:12px; }
.card-hint { margin:6px 0 0; color:#64748b; line-height:1.5; }
.card-hint--warn { color:#92400e; }
.notice { border-radius:10px; padding:10px 12px; margin:10px 0 14px; font-weight:600; }
.notice--ok { background:#ebf7ef; border:1px solid #a5d6b4; color:#1f6b32; }
.notice--error { background:#fff1f0; border:1px solid #f4b8b2; color:#9f2f26; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }
.form-grid__wide { grid-column:1 / -1; }
.inline-actions { display:flex; gap:10px; margin-bottom:14px; }
.input { width:100%; min-height:44px; padding:10px 12px; border-radius:10px; border:1px solid #c8ccdc; background:#fff; color:#1f2b46; }
.input::placeholder { color:#7a8197; }
.input:focus { outline:none; border-color:#702283; box-shadow:0 0 0 3px rgba(112,34,131,.14); }
.ops-table { overflow-x:auto; border:1px solid #e6ebf5; border-radius:12px; }
.ops-table__head, .ops-table__row { gap:12px; padding:10px 12px; min-width:980px; align-items:center; }
.ops-table__head { font-weight:700; border-bottom:1px solid #e4e7f0; color:#1d2c4a; }
.ops-table__row { border-bottom:1px solid #f0f2f7; color:#2f3e60; }
.ops-table__head--sources, .ops-table__row--sources { display:grid; grid-template-columns:minmax(180px,1.1fr) minmax(120px,.8fr) minmax(180px,1fr) minmax(110px,.7fr) minmax(140px,.8fr) minmax(180px,1fr) minmax(220px,1.1fr); }
.ops-table__head--staff, .ops-table__row--staff { display:grid; grid-template-columns:minmax(240px,1.2fr) minmax(180px,1fr) minmax(220px,1fr) minmax(160px,.7fr); }
.ops-table__head--staff-private, .ops-table__row--staff-private { grid-template-columns:minmax(260px,1.2fr) minmax(260px,1fr) minmax(180px,.7fr); min-width:760px; }
.ops-table__head--access, .ops-table__row--access { display:grid; grid-template-columns:minmax(220px,.85fr) minmax(520px,2fr) minmax(160px,.6fr); }
.entity-stack { display:flex; flex-direction:column; gap:4px; align-items:flex-start; }
.row-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.row-actions--stack { flex-direction:column; align-items:stretch; justify-content:center; }
.row-actions--stack-tight .btn { width:100%; min-width:130px; }
.scope-pill { display:inline-block; border:1px solid #b8d1ff; background:#f1f7ff; color:#1f4d96; border-radius:999px; padding:6px 12px; font-size:13px; font-weight:600; }
.scope-pill--warn { border-color:#fde68a; background:#fff8dc; color:#92400e; }
.access-area-picker { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
.access-area-option { display:flex; align-items:flex-start; gap:9px; min-width:0; padding:9px 10px; border:1px solid #dfe5f0; border-radius:10px; background:#fff; cursor:pointer; transition:border-color .15s ease, background .15s ease, box-shadow .15s ease; }
.access-area-option:hover { border-color:#aebbd3; background:#fafcff; }
.access-area-option--selected { border-color:#9ebaf0; background:#f2f7ff; box-shadow:0 0 0 1px rgba(78,118,190,.08); }
.access-area-option--all { grid-column:1/-1; background:#fafbfe; }
.access-area-option input { flex:0 0 auto; width:17px; height:17px; margin:2px 0 0; accent-color:#223356; }
.access-area-option__body { display:grid; gap:2px; min-width:0; }
.access-area-option__body strong { color:#223356; font-size:13px; line-height:1.3; }
.access-area-option__body small { color:#6b7280; font-size:11px; line-height:1.35; }
.access-area-summary { grid-column:1/-1; color:#647191; font-size:12px; font-weight:600; }
.staff-identity { display:flex; flex-direction:column; gap:4px; align-items:flex-start; }
.staff-identity strong { color:#1d2c4a; font-size:14px; }
.cell-wrap { word-break:break-all; }
.muted { font-size:12px; color:#647191; }
.muted--error { color:#a13a31; }
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1200; }
.modal { width:min(920px,92vw); max-height:86vh; overflow:auto; background:#fff; border-radius:12px; padding:16px; }
.map-grid { display:grid; grid-template-columns:1fr; gap:8px; margin:12px 0; }
.map-row { display:grid; grid-template-columns:240px 1fr; gap:10px; align-items:center; }
.map-label { font-weight:600; color:#243550; }
@media (max-width: 1100px) {
  .settings-overview { grid-template-columns:repeat(3,minmax(0,1fr)); }
}
@media (max-width: 900px) {
  .page-head { flex-direction:column; }
  .settings-overview { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .form-grid { grid-template-columns:1fr; }
  .form-grid__wide { grid-column:auto; }
  .email-ingest-card__head { flex-direction:column; align-items:stretch; }
  .email-ingest-grid { grid-template-columns:1fr; }
  .geo-zone-card__head { flex-direction:column; align-items:stretch; }
  .geo-zone-upload { grid-template-columns:1fr; }
  .geo-zone-meta { grid-template-columns:1fr 1fr; }
  .ops-table--access { overflow:visible; border:0; border-radius:0; }
  .ops-table__head--access { display:none; }
  .ops-table__row--access { min-width:0; grid-template-columns:1fr; margin-bottom:12px; border:1px solid #e4e8f2; border-radius:12px; padding:14px; }
}
@media (max-width: 640px) {
  .settings-overview { grid-template-columns:1fr; }
  .section-switch {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .section-pill {
    flex: 0 0 220px;
  }
  .geo-zone-meta { grid-template-columns:1fr; }
  .access-area-picker { grid-template-columns:1fr; }
  .access-area-option--all { grid-column:auto; }
  .access-area-summary { grid-column:auto; }
  .inline-actions,
  .row-actions {
    width: 100%;
  }
  .inline-actions .btn,
  .row-actions .btn,
  .row-actions .action-select {
    width: 100%;
  }
  .map-row {
    grid-template-columns:1fr;
  }
  .modal {
    width:min(100vw - 16px, 920px);
    padding:14px;
  }
}
</style>
