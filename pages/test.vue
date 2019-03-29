<template>
  <label class="wrap">
    <input id="searchTextField" name="from" @input="initService" type="text" size=100 placeholder="testing"
           ref="acInput">
    <div id="result" ref="result" class="result-list" v-show="cityList">
      <li v-for="(item, i) in results" :key="i" @mouseenter="placeHover(item)" @click="insertValue(item)">
        {{item.description}}
      </li>
    </div>
    <div id="map" class="map" ref="mapRef"></div>
  </label>
</template>

<script>

  export default {
    data() {
      return {
        value: '',
        results: [],
        map: {},
        cityList: false,
      }
    },
    computed: {},
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
          zoom: 15
        });
    },
    methods: {
      displaySuggestions(predictions, status) {

        var that = this,
          placeService = new google.maps.places.PlacesService(this.map);

        if (status != google.maps.places.PlacesServiceStatus.OK) {
          return;
        }

        predictions.forEach(prediction => {

          var request = {
            placeId: prediction.place_id,
            fields: ['name', 'formatted_address', 'place_id', 'geometry']
          };

          // console.log(prediction)
          // Определяем координаты, записываем их в объект
          placeService.getDetails(request, function (place, status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) {

              let lat = place.geometry.location.lat(),
                lng = place.geometry.location.lng();

              prediction['location'] = {lat, lng}
            }
          })
        });

        that.results = predictions;
        // console.log(that.results)

      },
      initService() {
        var that = this,
            service = new google.maps.places.AutocompleteService(),
            myInput = that.$refs.acInput.value;

        clearTimeout(loadingTimer);

        var loadingTimer = setTimeout(function () {
          if (myInput.length) {

            // Поиск мест
            service.getQueryPredictions({
              input: myInput,
              componentRestrictions: {country: 'ru'},
            }, that.displaySuggestions);
          }
        }, 500);

        this.cityList = true;

      },
      placeHover(item) {
        // this.map.clearMarkers();

        var marker = new google.maps.Marker({
          map: this.map,
          position: item.location
        });

        // console.log(item)

        this.map.setCenter(item.location)
      },
      insertValue(item) {
        let that = this;

        this.$refs.acInput.value = item.description;


        setTimeout(() => {
          that.cityList = false;

        }, 200)

        console.log(this.$refs.acInput.value)
      },
      onFocus() {
        this.cityList = true;

        if (!this.$refs.acInput.length) {
          this.results = [];
        }
      },
      onBlur() {
        this.cityList = false;
      }
    }
  }
</script>

<style scoped lang="scss">
  .wrap {
    margin-top: 200px;
    display: block;
    position: relative;

  }

  input {
    padding: 50px 100px;
    border: 1px solid red;
  }

  .result-list {
    position: absolute;
    top: 150px;
    z-index: 200;
    background: #fff;
    opacity: 1;
    pointer-events: all;

  }

  /*input:focus + .result-list {
    opacity: 1;
    pointer-events: all;

  }*/

  .map {
    width: 400px;
    height: 400px;
  }

  li {
    padding: 20px;
  }

</style>
