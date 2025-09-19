<template>
  <div>
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
.widget{max-width:100%;}
#eto-iframe-customer{ display:block; width:100%; min-height:460px; }

/* Отступ сверху, чтобы шапка не перекрывала первый экран */
.site-section--pf{ padding-top: 140px; padding-bottom: 20px; }
@media (max-width: 1024px){ 
  .site-section--pf{ padding-top: 110px; padding-bottom: 16px; }
  #eto-iframe-customer{ min-height: 520px; }
}
@media (max-width: 767px){ 
  .site-section--pf{ padding-top: 90px; padding-bottom: 12px; }
  #eto-iframe-customer{ min-height: 580px; }
}
</style>



