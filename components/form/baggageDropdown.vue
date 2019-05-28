<template>
  <div class="dropdown dropdown-cities baggage-field__dropdown" ref="dropdown">
    <div class="dropdown-cities__row field" v-for="(item, i) in fields" :key="i">
      <div class="field__icon" v-bind:style="{ 'background-image': 'url(' + item.icon + ')' }"></div>
      <div class="field__title" v-html="item.title"></div>

      <div class="field__usage-box" v-if="item.data === 'iterate'">
        <div class="field__iterate field__iterate--minus" :class="{disabled: item.myVal == 0 }" @click="iterateBack(item, i)">&ndash;</div>
        <input class="field__input" type="text" :name="item.name" v-model.number="item.myVal" readonly>
        <div class="field__iterate field__iterate--plus" @click="iterateForward(item, i)">&#43;</div>
      </div>

      <b-select class="field__select"
                v-if="item.data === 'list'"
                :data="item" :key="i"
                :data-name="i" @click.native.stop="showDropdown($event)" v-click-outside.stop="hideDropdown" v-on:hide="hideDropdown">
      </b-select>
    </div>
    <div class="field ">
      <div  class="field__rental policy ">
        <label class="policy__label field__title">
          <input v-model="hourlyRental"  type="checkbox" class="policy__checkbox"><span>Почасовая аренда</span>
          <p class="subtitle">После 15 часов поездки будет смена водителя.</p>
        </label>
        <div class="field__wrap" :class="{disabled: !hourlyRental}">
          <b-select class="field__select"
                    :data="hours"
                    @click.native.stop="showDropdown($event)" v-click-outside.stop="hideDropdown" v-on:hide="hideDropdown" ref="hoursInput" v-on:hourschange="setHours">
          </b-select>
          <p class="subtitle" >{{`До ${selectedHour}`}}</p>
        </div>
      </div>
    </div>
    <div class="field ">
      <div  class="field__rental policy ">
        <label class="policy__label field__title wide">
          <input name="return_route" type="checkbox" class="policy__checkbox"><span>Потребуется обратный маршрут</span>
          <p class="subtitle">Детали согласует оператор по телефону.</p>
        </label>


      </div>

    </div>
  </div>
</template>


<script>
  import bSelect from '~/components/form/baggageSelect.vue'
  export default {
    components: {
      bSelect
    },
    computed:{
      media(){
        return this.$store.state.media;
      },
      choosenTime(){
        return this.$store.state.time;
      }
    },
    data() {
      return {
        hourlyRental: false,
        selectedHour: '',
        hours: {
          list: [0,1,2,3,4,5,6,7,8,9,10,11,12],

        },
        fields: [
          {
            data: 'iterate',
            title: 'Пассажиры',
            icon: '/img/baggage/passenger.svg',
            myVal: 0,
            name: 'passangers'

          }, {
            data: 'iterate',
            title: 'Багаж',
            icon: '/img/baggage/baggage.svg',
            myVal: 0,
            name: 'baggage'


          }, {
            data: 'iterate',
            title: 'Животные',
            icon: '/img/baggage/pet.svg',
            myVal: 0,
            name: 'pets'
          }, {
            data: 'list',
            title: 'Детские кресла 3-6 лет (15-25 кг) ',
            icon: '/img/baggage/kid.svg',
            myVal: '0',
            list: ['0',1,2],
            name: 'kid_seats_3_6'
          }, {
            data: 'list',
            title: 'Детские кресла 6-12 лет (22-36 кг) ',
            icon: '/img/baggage/kid.svg',
            myVal: '0',
            list: ['0', 1, 2 ],
            name: 'kid_seats_6_12'

          }
        ]
      }
    },
    methods:{
      showDropdown(event){
        this.hideDropdown();

        if(this.media !== 'laptop'){
          return;
        }

        if(event.target.classList.contains('dropdown__item')){
          return;
        }

        event.currentTarget.classList.toggle('active')

      },
      hideDropdown(event){
        let that = this,
            selects = this.$refs.dropdown.querySelectorAll('.select');

        selects.forEach(function(item){
          item.classList.remove('active')
        })

      },
      iterateBack(field, i){
        if(this.fields[i].myVal === 0) return;
        this.fields[i].myVal--;
        // console.log(this.fields)
      },
      iterateForward(field, i){
        if(this.fields[i].myVal >= 4) return;
        this.fields[i].myVal++;
      },
      setHours(val){
        var dt = new Date(),
            minutes, hour, min;

        dt.setHours( 17, 0 );
        hour = dt.setHours( dt.getHours() + val );

        minutes = (dt.getMinutes() < 10) ? `0${dt.getMinutes()}` : dt.getMinutes();
        this.selectedHour = `${dt.getHours()}:${minutes}`;

      }

    },
    mounted(){

      this.setHours(0)
    }
  }
