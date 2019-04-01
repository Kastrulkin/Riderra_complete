<template>
  <div class="payment">
    <order-caption :data="captionData"></order-caption>
    <div class="container">
      <div class=" payment__container">
        <div class="car-type">

          <div class="car-type__figure"></div>
          <div class="car-type__title">
            Люкс
          </div>
          <div class="car-type__price">15 000 ₽</div>
        </div>
        <div class="payment__wrap">
          <div class="payment__item active">
            <svg class="payment__icon payment__icon--cash" width="100%" height="100%" viewBox="0 0 30 28" fill="none"
                 xmlns="http://www.w3.org/2000/svg">
              <path
                d="M7.1925 5.32995L18.8207 2.15595L18.2049 0.911243C17.802 0.102183 16.8193 -0.231922 16.0103 0.17097L5.60059 5.32995H7.1925Z"/>
              <path
                d="M22.4298 2.24756C22.2857 2.24756 22.1416 2.26721 21.9975 2.30652L19.2657 3.05334L10.9229 5.32985H20.3925H24.5196L24.0087 3.45623C23.8121 2.72579 23.1505 2.24756 22.4298 2.24756Z"/>
              <path
                d="M26.2266 6.47656H25.8532H25.3455H24.8377H20.9628H6.72398H4.85692H3.28466H2.99314H2.01702C1.49949 6.47656 1.03764 6.71568 0.736287 7.09237C0.598714 7.26597 0.493896 7.46578 0.434936 7.68524C0.398905 7.82281 0.375977 7.96694 0.375977 8.11433V8.31087V10.1779V26.3624C0.375977 27.2665 1.1097 28.0002 2.01375 28.0002H26.2233C27.1274 28.0002 27.8611 27.2665 27.8611 26.3624V21.793H18.1425C16.6063 21.793 15.3583 20.545 15.3583 19.0088V17.5086V17.0009V16.4932V15.3664C15.3583 14.613 15.6596 13.9285 16.1477 13.4273C16.5801 12.9818 17.1599 12.6804 17.8084 12.6051C17.9165 12.592 18.0279 12.5855 18.1393 12.5855H26.4984H27.0062H27.5139H27.8611V8.11433C27.8643 7.21028 27.1306 6.47656 26.2266 6.47656Z"/>
              <path
                d="M29.0109 14.1507C28.8471 14.0001 28.6539 13.8854 28.4377 13.8101C28.2706 13.7544 28.0938 13.7217 27.9071 13.7217H27.8645H27.8317H27.324H25.493H18.1427C17.2386 13.7217 16.5049 14.4554 16.5049 15.3595V16.175V16.6827V17.1904V19.0051C16.5049 19.9092 17.2386 20.6429 18.1427 20.6429H27.8645H27.9071C28.0938 20.6429 28.2706 20.6101 28.4377 20.5544C28.6539 20.4824 28.8471 20.3645 29.0109 20.2138C29.3385 19.9157 29.5448 19.4833 29.5448 19.0051V15.3595C29.5448 14.8812 29.3385 14.4488 29.0109 14.1507ZM21.5623 17.5082C21.5623 17.9602 21.1955 18.3271 20.7434 18.3271H20.1997C19.7477 18.3271 19.3808 17.9602 19.3808 17.5082V16.9644C19.3808 16.7024 19.502 16.4698 19.6953 16.3224C19.8361 16.2143 20.0097 16.1456 20.1997 16.1456H20.3373H20.7434C21.1955 16.1456 21.5623 16.5124 21.5623 16.9644V17.5082Z"/>
            </svg>

            <div class="payment__title">Наличные</div>
            <div class="payment__descr">Вы&nbsp;сможете расплатиться с&nbsp;водителем в&nbsp;конце поездки.</div>
          </div>
          <div class="payment__item">
            <svg class="payment__icon payment__icon--card" width="35" height="31" viewBox="0 0 35 31" fill="none"
                 xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M27.6532 8.20772C28.119 8.41755 27.9734 9.11217 27.4566 9.11217L10.1632 9.1194C7.84142 9.1194 5.95632 10.9934 5.95632 13.3016V19.3288C5.95632 19.828 5.43228 20.1609 4.97374 19.9583L1.30544 18.3809C0.191849 17.8889 -0.30308 16.5937 0.191849 15.4939L6.56043 1.29776C7.05536 0.190721 8.35819 -0.301297 9.4645 0.190721L27.6532 8.20772ZM10.1562 11.0806H32.2169C33.447 11.0806 34.4441 12.0719 34.4441 13.2947V28.7788C34.4441 30.0016 33.447 30.9929 32.2169 30.9929L10.1562 31.0001C8.92614 31.0001 7.929 30.0089 7.929 28.7861V13.2947C7.929 12.0719 8.92614 11.0806 10.1562 11.0806ZM10.7603 28.1927L31.6201 28.1855V20.7763H10.7603V28.1927ZM10.7603 16.2107H31.6201V13.888H10.7603V16.2107Z"
              />
            </svg>

            <div class="payment__title">Онлайн</div>
            <div class="payment__descr">Картой, Qiwi кошелек, Сбербанк, Вебмани, Биткоины, Эппл пей.</div>
          </div>
        </div>
      </div>

      <div class="payment__content">
        <div class="by-cash">
          <div  class="form__item policy">
            <label class="policy__label">
              <input type="checkbox" checked="checked" class="policy__checkbox"> <span>Подтверждаю <a
             href="#" class="policy__link">условия перевозки</a> и <a href="#" class="policy__link">политики конфиценциальности</a></span>
            </label>
          </div>
          <input type="submit" value="Забронировать" class="form__button button">
        </div>
      </div>
    </div>
    <my-map></my-map>


  </div>
