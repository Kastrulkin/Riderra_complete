<template>
  <section class="main-section ">

    <div class="main-section__content container">
      <div class="row">
        <div class="col-xs-12">
        <h1 class="h2 main-section__title">
          Трансфер повышенного уровня комфорта по&nbsp;всему миру
        </h1>
        <prebooking></prebooking>
        </div>

      </div>
    </div>
  </section>
</template>

<script>
  import prebooking from '~/components/prebookingForm.vue'


  export default {
    components: {
      prebooking
    },
    data(){
      return {

      }
    }
  }
</script>

<style scoped lang="scss">
  .main-section {
    height: 100vh;
    width: 100vw;
    min-width: 100vw;
    background-image: url('/img/main_bg.jpg');
    background-size: cover;
    min-height: 665px;
    display: flex;
    align-items: center;

    &__content {

    }

    &__title {
      color: #fff;
      width: 60%;
      margin-bottom: 60px;
    }
  }

  @media all and (max-width: 767px){
    .main-section{

      &__title{
        width: 75%;
      }

    }
  }
</style>
