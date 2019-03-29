<template>
  <swiper :options="data" ref="mySwiper" @someSwiperEvent="callback">
    <!-- slides -->
    <div class="swiper-wrapper">
      <div class="swiper-slide"
           v-for="(slide, i) in data.slides"
           :class="currentSettings.slideClass"
           v-bind:key="i">
        <img :src="slide.src" alt="">
      </div>
    </div>
    <!-- Optional controls -->
    <div class="swiper-pagination"  slot="pagination"></div>
    <div class="swiper-button-prev" slot="button-prev"></div>
    <div class="swiper-button-next" slot="button-next"></div>
  </swiper>
</template>

<script>
  export default {
    props: ['data'],
    data(){
      return {

      }
    }
  }
</script>
