<template>
  <main class="wrapper" >
    <mobile-menu></mobile-menu>
    <navigation></navigation>
    <nuxt/>
    <site-footer></site-footer>
    <transition name="fade" mode="out-in">
      <popup v-if="popupState"></popup>
    </transition>
  </main>
</template>

<script>
  import navigation from '~/components/partials/nav.vue'
  import siteFooter from '~/components/partials/footer.vue'
  import mobileMenu from '~/components/partials/mobileMenu.vue'
  import popup from '~/components/partials/popup.vue'

  export default {
    computed: {
      popupState(){
        return this.$store.state.popup;
      }
    },
    components: {
      navigation, siteFooter, mobileMenu, popup
    },
    data(){
      return {
        langs:['ru', 'en', 'de']
      }
    },

    methods:{

    },
    created(){
      // Убираем автоматическое определение языка браузера
      // var userLang = window.navigator.language || window.navigator.userLanguage;

      // this.langs.forEach(el => {
      //   userLang.indexOf(el) !== -1 ? this.$store.commit('setLang', el) : false;

      //   // console.log(this.$store.state.language);
      // })
    },
    mounted(){

    }
  }


</script>
<style>
.wrapper{
  overflow: hidden;
}

*, *:before, *:after {
  box-sizing: border-box;
  margin: 0;
}


</style>

