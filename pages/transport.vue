<template>
  <div class="transport inner-page__wrap">
    <!--<order-caption :data="captionData"></order-caption>-->

    <div class="container">
      <cars :data="carsData"></cars>
    </div>
  </div>
</template>

<script>
  import cars from '~/components/partials/carSlider.vue'

  export default {
    scrollToTop: true,
    components: {cars},
    data() {
      return {
        formData: {
          class: 'transport-form'
        },
        captionData:{
          title: 'Выберите транспорт'
        },
        carsData: {
          type: 'transport'
        }
      }
    },
    head(){
      return {
        bodyAttrs: {
          class: 'inner-page'
        },
      }
    },

  }
</script>

<style scoped lang="scss">



</style>

