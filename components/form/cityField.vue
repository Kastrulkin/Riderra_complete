<template>
  <div class="prebooking__field text-field">
    <input class="prebooking__input" type="text" :name="data.name" :placeholder="data.placeholder"
           autocomplete="off"
           ref="acInput" @input="initService" @blur="onBlur">
    <div class="dropdown dropdown-cities" >
      <div v-bar>
      <!--<ul class="points-list"  >-->
      <ul class="points-list"  >
        <li :data-addr="JSON.stringify(item.location)" v-for="(item, i) in results" :key="i"
            @mouseenter="placeHover(item)" @click="insertValue(item)">
          {{item.description}}
        </li>
      </ul>
      </div>
      <div class="map" ref="mapRef"></div>
    </div>
  </div>
</template>


<script>
  import calendar from '~/components/partials/calendar.vue'

  export default {
    props: ['data'],
    components: {
      calendar
    },
    data() {
      return {
        value: '',
        results: [],
        map: {},
        cityList: false,
        state: {
          date: new Date(),
          language: 'ru',
        },
        loadingTimer: null
      }
    },
    watch: {
      value: function (oldVal, newVal) {
        if (newVal === '') {
          this.cityList = false;
        }
      }
    },

    mounted() {
      this.map = new google.maps.Map(
        this.$refs.mapRef, {
          center: {lat: -33.866, lng: 151.196},
          zoom: 15,
          mapTypeControl: false,
          disableDefaultUI: true
        });
    },
    methods: {

      displaySuggestions(predictions, status) {
        if (!predictions) return;

        var that = this,
          placeService = new google.maps.places.PlacesService(this.map);

        if (status != google.maps.places.PlacesServiceStatus.OK) {
          return;
        }

        predictions.forEach(prediction => {

          var request = {
            placeId: prediction.place_id,
            id: prediction.id,

          };

          // Определяем координаты, записываем их в объект
          placeService.getDetails(request, function (place, status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) {


              let lat = place.geometry.location.lat(),
                lng = place.geometry.location.lng();

              prediction['location'] = {lat, lng}
            }
          })
        });
        if(predictions) that.$refs.acInput.closest('.prebooking__field').classList.add('active');


        that.results = predictions;

      },

      initService() {
        var that = this,
          service = new google.maps.places.AutocompleteService(),
          myInput = that.$refs.acInput.value,
          parent = that.$refs.acInput.closest('.prebooking__field');


        clearTimeout(that.loadingTimer);

        that.loadingTimer = setTimeout(function () {
          if (myInput.length < 3){
            that.$el.classList.remove('active');
            return;

          }
          // Поиск мест
          service.getQueryPredictions({
            input: myInput,
            componentRestrictions: {country: 'ru'},
          }, that.displaySuggestions);


        }, 500);

      },

      placeHover(item) {

        var marker = new google.maps.Marker({
          map: this.map,
          position: item.location,
          icon: '/img/marker.svg'
        });

        this.map.setCenter(item.location)
      },
      insertValue(item) {
        var that = this,
          wrap = this.$el, // главный dom-элемент
          input = wrap.querySelector('.prebooking__input'),
          inputName = input.name;

        input.value = item.description;   // Передаем значение в инпут
        this.$store.commit(`${inputName}Update`, item);   // Передаем данные выбранных точек в $store
        wrap.classList.remove('active');  // Закрываем окно выборки адресов
      },
      onFocus() {
        this.cityList = true;

        if (!this.$refs.acInput.length) {
          this.results = [];
        }
      },
      onBlur() {
        setTimeout(() => {
          this.$el.classList.remove('active')
        }, 500)
      }
    }
  }
</script>


<style lang="scss" scoped>

  .dropdown-cities {
    position: absolute;
    top: calc(100% - 4px);
    left: 0;
    display: flex;
    width: 682px;
    height: 216px;
    max-width: none;
    box-shadow: 0px 5px 12px rgba(0, 0, 0, 0.4);
    z-index: 1;
    padding: 0;
    opacity: 0;
    pointer-events: none;
    padding-bottom: 15px;
    padding-top: 12px;


    .map {
      width: 189px;
      height: 189px;
      background: #cecece;
      margin-right: 15px;
      margin-left: 15px;

      flex: 0 0 auto;
    }
  }

  @media (max-width: 1024px){
    .dropdown-cities{
      top: calc(100% - 4px);

    }
  }

</style>
