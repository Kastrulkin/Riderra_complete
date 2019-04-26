<template>
  <section class="site-section site-section--sm" id="reviews">
    <div class="container">
      <div class="row">
        <div class="col-sm-6">
          <h2 class="h2 site-section__title">
            Отзывы
          </h2>
        </div>
      </div>
      <div v-swiper:mySwiper="swiperData" class="reviews" ref="mySlider">
        <div class="swiper-wrapper ">
          <div class="swiper-slide reviews__item"
               v-for="(slide, i) in slides"
               :key="i">
            <figure class="reviews__inner">
              <img :src="slide.src" class="reviews__img">
              <figcaption class="reviews__caption">
                <div class="reviews__title" ref="swiperTitle" v-html="slide.title"></div>
                <p class="reviews__desc" ref="swiperDesc" v-html="slide.desc"></p>
              </figcaption>
            </figure>
          </div>
        </div>
        <div class="swiper-pagination"></div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
  .reviews {
    margin-left: -10px;
    margin-right: -10px;
    padding-left: 10px;
    padding-right: 10px;
    padding-top: 10px;

    .swiper-slide {
      opacity: 0;
      transform: translate3d(10%, 0, 0);
      transition: 350ms all;
      height: auto;
      align-self: stretch;

    }
    .swiper-slide-active,
    .swiper-slide-next,
    .swiper-slide-next + .swiper-slide {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }

    &.swiper-container {
      overflow: visible;
    }

    &__item {
      min-height: 100%;
      height: 100%;
      display: flex;

      &:hover {
        transform: translate3d(0, -10px, 0);
      }
    }

    &__inner {
      padding: 40px 30px;
      border-radius: 5px;
      overflow: hidden;
      box-shadow: 0px 6px 20px rgba(213, 213, 213, 0.6);
      background: #fff;
      transition: all 250ms;

      &:hover {
        box-shadow: 0px 19px 30px rgba(178, 178, 178, 0.6);
      }

    }

    &__img {
      max-height: 40px;
      max-width: 50%;
      margin-bottom: 30px;
    }

    &__title {
      font-size: 16px;
      font-weight: 900;
      margin-bottom: 10px;
      width: 90%;
      color: #000;
    }

    &__desc {
      width: 80%;
    }
  }

  @media all and (max-width: 1024px) {

    .reviews {

      &__item {
        transform: translate3d(0, 0, 0);
      }

      &__title {
        font-size: 12px;
      }

      &__inner {
        padding: 30px 17px;
      }

      &__desc {
        width: 100%;
      }
    }
  }

  @media all and (max-width: 767px) {
    .reviews {

      &__item {
        width: 80%;
      }
    }
  }

</style>

<script>

  export default {
    components: {},
    data() {
      return {
        swiperData: {
          slidesPerView: 3,
          speed: 400,
          spaceBetween: 20,
          height: 'auto',
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
          },
          breakpoints: {
            667: {
              slidesPerView: 'auto',
            }
          }
        },
        slides: [
          {
            src: '/img/partners/zipcar.png',
            title: 'Лучшие в своем сегменте',
            desc: 'Равным образом рамки и место обучения кадров представляет собой интересный эксперимент проверки позиций, занимаемых участниками в отношении поставленных задач.',
          },
          {
            src: '/img/partners/ujet.png',
            title: 'Просто огонь!',
            desc: 'Разнообразный и богатый опыт сложившаяся структура организации требуют определения и уточнения форм развития.'

          },
          {
            src: '/img/partners/zapier.png',
            title: 'Сервис невероятного уровня',
            desc: 'Равным образом рамки и место обучения кадров представляет собой интересный эксперимент проверки позиций, занимаемых участниками в отношении поставленных задач.'
          }, {
            src: '/img/partners/zapier.png',
            title: 'Сервис невероятного уровня',
            desc: 'Равным образом рамки и место обучения кадров представляет собой интересный эксперимент проверки позиций, занимаемых участниками в отношении поставленных задач.'
          }, {
            src: '/img/partners/zapier.png',
            title: 'Сервис невероятного уровня',
            desc: 'Равным образом рамки и место обучения кадров представляет собой интересный эксперимент проверки позиций, занимаемых участниками в отношении поставленных задач.'
          },

        ]
      }
    },
    mounted() {
      const that = this;
      that.$refs.mySlider.swiper.on('slideChange', function () {
        console.log(this)
      });
    }
  }
</script>


