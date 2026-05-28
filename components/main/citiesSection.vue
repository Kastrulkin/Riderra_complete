<template>
  <section class="site-section site-section--sm">
    <div class="container">
      <div class="row">
        <div class="col-sm-6">
          <h2 class="h2 site-section__title">
            <span>{{ textData.gallery.title }}</span>
          </h2>
        </div>
      </div>
    </div>
    <div class="cities">
      <gallery></gallery>
    </div>
  </section>
</template>

<script>
  import gallery from '~/components/partials/gallery.vue'

  export default {
    components: {
      gallery
    },
    computed: {
      textData(){
        return this.$store.getters.textData;
      }
    }
  }
</script>

<style scoped lang="scss">
  .cities{
    overflow: hidden;

    img{
      max-width: 100%;
    }
  }
</style>
