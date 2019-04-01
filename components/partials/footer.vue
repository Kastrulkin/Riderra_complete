<template>
  <footer class="footer container">
    <div class="row footer__top">
      <div class="footer__logo col-sm-3 col-xs-12">
        <svg width="108" height="23" viewBox="0 0 108 23" class="logo__img">
          <use xlink:href="/sprite.svg#logo"></use>
        </svg>
      </div>
      <ul class="footer__col col-xs-12 col-sm-3 ">
        <li><a href="" class="links-list__">Условия перевозки</a></li>
        <li><a href="">Политика конфиденциальности</a></li>
      </ul>
      <ul class="footer__col footer__col--contacts col-xs-12 col-sm-3 col-md-push-1">
        <li><a href="tel:88009543212" class="phone">8-800-954-32-12</a></li>
        <li><a href="mailto:mail@riderra.ru">mail@riderra.ru</a></li>
      </ul>

      <div class="col-sm-3 col-xs-12 ">
        <div class="socials">
          <a href="#" class="socials__link">
            <svg width="20" height="21" viewBox="0 0 20 21" fill="none">
              <use xlink:href="/sprite.svg#insta"></use>
            </svg>
          </a>
          <a href="#" class="socials__link">
            <svg width="21" height="12" viewBox="0 0 21 12">
              <use xlink:href="/sprite.svg#vk"></use>
            </svg>
          </a>
          <a href="#" class="socials__link">
            <svg width="11" height="21" viewBox="0 0 11 21">
              <use xlink:href="/sprite.svg#fb"></use>
            </svg>
          </a>
        </div>
      </div>
    </div>
    <div class="row footer__bottom">
      <div class="col-sm-3 col-xs-12 footer__copyright">
        © 2012-2019 Riderra
      </div>
      <div class="col-sm-4 col-xs-12 money-operators">
        <img class="money-operators__item" src="/img/cards/visa.svg" alt="">
        <img class="money-operators__item" src="/img/cards/mastercard.svg" alt="">
        <img class="money-operators__item" src="/img/cards/visa_n.svg" alt="">
        <img class="money-operators__item" src="/img/cards/mir.svg" alt="">
        <img class="money-operators__item" src="/img/cards/apple_pay.svg" alt="">

      </div>
      <div class="col-sm-4 col-xs-12 col-sm-push-1 made-by">
        <span>Сделано в&nbsp;</span><a href="https://serenity.agency/">
        <svg class="made-by__logo" width="104" height="28" viewBox="0 0 104 28" fill="none"
             xmlns="http://www.w3.org/2000/svg">
          <use xlink:href="/sprite.svg#serenity"></use>
        </svg>
      </a>
      </div>
    </div>
  </footer>
</template>

<style lang="scss" scoped>

  .money-operators {
    display: flex;
    align-items: center;

    &__item {

      & + & {
        margin-left: 30px;
      }
    }
  }

  .made-by {
    display: flex;
    font-size: 12px;
    justify-content: flex-end;

    span {
      line-height: 32px;
    }
  }

  .socials {
    display: flex;
    justify-content: flex-end;

    margin-left: auto;

    &__link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 35px;
      height: 35px;
      border-radius: 50%;
      border: 1px solid #C4C4C4;

      & + & {
        margin-left: 15px;
      }
    }
  }

  .footer {
    padding-bottom: 54px;
    color: #000;
    font-size: 14px;

    &__copyright {
      color: #7D7D7D;
      display: flex;
      align-items: center;
    }

    a {
      text-decoration: none;
    }

    &__top {
      display: flex;
      flex-wrap: wrap;
      padding-top: 40px;
    }

    &__bottom {
      display: flex;
      flex-wrap: wrap;
      padding-top: 80px;
    }

    &__links {
      padding-top: 15px;

      &--contacts {
        padding-top: 10px;
      }
    }

    &__phone {
      text-decoration: none;
    }

    &__logo svg {
      fill: #000;
    }

    .phone {
      font-size: 16px;
    }
  }

  @media all and (max-width: 1024px) {

    .footer {
      font-size: 10px;

      &__copyright {
        display: flex;
        align-items: center;
      }

      &__logo {
        text-align: center;
      }

      &__col {
        text-align: left;
      }
    }

    .socials {
      justify-content: center;
    }

    .money-operators {
      display: flex;
      align-items: center;

      &__item {
        max-width: 30px;
        max-height: 12px;

        & + & {
          margin-left: 20px;
        }
      }
    }

    .socials {

      &__link {
        width: 30px;
        height: 30px;

        svg {
          max-width: 16px;
          max-height: 18px;
        }
      }
    }

    .made-by {

      span {
        line-height: 30px;
      }

      &__logo {
        max-width: 85px;
      }
    }
  }

  @media all and (max-width: 767px) {

    .footer {

      &__bottom{
        padding-top: 0;
      }

      &__copyright{
        justify-content: center;
        order: 3;
        margin-top: 20px;

      }

      &__logo {
        text-align: center;
        margin-bottom: 40px;
      }

      &__col {
        text-align: center;
        margin-bottom: 40px;

      }
    }

    .money-operators{
      justify-content: center;
      order: 2;

    }

    .socials {
      justify-content: center;
      margin-bottom: 40px;

    }

    .made-by{
      justify-content: center;
      order: 1;
      margin-bottom: 40px;


    }

  }
</style>
