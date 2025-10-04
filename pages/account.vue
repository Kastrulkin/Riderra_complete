<template>
  <div>
    <!-- Заголовок страницы -->
    <section class="site-section site-section--header">
      <div class="container">
        <div class="row">
          <div class="col-sm-12">
            <h1 class="h1 site-section__title">
              <span v-if="$store.state.language === 'ru'">Личный кабинет</span>
              <span v-else>Account</span>
            </h1>
            <p class="site-section__description">
              <span v-if="$store.state.language === 'ru'">Управляйте своими поездками и настройками</span>
              <span v-else>Manage your trips and settings</span>
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Основной контент -->
    <section class="site-section site-section--pf">
      <div class="container">
        <div class="widget">
          <iframe src="https://u3211.eto2.taxi/customer?site_key=7e3f3d3085b900d598bc40543d611575" id="eto-iframe-customer" allow="geolocation" width="100%" height="1200" scrolling="no" frameborder="0" style="width:1px; min-width:100%; border:0;"></iframe>
        </div>
      </div>
    </section>

    <section-cars></section-cars>
    <reviews></reviews>
  </div>
</template>

<script>
import sectionCars from '~/components/main/carpark.vue'
import reviews from '~/components/main/reviews.vue'

export default {
  layout: 'default',
  components: {
    sectionCars,
    reviews
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
      window.iFrameResize({ log: false, targetOrigin: '*', checkOrigin: false }, 'iframe#eto-iframe-customer');
    }
  }
}
</script>

<style scoped>
/* Заголовок страницы */
.site-section--header {
  background: linear-gradient(135deg, #702283 0%, #E5006D 100%);
  color: white;
  padding: 120px 0 80px;
  text-align: center;
}

.site-section--header .site-section__title {
  color: white;
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 20px;
}

.site-section--header .site-section__description {
  font-size: 18px;
  opacity: 0.9;
  margin: 0;
}

/* Основной контент */
.widget {
  max-width: 100%;
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  overflow: hidden;
}

#eto-iframe-customer { 
  display: block; 
  width: 100%; 
  min-height: 460px; 
  border: none;
}

/* Отступы */
.site-section--pf { 
  padding: 80px 0; 
  background: #f8f9fa;
}

/* Адаптивность */
@media (max-width: 1024px) { 
  .site-section--header {
    padding: 100px 0 60px;
  }
  
  .site-section--header .site-section__title {
    font-size: 36px;
  }
  
  .site-section--pf { 
    padding: 60px 0; 
  }
  
  #eto-iframe-customer { 
    min-height: 520px; 
  }
}

@media (max-width: 767px) { 
  .site-section--header {
    padding: 80px 0 40px;
  }
  
  .site-section--header .site-section__title {
    font-size: 28px;
  }
  
  .site-section--header .site-section__description {
    font-size: 16px;
  }
  
  .site-section--pf { 
    padding: 40px 0; 
  }
  
  #eto-iframe-customer { 
    min-height: 580px; 
  }
}
</style>



