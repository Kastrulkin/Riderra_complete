<template>
  <form class="prebooking" ref="form">
    <div class="prebooking__wrap">
      <div class="prebooking__row">
        <city-field v-for="(item,i) in placeInputs" :data="item" :key="i" :ref="item.name"></city-field>
        <div class="prebooking__field date-field">
          <input class="date-field__input" id="date_field_1" :value="today" type="radio" name="day_start[]">
          <label for="date_field_1" class="date-field__item" @click="radioValue()">
            <span class="date">{{ moment(today).format("DD.MM") }}</span>
            <span class="week-day">{{ moment(today).format('dddd') }}</span>
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

          <!--Date field-->
          <label class="date-field__item date-field__item--calendar calendar" ref="dateField">
            <no-ssr>
              <date-picker :lang="lang" ref="datepick" v-model="today" :clearable="false"></date-picker>
            </no-ssr>
            <input class="calendar__input" v-model="today" type="date" name="start_time_date">
            <svg width="26" height="26" viewBox="0 0 26 26">
              <use xlink:href="/sprite.svg#calendar"></use>
            </svg>
          </label>
        </div>

        <!--Time field-->
        <div class="prebooking__field time-field" ref="timeField" @click="timeFocus" v-click-outside="timeBlur">
          <masked-input mask="11:11" type="text" name="time" class="prebooking__input time-field__input"
                        placeholder="22:00"
                        v-model="myTime" @input="timeInput"
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
          <select name="time" class="time-field__select" v-model="myTime" @change="setTime(myTime)">
            <option :value="myTime" v-for="(myTime, i) in time" :key="i">{{myTime}}</option>
          </select>
        </div>

        <!--Baggage field-->
        <div class="prebooking__field baggage-field" ref="baggageField" :class="{active: baggageFocus}">
          <svg class="baggage-field__icon" width="11" height="7" viewBox="0 0 11 7" fill="none"
               xmlns="http://www.w3.org/2000/svg">
            <use xlink:href="/sprite.svg#arrow"></use>
          </svg>
          <input class="baggage__input prebooking__input" type="text" name="baggage"
                 placeholder="Для 1-2 пассажиров с багажом" readonly @click.self="baggageIn($event)"
                 v-click-outside="baggageOut">
          <transition name="fade">
            <baggage-dropdown></baggage-dropdown>
          </transition>
        </div>
        <div class="prebooking__field race-field" v-show="pointFrom">
          <input class="race-field__input prebooking__input" type="text" name="race"
                 placeholder="Номер рейса/поезда/корабля (необязательно)">
        </div>
        <div class="prebooking__submit" @click.capture="sendForm($event)">
          <nuxt-link to="/transport" class="button" :class="{disabled: !submitActive}">Заказать</nuxt-link>
        </div>
      </div>
    </div>
  </form>
</template>

