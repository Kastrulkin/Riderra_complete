<template>
  <footer class="footer container">
    <div class="row footer__top">
      <div class="col-sm-3 col-xs-12">
      <div class="footer__logo ">
        <svg width="108" height="23" viewBox="0 0 108 23" class="logo__img">
          <use xlink:href="/sprite.svg#logo"></use>
        </svg>

        <language :data="langData"></language>

      </div>
      </div>
      <ul class="footer__col col-xs-12 col-sm-3 ">
        <li><a href="" class="footer__link">Условия перевозки</a></li>
        <li><a href="" class="footer__link">Политика конфиденциальности</a></li>
            <li><nuxt-link to="/request" class="footer__link">{{$store.state.language === 'ru' ? 'Заявка' : 'Request'}}</nuxt-link></li>
            <li><nuxt-link to="/drivers" class="footer__link">{{$store.state.language === 'ru' ? 'Водителям' : 'Drivers'}}</nuxt-link></li>
      </ul>
      <ul class="footer__col footer__col--contacts col-xs-12 col-sm-3 col-md-push-1">
        <li><a class="footer__link" href="mailto:info@riderra.com">info@riderra.com</a></li>
      </ul>

      <div class="col-sm-3 col-xs-12 ">
        <div class="socials">
          <a href="https://www.linkedin.com/company/riderracs" class="socials__link socials__link--no-border" target="_blank" rel="noopener">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="currentColor"/>
            </svg>
          </a>
          <a href="https://vk.com/riderra" class="socials__link" target="_blank" rel="noopener">
            <svg width="21" height="21" viewBox="0 0 101 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clip-path="url(#clip0_2_16)">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M7.52944 7.02944C0.5 14.0589 0.5 25.3726 0.5 48V52C0.5 74.6274 0.5 85.9411 7.52944 92.9706C14.5589 100 25.8726 100 48.5 100H52.5C75.1274 100 86.4411 100 93.4706 92.9706C100.5 85.9411 100.5 74.6274 100.5 52V48C100.5 25.3726 100.5 14.0589 93.4706 7.02944C86.4411 0 75.1274 0 52.5 0H48.5C25.8726 0 14.5589 0 7.52944 7.02944ZM17.3752 30.4169C17.9168 56.4169 30.9167 72.0418 53.7084 72.0418H55.0003V57.1668C63.3753 58.0001 69.7082 64.1252 72.2498 72.0418H84.0835C80.8335 60.2085 72.2914 53.6668 66.9581 51.1668C72.2914 48.0835 79.7915 40.5835 81.5831 30.4169H70.8328C68.4995 38.6669 61.5836 46.1668 55.0003 46.8751V30.4169H44.2499V59.2501C37.5833 57.5835 29.1668 49.5002 28.7918 30.4169H17.3752Z" fill="currentColor"/>
              </g>
              <defs>
                <clipPath id="clip0_2_16">
                  <rect width="100" height="100" fill="white" transform="translate(0.5)"/>
                </clipPath>
              </defs>
            </svg>
          </a>
          <a href="https://www.facebook.com/profile.php?id=61564219065685" class="socials__link" target="_blank" rel="noopener">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="currentColor"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
    <div class="row footer__bottom">
      <div class="col-sm-3 col-xs-12 footer__copyright">
        © 2012-2025 Riderra
      </div>
      <div class="col-sm-4 col-xs-12 money-operators">
        <img class="money-operators__item" src="/img/cards/visa.svg" alt="">
        <img class="money-operators__item" src="/img/cards/mastercard.svg" alt="">
        <img class="money-operators__item" src="/img/cards/visa_n.svg" alt="">
        <img class="money-operators__item" src="/img/cards/mir.svg" alt="">
        <img class="money-operators__item" src="/img/cards/apple_pay.svg" alt="">

      </div>
    </div>
  </footer>
</template>

<script>
  import language from '~/components/partials/language.vue'

  export default {
    components:{
      language
    },
    data(){
      return {
        langData: {
          class: 'blue'
        }
      }
    }
  }
</script>
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
      border: 1px solid rgba(0,0,0,0.5);
      border-radius: 50%;
      transition: 150ms border-color;


      & + & {
        margin-left: 15px;
      }

      svg{
        fill: rgba(0,0,0,0.7);
        transition: 150ms all;
      }

      &:hover{
        border-color: rgba(0,0,0,0.8);

        svg{
          fill: #000;
        }
      }
    }

    &__link--no-border{
      border: none;
    }

  }

  .footer {
    padding-bottom: 54px;
    color: #000;
    font-size: 14px;
    position: relative;

    &__link{
      color: #000;
      transition: 150ms color;

      &:hover{
        color: rgba(0,0,0,0.7);
      }
    }

    &__copyright {
      color: #000;
      display: flex;
      align-items: center;
    }

    a {
      text-decoration: none;
    }

    &__top {
      display: flex;
      flex-wrap: wrap;
      padding-top: 50px;

      &:before{
        content: '';
        display: block;
        width: 100%;
        max-width: 1166px;
        height: 1px;
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.3);

      }
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

    &__logo{

      display: flex;
      align-items: flex-end;
      svg {
        fill: #000;
      }
    }


    .phone {
      font-size: 16px;
    }
  }

  .payment-page .footer__top:before{
    content: none;
  }

  @media all and (max-width: 1024px) {

    .footer {
      font-size: 10px;

      &__copyright {
        display: flex;
        align-items: center;
      }

      &__logo {
        justify-content: center;

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

      &__top{

        &:before{
          width: 90%;
        }
      }

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
