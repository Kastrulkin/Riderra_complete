<template>
  <section class="site-section site-section--sm" id="park">
    <div class="container">
      <div class="row">
        <div class="col-sm-6">
          <h2 class="h2 site-section__title">
            <span>{{ textData.park }}</span>
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
    computed: {
      textData(){
        return this.$store.getters.textData;
      }
    },
    data(){
      return {
        carsData:{
          type: 'park'
        }
      }
    }
  }
</script>
