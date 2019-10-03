<template>
  <div class="modal-cars">
    <!--<div class="modal-cars__figure" :style="{ backgroundColor: (currentCar.subColor)}">-->
    <div class="modal-cars__figure">
      <!--<div class="modal-cars__figure-inner" :style="{ backgroundColor: currentCar.color}"></div>-->
      <div class="modal-cars__figure-inner"></div>
      <div class="modal-cars__figure-sub"></div>
    </div>
    <div class="modal-cars__swiper">
      <div v-swiper:mySwiper="swiperData" ref="mySlider">
        <div class="swiper-wrapper ">
          <div class="swiper-slide modal-cars__item"
               v-for="(slide, i) in cars"
               :key="i">

            <div class="modal-cars__item-inner">
              <img :src="slide.src" class="modal-cars__img">

            </div>
            <!--:style="{ backgroundColor: slide.color}"-->

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

</template>

<script>
  import {mapState} from 'vuex'

  export default {
    props: ['data'],
    computed: {
      ...mapState(['cars', 'current']),
      currentCar() {
        return this.$store.getters.getCurrentCar;
      },
    },

    data() {
      return {
        swiperData: {
          slidesPerView: 1,
          centeredSlides: true,
          speed: 600,
          autoHeight: false,
          height: '100vh',
          spaceBetween: 100,
          navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          },
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
            renderBullet: function (index, className) {
              return '<span class="' + className + '"><span class="swiper-bullet-inner"></span></span>';
            },
          },

        }


      }
    },
    methods: {
      swiperInit() {
        let self = this;

        self.cars.forEach((item, index) => {

          if (item === self.currentCar) {
            self.$refs.mySlider.swiper.slideTo(index);

          }

        })
      }
    },
    mounted() {

      var that = this;

      // this.$store.commit('currentCar', this.cars[1]);

      this.swiperInit();

      that.$refs.mySlider.swiper.on('slideChange', function () {
        const index = this.activeIndex;
        that.$store.commit('sliderChangeCar', index)

        // console.log(that.$store.state.current)
      });

      /*clearTimeout(timeFun)

      var timeFun = setTimeout(function(){
        that.$refs.mySlider.swiper.on('touchMove', function () {
          // console.log(this);
          // console.log(this.slides[this.activeIndex])
          var currentSlide = this.slides[this.activeIndex],
            prevSlide = this.slides[this.activeIndex - 1],
            nextSlide = this.slides[this.activeIndex + 1];

          var coef = (this.translate * 5/this.width * 1) * 100;
          coef = coef <= 30 ? 30 : (coef >= 60 ? 60 : coef);

          console.log(this.translate)
          this.slides[0].style.width = `${coef}%`;
          // currentSlide.style.width = `${coef/2}%`;
          // currentSlide.style.width = (1/2) * (this.translate * 3/this.width)
          // console.log( coef)

        });
      }, 500)*/


      window.addEventListener('resize', function () {
        // that.$refs.mySlider.swiper.reInit();
      })

      // this.mySwiper.slideTo(i);

    },

  }

</script>

<style scoped lang="scss">

  .swiper-arrow {
    position: absolute;
    background: #fff;

    &:hover{
      background: #2F80ED;
    }
  }

  .swiper-button-prev{
    left: 100px;
    top: 35%;
  }
  .swiper-button-next{
    right: 100px;
    top: 35%;

  }

  .fade-enter-active {

    .modal-cars__swiper {
      opacity: 0;
    }
  }

  .fade-leave-active {
    transition: none;

  }

  .modal-cars {
    position: relative;
    height: 100%;
    overflow: hidden;
    min-height: 600px;

    &__swiper {
      transition: 550ms opacity 100ms;
      opacity: 1;
      height: 100%;
      display: flex;
      align-items: center;
      padding-top: 150px;


      .swiper-container{
        padding-bottom: 150px;
      }

    }

    /*&__swiper {
      position: relative;
      top: 50%;
      transform: translate3d(0, -50%, 0);
    }*/

    &__figure {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate3d(-50%, -50%, 0);
      width: 35%;
      border-radius: 50%;
      transition: 250ms all;

      &:before {
        content: "";
        display: block;
        padding-top: 100%;
        background: inherit;
        border-radius: 50%;
      }
    }



    &__img {
      width: 55%;
      margin: 0 auto;
    }

    &__figure-inner {
      position: absolute;
      background: rgba(229, 0, 109, 0.9);
      opacity: 0.7;
      filter: blur(170px);
      width: 200%;
      height: 200%;
      max-height: 717px;
      max-width: 986px;
      transform: translate3d(-40%, -40%, 0);
      top: 0;
      left: 0;
      border-radius: 30%;

    }

    &__figure-sub {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #702283;
      position: absolute;
      z-index: 1;
      top: 0;
      left: 0;
    }



    &__item {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      width: 60%;
      padding: 0 40px;
      transition: transform 250ms, width 250ms;
      top: 50%;
      position: relative;
      transform: translate3d(0, 0, 0);

    }

    &__item-inner {
      text-align: center;

    }

    &__img {
      max-width: 100%;
      transform: translate3d(0, 0, 0);

    }
  }

  .swiper-wrapper {
    position: relative;
    /*justify-content: center;*/
  }

  .swiper-slide-prev {
    /*transform: translate3d(50%, 10%, 0);*/
  }

  .swiper-slide-next {
    /*transform: translate3d(50%, 10%, 0);*/

    & + .swiper-slide {
      /*transform: translate3d(100%, 10%, 0);*/

    }
  }

  .swiper-slide-active {
    max-width: none;
    width: 60%;
    //transform: translate3d(-25%, 0, 0);
    /*transform: translate3d(0, 0, 0);*/
    filter: blur(0);

  }

  @media (max-width: 1024px) {

    .modal-cars {

      &__img{
        width: 75%;
      }

      &__figure{
        width: 60%;
      }

      &__swiper{
        padding-top: 100px;
        .swiper-container{
          padding-bottom: 100px;
        }
      }


    }

    .swiper-button-prev{
      left: 45px;
      top: 35%;
    }
    .swiper-button-next{
      right: 45px;
      top: 35%;

    }
  }

  @media (max-width: 991px) {
    .modal-cars{

      &__swiper{
        padding-top: 150px;

        .swiper-container{
          padding-bottom: 150px;
        }
      }
    }
  }

  @media (max-width: 767px) {

    .modal-cars {
      min-height: 100%;

      &__item {
        top: 0;
        display: flex;
        align-items: center;
      }

      &__figure {
        width: 110vw;
      }

      &__img{
        width: 100%;
      }

      &__swiper{
        padding-top: 0;

        .swiper-container{
          padding-bottom: 0;
          height: 100%;
        }

        .swiper-pagination{
          padding-bottom: 30px;
        }
      }
    }

    .swiper-wrapper {
      justify-content: initial;
    }

    .swiper-slide-active,
    .swiper-slide-next,
    .swiper-slide-next + .swiper-slide,
    .swiper-slide-prev {
      width: 100%;
      transform: translate3d(0, 0, 0);

    }
  }


</style>
