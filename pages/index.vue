<template>
  <div>
    <main-section :data="siteData"></main-section>
    <section class="site-section site-section--pf">
      <div class="container">
        <div class="row">
          <div class="col-sm-6">
            <h2 class="h2 site-section__title">Сделайте заказ, мы всё организуем:</h2>
          </div>
        </div>
        <div class="widget">
          <iframe src="https://u3211.eto2.taxi/booking?site_key=7e3f3d3085b900d598bc40543d611575" id="eto-iframe-booking" allow="geolocation" width="100%" height="250" scrolling="no" frameborder="0" style="width:1px; min-width:100%; min-height:520px; border:0;"></iframe>
        </div>
        <div class="request-cta">
          <div class="row">
            <div class="col-sm-6">
              <h2 class="h2 site-section__title">Либо:</h2>
            </div>
          </div>
          <nuxt-link to="/request" class="btn btn--primary">Оставьте бесплатную заявку на перевозку</nuxt-link>
          
          <div class="request-info">
            <p>Заявка с вашими данными будет отправлена перевозчикам из сети Riderra, в соответствующем городе. Те, кто заинтересуется, свяжется с вами и предложит условия. Пожалуйста, имейте ввиду, что это будет ваша договрённость, Riderra не несёт ответственности за действия отдельных лиц и не гарантирует выполнение договорённостей.</p>
          </div>
        </div>
      </div>
    </section>
    <work-section :data="siteData['whyWe']"></work-section>
    <section-cities></section-cities>
    <section-cars></section-cars>
    <reviews></reviews>
    <partners></partners>
    <questions></questions>
  </div>

</template>

<script>
import maps from '~/components/maps.vue'
import mainSection from '~/components/main/topSection.vue'
import workSection from '~/components/main/HowWeWorks.vue'
import sectionCities from '~/components/main/citiesSection.vue'
import sectionCars from '~/components/main/carpark.vue'
import reviews from '~/components/main/reviews.vue'
import partners from '~/components/main/partners.vue'
import questions from '~/components/main/questions.vue'

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
    maps, mainSection, workSection, sectionCities, sectionCars, reviews, partners, questions
  },
  computed: {
    lang(){
      return this.$store.state.language;
    },
    siteData(){
      return this.data[this.lang];
    }
  },
  data(){
    return {
      data: data,
    }
  },
  methods:{
    fetchData(){

    }
  },
  beforeMount(){
  },
  mounted(){
    if (typeof window !== 'undefined' && window.iFrameResize) {
      window.iFrameResize({ log: false, targetOrigin: '*', checkOrigin: false }, 'iframe#eto-iframe-booking');
    }
  }
}
</script>

<style scoped lang="scss">

  .site-section--pf{

    .container{
      padding-top: 60px;
      padding-bottom: 120px;
    }
  }


  @media (max-width: 1024px){

    .site-section--pf{

      .container{
        padding-bottom: 120px;
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

  .request-cta{
    margin-top: 30px;
    margin-bottom: 8px;
  }


  .request-info {
    max-width: 1040px;
    margin: 20px auto 0;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,.08);
    padding: 20px;
  }

  .request-info p {
    margin: 0;
    color: #666;
    font-size: 14px;
    line-height: 1.5;
  }

  /* Высота виджета бронирования */
  #eto-iframe-booking{
    display: block;
    width: 100%;
    min-height: 520px;
  }

  @media (max-width: 1024px){
    .widget-title {
      font-size: 24px;
      margin-bottom: 25px;
    }
    #eto-iframe-booking{ min-height: 720px; }
  }
  @media (max-width: 767px){
    .widget-title {
      font-size: 20px;
      margin-bottom: 20px;
    }
    #eto-iframe-booking{ min-height: 880px; }
  }
  @media (max-width: 767px){

    .site-section--pf{

      .container{
        padding-bottom: 100px;
      }
    }
  }
</style>