</script>

<style lang="scss" scoped>

  .subtitle{
    margin-left: 25px;
    font-size: 10px;
    line-height: 15px;
    color: #4C4C4C;
    margin-top: 2px;
  }

  .policy{
    align-items: flex-start;

    &__checkbox{
      padding: 0;
    }

    &__label{

      &.field__title{
        flex-wrap: wrap;
        max-width: 170px;
        padding-top: 3px;

        &.wide{
          max-width: 100%;
        }
      }

      span{
        width: 80%;
      }
    }

  }
  .dropdown #mySelect .dropdown-toggle{
    display: none;
  }

  .dropdown-cities {
    width: 332px;
    max-width: 332px;
    height: auto;
    background: #fff;
    border-radius: 0 0 5px 5px;
    padding-top: 32px;
    padding-bottom: 35px;
    padding-left: 30px;
    padding-right: 30px;
    box-shadow: 0px 5px 12px rgba(0, 0, 0, 0.4);
    right: -1px;
    position: absolute;
    top: calc(100% - 4px);
    opacity: 0;
    pointer-events: none;
  }

  .field {
    display: flex;
    align-items: center;

    &__wrap{
      margin-left: auto;
      position: relative;

      .subtitle{
        text-align: right;
      }

      &.disabled{
        opacity: .5;
        pointer-events: none;

        .subtitle{
          display: none;
        }
      }
    }

    &__rental{
      width: 100%;
      padding-top: 5px;
    }

    & + &{
      margin-top: 18px;
    }

    &__icon {
      width: 26px;
      height: 26px;
      margin-right: 5px;
      background-repeat: no-repeat;
      background-position: center;
    }

    &__title {
      font-size: 14px;
      color: #000;
      max-width: 130px;


    }

    &__usage-box {
      display: flex;
      margin-left: auto;

    }

    &__iterate {
      flex: 0 0 auto;
      text-align: center;
      line-height: 26px;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      background: #2F80ED;
      color: #fff;
      font-size: 18px;
      font-weight: 100;
      cursor: pointer;

      &.disabled{
        background: #E1E1E1;
        color: #908E94;
      }

      &--minus{
        line-height: 25px;
      }

    }

    &__input {
      font-size: 16px;
      color: #000;
      width: 12px;
      border: none;
      padding: 0;
      margin: 0;
      background: transparent;
      height: auto;
      margin-left: 7px;
      margin-right: 7px;
      text-align: center;
    }

    &__select{
      padding: 0;
      margin: 0;
      background: transparent;
      width: 78px;
      height: 26px;
      font-size: 16px;
      color: #000;
      margin-left: auto;
    }
  }

  @media (max-width: 480px){
    .baggage-field{
      width: 100%;

      &__dropdown{
        width: 100%;
        max-width: 100%;
        padding: 20px 10px;
      }
    }

    .field{

      &__title{
        font-size: 12px;
      }

      &__iterate{
        height: 20px;
        width: 20px;
        line-height: 20px;

        &--minus{
          line-height: 19px;
        }
      }

      &__input{
        font-size: 14px;
      }

      &__select{
        width: 67px;
        height: 26px;
        font-size: 13px;
      }

    }
  }
</style>


