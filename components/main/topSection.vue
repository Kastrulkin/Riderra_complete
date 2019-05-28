<template>
  <section class="main-section ">
    <div class="main-section__video">
      <video loop="" muted="" autoplay="" playsinline=""
             poster="/img/main_bg.jpg" class="main-section__bg-video">
        <source src="/video/main-video.mp4" type="video/mp4">
      </video>
    </div>

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
    data() {
      return {}
    }
  }
</script>

<style scoped lang="scss">
  .main-section {
    height: 100vh;
    width: 100vw;
    min-width: 100vw;
    /*background-image: url('/img/main_bg.jpg');*/
    background-size: cover;
    min-height: 665px;
    display: flex;
    align-items: center;
    position: relative;

    &__title {
      color: #fff;
      width: 60%;
      margin-bottom: 60px;
    }

    &__video{
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;

      &:before{
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        background: #000;
        opacity: .4;
      }

      &:after{
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        height: 200vh;
        width: 35vh;
        background: linear-gradient(180deg, rgba(255, 80, 41, 0.256) 0%, rgba(229, 0, 109, 0.8) 52.49%, rgba(112, 34, 131, 0.8) 64.64%);
        filter: blur(100px);
        transform: matrix(0.58, 1, -0.63, 0.64, 0, 0) translate3d(-120%, -40%, 0);
      }
    }

    &__bg-video{
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
  }

  @media all and (max-width: 1024px) {

    .main-section{

      &__video:after{
        transform: matrix(0.59, 0.96, -0.66, 0.63, 0, 0) translate3d(-160%, -30%, 0);

      }
    }
  }


    @media all and (max-width: 767px) {
    .main-section {

      &__title {
        width: 75%;
        margin-bottom: 25px;
      }

    }
  }
</style>
