<template>
  <div class="modal-cars">
    <!--<div class="modal-cars__figure" :style="{ backgroundColor: (currentCar.subColor)}">-->
    <div class="modal-cars__figure">
      <!--<div class="modal-cars__figure-inner" :style="{ backgroundColor: currentCar.color}"></div>-->
      <div class="modal-cars__figure-inner"></div>
      <div class="modal-cars__figure-sub"></div>
    </div>
    <div v-swiper:mySwiper="swiperData" class="modal-cars__swiper" ref="mySlider">
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
      <div class="container">

      </div>
    </div>
  </div>

</template>

<script>
  import { mapState } from 'vuex'

  export default {
    props: ['data'],
    computed: {
      ...mapState(['cars', 'current']),
      currentCar(){
        return this.$store.state.current;
      },
    },
    data(){
      return {
        swiperData:{
          slidesPerView: 'auto',
          centeredSlides: true,
          speed: 600,
          autoHeight: false,
          height: '100vh',
        }


      }
    },
    methods:{
      swiperInit(){
        let self = this;
        self.cars.forEach((item, index) => {

          if (item === self.currentCar){
            self.$refs.mySlider.swiper.slideTo(index);

          }

        })
      }
    },
    mounted(){



      var that = this;
      this.$store.commit('currentCar', this.cars[1]);


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







      window.addEventListener('resize', function(){
        that.$refs.mySlider.swiper.reInit();
      })

      // this.mySwiper.slideTo(i);

    },

  }

</script>

<style scoped lang="scss">



  .modal-cars{
    position: relative;
    height: 100%;
    overflow: hidden;
    min-height: 600px;

    &__figure{
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate3d(-50%, -50%, 0);
      width: 35%;
      border-radius: 50%;
      transition: 250ms all;

      &:before{
        content: "";
        display: block;
        padding-top: 100%;
        background: inherit;
        border-radius: 50%;
      }
    }

    &__figure-inner{
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

    &__figure-sub{
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #702283;
      position: absolute;
      z-index: 1;
      top: 0;
      left: 0;
    }

    &__swiper{
      position: relative;
      top: 50%;
      transform: translate3d(0, -50%, 0);
    }

    &__item{
      display: flex;
      justify-content: center;
      align-items: flex-start;
      width: 30%;
      padding: 0 40px;
      transition: all 250ms linear;
      top: 50%;
      position: relative;
      transform: translate3d(0, 0, 0);
      filter: blur(3px);

    }

    &__item-inner{
     /* width: 30%;
      transition: all 500ms;
      transform: translate3d(0, 0, 0);*/

    }

    &__img{
      max-width: 100%;
      transform: translate3d(0, 0, 0);

    }
  }
  .swiper-wrapper{
    position: relative;
    justify-content: center;
  }
  .swiper-slide-prev{
    //transform: translate3d(50%, 10%, 0);
  }

  .swiper-slide-next{
    //transform: translate3d(-50%, 10%, 0);

    & + .swiper-slide{
      /*transform: translate3d(100%, 10%, 0);*/

    }
  }

  .swiper-slide-active{
    max-width: none;
    width: 60%;
    //transform: translate3d(-25%, 0, 0);
    transform: translate3d(0, 0, 0);
    filter: blur(0);

    .modal-cars__item-inner{
      /*width: 50%;*/
    }

  }


</style>
