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
    mounted(){

      window.onload = function(){
        const sectionForm = document.querySelector('.main-section__content');
        const header = document.querySelector('.header');
        sectionForm.classList.add('active');
        header.classList.add('active');
      };

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

