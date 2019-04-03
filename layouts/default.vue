<template>
  <main class="wrapper" >
    <mobile-menu></mobile-menu>
    <navigation></navigation>
    <nuxt/>
    <site-footer></site-footer>

  </main>
</template>

<script>
  import navigation from '~/components/partials/nav.vue'
  import siteFooter from '~/components/partials/footer.vue'
  import mobileMenu from '~/components/partials/mobileMenu.vue'

  export default {
    components: {
      navigation, siteFooter, mobileMenu
    }
  }

  /*Vue.directive('scroll', {
    inserted: function(el, binding) {
      let f = function(evt) {
        if (binding.value(evt, el)) {
          window.removeEventListener('scroll', f);
        }
      };
      window.addEventListener('scroll', f);
    },
  });*/
</script>
<style>
.wrapper{
  /*overflow-x: hidden;
  overflow-y: auto;
  position: absolute;
  width: 100%;
  height: 100%;
  min-height: 100vh;*/
}

*, *:before, *:after {
  box-sizing: border-box;
  margin: 0;
}


</style>

