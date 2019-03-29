<template>
  <no-ssr>
    <datepicker :bootstrap-styling="true" :language="state.language" :value="state.date"></datepicker>
  </no-ssr>
</template>
<script>
  import Datepicker from "vuejs-datepicker/dist/vuejs-datepicker.esm.js";
  import {ru} from 'vuejs-datepicker/dist/locale'

  export default {
    components: {
      Datepicker
    },
    data(){
      return {
        state: {
          date: new Date(),
          language: ru

        }
      }
    }
  }
</script>
