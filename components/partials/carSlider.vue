<template>
  <div v-swiper:mySwiper="swiperData" class="cars" :class="{'transport-cars': data.type === 'transport'}" ref="mySlider">
    <div class="swiper-wrapper ">
      <div class="swiper-slide cars__item"
           :style="{ backgroundColor: slide.color}"
           v-for="(slide, i) in cars"
           :key="i"
            @click="chooseCar(slide)">
        <figure class="cars__inner">
          <!--<img :src="slide.src" class="cars__img">-->
          <div class="cars__img"
               :style="{ backgroundImage: 'url(' + slide.src + ')'}"></div>
          <figcaption class="cars__caption">
            <div class="cars__title h3" ref="swiperTitle" v-html="slide.title"></div>
            <p class="cars__desc" ref="swiperDesc" v-html="slide.desc"></p>

            <div class="cars-price">
              <div class="cars-price__current">{{ slide.price }}</div>
              <div class="cars-price__prev">{{ slide.prevPrice }}</div>
            </div>
            <div class="cars__button white-button">Выбрать</div>
          </figcaption>
        </figure>
      </div>
    </div>
    <div class="swiper-pagination"></div>
  </div>
</template>
<script>

  import { mapState } from 'vuex'


  export default {
    computed: mapState(['cars']),
    props: ['data'],
    data() {
      return {
        swiperData: {
          slidesPerView: 3,
          speed: 400,
          spaceBetween: 20,
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
          },
          breakpoints: {
            767: {
              slidesPerView: 'auto',
            }
          }
        },
        slides: [
          {
            src: '/img/cars/comfort_class.png',
            title: 'Комфорт-класс',
            desc: 'Багаж для 3&nbsp;человек 3&nbsp;места',
            backgroundColor: '#E5006D'
          }, {
            src: '/img/cars/bussines_class.png',
            title: 'Бизнес-класс',
            desc: 'Багаж для 3&nbsp;человек 3&nbsp;места',
            backgroundColor: '#C80D7D'
          }, {
            src: '/img/cars/first_class.png',
            title: '1 класс',
            desc: 'Багаж для 3&nbsp;человек 3&nbsp;места',
            backgroundColor: '#702283'
          }, {
            src: '/img/cars/first_class.png',
            title: '1 класс',
            desc: 'Багаж для 3&nbsp;человек 3&nbsp;места',
            backgroundColor: '#702283'
          },
          {
            src: '/img/cars/first_class.png',
            title: '1 класс',
            desc: 'Багаж для 3&nbsp;человек 3&nbsp;места',
            backgroundColor: '#702283'
          },
          {
            src: '/img/cars/first_class.png',
            title: '1 класс',
            desc: 'Багаж для 3&nbsp;человек 3&nbsp;места',
            backgroundColor: '#702283'
          },
          {
            src: '/img/cars/first_class.png',
            title: '1 класс',
            desc: 'Багаж для 3&nbsp;человек 3&nbsp;места',
            backgroundColor: '#702283'
          },

        ]
      }
    },
    methods:{
      chooseCar(current){

        this.$store.commit('currentCar', current);

        // console.log(current)

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
<style scoped lang="scss">

  .transport-cars{

    .cars{

      &__title{
        position: absolute;
        top: 25px;
        left: 20px;
      }

      &__button{
        display: block;
        max-width: 131px;
        margin-top: 0;
      }

      &__caption{
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
      }

      &__desc{
        width: 100%;
        margin-bottom: 30px;
      }
    }

    .cars-price{
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      position: relative;

      &__prev{
        order: 1;
        text-decoration: line-through;
        position: absolute;
        transform: translateY(-50%);
        top: 0px;
      }

      &__current{
        order: 2;
      }
    }
  }

  .cars-price{
    display: none;
    align-items: flex-end;
    color: #fff;
    font-size: 32px;
    font-weight: normal;

    &__prev{
      opacity: 0.7;
      font-size: 18px;

    }
  }

  .cars {

    &__button{
      display: none;
    }

    .swiper-slide {
      opacity: 0;
      transform: translate3d(10%, 0, 0);
      transition: 350ms all;
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
      padding: 20px 0 30px;
      border-radius: 5px;
      height: 450px;
      color: #fff;
      position: relative;
      overflow: hidden;
      transition: all 250ms;

      &:hover,
      &:focus {
        box-shadow: 0 20px 90px 3px rgba(112, 34, 131, .8);

      }
    }

    &__inner {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
    }

    &__img {
      background-size: cover;
      background-repeat: no-repeat;
      background-position: 130% 0;

      width: 100%;
      height: 70%;

    }

    &__caption {
      padding: 0 20px;
    }

    &__desc {
      width: 60%;
      color: #fff;
    }
  }



  @media all and (max-width: 991px) {
    .cars {

      &__item {
        height: 280px;
      }

      &__desc {
        font-size: 12px;
        width: 80%;
      }
    }
  }

  @media all and (max-width: 767px) {
    .cars{

      &__item{
        width: 80%;
        height: 290px;
      }
    }
  }
</style>
