<template>
  <div class="modal">
    <div class="modal__inner">
      <div class="car-class__header">
        <nuxt-link to="/" class="car-class__close"></nuxt-link>
        <slider></slider>
          <div class="description container">
            <div class="description__title">{{ currentCar.title }}</div>
            <div class="description__text">{{ currentCar.models }}</div>
            <div class="description__price">{{ currentCar.price }} ₽</div>
          </div>
      </div>
      <div class="car-class__content">
        <div class="container">
          <div v-swiper:mySwiper="swiperData" class="slider" ref="mySlider">
            <div class="swiper-wrapper ">
              <div class="swiper-slide slider__item"
                   v-for="(slide, i) in slides"
                   :key="i">
                <img class="slider__img" :src="slide.src" alt="">
              </div>
            </div>
            <div class="swiper-pagination"></div>
          </div>
          <div class="row car-class__descr">
            <div class="col-sm-6">
              <h2 class="h2 site-section__title">Особенности автомобиля</h2>
            </div>
            <div class="col-sm-6">
              <p>
                Игристое вино Франции. Ключевое из&nbsp;всех игристых вин. Именно &laquo;шампанским&raquo; мы&nbsp;нередко
                обзываем все вина, где есть пузырьки. Но&nbsp;на&nbsp;самом деле, шампанское&nbsp;&mdash; это вино,
                произведённое во&nbsp;французской провинции Шампань. Всё остальное можно называть как угодно, но&nbsp;это
                уже не&nbsp;будет настоящим шампанским.
              </p>
              <p>
                В&nbsp;конце XIX века такой указ был подписан на&nbsp;официальном уровне. Хотя Россия сделала вид, что
                не&nbsp;слышала
                об&nbsp;этом указе, гордо штампуя на&nbsp;бутылки этикетки &laquo;Советское шампанское&raquo; или
                &laquo;Российское
                шампанское&raquo;. Традиционные сорта винограда для белого шампанского&nbsp;&mdash; шардоне, для
                красного&nbsp;&mdash;
                пино-нуар.
              </p>
            </div>
          </div>
        </div>
        <form-feedback :data="formData"></form-feedback>
      </div>
    </div>

  </div>

</template>


<script>
  import formFeedback from '~/components/partials/form.vue'
  import slider from '~/components/partials/popupSlider.vue'

  export default {
    components: {formFeedback, slider},
    computed: {
      currentCar() {
        return this.$store.state.current;
      }
    },
    data() {
      return {
        formData: {
          type: 'transport'
        },
        swiperData: {
          slidesPerView: 'auto',
          speed: 400,
          spaceBetween: 60,
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
          }
        },
        slides: [
          {
            src: '/img/slider/slide1.jpg'
          }, {
            src: '/img/slider/slide1.jpg'
          }
        ]
      }
    },
    head() {
      return {
        bodyAttrs: {},
      }
    },

  }
</script>
<style scoped lang="scss">

  .description {
    max-width: 100%;
    display: flex;
    align-items: flex-start;
    color: #fff;
    position: absolute;
    bottom: 55px;
    left: 50%;
    transform: translate3d(-50%, 0, 0);

    &__title {
      font-size: 36px;
      color: #fff;
      width: 20%;
    }

    &__text {
      font-size: 16px;
      line-height: 23px;
      font-weight: 100;
      padding-top: 4px;
      width: 25%;
      margin-left: 15%;
    }

    &__price {
      font-size: 32px;
      width: 20%;
      margin-left: auto;
    }
  }

  .modal {
    position: fixed;
    display: block;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    min-height: 100vh;
    z-index: 100;
    overflow-y: scroll;
    -webkit-overflow-scrolling: touch;
    background: #702283;

    &__inner {
      height: 100%;
      width: 100%;
      overflow-y: scroll;
    }

  }

  .car-class {

    &__header {
      height: 100vh;
      min-height: 600px;
      background: #702283;
      position: relative;
    }
    &__close {
      display: block;
      width: 50px;
      height: 50px;
      position: fixed;
      top: 64px;
      right: 64px;
      background: url(/img/close.svg) center no-repeat;
      cursor: pointer;
      z-index: 20;
    }

    &__content {
      padding-top: 110px;
      padding-bottom: 110px;
      background: #fff;
      overflow: hidden;
    }

    &__descr {
      padding-top: 130px;
      padding-bottom: 150px;

      .h2 {
        max-width: 60%;
      }
    }
  }

  .slider {
    overflow: visible;

    &__item {
      width: 80%;
      overflow: hidden;
    }

    &__img {
      width: 100%;
      max-width: 100%;
      border-radius: 5px;

    }
  }
</style>
