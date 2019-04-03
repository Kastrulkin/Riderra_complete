<template>
  <div class="container">
    <div class="tabs">
      <!--<nuxt-link to="/" class="tabs__link">Откуда и куда</nuxt-link>
      <nuxt-link to="/transport" class="tabs__link active">Транспорт</nuxt-link>
      <nuxt-link to="/payment" class="tabs__link">Оплата</nuxt-link>-->

      <nuxt-link :to="item.href" v-for="(item, i) in tabs" class="tabs__link" :key="i" @click.native="changeTab(item)">
        {{item.title}}
      </nuxt-link>
    </div>
    <h2 class="h2 transport__title" v-html="data.title"></h2>
  </div>
</template>

<script>
  export default {
    props: ['data'],
    data() {
      return {
        current: null,
        tabs: [
          {
            title: 'Откуда и куда',
            href: '/'
          },
          {
            title: 'Транспорт',
            href: '/transport'
          }, {
            title: 'Оплата',
            href: '/payment'
          }
        ]
      }
    },
    methods: {
      changeTab(item) {
        this.current = item;

        console.log(this.current === item)
      }
    },
    mounted(){
      this.current = this.tabs[1];
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

      &.nuxt-link-exact-active {
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

  @media (max-width: 1024px) {

    .tabs {

      &__link {
        font-size: 12px;

        & + & {
          margin-left: 40px;
        }
      }
    }
  }

  @media (max-width: 767px) {
    .tabs {
      margin-top: 90px;
      margin-bottom: 60px;

      &__link {

        & + & {
          margin-left: 30px;
        }
      }
    }

    .transport {

      &__title {
        margin-bottom: 25px;
      }
    }
  }

</style>
