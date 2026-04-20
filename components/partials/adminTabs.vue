<template>
  <div class="admin-nav-shell">
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

    <div class="admin-subtabs">
      <nuxt-link
        v-for="tab in activeTabs"
        :key="tab.to"
        :to="tab.to"
        class="admin-subtab"
        active-class="admin-subtab--active"
      >
        <span>{{ tab.label }}</span>
        <small v-if="tab.hint">{{ tab.hint }}</small>
      </nuxt-link>
    </div>
  </div>
</template>

<script>
export default {
  computed: {
    lang () { return this.$store.state.language },
    routePath () { return String(this.$route?.path || '/admin') },
    sections () {
      const ru = [
        {
          key: 'operations',
          label: 'Операции',
          hint: 'Заказы, очередь, AI',
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
          defaultTo: '/admin-pricing',
          tabs: [
            { to: '/admin-pricing', label: 'Прайс', hint: 'Продажные цены' }
          ]
        },
        {
          key: 'admin',
          label: 'Администрирование',
          hint: 'Доступы и конфигурация',
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
          defaultTo: '/admin-pricing',
          tabs: [
            { to: '/admin-pricing', label: 'Pricing', hint: 'Sales prices' }
          ]
        },
        {
          key: 'admin',
          label: 'Admin',
          hint: 'Access and configuration',
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
    }
  },
  methods: {
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
}

.admin-sections {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
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
  background: linear-gradient(135deg, #15316d 0%, #2b6eff 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 18px 34px rgba(22, 51, 109, 0.18);
}

.admin-section-pill--active .admin-section-pill__hint {
  color: rgba(255, 255, 255, 0.78);
}

.admin-subtabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
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
}

.admin-subtab small {
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
}

.admin-subtab--active {
  background: #0ea5e9;
  border-color: #0ea5e9;
  color: #fff;
}

.admin-subtab--active small {
  color: rgba(255, 255, 255, 0.82);
}

@media (max-width: 980px) {
  .admin-sections {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .admin-sections {
    grid-template-columns: 1fr;
  }

  .admin-subtab {
    min-width: unset;
    flex: 1 1 140px;
  }
}
</style>
