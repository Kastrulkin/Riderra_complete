<template>
  <div class="transport inner-page__wrap">
    <div class="container">
      <order-caption :data="captionData"></order-caption>
    </div>
    <form-feedback :data="formData"></form-feedback>

    <div class="container">
      <cars :data="carsData"></cars>
    </div>
  </div>
</template>

<script>
  import formFeedback from '~/components/partials/form.vue'
  import cars from '~/components/partials/carSlider.vue'
  import orderCaption from '~/components/partials/orderCaption.vue'

  export default {
    scrollToTop: true,
    components: {formFeedback, cars, orderCaption},
    data() {
      return {
        formData: {
          type: 'transport'
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


