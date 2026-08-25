<template>
  <transition name="slide">
    <div class="mobile-menu" v-if="menu" v-scroll-lock="menu">
      <div class="mobile-menu__wrap container">
        <language :data="langData"></language>
        <a class="mobile-menu__tel" href="tel:88009543212">8-800-954-32-12</a>
        <nav class="nav">
          <a
            v-for="(item,i) in navList"
            :key="i"
            class="nav__link"
            :href="item.link"
            @click="closeMenu"
          >
            {{item.title}}
          </a>
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
      },
      textData() {
        return this.$store.getters.textData || {};
      },
      navList() {
        const lang = this.$store.state.language;
        const labels = {
          ru: ['Партнёрам', 'Стать перевозчиком'], en: ['Partners', 'Become a fleet partner'], es: ['Socios', 'Ser socio de flota'],
          de: ['Partner', 'Flottenpartner werden'], fr: ['Partenaires', 'Devenir partenaire de flotte'], el: ['Συνεργάτες', 'Γίνετε συνεργάτης στόλου'],
          th: ['พันธมิตร', 'สมัครเป็นพันธมิตรรถ'], ar: ['الشركاء', 'التسجيل كشريك أسطول'], ha: ['Abokan hulɗa', 'Kasance abokin hulɗar motoci']
        };
        const current = labels[lang] || labels.en;
        const partnersPath = lang === 'en' ? '/partners' : `/${lang}/partners`;
        const wikiPath = lang === 'en' ? '/vendor-wiki' : `/${lang}/vendor-wiki`;
        return [
          { title: current[0], link: partnersPath },
          { title: current[1], link: `/drivers?lang=${lang}` },
          { title: 'Vendor Wiki', link: wikiPath },
          {
            title: this.textData.travelPlanners || 'Tour Agencies',
            link: '/for-travel-planners'
          },
          {
            title: this.textData.aiAgents || 'AI Agents',
            link: '/ai'
          },
          {
            title: this.textData.businessTravel || 'Business Travel',
            link: '/business-travel'
          },
          {
            title: this.textData.howItWorks || 'How it works',
            link: '/how-it-works'
          }
        ]
      }
    },
    methods:{
      closeMenu() {
        this.$store.commit('toggleMenu', false)
      }
    },
    data() {
      return {
        langData: {
          class: ''
        }
      }
    }
  }
</script>

<style scoped lang="scss">
  .mobile-menu {
    width: 100%;
    height: 100svh;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    background: #101827;
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
      border-radius: 8px;
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
    transition: opacity 300ms ease, transform 300ms ease;
  }
  .list-enter, .list-leave-to /* .list-leave-active до версии 2.1.8 */ {
    opacity: 0;
    transform: translateY(30px);
  }
</style>
