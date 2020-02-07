<template>
  <header class="header" :class="{'menu-open': menu}">
    <div class="header__container container">
    <div class="logo">
      <nuxt-link to="/" class="logo__link">
        <svg class="logo__img logo__img--main" width="108" height="25" viewBox="0 0 108 25">
          <use xlink:href="/sprite.svg#logo"></use>
        </svg>

        <svg class="logo__img logo__img--sub" width="108" height="25" viewBox="0 0 108 25" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clip-path="url(#clip0)">
            <path d="M13.575 8.27993L12.525 13.8541C12.075 13.7767 11.625 13.7767 11.175 13.7767C10.125 13.7767 9.3 14.009 8.7 14.4735C8.1 14.938 7.65 15.7122 7.5 16.7961L6.15 23.8413H0L2.925 8.58961H8.7L8.4 10.138C9.6 8.89929 11.325 8.27993 13.575 8.27993ZM15.225 8.58961H21.3L18.375 23.8413H12.3L15.225 8.58961ZM16.425 6.49928C15.825 5.95735 15.45 5.26057 15.45 4.33154C15.45 3.32508 15.825 2.55089 16.5 1.85411C17.25 1.23475 18.15 0.847656 19.275 0.847656C20.325 0.847656 21.15 1.07991 21.75 1.62185C22.35 2.16379 22.725 2.86056 22.725 3.71218C22.875 4.87347 22.5 5.72509 21.75 6.34445C21.075 6.9638 20.1 7.3509 18.9 7.3509C17.925 7.3509 17.1 7.04122 16.425 6.49928ZM41.4 3.09282L37.425 23.7638H31.65L31.95 22.3703C30.825 23.4542 29.475 24.0735 27.975 24.0735C27 24.0735 26.025 23.7638 25.05 23.2219C24.15 22.68 23.325 21.8284 22.8 20.8219C22.275 19.8155 21.9 18.4993 21.9 17.0283C21.9 15.4025 22.275 13.9316 22.95 12.538C23.625 11.1445 24.6 10.138 25.8 9.36381C27 8.58961 28.275 8.20252 29.7 8.20252C31.65 8.20252 33.075 8.82187 33.9 10.0606L35.25 3.0154H41.4V3.09282ZM28.65 18.4993C29.025 18.9638 29.55 19.1187 30.225 19.1187C31.05 19.1187 31.65 18.809 32.175 18.1896C32.7 17.5703 32.925 16.7187 32.925 15.6348C32.925 14.938 32.7 14.3187 32.325 13.9316C31.95 13.467 31.425 13.3122 30.75 13.3122C29.925 13.3122 29.325 13.6219 28.8 14.2412C28.275 14.8606 28.05 15.7122 28.05 16.7961C28.05 17.4154 28.275 18.0348 28.65 18.4993ZM57.15 17.6477H46.8C46.95 18.2671 47.25 18.7316 47.7 19.0413C48.15 19.3509 48.825 19.4284 49.65 19.4284C50.85 19.4284 51.975 19.0413 52.875 18.3445L55.425 22.138C53.625 23.3768 51.45 23.9961 48.975 23.9961C47.4 23.9961 45.975 23.6864 44.7 23.1445C43.5 22.6026 42.525 21.7509 41.85 20.6671C41.175 19.5832 40.875 18.3445 40.875 16.9509C40.875 15.2477 41.25 13.7767 42 12.4606C42.75 11.1445 43.875 10.0606 45.225 9.36381C46.575 8.58961 48.225 8.20252 50.025 8.20252C51.6 8.20252 52.95 8.51219 54.075 9.05413C55.2 9.59607 56.1 10.4477 56.7 11.4541C57.3 12.4606 57.6 13.6219 57.6 14.938C57.45 15.8671 57.375 16.7187 57.15 17.6477ZM48 13.1574C47.55 13.5445 47.25 14.009 47.025 14.6283H51.825C51.825 14.009 51.6 13.467 51.225 13.1574C50.85 12.7703 50.325 12.6154 49.65 12.6154C49.05 12.538 48.45 12.7703 48 13.1574ZM71.175 8.27993L70.125 13.8541C69.675 13.7767 69.225 13.7767 68.775 13.7767C67.725 13.7767 66.9 14.009 66.3 14.4735C65.7 14.938 65.25 15.7122 65.1 16.7961L63.75 23.8413H57.675L60.6 8.58961H66.375L66.075 10.138C67.2 8.89929 68.925 8.27993 71.175 8.27993ZM83.475 8.27993L82.425 13.8541C81.975 13.7767 81.525 13.7767 81.075 13.7767C80.025 13.7767 79.2 14.009 78.6 14.4735C78 14.938 77.55 15.7122 77.4 16.7961L76.05 23.8413H69.975L72.9 8.58961H78.675L78.375 10.138C79.5 8.89929 81.225 8.27993 83.475 8.27993ZM101.25 8.58961L98.325 23.8413H92.55L92.85 22.4477C91.725 23.5316 90.375 24.1509 88.875 24.1509C87.9 24.1509 86.925 23.8413 85.95 23.2993C85.05 22.7574 84.225 21.9058 83.7 20.8993C83.1 19.8155 82.8 18.5767 82.8 17.1058C82.8 15.48 83.175 14.009 83.85 12.6154C84.525 11.2993 85.5 10.2154 86.7 9.44123C87.9 8.66703 89.175 8.27993 90.6 8.27993C92.55 8.27993 93.975 8.89929 94.8 10.138L95.1 8.51219H101.25V8.58961ZM89.55 18.4993C89.925 18.9638 90.45 19.1187 91.125 19.1187C91.95 19.1187 92.55 18.809 93.075 18.1896C93.6 17.5703 93.825 16.7187 93.825 15.6348C93.825 14.938 93.6 14.3187 93.225 13.9316C92.85 13.5445 92.325 13.3122 91.65 13.3122C90.825 13.3122 90.225 13.6219 89.7 14.2412C89.175 14.8606 88.95 15.7122 88.95 16.7961C88.95 17.4154 89.175 18.0348 89.55 18.4993ZM101.775 23.1445C101.175 22.5251 100.875 21.7509 100.875 20.7445C100.875 19.5832 101.25 18.6542 102 17.9574C102.75 17.2606 103.65 16.8735 104.7 16.8735C105.675 16.8735 106.5 17.1832 107.1 17.8025C107.7 18.4219 108 19.1961 108 20.2025C108 21.3638 107.625 22.2929 106.875 22.9897C106.125 23.6864 105.225 24.0735 104.175 24.0735C103.2 24.0735 102.375 23.7638 101.775 23.1445Z" fill="white"/>
            <path d="M13.575 8.27993L12.525 13.8541C12.075 13.7767 11.625 13.7767 11.175 13.7767C10.125 13.7767 9.3 14.009 8.7 14.4735C8.1 14.938 7.65 15.7122 7.5 16.7961L6.15 23.8413H0L2.925 8.58961H8.7L8.4 10.138C9.6 8.89929 11.325 8.27993 13.575 8.27993ZM15.225 8.58961H21.3L18.375 23.8413H12.3L15.225 8.58961ZM16.425 6.49928C15.825 5.95735 15.45 5.26057 15.45 4.33154C15.45 3.32508 15.825 2.55089 16.5 1.85411C17.25 1.23475 18.15 0.847656 19.275 0.847656C20.325 0.847656 21.15 1.07991 21.75 1.62185C22.35 2.16379 22.725 2.86056 22.725 3.71218C22.875 4.87347 22.5 5.72509 21.75 6.34445C21.075 6.9638 20.1 7.3509 18.9 7.3509C17.925 7.3509 17.1 7.04122 16.425 6.49928ZM41.4 3.09282L37.425 23.7638H31.65L31.95 22.3703C30.825 23.4542 29.475 24.0735 27.975 24.0735C27 24.0735 26.025 23.7638 25.05 23.2219C24.15 22.68 23.325 21.8284 22.8 20.8219C22.275 19.8155 21.9 18.4993 21.9 17.0283C21.9 15.4025 22.275 13.9316 22.95 12.538C23.625 11.1445 24.6 10.138 25.8 9.36381C27 8.58961 28.275 8.20252 29.7 8.20252C31.65 8.20252 33.075 8.82187 33.9 10.0606L35.25 3.0154H41.4V3.09282ZM28.65 18.4993C29.025 18.9638 29.55 19.1187 30.225 19.1187C31.05 19.1187 31.65 18.809 32.175 18.1896C32.7 17.5703 32.925 16.7187 32.925 15.6348C32.925 14.938 32.7 14.3187 32.325 13.9316C31.95 13.467 31.425 13.3122 30.75 13.3122C29.925 13.3122 29.325 13.6219 28.8 14.2412C28.275 14.8606 28.05 15.7122 28.05 16.7961C28.05 17.4154 28.275 18.0348 28.65 18.4993ZM57.15 17.6477H46.8C46.95 18.2671 47.25 18.7316 47.7 19.0413C48.15 19.3509 48.825 19.4284 49.65 19.4284C50.85 19.4284 51.975 19.0413 52.875 18.3445L55.425 22.138C53.625 23.3768 51.45 23.9961 48.975 23.9961C47.4 23.9961 45.975 23.6864 44.7 23.1445C43.5 22.6026 42.525 21.7509 41.85 20.6671C41.175 19.5832 40.875 18.3445 40.875 16.9509C40.875 15.2477 41.25 13.7767 42 12.4606C42.75 11.1445 43.875 10.0606 45.225 9.36381C46.575 8.58961 48.225 8.20252 50.025 8.20252C51.6 8.20252 52.95 8.51219 54.075 9.05413C55.2 9.59607 56.1 10.4477 56.7 11.4541C57.3 12.4606 57.6 13.6219 57.6 14.938C57.45 15.8671 57.375 16.7187 57.15 17.6477ZM48 13.1574C47.55 13.5445 47.25 14.009 47.025 14.6283H51.825C51.825 14.009 51.6 13.467 51.225 13.1574C50.85 12.7703 50.325 12.6154 49.65 12.6154C49.05 12.538 48.45 12.7703 48 13.1574ZM71.175 8.27993L70.125 13.8541C69.675 13.7767 69.225 13.7767 68.775 13.7767C67.725 13.7767 66.9 14.009 66.3 14.4735C65.7 14.938 65.25 15.7122 65.1 16.7961L63.75 23.8413H57.675L60.6 8.58961H66.375L66.075 10.138C67.2 8.89929 68.925 8.27993 71.175 8.27993ZM83.475 8.27993L82.425 13.8541C81.975 13.7767 81.525 13.7767 81.075 13.7767C80.025 13.7767 79.2 14.009 78.6 14.4735C78 14.938 77.55 15.7122 77.4 16.7961L76.05 23.8413H69.975L72.9 8.58961H78.675L78.375 10.138C79.5 8.89929 81.225 8.27993 83.475 8.27993ZM101.25 8.58961L98.325 23.8413H92.55L92.85 22.4477C91.725 23.5316 90.375 24.1509 88.875 24.1509C87.9 24.1509 86.925 23.8413 85.95 23.2993C85.05 22.7574 84.225 21.9058 83.7 20.8993C83.1 19.8155 82.8 18.5767 82.8 17.1058C82.8 15.48 83.175 14.009 83.85 12.6154C84.525 11.2993 85.5 10.2154 86.7 9.44123C87.9 8.66703 89.175 8.27993 90.6 8.27993C92.55 8.27993 93.975 8.89929 94.8 10.138L95.1 8.51219H101.25V8.58961ZM89.55 18.4993C89.925 18.9638 90.45 19.1187 91.125 19.1187C91.95 19.1187 92.55 18.809 93.075 18.1896C93.6 17.5703 93.825 16.7187 93.825 15.6348C93.825 14.938 93.6 14.3187 93.225 13.9316C92.85 13.5445 92.325 13.3122 91.65 13.3122C90.825 13.3122 90.225 13.6219 89.7 14.2412C89.175 14.8606 88.95 15.7122 88.95 16.7961C88.95 17.4154 89.175 18.0348 89.55 18.4993ZM101.775 23.1445C101.175 22.5251 100.875 21.7509 100.875 20.7445C100.875 19.5832 101.25 18.6542 102 17.9574C102.75 17.2606 103.65 16.8735 104.7 16.8735C105.675 16.8735 106.5 17.1832 107.1 17.8025C107.7 18.4219 108 19.1961 108 20.2025C108 21.3638 107.625 22.2929 106.875 22.9897C106.125 23.6864 105.225 24.0735 104.175 24.0735C103.2 24.0735 102.375 23.7638 101.775 23.1445Z" fill="url(#paint0_linear)"/>
          </g>
          <defs>
            <linearGradient id="paint0_linear" x1="39.3846" y1="8.61542" x2="113.893" y2="11.0546" gradientUnits="userSpaceOnUse">
              <stop stop-color="#FF017A"/>
              <stop offset="1" stop-color="#702283"/>
            </linearGradient>
            <clipPath id="clip0">
              <rect width="108" height="23.1485" fill="white" transform="translate(0 0.924805)"/>
            </clipPath>
          </defs>
        </svg>

      </nuxt-link>
    </div>
      <language :data="langData"></language>
    <nav class="nav-list">
      <nuxt-link to="/" class="nav-list__item" @click.native="scrollTo('#howWorks')">{{textData.howwework}}</nuxt-link>
      <nuxt-link to="/" class="nav-list__item" @click.native="scrollTo('#park')">Автопарк</nuxt-link>
      <nuxt-link to="/" class="nav-list__item" @click.native="scrollTo('#reviews')">Отзывы</nuxt-link>
    </nav>
    <tabs-nav></tabs-nav>
    <div class="header__right">
      <a href="tel:88009543212" class="header__tel">8-800-954-32-12</a>
      <a href="#" class="header__signin">Войти</a>
    </div>
    <div class="menu-toggle" ref="burger" @click="menuToggle">
      <span class="menu-toggle__line menu-toggle__line--first"></span>
      <span class="menu-toggle__line menu-toggle__line--second"></span>
      <span class="menu-toggle__line menu-toggle__line--third"></span>
    </div>
    </div>
  </header>