<script>

  import calendar from '~/components/partials/calendar.vue'
  import cityField from '~/components/form/cityField.vue'
  import baggageDropdown from '~/components/form/baggageDropdown.vue'
  import MaskedInput from 'vue-masked-input'
  import datePicker from 'vue2-datepicker';

  const moment = require('moment');
  moment.updateLocale('ru', {
    weekdays: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  });

  export default {
    components: {
      calendar, cityField, baggageDropdown, MaskedInput, datePicker
    },
    watch:{
      pointTo: function(){
        console.log(this.distanceLimit)
        this.distanceLimit;
      }
    },
    computed: {
      media() {
        return this.$store.state.media;
      },
      pointFrom() {
        return this.$store.state.points.from;
      },
      pointTo() {
        return this.$store.state.points.to;
      },
      points() {
        return this.$store.getters.getPoints;
      },
      tomorrow() {
        return moment(this.today).add(1, 'days');
      },
      afterTomorrow() {
        return moment(this.today).add(2, 'days');
      },
      distanceLimit() {
        const that = this;
        if (this.pointFrom) {
          let myCoords = {
            to: {
              lat: this.points.to.location.lat,
              lng: this.points.to.location.lng
            },
            from: {
              lat: this.points.from.location.lat,
              lng: this.points.from.location.lng
            }
          };

          const directionsService = new google.maps.DirectionsService();
          const directionsDisplay = new google.maps.DirectionsRenderer();

          const request = {
            origin: new google.maps.LatLng(myCoords.from.lat, myCoords.from.lng),
            destination: new google.maps.LatLng(myCoords.to.lat, myCoords.to.lng),
            travelMode: 'DRIVING',

          };

          directionsService.route(request, function (response, status) {
            if (status == google.maps.DirectionsStatus.OK) {

              let route = response.routes[0].legs[0];

              directionsDisplay.setDirections(response);

              let distance = route.distance.value / 1000;

              that.$store.commit('setDistance', distance);
            }
          });

        }

        return (this.$store.getters.getDistance <= 200);
      },
      submitActive() {
        return (this.pointTo && this.pointFrom && this.distanceLimit)
      },
    },

    filters: {
      moment: function (date) {
        return moment(date).format('MMMM Do YYYY, h:mm:ss a');
      }
    },
    data() {
      return {
        calendar: {
          lang: 'ru'
        },
        lang: 'ru',
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
            name: 'from',
            placeholder: 'Откуда',
            errorMsg: 'Не указано место отбытия'
          },
          {
            name: 'to',
            placeholder: 'Куда',
            errorMsg: 'Не указано место прибытия',
            distanceError: 'Превышена максимальная дальность поездки (200 км).'
          }
        ],
        formData: null
      }
    },

    methods: {
      sendForm(event) {

        if(!this.pointFrom){
          this.$refs.from[0].$el.classList.add('error')
        }

        if(!this.pointFrom){
          this.$refs.to[0].$el.classList.add('error')
        }

        let that = this,
          form = this.$refs.form,
          formData = new FormData(form),
          dataList = {};

        formData.forEach((value, key) => {
          dataList[key] = value;
        });
        this.formData = dataList;
        this.$store.commit('setFormData', dataList);

        localStorage.setItem('formData', JSON.stringify(dataList));
        localStorage.setItem('from', JSON.stringify(this.pointFrom));
        localStorage.setItem('to', JSON.stringify(this.pointTo));

        this.expireStorage();

      },
      expireStorage() {
        var limit = 3 * 3600 * 1000,
          localStorageInitTime = localStorage.getItem('localStorageInitTime');

        if (localStorageInitTime === null) {
          localStorage.setItem('localStorageInitTime', +new Date());
        } else if (+new Date() - localStorageInitTime > limit) {
          localStorage.clear();
        }
      },

      showCalendar() {
        this.$refs.dateField.classList.add('active');
        this.$refs.datepick.showCalendar();
      },
      closeCalendar() {
        this.$refs.dateField.classList.remove('active');

      },
      calendarSelect(date) {
        this.today = date;
        this.$refs.dateField.classList.remove('active');
      },
      baggageIn(event) {
        if (event.target.closest('.dropdown')) return;

        this.$refs.baggageField.classList.toggle('active');
      },
      baggageOut(event) {
        if (event.target.closest('.dropdown')) return;
        this.$refs.baggageField.classList.remove('active');

      },
      momentDay() {
        return moment();
      },
      radioValue() {

      },
      setTime(time) {
        this.myTime = time;
        this.timeBlur();
        this.$store.commit('setTime', time)
      },
      timeFocus() {
        if (this.media !== 'laptop') return;
        this.$refs.timeField.classList.add('active')
      },
      timeInput() {
        if (this.media !== 'laptop') return;
        this.$refs.timeField.classList.remove('active')
      },
      timeBlur() {
        if (this.media !== 'laptop') return;
        const that = this;
        setTimeout(function () {
          that.$refs.timeField.classList.remove('active')
          that.$refs.timeField.querySelector('.time-field__input').blur();
        }, 100)
      },


    },
    beforeMount() {
      this.$store.commit('setTime', this.myTime)
    },
    mounted() {

      const startTime = '00:00';
      const durationInMinutes = '15';
      var endTime = moment(startTime, 'HH:mm').add(durationInMinutes, 'minutes').format('HH:mm');

      for (let i = 0; i < 94; i++) {
        this.time.push(endTime)
        endTime = moment(endTime, 'HH:mm').add(durationInMinutes, 'minutes').format('HH:mm');
      }

      this.expireStorage();

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

    &__error, &__distance-error{
      opacity: 0;
      pointer-events: none;
      width: calc(100% + 2px);
      position: absolute;
      top: calc(100% - 1px);
      left: -1px;
      background: #FF3495;
      box-shadow: 0px 5px 12px rgba(0, 0, 0, 0.4);
      border-radius: 0px 0px 5px 5px;
      color: #fff;
      padding: 12px 24px;
      font-size: 12px;
      text-align: center;
      z-index: 10;

      &:before{
        content: '';
        position: absolute;
        display: block;
        width: 0;
        height: 0;
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        border-bottom: 10px #FF3495 solid;
        border-left: 5px transparent solid;
        border-right: 5px transparent solid;
        z-index: 10;


      }
    }

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

      &.active {
        .dropdown-cities {
          opacity: 1;
          transform: translate3d(0, 0, 0);
          pointer-events: all;
        }

        &__input {
          box-shadow: 0 0 0 2px #2F80ED;
          z-index: 3;
        }
      }

    }
  }

  .dropdown {
    background: #fff;
    border-radius: 0px 0px 5px 5px;
    padding: 12px 15px 15px 9px;
    max-width: 100%;
    /*transition: all 150ms;*/
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

    &__select {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 10;
      opacity: 0;
      display: none;
    }

    &.active {
      z-index: 2;

      .time-field {

        &__dropdown {
          pointer-events: all;
          opacity: 1;
        }

        &__input {
          box-shadow: 0 0 0 2px #2F80ED;
          z-index: 3;
        }
      }

    }

    &__inner {
      height: 100%;
    }

    &__input {
      padding-left: 18px;
      background: #fff;

      &:focus {
        box-shadow: none;
      }

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

    &.active {

      .dropdown-cities {
        opacity: 1;
        pointer-events: all;
      }

      .baggage__input {
        box-shadow: 0 0 0 2px #2F80ED !important;
        z-index: 3;
      }

      .baggage-field__icon {
        transform: translate3d(0, -50%, 0) rotateX(180deg);

      }
    }

    .baggage__input {
      font-size: 12px;
      padding-right: 50px;
      border-radius: 0 5px 5px 0;
      position: relative;
      cursor: pointer;

      &::placeholder {
        font-size: 12px;
      }

      &:focus {
        box-shadow: none;
      }
    }

    .dropdown-cities:hover {
      opacity: 1;
      pointer-events: all;

    }

    &__icon {
      position: absolute;
      top: 50%;
      transform: translate3d(0, -50%, 0) rotateX(0);
      right: 22px;
      z-index: 5;
      transform-origin: center;
      transition: all 150ms ease;
    }
  }

  .date-field {
    padding: 3px 14px;
    display: flex;
    background: #fff;
    z-index: 2;

    &__input {
      display: none;
    }

    #datepick {
      opacity: 0;
      pointer-events: none;
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
      flex: 0 0 auto;
      transition: background 100ms;

      .vdp-datepicker {
        position: absolute;
        left: 0;
        top: 0;
        pointer-events: none;
        transform: translate3d(0, 10px, 0);
        opacity: 0;
        transition: transform 150ms, opacity 150ms;
      }

      &.active {
        z-index: 2;

        .vdp-datepicker {
          opacity: 1;
          pointer-events: all;
          transform: translate3d(0, 0, 0);
        }
      }

      .date {
        font-size: 12px;
        color: #4C4C4C;
        display: block;
        margin-bottom: 6px;
        transition: color 100ms;

      }

      .week-day {
        font-size: 8px;
        display: block;
        transition: color 100ms;

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
        z-index: 1;

        &.active,
        &:hover {
          background: transparent;
        }
      }
    }
  }

  .calendar {

    &__input {
      display: none;
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

      &__select {
        display: block;
      }

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

    .calendar {

      &__input {
        -webkit-appearance: none;
        border: none;
        color: #ffffff;
        font-size: 0;
        display: block;
        width: 30px;
        height: 100%;
        position: absolute;
        opacity: 0;
      }
    }

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
        z-index: 3;
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
      justify-content: flex-start;

      &__item {
        width: 50px;
        padding: 5px 5px 5px 7px;

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

  @media (max-width: 320px) {
    .date-field__item {
      margin-right: 3px;
    }
  }

  .disabled {
    pointer-events: none;
  }
</style>
