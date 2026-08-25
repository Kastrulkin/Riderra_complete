<template>
  <main class="error-layout">
    <section class="error-content">
      <p class="error-code">{{ statusCode }}</p>
      <h1>{{ copy.title }}</h1>
      <p>{{ copy.text }}</p>
      <nuxt-link class="error-action" to="/">{{ copy.action }}</nuxt-link>
    </section>
  </main>
</template>

<script>
export default {
  props: {
    error: { type: Object, default: () => ({}) }
  },
  computed: {
    statusCode () { return Number(this.error.statusCode || 404) },
    copy () {
      const language = this.$store?.state?.language || 'en'
      return language === 'ru'
        ? { title: 'Страница не найдена', text: 'Проверьте адрес или вернитесь на главную страницу Riderra.', action: 'На главную' }
        : { title: 'Page not found', text: 'Check the address or return to the Riderra home page.', action: 'Back to home' }
    }
  },
  head () {
    return { title: `${this.statusCode} | Riderra` }
  }
}
</script>

<style scoped>
.error-layout{min-height:620px;color:#fff;background:var(--riderra-gradient);font-family:'Montserrat',sans-serif}.error-content{display:flex;min-height:620px;flex-direction:column;align-items:flex-start;justify-content:center;width:min(1200px,calc(100% - 48px));margin:auto;padding:64px 0 96px}.error-code{margin:0 0 12px;color:#d8def2;font-size:14px;font-weight:800;letter-spacing:.14em}.error-content h1{max-width:760px;margin:0;font-size:clamp(42px,7vw,80px);line-height:1;letter-spacing:-.035em}.error-content>p:not(.error-code){max-width:620px;margin:22px 0 0;color:rgba(255,255,255,.76);font-size:18px;line-height:1.6}.error-action{display:inline-flex;align-items:center;min-height:48px;margin-top:30px;border-radius:var(--riderra-radius-control);background:#fff;padding:0 18px;color:var(--riderra-cta);font-weight:700;text-decoration:none}.error-action:hover,.error-action:focus-visible{background:#eef5ff;outline:3px solid rgba(255,255,255,.24);outline-offset:3px}@media(max-width:620px){.error-content{width:calc(100% - 32px);padding:48px 0 72px}}
</style>
