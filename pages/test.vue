<template>
  <div class="wrap">
    <dropdown></dropdown>
  </div>
</template>

<script>
  import dropdown from '~/components/form/baggageDropdown.vue'
  export default {
    components: {
      dropdown
    },


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
