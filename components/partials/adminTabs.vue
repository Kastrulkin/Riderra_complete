<template>
  <div
    class="admin-nav-shell"
    :class="{
      'admin-nav-shell--sticky': sticky,
      'admin-nav-shell--condensed': sticky && isCondensed
    }"
  >
    <div class="admin-section-intro">
      <div>
        <p class="admin-section-intro__eyebrow">{{ activeSectionContext.label }}</p>
        <div class="admin-section-intro__line">
          <h2 class="admin-section-intro__title">{{ activeTabContext.label }}</h2>
          <p class="admin-section-intro__description">{{ activeTabContext.hint || activeSectionContext.description }}</p>
        </div>
      </div>
    </div>

    <div class="admin-sections">
      <button
        v-for="section in sections"
        :key="section.key"
        type="button"
        class="admin-section-pill"
        :class="{ 'admin-section-pill--active': section.key === activeSectionKey }"
        @click="goToSection(section)"
      >
        <span class="admin-section-pill__label">{{ section.label }}</span>
        <span class="admin-section-pill__hint">{{ section.hint }}</span>
      </button>
    </div>

    <div class="admin-subtabs-shell">
      <div class="admin-subtabs">
        <nuxt-link v-for="tab in activeTabs" :key="tab.to" :to="tab.to" :exact="tab.to === '/admin'" class="admin-subtab" active-class="admin-subtab--active">
          <span class="admin-subtab__label">{{ tab.label }} <b v-if="tab.badge" class="admin-subtab__badge">{{ tab.badge }}</b></span>
          <small v-if="tab.hint">{{ tab.hint }}</small>
        </nuxt-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    sticky: {
      type: Boolean,
      default: true
    }
  },
  data: () => ({
    isCondensed: false,
    selectedSectionKey: '',
    inquiryUnread: 0,
    complaintAttention: 0
  }),
  computed: {
    lang () { return this.$store.state.language },
    canAdmin () {
      const user = this.$store.state.user || {}
      const permissions = user.permissions || []
      return user.role === 'admin' || permissions.includes('*') || permissions.includes('admin.panel')
    },
    routePath () { return String(this.$route?.path || '/admin') },
    sections () {
      const ru = [
        {
          key: 'operations',
          label: 'Операции',
          hint: 'Заказы, очередь, AI',
          kicker: 'Рабочий контур',
          description: 'Здесь команда ведёт ежедневную операционную работу: следит за заказами, очередью, AI-черновиками и тем, что требует реакции прямо сейчас.',
          defaultTo: '/admin',
          tabs: [
            { to: '/admin', label: 'Обзор', hint: 'Сегодня и риски' },
            { to: '/admin-orders', label: 'Заказы', hint: 'Основная очередь' },
            { to: '/admin-chats', label: 'Чаты', hint: 'Диалоги и SLA', badge: this.inquiryUnread },
            { to: '/admin-complaints', label: 'Жалобы', hint: 'Расследования и ответы', badge: this.complaintAttention },
            { to: '/admin-ai-requests', label: 'Заявки с сайта', hint: 'Новые запросы' }
          ]
        },
        {
          key: 'network',
          label: 'Сеть',
          hint: 'Водители, клиенты, покрытие',
          kicker: 'Контур покрытия',
          description: 'Здесь видно, с кем мы работаем: водители, клиенты и география. Этот раздел помогает понять, где есть покрытие, а где сеть нужно усиливать.',
          defaultTo: '/admin-drivers',
          tabs: [
            { to: '/admin-drivers', label: 'Водители', hint: 'Люди и машины' },
            { to: '/admin-crm', label: 'CRM', hint: 'Клиенты и компании' },
            { to: '/admin-directions-matrix', matches: ['/admin-city-routes'], label: 'Направления', hint: 'Покрытие и маршруты' },
            { to: '/admin-network-map', label: 'Карта', hint: 'Геозоны и покрытие' },
            ...(this.canAdmin ? [
              { to: '/admin-driver-switch', label: 'Войти как водитель', hint: 'Проверка кабинета' }
            ] : [])
          ]
        },
        {
          key: 'economics',
          label: 'Экономика',
          hint: 'Цены и маржа',
          kicker: 'Контур экономики',
          description: 'Здесь команда держит под контролем базовый прайс, специальные договорённости, водительские ставки и риски для маржи.',
          defaultTo: '/admin-pricing',
          tabs: [
            { to: '/admin-pricing', label: 'Прайс', hint: 'Продажные цены' },
            { to: '/admin-order-archive', label: 'Архив заказов', hint: 'Прошлые месяцы' },
            { to: '/admin-order-analytics', label: 'Аналитика', hint: 'ROI и выработка' }
          ]
        },
        {
          key: 'wiki',
          label: 'Вики',
          hint: 'Знания команды',
          kicker: 'База знаний',
          description: 'Здесь собраны внутренние инструкции, правила и справочные материалы Riderra для сотрудников.',
          defaultTo: '/admin-wiki',
          tabs: [
            { to: '/admin-wiki', label: 'Вики', hint: 'Инструкции и правила' }
          ]
        },
        {
          key: 'admin',
          label: 'Администрирование',
          hint: 'Настройки и доступы',
          kicker: 'Системный контур',
          description: 'Здесь живут доступы, агенты, VPN и внутренняя конфигурация. Это редкие, но важные административные действия.',
          defaultTo: '/admin-settings',
          tabs: [
            { to: '/admin-settings', label: 'Настройки', hint: 'Источники и люди' },
            { to: '/admin-agents', label: 'AI-помощники', hint: 'Поведение и тесты' },
            { to: '/admin-vpn', label: 'VPN', hint: 'Доступ сотрудников' }
          ]
        }
      ]
      const en = [
        {
          key: 'operations',
          label: 'Operations',
          hint: 'Orders, queue, AI',
          kicker: 'Working lane',
          description: 'This is where the team runs day-to-day operations: orders, queue management, AI drafts, and the items that need action right now.',
          defaultTo: '/admin',
          tabs: [
            { to: '/admin', label: 'Overview', hint: 'Today and risks' },
            { to: '/admin-orders', label: 'Orders', hint: 'Main queue' },
            { to: '/admin-chats', label: 'Chats', hint: 'Dialogs and SLA', badge: this.inquiryUnread },
            { to: '/admin-complaints', label: 'Complaints', hint: 'Investigations and replies', badge: this.complaintAttention },
            { to: '/admin-ai-requests', label: 'AI requests', hint: 'Public drafts' }
          ]
        },
        {
          key: 'network',
          label: 'Network',
          hint: 'Drivers, clients, coverage',
          kicker: 'Coverage lane',
          description: 'This is where the team sees who we work with: drivers, clients, and geography. It helps spot where coverage is strong and where the network needs attention.',
          defaultTo: '/admin-drivers',
          tabs: [
            { to: '/admin-drivers', label: 'Drivers', hint: 'People and vehicles' },
            { to: '/admin-crm', label: 'CRM', hint: 'Clients and companies' },
            { to: '/admin-directions-matrix', matches: ['/admin-city-routes'], label: 'Directions', hint: 'Coverage and routes' },
            { to: '/admin-network-map', label: 'Map', hint: 'Zones and coverage' },
            ...(this.canAdmin ? [
              { to: '/admin-driver-switch', label: 'View as driver', hint: 'Check driver workspace' }
            ] : [])
          ]
        },
        {
          key: 'economics',
          label: 'Economics',
          hint: 'Pricing and margin',
          kicker: 'Economics lane',
          description: 'This is where the team controls the base price book, special agreements, driver rates, and margin risk across the network.',
          defaultTo: '/admin-pricing',
          tabs: [
            { to: '/admin-pricing', label: 'Pricing', hint: 'Sales prices' },
            { to: '/admin-order-archive', label: 'Order archive', hint: 'Past months' },
            { to: '/admin-order-analytics', label: 'Analytics', hint: 'ROI and output' }
          ]
        },
        {
          key: 'wiki',
          label: 'Wiki',
          hint: 'Team knowledge',
          kicker: 'Knowledge base',
          description: 'Internal Riderra instructions, policies, and reference materials for staff.',
          defaultTo: '/admin-wiki',
          tabs: [
            { to: '/admin-wiki', label: 'Wiki', hint: 'Guides and policies' }
          ]
        },
        {
          key: 'admin',
          label: 'Admin',
          hint: 'Access and configuration',
          kicker: 'System lane',
          description: 'This is where access, agents, VPN, and internal configuration live. These are less frequent but important administrative actions.',
          defaultTo: '/admin-settings',
          tabs: [
            { to: '/admin-settings', label: 'Settings', hint: 'Sources and staff' },
            { to: '/admin-agents', label: 'Agents', hint: 'Prompt and workflow' },
            { to: '/admin-vpn', label: 'VPN', hint: 'Staff access' }
          ]
        }
      ]
      return this.lang === 'ru' ? ru : en
    },
    activeSectionKey () {
      if (this.selectedSectionKey && this.sections.some((section) => section.key === this.selectedSectionKey)) {
        return this.selectedSectionKey
      }
      const path = this.routePath
      const found = this.sections.find((section) => section.tabs.some((tab) => path === tab.to || path.startsWith(`${tab.to}/`) || (tab.matches || []).some((match) => path === match || path.startsWith(`${match}/`))))
      return found ? found.key : 'operations'
    },
    activeTabs () {
      return this.sections.find((section) => section.key === this.activeSectionKey)?.tabs || []
    },
    activeSectionContext () {
      return this.sections.find((section) => section.key === this.activeSectionKey) || this.sections[0]
    },
    activeTabContext () {
      const path = this.routePath
      return this.activeTabs.find(tab => path === tab.to || (tab.to !== '/admin' && path.startsWith(`${tab.to}/`)) || (tab.matches || []).some((match) => path === match || path.startsWith(`${match}/`))) || this.activeTabs[0] || this.activeSectionContext
    }
  },
  mounted () {
    this.loadInquiryUnread()
    this.loadComplaintAttention()
    window.addEventListener('riderra:inquiry-unread', this.handleInquiryUnread)
    if (!this.sticky) return
    this.handleScroll()
    window.addEventListener('scroll', this.handleScroll, { passive: true })
  },
  watch: {
    routePath () {
      this.selectedSectionKey = ''
    }
  },
  beforeDestroy () {
    window.removeEventListener('riderra:inquiry-unread', this.handleInquiryUnread)
    if (!this.sticky) return
    window.removeEventListener('scroll', this.handleScroll)
  },
  methods: {
    handleInquiryUnread (event) {
      this.inquiryUnread = Number(event?.detail?.unread || 0)
    },
    async loadInquiryUnread () {
      try {
        const token = localStorage.getItem('authToken')
        const response = await fetch('/api/admin/chats/inquiries/unread-count', { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        if (!response.ok) return
        const data = await response.json()
        this.inquiryUnread = Number(data.unread || 0)
      } catch (_) {}
    },
    async loadComplaintAttention () {
      try {
        const token = localStorage.getItem('authToken')
        const response = await fetch('/api/admin/complaints/counts', { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        if (!response.ok) return
        const data = await response.json()
        this.complaintAttention = Number(data.new || 0) + Number(data.overdue || 0)
      } catch (_) {}
    },
    handleScroll () {
      if (window.innerWidth <= 640) {
        this.isCondensed = false
        return
      }
      const scrollY = window.scrollY || 0
      if (!this.isCondensed && scrollY > 96) {
        this.isCondensed = true
      } else if (this.isCondensed && scrollY < 48) {
        this.isCondensed = false
      }
    },
    goToSection (section) {
      if (!section) return
      this.selectedSectionKey = section.key
    }
  }
}
</script>

<style scoped>
.admin-nav-shell {
  position: relative;
  isolation: isolate;
  display: grid;
  min-width: 0;
  max-width: 100%;
  gap: 8px;
  margin-bottom: 18px;
  padding: 0;
  background: transparent;
  transition: padding 180ms ease, gap 180ms ease, top 180ms ease;
}

.admin-nav-shell--sticky {
  position: sticky;
  top: 68px;
  z-index: 70;
}

.admin-nav-shell--sticky::before {
  position: absolute;
  z-index: -1;
  inset: -10px -12px -12px;
  border: 1px solid rgba(203, 213, 225, 0.72);
  border-top-color: rgba(226, 232, 240, 0.45);
  border-radius: 0 0 16px 16px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 14px 28px -24px rgba(15, 23, 42, 0.55);
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  backdrop-filter: blur(18px) saturate(145%);
  content: '';
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity 180ms ease, transform 180ms ease;
}

.admin-sections {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  align-items: stretch;
}

.admin-section-pill {
  display: grid;
  gap: 2px;
  text-align: left;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid #e1e6ee;
  background: #fff;
  color: #223356;
  cursor: pointer;
  min-width: 0;
  min-height: 54px;
  align-content: center;
  transition: min-height 180ms ease, padding 180ms ease, border-radius 180ms ease, box-shadow 180ms ease;
}

.admin-section-pill__label {
  font-size: 15px;
  font-weight: 800;
}

.admin-section-pill__hint {
  font-size: 12px;
  color: #6b7280;
}

.admin-section-pill--active {
  background: #17233d;
  border-color: #17233d;
  color: #fff;
  box-shadow: none;
}

.admin-section-pill--active .admin-section-pill__hint {
  color: rgba(255, 255, 255, 0.78);
}

.admin-subtabs {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 6px;
}

.admin-section-intro {
  min-width: 0;
  padding: 2px 2px 4px;
}
.admin-section-intro__line{display:flex;align-items:baseline;gap:12px}

.admin-section-intro__eyebrow {
  margin: 0 0 3px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #718096;
}

.admin-section-intro__title {
  margin: 0;
  font-size: 23px;
  line-height: 1.1;
  color: #17233d;
}

.admin-section-intro__description {
  margin: 0;
  max-width: 920px;
  color: #5d6c88;
  font-size: 12px;
  line-height: 1.4;
}

.admin-subtabs-shell {
  min-width: 0;
  max-width: 100%;
  min-height: 50px;
  transition: min-height 180ms ease;
}

.admin-subtab {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 8px 11px;
  border-radius: 10px;
  border: 1px solid #e1e6ee;
  background: #fff;
  color: #334155;
  text-decoration: none;
  font-size: 14px;
  font-weight: 700;
  min-height: 50px;
  align-content: center;
  box-sizing: border-box;
  transition: min-height 180ms ease, padding 180ms ease, border-radius 180ms ease, box-shadow 180ms ease;
}

.admin-subtab small {
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
}

.admin-subtab__label {
  display: flex;
  align-items: center;
  gap: 7px;
}

.admin-subtab__badge {
  display: inline-grid;
  place-items: center;
  min-width: 21px;
  height: 21px;
  padding: 0 5px;
  border-radius: 11px;
  background: #d92d20;
  color: #fff;
  font-size: 11px;
}

.admin-subtab--active {
  background: #eef2f8;
  border-color: #ccd6e5;
  color: #17233d;
  box-shadow: none;
}

.admin-subtab--active small { color: #52627b; }

.admin-subtab--placeholder {
  visibility: hidden;
  pointer-events: none;
}

.admin-nav-shell--condensed {
  top: 68px;
}

.admin-nav-shell--condensed::before {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 980px) {
  .admin-nav-shell--sticky { top: 68px; }

  .admin-sections {
    grid-template-columns: repeat(5, minmax(120px, 1fr));
    overflow-x: auto;
  }

  .admin-subtabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-subtabs-shell { min-height: 50px; }

  .admin-section-intro__title {
    font-size: 24px;
  }

  .admin-nav-shell--condensed {
    top: 68px;
  }
}

@media (max-width: 640px) {
  .admin-nav-shell {
    position: relative;
    top: 0;
    padding: 0;
    background: transparent;
    isolation: auto;
    backdrop-filter: none;
  }

  .admin-nav-shell--sticky::before {
    content: none;
  }

  .admin-sections {
    display: flex;
    overflow-x: auto;
    padding-bottom: 3px;
  }
  .admin-section-pill{flex:0 0 150px}

  .admin-subtabs-shell {
    min-height: unset;
    overflow: hidden;
  }

  .admin-section-intro {
    padding: 14px 16px;
  }

  .admin-section-intro__title {
    font-size: 22px;
  }

  .admin-section-intro__description {
    display:none;
  }

  .admin-subtabs {
    display: flex;
    width: 100%;
    max-width: 100%;
    flex-wrap: nowrap;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;
    margin-right: -4px;
  }

  .admin-subtab {
    min-width: unset;
    flex: 0 0 180px;
    min-height: 62px;
  }
}
</style>
