<template>
  <section class="site-section">
    <div class="container">
      <div class="row">
        <div class="col-sm-6">
          <h2 class="h2 site-section__title">
            Как мы работаем
          </h2>
        </div>
      </div>
      <div class="row">
        <div v-swiper:mySwiper="swiperData" class="main-slider col-lg-12" ref="mySlider">
          <div class="swiper-wrapper ">
            <div class="swiper-slide main-slider__item"
                 :style="{ backgroundColor: slide.backgroundColor}"
                 v-for="(slide, i) in slides"
                 :key="i">
              <figure class="main-slider__inner">
                <img :src="slide.src" class="main-slider__img">
                <figcaption class="main-slider__caption">
                  <div class="main-slider__title h2" ref="swiperTitle" v-html="slide.title"></div>
                  <p class="main-slider__desc" ref="swiperDesc" v-html="slide.desc"></p>
                </figcaption>
              </figure>
            </div>
          </div>
          <div class="swiper-pagination"></div>
        </div>
      </div>
    </div>
  </section>
</template>



<script>

  export default {
    components: {},
    data() {
      return {
        swiperData: {
          slidesPerView: 1,
          speed: 400,
          effect: 'fade',
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
          },
        },
        slides: [
          {
            src: '/img/slide1.png',
            title: 'Безопасно и надежно',
            desc: 'Каждый водитель проходит через индивидуальное собеседование при трудоустройстве. Минимальный стаж — 5 лет.',
            backgroundColor: '#291737'
          }, {
            src: '/img/slide1.png',
            title: 'Безопасно и надежно',
            desc: 'Каждый водитель проходит через индивидуальное собеседование при трудоустройстве. Минимальный стаж — 5 лет.',
            backgroundColor: '#cecece'
          }, {
            src: '/img/slide1.png',
            title: 'Безопасно и надежно',
            desc: 'Каждый водитель проходит через индивидуальное собеседование при трудоустройстве. Минимальный стаж — 5 лет.',
            backgroundColor: 'blue'
          },

        ]
      }
    },
    mounted() {
      this.$refs.mySlider.swiper.on('slideChange', function () {
        console.log(this)
        /*var currentIndex = this.activeIndex;
        this.slides.forEach(function(val, currentIndex){
          val.
          this.slides[currentIndex].classList.addClass('active')
        });
        for(let i=0; i < this.slides; i++){
          this.slides[i].classList.removeClass('active')
        }*/
      });
    }
  }
</script>
<style scoped lang="scss">
  .swiper-slide-active {

    .main-slider {

      &__img {
        transform: translate3d(0, -50%, 0);
        opacity: 1;
      }

      &__title {
        transform: translate3d(0, 0, 0);
        opacity: 1;
      }

      &__desc {
        transform: translate3d(0, 0, 0);
        opacity: 1;
      }
    }

  }

  .swiper-slide {
    transition: 300ms all;
  }

  .main-slider {

    &__item {
      min-height: 430px;
      overflow: hidden;
      color: #fff;
    }

    &__inner {
      height: 100%;

      &:after {
        content: '';
        display: block;
        width: 40%;
        height: 150%;
        position: absolute;
        background-image: radial-gradient(ellipse at center, #FF017A 10%, transparent 70%);
        left: 38%;
        transform: skew(30deg) translateY(-50%);
        opacity: .45;
        z-index: -1;
        top: 72%;
      }
    }

    &__img {
      display: block;
      width: auto;
      position: absolute;
      top: 50%;
      max-height: 100%;
      transform: translate3d(-10%, -50%, 0);
      transition: 300ms all 600ms;
      opacity: 0;
    }

    &__caption {
      width: 30%;
      position: absolute;
      right: 120px;
      top: 50%;
      transform: translate3d(0, -50%, 0);
    }

    &__title {
      font-weight: 800;
      margin-bottom: 20px;
      transition: 300ms all 900ms;
      opacity: 0;
      transform: translate3d(40px, 0, 0);

    }

    &__desc {
      transform: translate3d(40px, 0, 0);

      transition: 300ms all 1200ms;
      opacity: 0;
    }
  }

  @media all and (max-width: 767px){
    .main-slider{
      padding-left: 0;
      padding-right: 0;
    }
  }
</style>
