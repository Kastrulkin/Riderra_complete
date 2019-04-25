<template>
  <div class="wrap">
    <button>click me!</button>
    <date-picker v-model="value" :lang="lang" @input="change" >
      <calendar-icon></calendar-icon>
    </date-picker>
  </div>
</template>

<script>
  import dropdown from '~/components/form/baggageDropdown.vue'
  import DatePicker from 'vue2-datepicker'
  export default {
    components: {
      dropdown, DatePicker
    },
    data(){
      return {
        /*lang: {
          days: ['asd', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          pickers: ['next 7 days', 'next 30 days', 'previous 7 days', 'previous 30 days'],
          placeholder: {
            date: 'Select Date',
            dateRange: 'Select Date Range'
          },
        },*/
        lang: 'ru'

      }
    },
    methods: {
      change(val){
        console.log(val)
      }
    }


  }
</script>

<style scoped lang="scss">
  .wrap {
    margin-top: 200px;
    display: block;
    position: relative;

  }

  input {
    padding: 50px 100px;
    border: 1px solid red;
  }

  .result-list {
    position: absolute;
    top: 150px;
    z-index: 200;
    background: #fff;
    opacity: 1;
    pointer-events: all;

  }

  /*input:focus + .result-list {
    opacity: 1;
    pointer-events: all;

  }*/

  .map {
    width: 400px;
    height: 400px;
  }

  li {
    padding: 20px;
  }

</style>
