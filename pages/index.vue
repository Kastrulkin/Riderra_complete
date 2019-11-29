<template>
  <div>
    <main-section :data="siteData"></main-section>
    <work-section :data="siteData['whyWe']"></work-section>
    <section-cities></section-cities>
    <section-cars></section-cars>
    <reviews></reviews>
    <partners></partners>
    <questions></questions>
    <section class="site-section site-section--pf">
      <form-feedback :data="formData"></form-feedback>
    </section>
  </div>

</template>

<script>
import maps from '~/components/maps.vue'
import mainSection from '~/components/main/topSection.vue'
import workSection from '~/components/main/HowWeWorks.vue'
import sectionCities from '~/components/main/citiesSection.vue'
import sectionCars from '~/components/main/carpark.vue'
import reviews from '~/components/main/reviews.vue'
import partners from '~/components/main/partners.vue'
import questions from '~/components/main/questions.vue'
import formFeedback from '~/components/partials/form.vue'

import {data} from '~/static/lang.js'

export default {
  components: {
    maps, mainSection, workSection, sectionCities, sectionCars, reviews, partners, questions, formFeedback
  },
  computed: {
    lang(){
      return this.$store.state.language;
    },
    siteData(){
      return this.data[this.lang];
    }
  },
  data(){
    return {
      data: data,
      formData: {
        class: 'feedback'
      },
    }
  },
  methods:{
    fetchData(){

    }
  },
  beforeMount(){
  },
  mounted(){

     console.log( this.data[this.lang]);

  }
}
</script>

<style scoped lang="scss">

  .site-section--pf{

    .container{
      padding-bottom: 230px;
    }
  }


  @media (max-width: 1024px){

    .site-section--pf{

      .container{
        padding-bottom: 120px;
      }
    }
  }
  @media (max-width: 767px){

    .site-section--pf{

      .container{
        padding-bottom: 100px;
      }
    }
  }
</style>

