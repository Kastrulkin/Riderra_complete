<template>
  <form class="prebooking" action="">
    <span><span>{{ date | moment("from", "now", true) }}</span></span>
    <calendar></calendar>
    <div class="prebooking__wrap">

      <city-field v-for="(item,i) in placeInputs" :data="item" :key="i"></city-field>


      <div class="prebooking__field date-field">
        <div class="date-field__item active">
          <span class="date">{{ new Date().getDay() }}</span>
          <span class="week-day">Пн</span>
        </div>
        <div class="date-field__item">
          <span class="date">15.02</span>
          <span class="week-day">Пн</span>
        </div>
        <div class="date-field__item">
          <span class="date">14.02</span>
          <span class="week-day">Пн</span>
        </div>
        <div class="date-field__item date-field__item--calendar">
          <svg width="26" height="26" viewBox="0 0 26 26">
            <use xlink:href="/sprite.svg#calendar"></use>
          </svg>

        </div>

      </div>
      <label class="prebooking__field time-field">
        <input type="text" value="22:00" readonly>
        <svg class="time-field__icon" width="26" height="26" viewBox="0 0 26 26" fill="none">
          <use xlink:href="/sprite.svg#clock"></use>
        </svg>
        <ul class="dropdown time-field__dropdown">
          <li>22:00</li>
          <li>22:00</li>
          <li>22:00</li>
          <li>22:00</li>
          <li>22:00</li>
        </ul>
      </label>

      <div class="prebooking__field baggage-field">
        <svg class="baggage-field__icon" width="11" height="7" viewBox="0 0 11 7" fill="none"
             xmlns="http://www.w3.org/2000/svg">
          <use xlink:href="/sprite.svg#arrow"></use>
        </svg>
        <input type="text" name="baggage" placeholder="Для 1-2 пассажиров с багажом" readonly>
        <div class="dropdown dropdown-cities">
          <ul class="points-list">
            <li>Россия; Санкт-Петербург; ул.Маршала Жукова 24</li>
            <li>Россия; Санкт-Петербург; ул.Маршала Жукова 24</li>
            <li>Россия; Санкт-Петербург; ул.Маршала Жукова 24</li>
            <li>Россия; Санкт-Петербург; ул.Маршала Жукова 24</li>
            <li>Россия; Санкт-Петербург; ул.Маршала Жукова 24</li>
            <li>Россия; Санкт-Петербург; ул.Маршала Жукова 24</li>
          </ul>
          <div class="map"></div>
        </div>
      </div>
    </div>

  </form>
</template>

<script>

  import calendar from '~/components/partials/calendar.vue'
  import cityField from '~/components/form/cityField.vue'

  var moment = require('moment');

  export default {
    components: {
      calendar, cityField
    },
    data() {
      return {
        moment: moment,
        value: '',
        results: [],
        map: {},
        date: new Date(),
        prevDate: '',
        currentTime: null,
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
      updateCurrentTime() {
        this.currentTime = moment(new Date()).add(-1,'days');

        console.log(this.currentTime)
      }
    },
    mounted(){
      this.updateCurrentTime()
    }


  }
</script>


<style lang="scss">

  .prebooking {
    position: relative;

    &__input{
      position: relative;
      z-index: 2;

      &:focus{
        box-shadow: 0 0 0 2px #2F80ED;
        z-index: 3;
      }
    }

    &__wrap {
      display: flex;
      background: #fff;
      border-radius: 5px;
    }

    &__field {
      border-right: 1px solid #D8D8E6;
      height: 56px;
      position: relative;

      &.active .dropdown-cities{
        opacity: 1;
        pointer-events: all;
      }
    }
  }

  .dropdown {
    background: #fff;
    border-radius: 0px 0px 5px 5px;
    padding: 12px 15px 15px 9px;
    max-width: 100%;
  }


  .points-list {
    overflow-y: scroll;
    direction: rtl;
    padding: 12px 15px 15px 9px;

    li {
      padding: 20px 35px 20px 10px;
      line-height: 1.5;
      direction: rtl;
      text-align: left;
      margin: 0;

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
  }

  .time-field {
    min-width: 124px;
    cursor: pointer;
    position: relative;
    font-size: 18px;

    input{
      padding-left: 18px;
    }

    &__icon {
      position: absolute;
      top: 50%;
      transform: translate3d(0, -50%, 0);
      right: 13px;
      height: 26px;
    }

  }

  .baggage-field {
    position: relative;
    width: 100%;
    max-width: 280px;

    input{
      font-size: 12px;
      padding-right: 50px;

      &::placeholder{
        font-size: 12px;
      }
    }

    &__icon {
      position: absolute;
      top: 50%;
      transform: translate3d(0, -50%, 0);
      right: 22px;
    }
  }

  .date-field {
    padding: 3px 14px;
    display: flex;

    &__item {
      width: 60px;
      height: 100%;
      border-radius: 5px;
      padding-left: 12px;
      padding-top: 8px;
      cursor: pointer;

      & + &{
        margin-left: 10px;
      }

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
        margin-left: 12px;
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

  @media all and (max-width: 991px){

    .prebooking{

      &__wrap{
        flex-wrap: wrap;
      }
    }

    .text-field{
      max-width: 174px;
    }
  }
</style>
