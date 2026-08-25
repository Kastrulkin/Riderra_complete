<template>
  <header class="staff-header">
    <div class="staff-header__inner">
      <nuxt-link class="staff-brand" to="/admin-orders" aria-label="Riderra — работа с заказами">
        <img src="/img/logo.svg" alt="Riderra" />
        <span>Команда</span>
      </nuxt-link>

      <div class="staff-header__actions">
        <work-activity-indicator />
        <notification-bell />
        <button class="staff-user" type="button" :aria-expanded="menuOpen ? 'true' : 'false'" @click="menuOpen = !menuOpen">
          <span class="staff-user__avatar">{{ initials }}</span>
          <span class="staff-user__copy"><strong>{{ displayName }}</strong><small>{{ roleLabel }}</small></span>
          <span aria-hidden="true">⌄</span>
        </button>
        <transition name="staff-menu">
          <div v-if="menuOpen" class="staff-user-menu">
            <span>{{ user && user.email }}</span>
            <nuxt-link v-if="canAdmin" to="/admin-settings" @click.native="menuOpen = false">Настройки</nuxt-link>
            <button type="button" @click="logout">Выйти</button>
          </div>
        </transition>
        <button class="staff-menu-toggle" type="button" :aria-expanded="mobileOpen ? 'true' : 'false'" aria-label="Открыть меню" @click="mobileOpen = !mobileOpen">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
    <nav v-if="mobileOpen" class="staff-mobile-nav" aria-label="Мобильная навигация">
      <nuxt-link v-for="item in visibleLinks" :key="`mobile-${item.to}`" :to="item.to" :exact="item.to === '/admin'" @click.native="mobileOpen = false">{{ item.label }}</nuxt-link>
      <nuxt-link v-if="canAdmin" to="/admin-settings" @click.native="mobileOpen = false">Настройки</nuxt-link>
      <button type="button" @click="logout">Выйти</button>
    </nav>
  </header>
</template>

<script>
import NotificationBell from '~/components/admin/NotificationBell.vue'
import WorkActivityIndicator from '~/components/admin/WorkActivityIndicator.vue'

