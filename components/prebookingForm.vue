<template>
  <form class="prebooking" action="">
    <!--<calendar></calendar>-->
    <div class="prebooking__wrap">
      <div class="prebooking__row">
        <city-field v-for="(item,i) in placeInputs" :data="item" :key="i"></city-field>
        <div class="prebooking__field date-field">
          <input class="date-field__input" id="date_field_1" :value="today" type="radio" name="day_start[]">
          <label for="date_field_1" class="date-field__item" @click="radioValue()">
            <span class="date">{{ moment(today).format("DD.MM") }}</span>
            <span class="week-day">{{ moment(today).format('dddd') }}</span>
            <!--<span class="week-day">{{ moment(today).format('HH:mm') }}</span>-->
          </label>
          <input class="date-field__input" id="date_field_2" :value="tomorrow" type="radio" name="day_start[]" checked>
          <label for="date_field_2" class="date-field__item">
            <span class="date">{{ tomorrow.format("DD.MM") }}</span>
            <span class="week-day">{{ tomorrow.format('dddd') }}</span>
          </label>
          <input class="date-field__input" id="date_field_3" :value="afterTomorrow" type="radio" name="day_start[]">
          <label for="date_field_3" class="date-field__item">
            <span class="date">{{ afterTomorrow.format("DD.MM") }}</span>
            <span class="week-day">{{ afterTomorrow.format("dddd") }}</span>
            <input class="date-field__input" type="radio" name="day_start[]">
          </label>
          <div class="date-field__item date-field__item--calendar">
            <svg width="26" height="26" viewBox="0 0 26 26">
              <use xlink:href="/sprite.svg#calendar"></use>
            </svg>

          </div>

        </div>
        <label class="prebooking__field time-field" ref="timeField" @focus="timeFocus" @blur="timeBlur" @click="timeFocus">
          <masked-input mask="11:11" type="text" class="prebooking__input time-field__input" placeholder="22:00" v-model="myTime"
                 />
          <svg class="time-field__icon" width="26" height="26" viewBox="0 0 26 26" fill="none">
            <use xlink:href="/sprite.svg#clock"></use>
          </svg>
          <div class="dropdown time-field__dropdown">
            <div class="time-field__inner" v-bar>
              <ul>
                <li v-for="(el, i) in time" :key="i" @click="setTime(el)">{{ el }}</li>
              </ul>
            </div>
          </div>
        </label>
        <label class="prebooking__field baggage-field" ref="baggageField" :class="{active: baggageFocus}">
          <svg class="baggage-field__icon" width="11" height="7" viewBox="0 0 11 7" fill="none"
               xmlns="http://www.w3.org/2000/svg">
            <use xlink:href="/sprite.svg#arrow"></use>
          </svg>
          <input class="baggage__input prebooking__input" type="text" name="baggage"
                 placeholder="Для 1-2 пассажиров с багажом" readonly>
          <transition name="dropdown" mode="out-in">
            <baggage-dropdown></baggage-dropdown>
          </transition>
        </label>

        <div class="prebooking__field race-field" v-show="pointFrom">
          <input class="race-field__input" type="text" name="race"
                 placeholder="Номер рейса/поезда/корабля (необязательно)">
        </div>
        <nuxt-link to="/transport" class="button prebooking__submit">Заказать</nuxt-link>


      </div>

    </div>

  </form>
</template>

<script>

  import calendar from '~/components/partials/calendar.vue'
  import cityField from '~/components/form/cityField.vue'
  import baggageDropdown from '~/components/form/baggageDropdown.vue'
  import MaskedInput from 'vue-masked-input'


  const moment = require('moment');
  moment.updateLocale('ru', {
    weekdays: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  });

  export default {
    components: {
      calendar, cityField, baggageDropdown, MaskedInput
    },
    computed: {
      pointFrom() {
        return this.$store.getters.getPointFrom;
      },
      tomorrow: {
        get: () => {
          return moment(new Date()).add(1, 'days');
        },
        set: (newValue) => {
          console.log(newValue)
        }
      },
      afterTomorrow() {
        return moment(this.today).add(2, 'days');
      }
    },
    filters: {
      moment: function (date) {
        return moment(date).format('MMMM Do YYYY, h:mm:ss a');
      }
    },
    data() {
      return {
        moment: moment,
        myTime: '17:00',
        value: '',
        results: [],
        map: null,
        today: new Date(),
        time: [],
        currentTime: null,
        baggageFocus: false,
        placeInputs: [
          {
            name: 'fromPoint',
            placeholder: 'Откуда',
          },
          {
            name: 'toPoint',
            placeholder: 'Куда',
          }
        ]
      }
    },
    methods: {

      baggageIn() {
        this.baggageFocus = true;
      },
      baggageOut() {
        this.baggageFocus = false;
      },
      momentDay() {
        return moment();
      },
      radioValue() {

      },
      setTime(time) {
        console.log(time)

        this.myTime = time;

        this.timeBlur();

      },
      setTimeHandle() {

      },
      timeFocus() {
        this.$refs.timeField.classList.add('active')
      },
      timeBlur() {
        const that = this;

        setTimeout(function () {
          that.$refs.timeField.classList.remove('active')
          that.$refs.timeField.querySelector('.time-field__input').blur();
        }, 200)
      }


    },
    mounted() {
      const startTime = '00:00';
      const durationInMinutes = '15';
      var endTime = moment(startTime, 'HH:mm').add(durationInMinutes, 'minutes').format('HH:mm');

      for (let i = 0; i < 94; i++) {
        this.time.push(endTime)
        endTime = moment(endTime, 'HH:mm').add(durationInMinutes, 'minutes').format('HH:mm');


      }
    }


  }