</template>

<script>

  import tabsNav from '~/components/partials/orderCaption.vue'
  import language from '~/components/partials/language.vue'


  export default {
    components: {
      tabsNav,language
    },
    computed:{
      menu(){
        return this.$store.getters.getMenu;
      },
      data(){
        return this.$store.state.siteData;
      },
      textData(){
	      return this.$store.getters.textData
      }

    },
    head() {
      return {
        bodyAttrs: {
          class: this.ua
        },
      }
    },
    data(){
      return {
        mobileMenu: false,
        navList: ['Как мы работаем', 'Автопарк', 'Отзывы'],
        // navList: $store.state.siteData["ru"].nav,
        ua: '',
        langData: {
          class: ''
        }
      }
    },
    methods:{
      mediaQuery() {
        this.$store.commit('setQuery', window.innerWidth < 667 ? 'mobile' : ((window.innerWidth > 667 && window.innerWidth < 1023) ? 'tablet' : 'laptop'))
      },
      menuToggle(){
        /*if(!this.menu){
          this.$refs.burger.classList.add('active');
          this.$store.commit('toggleMenu', true)

        } else {
          this.$refs.burger.classList.remove('active');
          this.$store.commit('toggleMenu', false)

        }*/

        this.$refs.burger.classList.toggle('active');
        this.mobileMenu = !this.mobileMenu;
        this.$store.commit('toggleMenu', this.mobileMenu)

        // console.log(this.mobileMenu)


      },
      scrollTo(ident){
        if(process.browser){
          let el = document.querySelector(`${ident}`);
          if(!el) return;
          setTimeout(function(){
            el.scrollIntoView({block: "start", behavior: "smooth"});
          }, 100);

        }

      }
    },
    beforeMount(){
      // Данные в localStorage

      if( localStorage.getItem('currentCar') ){

        let car = JSON.parse(localStorage.getItem('currentCar'));

        let empty = { a : 'asd'}
        this.$store.commit('setCar', car);
        // this.$store.commit('setCar', empty);
        // console.log(car)
        // console.log(this.currentCar)
      }

      if(localStorage.getItem('formData')){
        let formData = JSON.parse(localStorage.getItem('formData')),
          pointFrom = JSON.parse(localStorage.getItem('from')),
          pointTo = JSON.parse(localStorage.getItem('to'));

        this.$store.commit('setData', formData);
        this.$store.commit('fromPointUpdate', pointFrom);
        this.$store.commit('toPointUpdate', pointTo);

      }
    },
    mounted(){


      this.mediaQuery();

      var ua = navigator.userAgent.toLowerCase();
      if (ua.indexOf('safari') != -1 && ua.indexOf('chrome') === -1) {
        this.ua = 'safari'
      }


    },

  }
