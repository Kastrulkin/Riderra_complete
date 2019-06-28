<template>
  <div class="error-page complite-page">
    <div class="container">
      <div class="complite-page__gradient"></div>

      <div class="complite-page__box" v-if="error">
        <div class="complite-page__logo"></div>
        <div class="complite-page__content">
          <div class="complite-page__title error-page__title h2">
            404
          </div>
          <div class="complite-page__text">
            Что-то пошло не так

          </div>

          <nuxt-link to="/" class="complite-page__button white-button">На главную</nuxt-link>

        </div>
      </div>

      <div class="complite-page__box form-success" v-if="formSuccess">
        <div class="complite-page__logo"></div>
        <div class="complite-page__content">

          <svg class="form-success__icon" width="89" height="65" viewBox="0 0 89 65" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 22.5789L37.8438 52L80 9" stroke="white" stroke-width="18" stroke-linecap="round"/>
          </svg>

          <div class="complite-page__title error-page__title h2">
            Успешно отправлено
          </div>
          <div class="complite-page__text">
            Скоро мы обязатльно вам ответим.

          </div>

          <nuxt-link to="/" class="complite-page__button white-button">На главную</nuxt-link>

        </div>
      </div>

      <div class="complite-page__box form-success order-complite" v-if="complite">

        <img class="complite-page__logo order-complite__car" :src="currentCar.src">

        <div class="complite-page__content order-complite__content">

          <svg class="form-success__icon" width="89" height="65" viewBox="0 0 89 65" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 22.5789L37.8438 52L80 9" stroke="white" stroke-width="18" stroke-linecap="round"/>
          </svg>

          <div class="complite-page__title error-page__title h2">
            Заказ успешно принят
          </div>
          <div class="complite-page__text">
            Спасибо, что воспользовались услугами нашей компании.
          </div>

          <nuxt-link to="/" class="complite-page__button white-button">На главную</nuxt-link>

        </div>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    computed:{
      currentCar(){
        return this.$store.getters.getCurrentCar;
      }
    },
    data(){
      return {
        formSuccess: false,
        error: false,
        complite: true
      }
    }
  }
</script>

<style lang="scss">

  .complite-page {
    height: 640px;
    background: #702283;
    position: relative;
    overflow: hidden;

    &__gradient {
      display: block;
      position: absolute;
      width: 70%;
      height: 50%;
      top: 45%;
      transform: translate3d(-10%, -50%, 0);
      /*background: #E5006D;*/
      /*opacity: 0.7;*/
      box-shadow: 0px 11px 24px rgba(229, 0, 109, 0.6);
      filter: blur(50px);
      border-radius: 5px;

      background: radial-gradient(ellipse at center, #E5006D, transparent);
    }

    &__box {
      display: flex;
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate3d(-50%, -50%, 0);
      color: #fff;
      width: 74%;
    }

    &__logo {
      width: 331px;
      height: 331px;
      background: url(/img/logo_n.svg) center no-repeat / cover;
      margin-right: 140px;
      max-width: 100%;
    }

    &__text {
      font-size: 16px;
    }

    &__content {
      width: 35%;
    }

    &__button {
      line-height: 60px;
      border-radius: 40px;

      &:hover {
        color: #000;
        background: #fff;
      }
    }

  }

  .error-page {

    &__title {
      font-size: 96px;
      font-weight: 800;
    }
  }

  .form-success{

    .h2{
      font-size: 36px;
      margin-bottom: 20px;
      margin-top: 20px;
    }
  }

  .order-complite{
    justify-content: flex-end;

    &__car{
      position: absolute;
      left: 0;
      top: 50%;
      transform: translate3d(-60%,-50%,0);
      height: 100%;
      width: 60%;
      background: none;
    }

    &__content{
      width: 50%;
      padding-right: 15%;
    }
  }

  @media all and (max-width: 991px) {

    .form-success{

      &__icon{
        width: 40px;
        height: 25px;
      }

      .h2{
        font-size: 26px;
        margin-bottom: 10px;
      }
    }

    .complite-page {
      height: 100vh;

      &__gradient {
        width: 90%;
        height: 57%;
        top: 21%;
        border-radius: 50%;
        left: -5%;
      }

      &__box {
        flex-wrap: wrap;
        justify-content: center;
        width: 60%;
      }

      &__logo {
        margin-right: 0;
        margin-bottom: 50px;
      }

      &__content {
        text-align: center;
        width: 100%;
      }
    }

    .order-complite{

      &__car{
        position: relative;
        width: 100%;
        transform: none;
      }

      &__content{
        padding-right: 0;
      }
    }
  }

  @media all and (max-width: 767px) {

    .form-success{

      &__icon{
        width: 32px;
        height: 20px;
      }

      .h2{
        margin-top: 10px;
        font-size: 18px;
      }
    }
    .complite-page {
      min-height: 480px;

      &__box {
        width: 90%;
        max-width: 370px;
      }

      &__logo {
        width: 118px;
        height: 118px;
      }

      &__text {
        font-size: 12px;
      }

      &__button {
        line-height: 50px;
      }

      &__gradient {
        width: 200%;
        height: auto;
        padding-top: 200%;
        left: 50%;
        top: 40%;
        transform: translate3d(-50%, -50%, 0);

      }
    }

    .error-page {

      &__title {
        font-size: 56px;
      }
    }

    .order-complite{
      align-items: center;

      &__car{
        width: 100%;
        height: auto;
      }

    }
  }
</style>