</script>


<style lang="scss">

  .dropdown-enter-active, .dropdown-leave-active {
    transition: opacity .3s ease;
    opacity: 1;
    transform: translate3d(0, 0px, 0);

  }

  .dropdown-enter, .dropdown-leave-to /* .list-leave-active до версии 2.1.8 */
  {
    opacity: 0;
    transform: translate3d(0, -10px, 0);
  }

  .prebooking {
    position: relative;

    &__row {
      display: flex;
    }

    &__input {
      position: relative;
      z-index: 2;
      padding: 12px 16px;

      &:focus {
        box-shadow: 0 0 0 2px #2F80ED;
        z-index: 3;
      }
    }

    &__submit {
      max-width: 280px;
      width: 100%;
      text-align: center;
      position: absolute;
      top: calc(100% + 20px);
      right: 0;
    }

    &__field {
      border-right: 1px solid #D8D8E6;
      height: 56px;
      position: relative;

      &.active .dropdown-cities {
        opacity: 1;
        transform: translate3d(0, 0, 0);
        pointer-events: all;
      }
    }
  }

  .dropdown {
    background: #fff;
    border-radius: 0px 0px 5px 5px;
    padding: 12px 15px 15px 9px;
    max-width: 100%;
    /*opacity: 0;*/
    //transform: translate3d(0, -10px, 0);
    /*transition: all 250ms;*/
  }

  .dropdown-cities {
    left: initial;
    right: 0;
  }

  .race-field {
    position: absolute;
    top: calc(100% + 20px);
    left: 0;
    width: 100%;
    max-width: 504px;
    border-right: none;

    &__input {
      border-radius: 5px;
    }
  }

  .points-list {
    margin: 0;
    li {
      padding: 20px 35px 20px 10px;
      line-height: 1.5;
      direction: rtl;
      text-align: left;
      margin: 0 0 0 9px;

      &:hover {
        background: #2F80ED;
        -webkit-border-radius: 5px;
        -moz-border-radius: 5px;
        border-radius: 5px;
        cursor: pointer;
        color: #fff;
      }
    }
  }

  .text-field {
    width: 100%;
    max-width: 252px;

    &.active {
      z-index: 5;
    }

    &:first-child input {
      border-radius: 5px 0 0 5px;
    }
  }

  .time-field {
    min-width: 124px;
    cursor: pointer;
    position: relative;
    font-size: 18px;
    z-index: 1;

    &.active{
      z-index: 2;
      .time-field__dropdown {
        opacity: 1;
        pointer-events: all;
        transform: translate3d(0, 0, 0);

      }
    }


    &__inner {
      height: 100%;
    }

    &__input {
      padding-left: 18px;
      background: #fff;

    }

    &__icon {
      position: absolute;
      top: 50%;
      transform: translate3d(0, -50%, 0);
      right: 13px;
      height: 26px;
      z-index: 4;
    }

    &__dropdown {
      height: 322px;
      box-shadow: 0px 5px 12px rgba(0, 0, 0, 0.4);
      border-radius: 0px 0px 5px 5px;
      color: #4C4C4C;
      font-size: 18px;
      overflow: hidden;
      padding: 0 0 0 18px;
      opacity: 0;
      pointer-events: none;
      transition: 150ms all 100ms;
      transform: translate3d(0, 5px, 0);

      li {

        &:first-child {
          margin-top: 18px;
        }
        &:last-child {
          margin-bottom: 25px;
        }
      }

    }

  }

  .baggage-field {
    position: relative;
    width: 100%;
    max-width: 280px;
    border-radius: 0 5px 5px 0;
    border: none;
    z-index: 1;

    .baggage__input {
      font-size: 12px;
      padding-right: 50px;
      border-radius: 0 5px 5px 0;
      position: relative;
      cursor: pointer;

      &::placeholder {
        font-size: 12px;
      }
    }

    .baggage__input:focus {
      box-shadow: 0 0 0 2px #2F80ED;
      z-index: 2;
    }
    .baggage__input:focus + .dropdown-cities {
      opacity: 1;
      pointer-events: all;

    }

    .dropdown-cities:hover {
      opacity: 1;
      pointer-events: all;

    }

    &__icon {
      position: absolute;
      top: 50%;
      transform: translate3d(0, -50%, 0);
      right: 22px;
      z-index: 5;
      transform-origin: top center;
      transition: all 150ms;
    }
  }

  .date-field {
    padding: 3px 14px;
    display: flex;
    background: #fff;

    &__input {
      display: none;
    }

    &__input:checked + .date-field__item {
      background: #2F80ED;
      .date,
      .week-day {
        color: #fff;
      }
    }

    &__item {
      width: 60px;
      height: 100%;
      border-radius: 5px;
      padding-left: 12px;
      padding-top: 8px;
      cursor: pointer;
      margin-right: 10px;

      .date {
        font-size: 12px;
        color: #4C4C4C;
        display: block;
        margin-bottom: 6px;
      }

      .week-day {
        font-size: 8px;
        display: block;
      }

      &.active,
      &:hover {
        background: #2F80ED;

        .date,
        .week-day {
          color: #fff;
        }
      }

      &--calendar {
        margin-left: 2px;
        margin-right: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: auto;

        &:hover {
          background: transparent;
        }
      }
    }
  }

  @media all and (max-width: 1024px) {

    .prebooking {
      margin-bottom: 56px;

      &__wrap {
        flex-wrap: wrap;
      }

      &__field {
        height: 46px;
      }

      &__input {
        font-size: 14px;
        padding: 5px 12px;
      }
    }

    .text-field {
      max-width: none;
      min-width: 25%;
    }

    .baggage-field {
      position: absolute;
      top: calc(100% + 20px);
      max-width: none;
      width: 50%;

      .baggage__input {
        border-radius: 5px;
      }
    }

    .time-field {
      border-right: none;
      min-width: 105px;

      input {
        border-radius: 0 5px 5px 0;

      }
    }

    .dropdown-cities {
      left: 0;
      top: calc(100% - 50px);

    }

    .race-field {
      top: calc(200% + 40px);
      max-width: 50%;

    }

    .date-field {
      min-width: 33%;
      flex: 0 1 auto;
      justify-content: center;

      &__item {
        width: 50px;
        min-width: 50px;
        padding-left: 8px;
        padding-top: 6px;

        &--calendar {
          padding: 0;
          width: auto;
          min-width: initial;
        }

        .date {
          margin-bottom: 2px;
        }
      }
    }
  }

  @media all and (max-width: 767px) {

    .prebooking {

      &__row {
        flex-wrap: wrap;
      }
    }
    .text-field {
      width: 100%;
      max-width: 100%;
      flex: 1 0 auto;
      margin-bottom: 30px;
      border: none;
      z-index: 0;

      &.active {
        z-index: 2;
      }

      &:first-child {
        input {
          border-radius: 5px;

        }
      }

      input {
        border-radius: 5px;

      }
    }

    .time-field {
      flex: 0 1 auto;
      min-width: 85px;
      max-width: 30%;

      &__input {
        padding-right: 0;
      }

      &__icon {
        right: 5px;
      }
    }

    .date-field {
      flex: 1 1 auto;
      max-width: 70%;
      border-radius: 5px 0 0 5px;
      padding: 3px;

      &__item {
        width: 50px;
        padding: 5px 5px 5px 7px;
        margin: 0;

        &--calendar {
          padding: 0;
          width: auto;
          margin-left: auto;
          margin-right: 8px;
        }

        .date {
          margin-bottom: 0;
        }
      }
    }

    .race-field {
      display: none;
    }

    .prebooking__field {
      height: 40px;
    }
    .prebooking__submit {
      position: relative;
      margin-top: 30px;
      width: 100%;
      max-width: 100%;
    }

    .baggage-field {
      position: relative;
      margin-top: 30px;
      width: 100%;
    }
  }
</style>
