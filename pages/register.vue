<template>
  <div>
    <navigation></navigation>
    
    <section class="site-section site-section--pf login-section">
      <div class="container">
        <div class="row">
          <div class="col-sm-12 text-center">
            <h1 class="h1 login-title">{{ t.title }}</h1>
            <p class="login-description">{{ t.subtitle }}</p>
          </div>
        </div>
        <div class="widget">
          <iframe
            src="https://u3211.eto2.taxi/customer?site_key=7e3f3d3085b900d598bc40543d611575"
            id="eto-iframe-customer"
            allow="geolocation"
            width="100%"
            height="1200"
            scrolling="no"
            frameborder="0"
            style="width:1px; min-width:100%; border:0;"
          ></iframe>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import navigation from '~/components/partials/nav.vue'

export default {
  layout: 'default',
  components: {
    navigation
  },
  computed: {
    lang(){ return this.$store.state.language },
    t(){
      const dict = {
        ru: {
          title: 'Вход или регистрация для клиентов',
          subtitle: 'Вход или регистрация для клиентов'
        },
        en: {
          title: 'Login or registration for clients',
          subtitle: 'Login or registration for clients'
        }
      }
      return dict[this.lang]
    }
  },
  head() {
    return {
      script: [
        { src: 'https://u3211.eto2.taxi/assets/plugins/iframe-resizer/iframeResizer.min.js', defer: true }
      ]
    }
  },
  mounted(){
    if (typeof window !== 'undefined' && window.iFrameResize) {
      window.iFrameResize({ log: false, targetOrigin: '*', checkOrigin: false }, 'iframe#eto-iframe-customer')
    }
  }
}
</script>

<style scoped>
.login-section {
  padding: 120px 0 80px;
  background: linear-gradient(135deg, #1a237e 0%, #0d1421 50%, #000000 100%);
  min-height: 100vh;
  color: #fff;
}

.login-title {
  color: #fff;
  font-weight: 700;
  margin-bottom: 10px;
  }
  
.login-description {
  color: rgba(255,255,255,0.8);
  margin-bottom: 40px;
  font-size: 18px;
}

.widget {
  max-width: 1040px;
  margin: 0 auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.25);
  overflow: hidden;
}

#eto-iframe-customer {
  display: block;
  width: 100%;
  min-height: 520px;
  border: none;
}

@media (max-width: 767px) {
  .login-section {
    padding: 100px 0 60px;
  }
  
  .login-title {
    font-size: 28px;
  }

  .login-description {
    font-size: 16px;
  }
}
</style>
