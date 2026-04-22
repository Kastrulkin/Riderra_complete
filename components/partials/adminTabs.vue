<template>
  <div class="admin-nav-shell" :class="{ 'admin-nav-shell--condensed': isCondensed }">
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

    <div class="admin-section-intro">
      <div>
        <p class="admin-section-intro__eyebrow">{{ activeSectionContext.kicker }}</p>
        <h2 class="admin-section-intro__title">{{ activeSectionContext.label }}</h2>
        <p class="admin-section-intro__description">{{ activeSectionContext.description }}</p>
      </div>
    </div>

    <div class="admin-subtabs-shell">
      <div class="admin-subtabs">
        <template v-for="tab in paddedActiveTabs">
          <nuxt-link
            v-if="!tab.placeholder"
            :key="tab.to"
            :to="tab.to"
            class="admin-subtab"
            active-class="admin-subtab--active"
          >
            <span>{{ tab.label }}</span>
            <small v-if="tab.hint">{{ tab.hint }}</small>
          </nuxt-link>
          <div
            v-else
            :key="tab.key"
            class="admin-subtab admin-subtab--placeholder"
            aria-hidden="true"
          ></div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data: () => ({
    isCondensed: false
  }),
  computed: {
    lang () { return this.$store.state.language },
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
            { to: '/admin-chats', label: 'Чаты', hint: 'Диалоги и SLA' },
            { to: '/admin-ai-inbox', label: 'AI Inbox', hint: 'Черновики' }
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
            { to: '/admin-directions-matrix', label: 'Направления', hint: 'Спрос и покрытие' }
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
            { to: '/admin-pricing', label: 'Прайс', hint: 'Продажные цены' }
          ]
        },
        {
          key: 'admin',
          label: 'Администрирование',
          hint: 'Доступы и конфигурация',
          kicker: 'Системный контур',
          description: 'Здесь живут доступы, агенты, VPN и внутренняя конфигурация. Это редкие, но важные административные действия.',
          defaultTo: '/admin-settings',
          tabs: [
            { to: '/admin-settings', label: 'Настройки', hint: 'Источники и люди' },
            { to: '/admin-agents', label: 'Агенты', hint: 'Prompt и workflow' },
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
            { to: '/admin-chats', label: 'Chats', hint: 'Dialogs and SLA' },
            { to: '/admin-ai-inbox', label: 'AI Inbox', hint: 'Drafts' }
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
            { to: '/admin-directions-matrix', label: 'Coverage', hint: 'Demand and supply' }
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
            { to: '/admin-pricing', label: 'Pricing', hint: 'Sales prices' }
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
      const path = this.routePath
      const found = this.sections.find((section) => section.tabs.some((tab) => path === tab.to || path.startsWith(`${tab.to}/`)))
      return found ? found.key : 'operations'
    },
    activeTabs () {
      return this.sections.find((section) => section.key === this.activeSectionKey)?.tabs || []
    },
    activeSectionContext () {
      return this.sections.find((section) => section.key === this.activeSectionKey) || this.sections[0]
    },
    paddedActiveTabs () {
      const tabs = [...this.activeTabs]
      const padTo = Math.max(...this.sections.map((section) => section.tabs.length))
      while (tabs.length < padTo) {
        tabs.push({ placeholder: true, key: `placeholder-${tabs.length}` })
      }
      return tabs
    }
  },
  mounted () {
    this.handleScroll()
    window.addEventListener('scroll', this.handleScroll, { passive: true })
  },
  beforeDestroy () {
    window.removeEventListener('scroll', this.handleScroll)
  },
  methods: {
    handleScroll () {
      if (window.innerWidth <= 640) {
        this.isCondensed = false
        return
      }
      this.isCondensed = window.scrollY > 140
    },
    goToSection (section) {
      if (!section) return
      const target = section.defaultTo || section.tabs?.[0]?.to || '/admin'
      if (target && target !== this.routePath) this.$router.push(target)
    }
  }
}
</script>

