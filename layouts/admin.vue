<template>
  <div class="admin-wrapper">
    <staff-header />
    <div class="route-progress" :class="{ 'route-progress--active': routeBusy }"><span></span></div>
    <main class="admin-shell">
      <transition name="staff-page" mode="out-in">
        <nuxt />
      </transition>
    </main>
  </div>
</template>

<script>
import StaffHeader from '~/components/admin/StaffHeader.vue'

export default {
  components: { StaffHeader },
  data: () => ({ routeBusy: false, removeBeforeHook: null, removeAfterHook: null }),
  mounted () {
    this.removeBeforeHook = this.$router.beforeEach((to, from, next) => { this.routeBusy = true; next() })
    this.removeAfterHook = this.$router.afterEach(() => { window.requestAnimationFrame(() => { this.routeBusy = false }) })
  },
  beforeDestroy () {
    if (this.removeBeforeHook) this.removeBeforeHook()
    if (this.removeAfterHook) this.removeAfterHook()
  }
}
</script>

<style>
.admin-wrapper {
  --staff-bg: #f5f7fa;
  --staff-surface: #fff;
  --staff-soft: #f1f4f8;
  --staff-line: #e1e6ee;
  --staff-ink: #17233d;
  --staff-muted: #66748b;
  --staff-accent: #243b73;
  --staff-success: #248253;
  --staff-warning: #a15c08;
  --staff-danger: #b42318;
  min-height: 100vh;
  background: var(--staff-bg);
  color: var(--staff-ink);
}
.admin-shell { min-height: 100vh; padding-top: 68px; }
.route-progress{position:fixed;z-index:950;top:67px;left:0;width:100%;height:2px;overflow:hidden;pointer-events:none}.route-progress span{display:block;width:38%;height:100%;background:#3e67a3;opacity:0;transform:translateX(-110%)}.route-progress--active span{opacity:1;animation:routeWork 1s ease-in-out infinite}@keyframes routeWork{50%{transform:translateX(110%)}100%{transform:translateX(280%)}}
.admin-shell .page-background { display: none; }
.admin-shell .site-section--pf { padding-top: 24px !important; }
.admin-shell .container { width: min(1480px, calc(100% - 32px)); max-width: none; padding-left: 0; padding-right: 0; }
.admin-shell .panel,
.admin-shell .card,
.admin-shell .table-wrap { border-color: var(--staff-line); box-shadow: none; }
.admin-shell .btn { border-radius: 9px; box-shadow: none; transform: none; }
.admin-shell .btn:hover { transform: none; }
.admin-shell input,
.admin-shell select,
.admin-shell textarea { border-color: var(--staff-line); }
.admin-shell .notice,
.admin-shell .toast,
.admin-shell .hint { animation:staffFeedbackIn .2s ease-out; }
.admin-shell button:focus-visible,
.admin-shell a:focus-visible,
.admin-shell input:focus-visible,
.admin-shell select:focus-visible,
.admin-shell textarea:focus-visible { outline: 3px solid rgba(36,59,115,.22); outline-offset: 2px; }
@keyframes staffFeedbackIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.staff-page-enter-active,.staff-page-leave-active{transition:opacity .16s ease,transform .16s ease}.staff-page-enter,.staff-page-leave-to{opacity:0;transform:translateY(3px)}

*, *:before, *:after {
  box-sizing: border-box;
}
@media(max-width:620px){.admin-shell{padding-top:60px}.route-progress{top:59px}.admin-shell .site-section--pf{padding-top:14px!important}.admin-shell .container{width:calc(100% - 20px)}}
@media(prefers-reduced-motion:reduce){.staff-page-enter-active,.staff-page-leave-active{transition:none}.route-progress--active span{animation:none;transform:none;width:100%}.admin-shell .notice,.admin-shell .toast,.admin-shell .hint{animation:none}}
</style>
