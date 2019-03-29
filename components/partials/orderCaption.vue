<template>
  <div class="container">
    <div class="tabs">
      <a href="#" class="tabs__link">Откуда и куда</a>
      <a href="#" class="tabs__link active">Транспорт</a>
      <a href="#" class="tabs__link disabled">Оплата</a>
    </div>
    <h2 class="h2 transport__title" v-html="data.title"></h2>
  </div>
</template>

<script>
  export default {
    props: ['data'],
    data(){
      return {

      }
    }
  }
</script>
<style scoped lang="scss">

  .tabs {
    display: flex;
    justify-content: center;
    margin-top: 124px;
    margin-bottom: 85px;

    &__link {
      position: relative;
      text-decoration: none;
      color: #2F80ED;
      font-size: 14px;

      &.active {
        color: #000;

        &:before {
          content: '';
          display: block;
          width: 100%;
          height: 1px;
          position: absolute;
          bottom: -15px;
          background: #000;

        }
      }

      &.disabled {
        color: #7D7D7D;
        pointer-events: none;
      }

      & + & {
        margin-left: 100px;
      }
    }
  }

  .transport {
    padding-bottom: 200px;

    &__title {
      margin-bottom: 70px;
    }
  }

  @media (max-width: 1024px){

    .tabs{

      &__link{
        font-size: 12px;

        & + &{
          margin-left: 40px;
        }
      }
    }
  }

  @media (max-width: 767px){
    .tabs{

      &__link{

        & + &{
          margin-left: 30px;
        }
      }
    }
  }

</style>