<style scoped>
.admin-nav-shell {
  display: grid;
  gap: 14px;
  margin-bottom: 22px;
  position: sticky;
  top: 92px;
  z-index: 70;
  padding: 14px 0 10px;
  background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.94) 78%, rgba(255,255,255,0) 100%);
  backdrop-filter: blur(12px);
  transition: padding 180ms ease, gap 180ms ease, top 180ms ease;
}

.admin-sections {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}

.admin-section-pill {
  display: grid;
  gap: 4px;
  text-align: left;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid #d6deee;
  background: #f8fbff;
  color: #223356;
  cursor: pointer;
  min-height: 92px;
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
  background: linear-gradient(135deg, #ff017a 0%, #702283 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 18px 34px rgba(112, 34, 131, 0.24);
}

.admin-section-pill--active .admin-section-pill__hint {
  color: rgba(255, 255, 255, 0.78);
}

.admin-subtabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.admin-section-intro {
  border: 1px solid #ead7f0;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(255, 240, 247, 0.92) 0%, rgba(248, 244, 255, 0.96) 100%);
  padding: 18px 20px;
  box-shadow: 0 16px 30px rgba(112, 34, 131, 0.08);
}

.admin-section-intro__eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #702283;
}

.admin-section-intro__title {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
  color: #17233d;
}

.admin-section-intro__description {
  margin: 10px 0 0;
  max-width: 880px;
  color: #5d6c88;
  font-size: 15px;
  line-height: 1.6;
}

.admin-subtabs-shell {
  min-height: 68px;
  transition: min-height 180ms ease;
}

.admin-subtab {
  display: grid;
  gap: 2px;
  min-width: 120px;
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px solid #d6deee;
  background: #fff;
  color: #334155;
  text-decoration: none;
  font-size: 14px;
  font-weight: 700;
  min-height: 68px;
  align-content: center;
  box-sizing: border-box;
  transition: min-height 180ms ease, padding 180ms ease, border-radius 180ms ease, box-shadow 180ms ease;
}

.admin-subtab small {
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
}

.admin-subtab--active {
  background: linear-gradient(135deg, #1a237e 0%, #0d1421 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 12px 28px rgba(13, 20, 33, 0.2);
}

.admin-subtab--active small {
  color: rgba(255, 255, 255, 0.82);
}

.admin-subtab--placeholder {
  visibility: hidden;
  pointer-events: none;
}

.admin-nav-shell--condensed {
  gap: 10px;
  top: 84px;
  padding: 8px 0 8px;
  background: linear-gradient(180deg, rgba(255,255,255,0.985) 0%, rgba(255,255,255,0.95) 84%, rgba(255,255,255,0) 100%);
}

.admin-nav-shell--condensed .admin-section-pill {
  min-height: 78px;
  padding: 12px 14px;
  border-radius: 14px;
}

.admin-nav-shell--condensed .admin-subtabs-shell {
  min-height: 62px;
}

.admin-nav-shell--condensed .admin-section-intro {
  padding: 14px 18px;
}

.admin-nav-shell--condensed .admin-section-intro__title {
  font-size: 24px;
}

.admin-nav-shell--condensed .admin-subtab {
  min-height: 62px;
  padding: 9px 12px;
  border-radius: 12px;
}

@media (max-width: 980px) {
  .admin-nav-shell {
    top: 88px;
  }

  .admin-sections {
    grid-template-columns: 1fr 1fr;
  }

  .admin-subtabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-subtabs-shell {
    min-height: 146px;
  }

  .admin-section-intro__title {
    font-size: 24px;
  }

  .admin-nav-shell--condensed {
    top: 82px;
  }

  .admin-nav-shell--condensed .admin-subtabs-shell {
    min-height: 134px;
  }
}

@media (max-width: 640px) {
  .admin-nav-shell {
    position: relative;
    top: 0;
    padding: 0;
    background: transparent;
    backdrop-filter: none;
  }

  .admin-sections {
    grid-template-columns: 1fr;
  }

  .admin-subtabs-shell {
    min-height: unset;
  }

  .admin-section-intro {
    padding: 14px 16px;
  }

  .admin-section-intro__title {
    font-size: 22px;
  }

  .admin-section-intro__description {
    font-size: 14px;
  }

  .admin-subtabs {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
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