</template>


<script>
  import orderCaption from '~/components/partials/orderCaption.vue'
  import myMap from '~/components/payment/map.vue'

  export default {
    components: {orderCaption, myMap},
    data() {
      return {
        formData: {
          type: 'transport'
        },
        captionData: {
          title: 'Выберите способ оплаты'
        }
      }
    },
    head() {
      return {
        bodyAttrs: {
          class: 'inner-page'
        },
      }
    },

  }
</script>

<style scoped lang="scss">
  .payment {

    &__content{
      margin-top: 30px;
    }

    &__container {
      display: flex;
    }

    &__wrap {
      border: 1px solid #D8D8E6;
      /*padding: 30px 20px;*/
      margin-left: 20px;
      width: 100%;
      border-radius: 5px;
      display: flex;
      overflow: hidden;
    }

    &__icon{
      &--cash {
        width: 29px;
        height: 28px;
      }

      &--card {
        width: 34px;
        height: 31px;
      }
    }

    &__item {
      padding: 30px 40px 30px 90px;
      color: #000;
      font-size: 14px;
      cursor: pointer;
      position: relative;
      overflow: hidden;

      &:before {
        content: '';
        display: block;
        position: absolute;
        width: 50%;
        height: 50%;
        top: 50%;
        left: 17%;
        transform: translate3d(0, -50%, 0);
        background: #E5006D;
        filter: blur(30px);
        border-radius: 5px;
        pointer-events: none;
        opacity: 0;
      }
      &.active {
        background: #702283;
        color: #fff;

        &:before {
          opacity: 1;
        }

        .payment__icon {
          fill: #fff;


        }
      }
    }

    &__title {
      font-size: 26px;
      font-weight: 900;
      margin-bottom: 10px;
      z-index: 1;
      position: relative;
    }

    &__descr {
      z-index: 1;
      position: relative;
    }

    &__icon {
      fill: #702283;
      position: absolute;
      left: 40px;
      top: 32px;
      z-index: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  .car-type {
    width: 33%;
    background: #702283;
    border-radius: 5px;
    padding: 30px 20px;
    flex: 0 0 auto;
    color: #fff;
    position: relative;
    padding-left: 190px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;

    &:before {
      content: '';
      display: block;
      position: absolute;
      width: 50%;
      height: 30%;
      top: 50%;
      left: 0;
      transform: translate3d(20%, -50%, 0);
      background: #E5006D;
      filter: blur(30px);
      border-radius: 5px;
      pointer-events: none;
    }

    &__figure {
      height: 80%;
      width: 75%;
      position: absolute;
      background: url(/img/cars/econom.png) center right no-repeat / cover;
      transform: translate3d(-50%, -50%, 0);
      left: 0;
      top: 50%;
      z-index: 0;
    }

    &__title {
      font-style: normal;
      font-weight: 900;
      font-size: 26px;
      line-height: normal;
      margin-bottom: 10px;
      z-index: 0;
      position: relative;
    }

    &__price {
      font-weight: normal;
      font-size: 26px;
      z-index: 0;
      position: relative;
    }
  }

  @media (max-width: 1024px) {
    .car-type {
      padding-left: 150px;

      &__title {
        font-size: 16px;
      }

      &__price {
        font-size: 18px;
      }

      &__figure {
        height: 70%;
        width: 70%;
      }
    }

    .payment {

      &__item {
        padding: 20px 20px 25px 50px;
      }

      &__title {
        font-size: 16px;
      }

      &__descr {
        font-size: 10px;
      }

      &__icon {
        left: 20px;
        top: 20px;

        &--cash {
          height: 18px;
          width: 18px;
        }

        &--card {
          height: 21px;
          width: 23px;
        }
      }
    }
  }

  @media (max-width: 991px) {
    .car-type{
      padding-left: 100px;
    }
  }


    @media (max-width: 767px) {
    .payment {

      &__container {
        flex-wrap: wrap;
      }

      &__wrap {
        margin-left: 0;
        flex-wrap: wrap;
        margin-top: 30px;

      }

      &__item {
        width: 100%;
        padding-right: 17%;
        padding-bottom: 20px;

        &:before {
          left: 25%;
        }
      }
    }

    .car-type {
      width: 100%;
      padding-left: 55%;
      padding-top: 40px;
      padding-bottom: 40px;

      &:before {
        width: 45%;
        height: 55%;
        left: 11%;
        filter: blur(23px);
      }

      &__figure {
        height: 75%;
        width: 75%;
      }
    }

  }


</style>

