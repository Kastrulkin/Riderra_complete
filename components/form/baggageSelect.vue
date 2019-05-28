<template>
  <div class="select"  >
    <div class="select__label">
      <input class="select__input" type="text" readonly v-model="value" :name="data.name">
      <i class="select__icon"></i>
      <transition name="fade">
      <ul class="select__dropdown dropdown" >
        <li class="dropdown__item" v-for="(item,i) in data.list"  :key="i" @click="setValue(item)">{{item}}</li>
      </ul>
      </transition>
    </div>
  </div>
</template>

<script>
  export default {
    props: ['data'],
    data() {
      return {
        active: false,
        value: 0,
        currentTarget: '',
        oldTarget: ''
      }
    },
    methods: {

      setValue(a) {
        this.value = a;

        // закрываем dropdown
        this.$emit('hide');
      },

    },
    mounted(){

    }
  }
</script>

<style scoped lang="scss">

  .select {
    width: 78px;
    height: 26px;
    border: 1px solid rgba(60, 60, 60, .26);
    border-radius: 4px;
    width: 100%;

    &.active {

      .select__icon{
        transform: translateY(-50%) rotateX(180deg);
      }

      .select__dropdown{
        opacity: 1;
        pointer-events: all;
      }
    }

    &__label {
      padding: 0;
      margin: 0;
      background: transparent;
      width: 100%;
      height: 100%;
      font-size: 16px;
      color: #000;
      margin-left: auto;
      cursor: pointer;
      position: relative;

    }

    &__input {
      pointer-events: none;
      background: transparent;
      padding-left: 10px;

      &:focus,
      &:hover {
        outline: none;
      }
    }

    &__dropdown {
      position: absolute;
      top: calc(100% - 2px);
      left: -1px;
      background: #fff;
      border: 1px solid rgba(60, 60, 60, .26);
      border-top: none;
      width: 100%;
      padding: 10px 0;
      margin: 0;
      box-sizing: content-box;
      z-index: 3;

      opacity: 0;
      pointer-events: none;

    }

    &__icon{
      width: 12px;
      height: 6px;
      position: absolute;
      right: 5px;
      top: 50%;
      transform: translateY(-50%);
      background: url(/img/arrow.svg) center no-repeat;
      transition: 150ms transform;
      transform-origin: center;

    }
  }

  .dropdown {
    transition: all 150ms ease;

    &__item {
      text-align: center;
      padding: 3px 0;
      background: #fff;
      transition: all 150ms ease;
      color: #000;
      position: relative;

      &:hover {
        background: #2F80ED;
        color: #fff;
      }
    }


  }

</style>
