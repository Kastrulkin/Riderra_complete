<template>
  <section class="site-section" id="howWorks">
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
            <div class="swiper-slide main-slider__item" :class="slide.class"
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
          <div class="swiper-button-prev swiper-arrow">
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M7.73994 11.3273C8.11145 11.736 8.08133 12.3684 7.67267 12.7399C7.26402 13.1114 6.63157 13.0813 6.26006 12.6727L7.73994 11.3273ZM2 6.5L1.26006 7.17267L0.648539 6.5L1.26006 5.82733L2 6.5ZM6.26006 0.327326C6.63157 -0.0813307 7.26402 -0.111448 7.67267 0.260059C8.08133 0.631566 8.11145 1.26401 7.73994 1.67267L6.26006 0.327326ZM6.26006 12.6727L1.26006 7.17267L2.73994 5.82733L7.73994 11.3273L6.26006 12.6727ZM1.26006 5.82733L6.26006 0.327326L7.73994 1.67267L2.73994 7.17267L1.26006 5.82733Z"/>
            </svg>

          </div>
          <div class="swiper-button-next swiper-arrow">
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M7.73994 11.3273C8.11145 11.736 8.08133 12.3684 7.67267 12.7399C7.26402 13.1114 6.63157 13.0813 6.26006 12.6727L7.73994 11.3273ZM2 6.5L1.26006 7.17267L0.648539 6.5L1.26006 5.82733L2 6.5ZM6.26006 0.327326C6.63157 -0.0813307 7.26402 -0.111448 7.67267 0.260059C8.08133 0.631566 8.11145 1.26401 7.73994 1.67267L6.26006 0.327326ZM6.26006 12.6727L1.26006 7.17267L2.73994 5.82733L7.73994 11.3273L6.26006 12.6727ZM1.26006 5.82733L6.26006 0.327326L7.73994 1.67267L2.73994 7.17267L1.26006 5.82733Z"/>
            </svg>
          </div>
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
          navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          },
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
            backgroundColor: '#291737',
            class: 'safety'
          }, {
            src: '/img/slide2.png',
            title: 'Пунктуальность',
            desc: 'Приедем заранее, ориентируясь на&nbsp;указанное вами время или сроки рейса. При необходимости вы&nbsp;сможете связаться с&nbsp;водителем напрямую.',
            backgroundColor: '#B0137F',
            class: 'punctuality'

          }, {
            src: '/img/slide3.png',
            title: 'Вежливость и&nbsp;знание языков',
            desc: 'Наши водители вежливы и&nbsp;владеют английским языком. Встретят вас с&nbsp;табличкой в&nbsp;аэропорту или на&nbsp;вокзале, помогут с&nbsp;багажом. Подождут бесплатно, если рейс задержат.',
            backgroundColor: '#F31880',
            class: 'knowledges'
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
        transform: translate3d(0, 0, 0);
        opacity: 1;
      }

      &__title {
        transform: translate3d(0, 0, 0) !important;
        opacity: 1;
      }

      &__desc {
        transform: translate3d(0, 0, 0) !important;
        opacity: 1;
      }
    }

  }

  .swiper-slide {
    /*transition: 300ms all;*/
  }

  .main-slider {
    overflow: visible;
    z-index: 0;

    &__item {
      min-height: 430px;
      overflow: hidden;
      color: #fff;
      height: auto;
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
      bottom: 0;
      max-height: 100%;
      /*transition: 300ms all 600ms;*/
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
      /*transition: 300ms all 900ms;*/
      opacity: 0;

    }

    &__desc {

      /*transition: 300ms all 1200ms;*/
      opacity: 0;
    }
  }

  .punctuality {

    .main-slider {

      &__img {
        right: 0;
        //transform: translate3d(10%, -50%, 0);

      }

      &__caption {
        left: 80px;
      }

      &__title,
      &__desc {
        //transform: translate3d(-40px, 0, 0);
      }

    }

  }

  .knowledges {

    .main-slider {

      &__caption:after {
        background: linear-gradient(180deg, rgba(255, 80, 41, 0.224) 0%, rgba(255, 143, 196, 0.7) 52.49%, rgba(227, 155, 244, 0.7) 64.64%);;
      }

      &__img{
        left: 5%;
        bottom: 10px;
      }
    }
  }

  @media all and (max-width: 1024px) {

    .main-slider {
      width: 90%;

      &__item {
        min-height: 250px;
      }

      &__caption {
        width: 40%;
      }
    }
  }

  @media all and (max-width: 767px) {
    .main-slider {
      width: 100%;
      padding-left: 0;
      padding-right: 0;

      &__inner {
        &:after {
          width: 80%;
          opacity: 0.2;
          left: 65%;
        }
      }

      &__caption {
        position: relative;
        top: 0;
        left: 0;
        transform: translate3d(0, 0, 0);
      }

      &__item {
        position: relative;
      }

      &__img {
        position: relative;
      }
    }

    .safety {

      .main-slider {

        &__inner {
          display: flex;
          flex-direction: column;
          padding-top: 45px;
        }

        &__caption {
          order: 1;
          width: 90%;
          margin: 0 auto;
          padding-right: 30%;
        }

        &__img {
          order: 2;
          position: relative;
          transform: translate3d(-10%, 15%, 0)
        }
      }
    }

    .punctuality {

      .main-slider {

        &__inner {
          display: flex;
          flex-direction: column;
        }

        &__img {
          width: 90%;
          margin-left: auto;
        }

        &__caption {
          order: 1;
          width: 90%;
          margin: 0 auto;
          padding-right: 30%;
          left: 0;
          padding-bottom: 40px;
          margin-top: auto;
        }
      }
    }

    .knowledges{


      .main-slider {

        &__caption{
          width: 90%;
          margin: 0 auto;
          padding-right: 20%;
          left: 0;
          padding-bottom: 40px;
          margin-top: auto;
        }

        &__img{
          max-width: 90%;
          margin-top: -90px;
        }
      }
    }
  }
</style>
