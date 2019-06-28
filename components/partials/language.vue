<template>
  <div class="lang-select" :class="data.class">
    <div class="lang-select__wrap" v-click-outside="hideList">
      <div class="lang-select__current" @click="toggleList">
        {{current || languages[0].shortcut}}
        <svg class="lang-select__arrow" width="10" height="6" viewBox="0 0 13 8" fill="none"
             xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L6.5 6L12 1" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <transition name="list-fade">
        <div class="lang-select__list" v-show="state">
          <div class="lang-select__list-item" v-for="(item, i) in languages" :key="i" @click="chooseLang(item)">
            {{item.lang}}
          </div>
        </div>
      </transition>
    </div>


  </div>
</template>

<script>
  export default {
    props: ['data'],
    watch: {
      '$route.path': function (nv, ov) {
        this.state = false;
      }
    },
    data() {
      return {
        state: false,
        languages: [
          {
            shortcut: 'Ru',
            lang: 'Россия — русский'
          }, {
            shortcut: 'En',
            lang: 'Germany — English'
          }, {
            shortcut: 'Ch',
            lang: '中国 — 中文'
          }
        ],
        current: null

      }
    },
    methods: {
      toggleList() {
        this.state = !this.state;
      },
      hideList() {
        this.state = false;
      },
      chooseLang(lang) {
        console.log(lang)
        this.current = lang.shortcut;
        this.state = false;

      }
    }
  }
</script>
<style lang="scss" scoped>

  .lang-select {
    margin-left: 25px;
    position: relative;
    cursor: pointer;

    &__current{
      white-space: nowrap;
    }

    &__wrap{
      display: flex;
      align-items: flex-end;
      margin-bottom: -2px;
    }

    &__list {
      position: absolute;
      top: 100%;
      left: 100%;
      padding: 10px;
      background: #fff;
      border-radius: 0 0 5px 5px;
      color: #000;
      box-shadow: 0px 5px 12px rgba(0, 0, 0, 0.4);
      z-index: 10;
    }

    &__list-item {
      line-height: 60px;
      white-space: nowrap;
      transition: 150ms all ease;
      padding: 0 10px;
      border-radius: 5px;

      &:hover {
        background: #2F80ED;
        color: #fff;
      }
    }

    &__arrow {
      margin-left: 4px;
      stroke: #fff;
    }

    &.blue {
      color: #2F80ED;
    }

    &.blue &__arrow {
      stroke: #2F80ED;
    }
  }

  .blue{

    .lang-select{

      &__list {
        bottom: 100%;
        top: initial;
        border-radius: 5px 5px 0 0;
      }
    }

  }

  .list-fade-enter-active {
    transition: all .3s ease;
  }

  .list-fade-leave-active {
    transition: none;
  }

  .list-fade-enter, .list-fade-leave-to
    /* .slide-fade-leave-active до версии 2.1.8 */
  {
    transform: translateY(10px);
    opacity: 0;
  }

  @media (max-width: 1024px) {

    .lang-select{

      &__current{
        font-size: 12px;
      }
    }
  }
</style>
