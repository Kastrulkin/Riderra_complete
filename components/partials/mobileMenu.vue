<template>
  <transition name="slide">
    <div class="mobile-menu" v-if="menu" v-scroll-lock="menu">
      <div class="mobile-menu__wrap container">
        <language :data="langData"></language>
        <a class="mobile-menu__tel" href="tel:88009543212">8-800-954-32-12</a>
        <nav class="nav">

          <a class="nav__link" href="" v-for="(item,i) in navList" :key="i" @click.prevent="scrollTo(item.to)">{{item.title}}</a>
        </nav>
        <nuxt-link to="/account" class="mobile-menu__signin">{{$store.getters.textData.enter || 'Sign in'}}</nuxt-link>
      </div>
    </div>
  </transition>
</template>

<script>
  import language from '~/components/partials/language.vue'

  export default {
    components:{
      language
    },
    computed: {
      menu() {
        return this.$store.getters.getMenu;
      }
    },
    methods:{
      scrollTo(id){
        const el = document.getElementById(id)
        el.scrollIntoView({block: "start", inline: "nearest", behavior: "smooth"});
        this.$store.commit('toggleMenu', false)
      }
    },
    data() {
      return {
        langData: {
          class: ''
        },
        navList:[
          {
            title: 'Как мы работаем',
            to: 'howWorks'
          },{
            title: 'Автопарк',
            to: 'park'
          },{
            title: 'Отзывы',
            to: 'reviews'
          },{
            title: 'Условия перевозки',
            to: ''
          },{
            title: 'Политика конфиденциальности',
            to: ''
          },
        ]
      }
    }
  }
</script>

<style scoped lang="scss">
  .mobile-menu {
    width: 100%;
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    background: linear-gradient(90deg, #FF017A 36.45%, #702283 105.02%);
    z-index: 30;
    display: block;
    -webkit-overflow-scrolling: touch;
    overflow-y: scroll;



    a {
      text-decoration: none;
    }

    &__wrap {
      display: block;
      min-height: 100%;
      overflow-y: scroll;
      padding-top: 85px;
      padding-bottom: 150px;
    }

    &__tel {
      font-size: 26px;
      color: #fff;
    }

    &__signin {
      display: block;
      line-height: 40px;
      border: 1px solid #fff;
      border-radius: 40px;
      padding: 0 16px;
      text-decoration: none;
      font-weight: 800;
      text-align: center;
      font-size: 14px;
      color: #fff;
    }

  }

  .nav {
    display: flex;
    flex-direction: column;
    margin-top: 50px;
    margin-bottom: 50px;

    &__link {
      font-size: 18px;
      font-weight: normal;
      text-decoration: none;
      color: #fff;

      & + & {
        margin-top: 20px;
      }

    }


  }

  .slide-enter-active{
    transform: translate3d(0, 0, 0);
    transition: transform 300ms;

  }

  .slide-leave-to, .slide-enter{
    transform: translate3d(0, -100%, 0);
  }
  .list-enter-active, .list-leave-active {
    transition: all 1s;
  }
  .list-enter, .list-leave-to /* .list-leave-active до версии 2.1.8 */ {
    opacity: 0;
    transform: translateY(30px);
  }
</style>
