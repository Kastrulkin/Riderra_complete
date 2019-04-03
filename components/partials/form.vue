<template>
  <div class="container">
    <form action="" class="form" :class="{'transport-form': data.type === 'transport'}">
      <div class="form__row js-form-row" v-for="(item, index) in fields" :key="index" >

        <div class="form__item" :id="index">
          <input class="form__input" type="text" name="name[]" placeholder="Укажите ваше имя">
          <span class="form__item-label">Имя</span>
        </div>
        <div class="form__item">
          <masked-input mask="\+\7 (111) 111-11-11" class="form__input" type="tel" name="phone[]" placeholder="Телефон, например +84 567-66-77"  />
          <span class="form__item-label">Телефон</span>
        </div>
        <div class="form__sub-button js-slice-row" @click="remove(item)">Удалить</div>
        <div class="form__sub-button js-add-row" ref="more" @click="clone(index)">
          + Дополнительный номер
        </div>
      </div>
      <div class="form__row">
        <div class="form__item form__item--wide">
          <input class="form__input" type="text" name="comment" placeholder="Комментарий">
          <!--<span class="form__item-label">Комментарий</span>-->
        </div>
      </div>
      <div class="form__row submit-row">
        <div class="form__item policy">
          <label class="policy__label">
            <input class="policy__checkbox" type="checkbox" checked>
            <span>Согласен с&nbsp;<a href="#" class="policy__link">политикой конфиценциальности</a></span>
          </label>
        </div>
        <div class="form__item">
          <!--<input class="form__button button" type="submit" value="Отправить">-->
          <nuxt-link class="form__button button" to="/payment">Отправить</nuxt-link>
        </div>
      </div>
    </form>
  </div>
</template>

<script>
  import MaskedInput from 'vue-masked-input'

  export default {
    props: ['data'],
    components: {
      MaskedInput
    },
    data(){
      return {
        fields: [
          {
            name: '',
            phone: ''
          }
        ]
      }
    },
    methods:{
      clone(index){
        // this.fields.splice(index, 0, this.fields[index])
        console.log(this.fields)
        this.fields.push({
          name: '',
          phone: ''
        });
      },
      remove(index){
        console.log(index)
        this.fields.splice(index, 1);
      }
    }
  }
</script>

<style scoped lang="scss">

  .js-slice-row{
    cursor: pointer;
    position: absolute;
    font-size: 14px;
    left: 0;
    bottom: 0;
    color: #EB5757;
    opacity: 0;
    pointer-events: none;
  }

  .js-add-row{
    color: #2F80ED;
    cursor: pointer;
    position: absolute;
    font-size: 14px;
    right: 0;
    bottom: 0;
    opacity: 0;
    pointer-events: none;
  }

  .transport-form{

    .submit-row{
      display: none;
    }

    .js-form-row{
      padding-bottom: 30px;
    }

    .form{

      &__row{
        margin-bottom: 40px;
      }

    }

    .js-slice-row{
      opacity: 1;
      pointer-events: all;
    }
    .js-form-row{

      &:first-child {

        .js-slice-row{
          opacity: 0;
          pointer-events: none;
        }
      }

      &:nth-last-child(3){

        .js-add-row{
          opacity: 1;
          pointer-events: all;
        }
      }
    }
  }




  .form{

    &__button{
      height: 60px;
      text-align: center;
    }

    &__input{
      box-shadow: 0 0 0 1px #D8D8E6;
      position: relative;
      transition: box-shadow 150ms;
      height: 56px;
      font-size: 16px;
      padding: 5px 16px;

      &:focus{
        box-shadow: 0 0 0 2px #2F80ED;
        z-index: 1;
      }
    }

    &__row{
      display: flex;
      margin-bottom: 20px;
      position: relative;


    }



    &__item{
      width: 50%;
      position: relative;

      &:first-child {
        .form__input{
          border-radius: 5px 0 0 5px;
        }
      }




      & + &{
        //margin-left: -1px;

        .form__input{
          border-radius: 0 5px 5px 0;
        }
      }

      &--wide{
        width: 100%;

        .form__input:first-child{
          border-radius: 5px;
        }
      }
    }

    &__item-label{
      opacity: 0;
      pointer-events: none;
      position: absolute;
      top: -10px;
      transform: translate3d(0, -50%, 0);
      transition: all 150ms;

      font-size: 14px;
      color: #7D7D7D;
      font-weight: normal;
    }

    .form__input:focus + .form__item-label,
    .form__input:not(:placeholder-shown) + .form__item-label{
      opacity: 1;
      transform: translate3d(0, -100%, 0);
    }
  }

  @media all and (max-width: 1024px){
    .policy{
      font-size: 12px;
    }

    .form{

      &__input{
        height: 46px;
        font-size: 14px;
        padding: 5px 12px;
      }

      &__button{
        height: 50px;
        line-height: 50px;
      }
    }
  }
  @media all and (max-width: 767px){

    .form__item + .form__item .form__input {
      border-radius: 5px;
    }
    .form{

      &__sub-button{
        font-size: 12px;
      }

      &__input{
        height: 40px;
        border-radius: 5px;
      }


      &__row{
        flex-wrap: wrap;
      }

      &__item{
        width: 100%;

        & + &{
          margin-top: 20px;
        }

        &:first-child,
        &:last-child{

          .form__input{
            border-radius: 5px;

          }

        }
      }
    }



    .policy{
      font-size: 10px;
      padding-bottom: 10px;
    }
  }
</style>