export default {
  components: { NotificationBell, WorkActivityIndicator },
  data: () => ({ menuOpen: false, mobileOpen: false, inquiryUnread: 0, complaintAttention: 0 }),
  computed: {
    user () { return this.$store.state.user || {} },
    permissions () { return this.user.permissions || [] },
    canAdmin () { return this.user.role === 'admin' || this.permissions.includes('*') || this.permissions.includes('admin.panel') },
    links () {
      return [
        { to: '/admin', label: 'Обзор', permissions: ['orders.read', 'ops.read', 'drivers.read', 'pricing.read', 'crm.read'] },
        { to: '/admin-orders', label: 'Заказы', permissions: ['orders.read'] },
        { to: '/admin-chats', label: 'Чаты', permissions: ['ops.read', 'orders.read'], badge: this.inquiryUnread },
        { to: '/admin-complaints', label: 'Жалобы', permissions: ['orders.read'], badge: this.complaintAttention },
        { to: '/admin-drivers', label: 'Водители', permissions: ['drivers.read'] },
        { to: '/admin-pricing', label: 'Цены', permissions: ['pricing.read'] },
        { to: '/admin-crm', label: 'Клиенты', permissions: ['crm.read'] }
      ]
    },
    visibleLinks () {
      if (this.canAdmin) return this.links
      return this.links.filter(item => item.permissions.some(permission => this.permissions.includes(permission)))
    },
    displayName () {
      const source = this.user.name || this.user.email || 'Сотрудник'
      return String(source).split('@')[0]
    },
    initials () {
      return this.displayName.split(/[ ._-]+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'R'
    },
    roleLabel () {
      if (this.user.role === 'admin') return 'Владелец'
      if (this.permissions.includes('orders.manage')) return 'Диспетчер'
      return 'Сотрудник'
    }
  },
  mounted () {
    this.loadInquiryUnread()
    this.loadComplaintAttention()
    window.addEventListener('riderra:inquiry-unread', this.handleInquiryUnread)
  },
  beforeDestroy () { window.removeEventListener('riderra:inquiry-unread', this.handleInquiryUnread) },
  methods: {
    handleInquiryUnread (event) { this.inquiryUnread = Number(event?.detail?.unread || 0) },
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
    logout () {
      this.$store.dispatch('logout')
      this.$router.push('/staff-login')
    }
  }
}
</script>

<style scoped>
.staff-header{position:fixed;inset:0 0 auto;z-index:900;border-bottom:1px solid var(--staff-line,#e5e9f0);background:rgba(255,255,255,.94);backdrop-filter:blur(16px)}
.staff-header__inner{display:flex;align-items:center;gap:22px;width:min(1480px,calc(100% - 32px));height:68px;margin:auto}
.staff-brand{display:flex;align-items:center;gap:10px;color:#1c2942;text-decoration:none}.staff-brand img{width:105px;filter:brightness(0) saturate(100%) invert(13%) sepia(17%) saturate(1597%) hue-rotate(181deg) brightness(94%)}.staff-brand span{border-left:1px solid #dfe4ec;padding-left:10px;color:#718096;font-size:12px;font-weight:700}
.staff-header__actions{position:relative;display:flex;align-items:center;gap:8px;margin-left:auto}.staff-user{display:flex;align-items:center;gap:9px;min-height:40px;border:0;border-radius: 8px;background:transparent;padding:5px 7px;color:#17233d;cursor:pointer;transition:background-color .16s ease,box-shadow .16s ease,transform .15s ease}.staff-user:hover{background:#f4f6f9;box-shadow:0 4px 12px rgba(28,41,66,.08)}.staff-user:active{transform:scale(.96)}.staff-user__avatar{display:grid;place-items:center;width:34px;height:34px;border-radius: 8px;background:#17233d;color:#fff;font-size:12px;font-weight:800}.staff-user__copy{display:grid;text-align:left}.staff-user__copy strong{max-width:130px;overflow:hidden;text-overflow:ellipsis;font-size:12px}.staff-user__copy small{color:#7a879b;font-size:10px}.staff-user-menu{position:absolute;right:0;top:48px;display:grid;min-width:220px;border:1px solid #e1e6ee;border-radius: 8px;background:#fff;padding:8px;box-shadow:0 16px 40px rgba(28,41,66,.14)}.staff-menu-enter-active,.staff-menu-leave-active{transition:opacity .18s ease,transform .18s ease}.staff-menu-enter,.staff-menu-leave-to{opacity:0;transform:translateY(-6px)}.staff-user-menu span{padding:8px;color:#7a879b;font-size:11px;overflow-wrap:anywhere}.staff-user-menu a,.staff-user-menu button{min-height:40px;border:0;border-radius:8px;background:transparent;padding:9px 10px;color:#24324b;text-align:left;text-decoration:none;cursor:pointer;transition:background-color .16s ease}.staff-user-menu a:hover,.staff-user-menu button:hover{background:#f3f5f8}
.staff-menu-toggle,.staff-mobile-nav{display:none}
@media(max-width:1100px){.staff-menu-toggle{display:grid;gap:4px;width:40px;height:40px;place-content:center;border:1px solid #dfe4ec;border-radius: 8px;background:#fff;cursor:pointer;transition:background-color .16s ease,box-shadow .16s ease,transform .15s ease}.staff-menu-toggle:hover{background:#f7f9fb;box-shadow:0 4px 12px rgba(28,41,66,.08)}.staff-menu-toggle:active{transform:scale(.96)}.staff-menu-toggle span{width:17px;height:2px;background:#1c2942}.staff-mobile-nav{display:grid;border-top:1px solid #e5e9f0;padding:10px 16px 16px;background:#fff}.staff-mobile-nav a,.staff-mobile-nav button{min-height:44px;border:0;border-radius:9px;background:transparent;padding:11px;color:#24324b;text-align:left;text-decoration:none;font-weight:700}.staff-mobile-nav a.nuxt-link-active{background:#eef2f8}.staff-user__copy{display:none}}
@media(max-width:620px){.staff-header__inner{width:calc(100% - 20px);height:60px;gap:8px}.staff-brand img{width:88px}.staff-brand span{display:none}.staff-user{display:none}}
@media(prefers-reduced-motion:reduce){.staff-user,.staff-menu-toggle,.staff-menu-enter-active,.staff-menu-leave-active{transition:none}}
</style>
