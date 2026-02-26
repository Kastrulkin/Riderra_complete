<template>
  <div class="admin-tabs">
    <nuxt-link
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="admin-tab"
      active-class="admin-tab--active"
    >
      {{ tab.label }}
    </nuxt-link>
  </div>
</template>

<script>
export default {
  computed: {
    lang () { return this.$store.state.language },
    tabs () {
      const ru = [
        { to: '/admin-orders', label: 'Таблица' },
        { to: '/admin-drivers', label: 'Водители' },
        { to: '/admin-crm', label: 'CRM' },
        { to: '/admin-pricing', label: 'Прайс' },
        { to: '/admin-settings', label: 'Настройки' }
      ]
      const en = [
        { to: '/admin-orders', label: 'Orders' },
        { to: '/admin-drivers', label: 'Drivers' },
        { to: '/admin-crm', label: 'CRM' },
        { to: '/admin-pricing', label: 'Pricing' },
        { to: '/admin-settings', label: 'Settings' }
      ]
      return this.lang === 'ru' ? ru : en
    }
  }
}
</script>

<style scoped>
.admin-tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.admin-tab {
  display: inline-block;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  color: #334155;
  text-decoration: none;
  background: #f8fafc;
  font-size: 14px;
  font-weight: 600;
}

.admin-tab--active {
  background: #0ea5e9;
  border-color: #0ea5e9;
  color: #fff;
}
</style>
