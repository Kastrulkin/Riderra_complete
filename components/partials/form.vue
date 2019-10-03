<template>
  <div class="container">
    <form class="form" :class="data.class" ref="form">
      <div class="form__row js-form-row" v-for="(item, index) in fields" :key="index">

        <div class="form__item" :id="index">
          <input class="form__input js-required" type="text" name="name[]" placeholder="Укажите ваше имя">
          <span class="form__item-label">Имя</span>
        </div>
        <div class="form__item">
          <masked-input mask="\+\7 (111) 111-11-11" class="form__input js-required" type="tel" name="phone[]"
                        placeholder="Телефон, например +84 567-66-77" @input="inputActive($event)" />
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
          <div v-if="data.class === 'transaction'">
            <input type="submit" class="form__button button" @click.prevent="sendForm" value="Отправить">
          </div>
          <div v-else>
            <input type="submit" class="form__button button" @click.prevent="" value="Отправить">
          </div>
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
    computed: {
      orderData() {
        return this.$store.state.formData;
      },
      currentCar(){
        return this.$store.state.current;
      }
    },
    data() {
      return {
        fields: [
          {
            name: '',
            phone: ''
          }
        ],
        formData: null,
        formArray: [],
        error: false
      }
    },
    methods: {
      validation() {
        let form = this.$refs.form,
          inputs = form.querySelectorAll('.js-required');

        for (let i = 0; i < inputs.length; i++) {
          inputs[i].parentNode.classList.toggle('error', inputs[i].value.length < 2);
          this.error = this.error ? true : inputs[i].value.length < 2;
        }
      },
      inputActive(ev){
        let form = this.$refs.form,
          inputs = form.querySelectorAll('.js-required');

        for (let i = 0; i < inputs.length; i++) {
          inputs[i].parentNode.classList.remove('error');
        }
      },
      clone(index) {
        this.fields.push({
          name: '',
          phone: ''
        });
      },
      remove(index) {
        // console.log(index)
        this.fields.splice(index, 1);
      },
      sendForm() {

        this.validation();

        if(this.error === true) return;
        let that = this,
          form = this.$refs.form,
          formData = new FormData(form),
          dataList = {};
        formData.append('price', that.currentCar.price);

        formData.forEach((value, key) => {
          dataList[key] = value;
        });

        this.formData = dataList;


        this.formArray.push(this.formData, this.orderData)

        console.log(JSON.stringify(this.formArray))


      }

    }
  }
</script>

<style scoped lang="scss">

  .js-slice-row {
    cursor: pointer;
    position: absolute;
    font-size: 14px;
    left: 0;
    bottom: 0;
    color: #EB5757;
    opacity: 0;
    pointer-events: none;
  }

  .js-add-row {
    color: #2F80ED;
    cursor: pointer;
    position: absolute;
    font-size: 14px;
    right: 0;
    bottom: 0;
    opacity: 0;
    pointer-events: none;
  }

  .transport-form {

    .submit-row {
      display: none;
    }

    .js-form-row {
      padding-bottom: 30px;
    }

    .form {

      &__row {
        margin-bottom: 40px;
      }

    }

    .js-slice-row {
      opacity: 1;
      pointer-events: all;
    }
    .js-form-row {

      &:first-child {

        .js-slice-row {
          opacity: 0;
          pointer-events: none;
        }
      }

      &:nth-last-child(3) {

        .js-add-row {
          opacity: 1;
          pointer-events: all;
        }
      }
    }
  }

  .car-form {

    .submit-row {
      display: flex;
    }
  }

  .form {

    &__button {
      height: 60px;
      text-align: center;
    }

    &__input {
      -webkit-appearance: none;
      -webkit-box-shadow: 0 0 0 1px #D8D8E6;
      box-shadow: inset 0 0 0 1px #cecece;
      position: relative;
      transition: box-shadow 150ms;
      height: 56px;
      font-size: 16px;
      padding: 5px 16px;

      &:focus {
        -webkit-appearance: none;
        -webkit-box-shadow: 0 0 0 2px #2F80ED;
        box-shadow: 0 0 0 2px #2F80ED;
        z-index: 1;
      }
    }

    &__row {
      display: flex;
      margin-bottom: 20px;
      position: relative;

    }

    &__item {
      width: 50%;
      position: relative;

      &.error{

        .form__input{
          box-shadow: 0 0 0 2px #EB5757;
          z-index: 3;

          &::-webkit-input-placeholder{
            color: #EB5757;

          }
          &::-ms-input-placeholder{
            color: #EB5757;
          }

          &::placeholder{
            color: #EB5757;

          }
        }
      }

      &:first-child {
        .form__input {
          border-radius: 5px 0 0 5px;
        }
      }

      & + & {
        //margin-left: -1px;

        .form__input {
          border-radius: 0 5px 5px 0;
        }
      }

      &--wide {
        width: 100%;

        .form__input:first-child {
          border-radius: 5px;
        }
      }
    }

    &__item-label {
      opacity: 0;
      pointer-events: none;
      position: absolute;
      top: -10px;
      left: 0;
      transform: translate3d(0, -50%, 0);
      transition: all 150ms;
      font-size: 14px;
      color: #7D7D7D;
      font-weight: normal;
    }

    .form__input:focus + .form__item-label,
    .form__input:not(:placeholder-shown) + .form__item-label {
      opacity: 1;
      transform: translate3d(0, -100%, 0);
    }
  }

  .form {

    .policy__label {
      align-items: center;
    }

    &__item + &__item{
      margin-left: -1px;
    }
  }

  .safari {

    .form__input {

      -webkit-appearance: none;
      -webkit-box-shadow: 0 0 0 2px #D8D8E6;
      box-shadow: inset 0 0 0 2px #D8D8E6;

    }
  }

  /* @media screen and (min-color-index:0) and(-webkit-min-device-pixel-ratio:0) {
         .form__input{

           -webkit-appearance: none;
           -webkit-box-shadow: 0 0 0 2px #D8D8E6;
           box-shadow: inset 0 0 0 2px #cecece;

         }
   }
   @media not all and (min-resolution:.001dpcm){
     .form__input{

       -webkit-appearance: none;
       -webkit-box-shadow: 0 0 0 2px #D8D8E6;
       box-shadow: inset 0 0 0 2px #cecece;

     }
   }*/

  /* Safari 10.1+ */

  @media all and (max-width: 1024px) {
    .policy {
      font-size: 12px;
    }

    .form {

      &__input {
        height: 46px;
        font-size: 14px;
        padding: 5px 12px;
      }

      &__button {
        height: 50px;
        line-height: 50px;
      }

      &__item-label {
        display: none;
      }
    }
  }

  @media all and (max-width: 767px) {

    .form__item + .form__item .form__input {
      border-radius: 5px;
    }
    .form {

      &__sub-button {
        font-size: 12px;
      }

      &__input {
        height: 40px;
        border-radius: 5px;
      }

      &__row {
        flex-wrap: wrap;
      }

      &__item {
        width: 100%;

        & + & {
          margin-top: 20px;
        }

        &:first-child,
        &:last-child {

          .form__input {
            border-radius: 5px;

          }

        }
      }
    }

    .policy {
      font-size: 10px;
      padding-bottom: 10px;
    }
  }
</style>
