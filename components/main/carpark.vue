<template>
  <section class="site-section site-section--sm" id="park">
    <div class="container">
      <div class="row">
        <div class="col-sm-6">
          <h2 class="h2 site-section__title">
            <span v-if="$store.state.language === 'ru'">Автопарк</span>
            <span v-else>Cars</span>
          </h2>
        </div>
      </div>
      <cars :data="carsData"></cars>
    </div>
  </section>
</template>


<script>
  import cars from '~/components/partials/carSlider.vue'

  export default {
    components: {cars},
    data(){
      return {
        carsData:{
          type: 'park'
        }
      }
    }
  }
</script>
