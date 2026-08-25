<template>
  <div>
    <main-section :data="siteData"></main-section>

    <!-- B2B Value Proposition -->
    <b2b-value-proposition :data="siteData"></b2b-value-proposition>

    <!-- Fewer Layers Section -->
    <fewer-layers :data="siteData"></fewer-layers>

    <section class="site-section site-section--pf">
      <div class="container">
        <div class="row">
          <div class="col-sm-6">
            <h2 class="h2 site-section__title">{{ textData.orderTitle }}</h2>
          </div>
        </div>
        <div class="widget" id="booking-widget">
          <iframe :src="bookingWidgetSrc" id="eto-iframe-booking" allow="geolocation" width="100%" height="360" scrolling="no" frameborder="0" style="width:1px; min-width:100%; border:0;"></iframe>
        </div>
      </div>
    </section>
    <work-section :data="siteData"></work-section>
    <section-cities></section-cities>
    <section-cars></section-cars>
    <questions></questions>
  </div>

</template>

<script>
import mainSection from '~/components/main/topSection.vue'
import workSection from '~/components/main/HowWeWorks.vue'
import sectionCities from '~/components/main/citiesSection.vue'
import sectionCars from '~/components/main/carpark.vue'
import questions from '~/components/main/questions.vue'
import b2bValueProposition from '~/components/main/b2bValueProposition.vue'
import fewerLayers from '~/components/main/fewerLayers.vue'

import {data} from '~/static/lang.js'

export default {
  head() {
    return {
      script: [
        { src: 'https://u3211.eto2.taxi/assets/plugins/iframe-resizer/iframeResizer.min.js', defer: true }
      ]
    }
  },
  components: {
    mainSection, workSection, sectionCities, sectionCars, questions, b2bValueProposition, fewerLayers
  },
  computed: {
    lang(){
      return this.$store.state.language;
    },
    siteData(){
      return this.data[this.lang] || this.data.en || this.data.ru;
    },
    textData(){
      return this.$store.getters.textData;
    },
    bookingWidgetSrc() {
      const supportedLanguages = ['ru', 'en', 'es', 'de', 'fr', 'el', 'th', 'ar']
      const widgetLang = supportedLanguages.includes(this.lang) ? this.lang : 'en'
      return `https://u3211.eto2.taxi/booking?site_key=7e3f3d3085b900d598bc40543d611575&lang=${widgetLang}`
    }
  },
  data(){
    return {
      data: data,
    }
  },
  methods:{
    bookingMinHeight() {
      if (typeof window === 'undefined') return 360
      if (window.matchMedia('(max-width: 767px)').matches) return 500
      if (window.matchMedia('(max-width: 1024px)').matches) return 360
      return 360
    },
    enforceBookingIframeHeight(height) {
      const iframe = document.getElementById('eto-iframe-booking')
      if (!iframe) return
      const minHeight = this.bookingMinHeight()
      const measuredHeight = Number(height) || 0
      const safeHeight = Math.max(measuredHeight + 24, minHeight)
      iframe.style.height = `${safeHeight}px`
      iframe.style.minHeight = `${safeHeight}px`
    },
    fetchData(){

    }
  },
  beforeMount(){
  },
  mounted(){
    if (typeof window !== 'undefined' && window.location && window.location.hostname === 'u3211.riderra.com') {
      this.$router.replace('/staff-login')
      return
    }
    if (typeof window !== 'undefined' && window.iFrameResize) {
      window.iFrameResize({
        log: false,
        targetOrigin: '*',
        checkOrigin: false,
        minHeight: this.bookingMinHeight(),
        heightCalculationMethod: 'lowestElement',
        resizedCallback: (data) => {
          this.enforceBookingIframeHeight(data && data.height)
        }
      }, 'iframe#eto-iframe-booking');
      this.enforceBookingIframeHeight(this.bookingMinHeight())
    }
  }
}
</script>

<style scoped lang="scss">

  .site-section--pf{

    .container{
      padding-top: 60px;
      padding-bottom: 72px;
    }
  }


  @media (max-width: 1024px){

    .site-section--pf{

      .container{
        padding-bottom: 64px;
      }
    }
  }

  .widget-title {
    text-align: center;
    font-size: 28px;
    font-weight: 600;
    color: #333;
    margin-bottom: 30px;
  }

  .widget{
    max-width: 1040px;
    margin: 0 auto;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,.08);
    overflow: visible;
  }



  /* Высота виджета бронирования */
  #eto-iframe-booking{
    display: block;
    width: 100%;
    min-height: 360px;
  }

  @media (max-width: 1024px){
    .widget-title {
      font-size: 24px;
      margin-bottom: 25px;
    }
    #eto-iframe-booking{ min-height: 360px; }
  }
  @media (max-width: 767px){
    .widget-title {
      font-size: 20px;
      margin-bottom: 20px;
    }
    #eto-iframe-booking{ min-height: 500px; }
  }
  @media (max-width: 767px){

    .site-section--pf{

      .container{
        padding-bottom: 56px;
      }
    }
  }
</style>
