<template>
  <div class="error-page complite-page">
    <div class="container">
      <div class="complite-page__gradient"></div>

      <div class="complite-page__box">
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
    </div>
  </div>
</template>

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

  @media all and (max-width: 991px) {

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
        margin-bottom: 30px;
      }

      &__content {
        text-align: center;
        width: 100%;
      }
    }
  }

  @media all and (max-width: 767px) {
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
  }
</style>
