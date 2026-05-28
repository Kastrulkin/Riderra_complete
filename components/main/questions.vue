<template>
  <section class="site-section site-section--sm">
    <div class="container questions">
      <div class="row">
        <div class="col-sm-6 col-xs-12">
          <h2 class="h2">
            <span>{{ textData.questions.title }}</span>
          </h2>
        </div>
        <div class="col-sm-6 col-xs-12">
          <p>
            <span>{{ textData.questions.description }}</span>
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
  export default {
    computed: {
      textData(){
        return this.$store.getters.textData;
      }
    }
  }
</script>

<style scoped lang="scss">
  .questions {
    padding-top: 50px;
    margin-bottom: 120px;

    .h2 {
      margin-bottom: 30px;
    }
  }

  @media (max-width: 1024px) {

    .questions{
      margin-bottom: 95px;
    }
  }

  @media (max-width: 767px) {
    .questions {
      margin-bottom: 45px;

      p {
        font-size: 13px;
      }
    }
  }
</style>
