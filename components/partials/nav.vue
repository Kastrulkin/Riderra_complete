<template>
  <header class="container header">
    <div class="logo">
      <nuxt-link to="/" class="logo__link">
        <svg class="logo__img" width="108" height="23" viewBox="0 0 108 23">
          <use xlink:href="/sprite.svg#logo"></use>
        </svg>
      </nuxt-link>
    </div>
    <nav class="nav-list">
      <nuxt-link to="/test" class="nav-list__item">Как мы работаем</nuxt-link>
      <a href="#" class="nav-list__item">Автопарк</a>
      <a href="#" class="nav-list__item">Отзывы</a>
    </nav>
    <div class="header__right">
      <a href="tel:88009543212" class="header__tel">8-800-954-32-12</a>
      <a href="#" class="header__signin">Войти</a>
    </div>
    <div class="menu-toggle" ref="burger" @click="menuToggle">
      <span class="menu-toggle__line menu-toggle__line--first"></span>
      <span class="menu-toggle__line menu-toggle__line--second"></span>
      <span class="menu-toggle__line menu-toggle__line--third"></span>
    </div>
  </header>
</template>

<script>


  export default {
    components: {
    },
    computed:{
      menu(){
        return this.$store.getters.getMenu;
      }
    },
    methods:{
      menuToggle(){
        if(!this.menu){
          this.$refs.burger.classList.add('active');
          this.$store.commit('toggleMenu', true)

        } else {
          this.$refs.burger.classList.remove('active');
          this.$store.commit('toggleMenu', false)

        }
      }
    },
    data(){
      return {

      }
    }
  }
</script>

<style scoped lang="scss">

  .inner-page{

    .header{
      background: linear-gradient(90deg,#FF017A 36.45%, #702283 105.02%), #702283;
      padding-top: 25px;
      padding-bottom: 25px;
    }
  }
  .no-nav{

    .header{
      display: none;
    }
  }

  .header{
    display: flex;
    align-items: center;
    padding: 54px 15px;
    /*position: fixed;*/
    position: absolute;
    z-index: 50;
    top: 0;
    left: 0;
    right: 0;
    color: #fff;
    font-weight: 300;


    &__tel{
      text-decoration: none;
      font-size: 18px;
      margin-right: 54px;
    }

    &__right{
      margin-left: auto;
      display: flex;
      align-items: center;
    }

    &__signin{
      display: inline-block;
      line-height: 40px;
      border: 1px solid #fff;
      border-radius: 20px;
      padding: 0 16px;
      text-decoration: none;
      font-weight: 800;
    }
  }

  .menu-toggle{
    width: 26px;
    height: 21px;
    display: none;
    position: relative;
    margin-left: auto;
    cursor: pointer;

    &__line{
      width: 100%;
      height: 1px;
      background: #fff;
      position: absolute;
      transition: opacity 0ms, transform 200ms, top 100ms, bottom 100ms,;

      &--first{
        top: 0;
      }

      &--second{
        top: 50%;
        transform: translateY(-50%);
      }

      &--third{
        bottom: 0;
      }
    }

    &.active{

      .menu-toggle__line{

        &--first{
          top: 50%;
          transform: rotate(45deg);
        }
        &--third{
          bottom: 50%;
          transform: rotate(-45deg) ;
        }

        &--second{
          opacity: 0;
        }
      }
    }

  }

  .logo{

    svg{
      fill: #fff;
    }
  }
  .nav-list{
    display: flex;
    margin-left: 16%;
    align-items: center;

    &__item{
      margin-right: 42px;
      text-decoration: none;
      font-size: 16px;
    }
  }



  @media all and (max-width: 1024px){
    .header{
      padding-top: 30px;
      padding-bottom: 30px;
    }

    .nav-list{
      display: none;
    }
  }

  @media all and (max-width: 767px){
    .header{
      padding-top: 25px;
      padding-bottom: 25px;

      &__right{
        display: none;
      }
    }

    .menu-toggle{
      display: flex;
    }
  }
</style>