</script>

<style scoped lang="scss">
  .tabs-container{
    display: none;
  }

  .inner-page{

    &__wrap{
      padding-top: 125px;
    }

    .header{
      opacity: 1;
      transform: translate3d(0,0,0);
      padding-top: 25px;
      padding-bottom: 25px;

      &__tel{
        color: #2F80ED;
      }

      &__signin{
        display: none;
      }
    }

    .nav-list{
      display: none;
    }

    .tabs-container{
      display: block;
    }


    .logo{

      &__img{

        &--main{
          display: none;
        }
        &--sub{
          display: block;
        }
      }
    }

    .menu-toggle{

      &__line{
        background: #000;
      }

      &.active{

        .menu-toggle__line{
          background: #fff;
        }
      }
    }
  }
  .no-nav{

    .header{
      display: none;
    }
  }

  .menu-open.header{
    transform: none;
    opacity: 1;
    background: linear-gradient(90deg, #FF017A 36.45%, #702283 105.02%);

    .tabs-container{
      display: none;
    }

    .inner-page .menu-toggle__line{
      background: #fff;
    }

    .logo{

      &__img{

        &--sub{
          display: none;
        }

        &--main{
          display: block;
        }
      }
    }
  }

  .header{
    position: absolute;
    z-index: 50;
    top: 0;
    left: 0;
    right: 0;
    color: #fff;
    font-weight: 300;
    padding: 54px 15px;
    /*opacity: 0;*/
    transform: translate3d(0, -250%, 0);
    transition: 400ms all ease 400ms;
    will-change: transform, opacity;


    &.active{
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }

    &__container{
      display: flex;
      align-items: center;
      margin: 0 auto;
    }

    &__tel{
      text-decoration: none;
      font-size: 18px;
      margin-right: 54px;
    }

    &__right{
      margin-left: auto;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    &__signin{
      display: inline-block;
      line-height: 40px;
      border: 1px solid #fff;
      border-radius: 20px;
      padding: 0 16px;
      text-decoration: none;
      font-weight: 800;
      transition: all 250ms;

      &:hover{
        color: #000;
        background: #fff;
      }
    }
  }

  .menu-toggle{
    width: 26px;
    height: 21px;
    display: none;
    position: relative;
    margin-left: auto;
    cursor: pointer;

    &__line{
      width: 100%;
      height: 1px;
      background: #fff;
      position: absolute;
      transition: opacity 0ms, transform 200ms, top 100ms, bottom 100ms,;

      &--first{
        top: 0;
      }

      &--second{
        top: 50%;
        transform: translateY(-50%);
      }

      &--third{
        bottom: 0;
      }
    }

    &.active{

      .menu-toggle__line{

        &--first{
          top: 50%;
          transform: rotate(45deg);
        }
        &--third{
          bottom: 50%;
          transform: rotate(-45deg) ;
        }

        &--second{
          opacity: 0;
        }
      }
    }

  }

  .logo{

    &__img{

      &--sub{
        display: none;
      }
    }

    svg{
      fill: #fff;
    }
  }
  .nav-list{
    display: flex;
    margin-left: 16%;
    align-items: center;

    &__item{
      margin-right: 42px;
      text-decoration: none;
      font-size: 16px;
      position: relative;

      &:after{
        content: '';
        display: block;
        height: 1px;
        background: #fff;
        width: 0;
        bottom: -7px;
        position: absolute;
        transition: 250ms width;
      }

      &:hover{

        &:after{
          width: 100%;

        }
      }
    }
  }



  @media (max-width: 1024px){
    .header{
      padding-top: 30px;
      padding-bottom: 30px;
      opacity: 1;
      transform: none;
    }

    .nav-list{
      display: none;
    }
  }

  @media (max-width: 767px){

    .logo{

      &__img{
        max-width: 96px;
      }
    }
    .header{
      padding-top: 25px;
      padding-bottom: 25px;
      padding-left: 0;
      padding-right: 0;

      &__right{
        display: none;
      }
    }

    .menu-toggle{
      display: flex;
    }

    .inner-page{

      .header{
        padding-top: 17px;
        padding-bottom: 17px;
      }

      .tabs{
        position: absolute;
        top: 50%;
        left: 5%;
        transform: translateX(-50%);
      }


    }

  }


</style>
