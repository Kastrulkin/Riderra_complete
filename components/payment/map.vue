<template>

  <div class="wrap">
    <div class="map" ref="mapRef"></div>
    <div class="map-shadow"></div>
    <div class="details">
      <div class="details__title" @click="toggleOrder">Детали заказа
        <svg class="details__title-arrow" width="11" height="7" viewBox="0 0 11 7" fill="none"
             xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L5.50324 5.09385L10.0065 1" stroke="#2F80ED" stroke-width="1.63754" stroke-linecap="round"/>
        </svg>

      </div>
      <div class="details__order order">
      <div class="details__close" @click="showData">Изменить</div>
      <div class="order__row" >
        <div class="order__title">Откуда</div>
        <div class="order__desc">
          {{ points.from.description }}
        </div>
      </div>

      <div class="order__row">
        <div class="order__title">Куда</div>
        <div class="order__desc">
          {{ points.to.description }}

        </div>
      </div>
      <div class="order__row">
        <div class="order__title">Дата</div>
        <div class="order__desc">
          {{ myData.date }}

        </div>
      </div>
      <div class="order__row">
        <div class="order__title">Время</div>
        <div class="order__desc">
          {{ myData.time }}

        </div>
      </div>
      <div class="order__row">
        <div class="order__title">Тариф</div>
        <div class="order__desc">
          {{ currentCar.title }}

        </div>
      </div>
      <div class="order__row">
        <div class="order__title">Багаж</div>
        <div class="order__desc">
          {{ myData.baggage }}
        </div>
      </div>
      <div class="order__row">
        <div class="order__title">Детское кресло</div>
        <div class="order__desc">
          {{ points.to.description }}
        </div>
      </div>

      <div class="order__row">
        <div class="order__wishes">
          Client wishes
        </div>
      </div>
      </div>
    </div>

  </div>

</template>

<script>
  export default {
    computed: {
      currentCar() {
        return this.$store.state.current;
      },
      points() {
        return this.$store.state.points;
      },
      pointTo() {
        return this.$store.state.points.to;
      },
      myData() {
        return this.$store.state.formData;
      }
    },
    data() {
      return {
        map: null
      }
    },
    methods: {
      showData() {
        console.log(this.myData)
      },
      toggleOrder() {
        this.$refs.order.classList.toggle('active')
      }
    },
    mounted() {

      let that = this,
          myCoords = {
            to: {
              lat: this.points.to.location.lat,
              lng: this.points.to.location.lng
            },
            from: {
              lat: this.points.from.location.lat,
              lng: this.points.from.location.lng
            }

          };
      this.map = new google.maps.Map(
        this.$refs.mapRef, {
          zoom: 15,
          mapTypeControl: false,
          disableDefaultUI: true
        });

      var directionsService = new google.maps.DirectionsService();
      var directionsDisplay = new google.maps.DirectionsRenderer();

      var request = {
        origin: new google.maps.LatLng(myCoords.from.lat, myCoords.from.lng),
        destination: new google.maps.LatLng(myCoords.to.lat, myCoords.to.lng),
        travelMode: 'DRIVING',

      };

      // Прокладка маршрута
      directionsService.route(request, function (response, status) {
        if (status == google.maps.DirectionsStatus.OK) {

          var route = response.routes[0].legs[0];

          // Добавляем маркеры
          createMarker(route.start_location, icon.start);
          createMarker(route.end_location, icon.end);

          directionsDisplay.setDirections(response);

          var distance = route.distance.value / 1000;
          that.$store.commit('setDistance', distance);


        }
      });

      var directionsOptions = {
        polylineOptions: {
          strokeColor: '#702283'
        },
        suppressMarkers: true,
      };

      directionsDisplay = new google.maps.DirectionsRenderer(directionsOptions);
      directionsDisplay.setMap(this.map);

      var icon = {
        start: {
          url: '/img/marker_r1.svg',
          size: new google.maps.Size(53, 53),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(27, 27),
        },
        end: {
          url: '/img/marker_r2.svg',
          size: new google.maps.Size(53, 53),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(27, 27),
        }
      };


      function createMarker(position, image) {
        var marker = new google.maps.Marker({
          position: position,
          map: that.map,
          icon: image

        });
      }


    }
  }
</script>

<style lang="scss" scoped>
  .wrap {
    width: 100%;
    margin-top: 145px;
    position: relative;
    overflow: hidden;
  }

  .map {
    width: 140%;
    height: 600px;
    position: relative;

  }

  .map-shadow {
    width: 257px;
    height: 920px;
    position: absolute;
    background: linear-gradient(180deg, rgba(255, 80, 41, 0.256) 0%, rgba(229, 0, 109, 0.8) 52.49%, rgba(112, 34, 131, 0.8) 64.64%);
    filter: blur(80px);
    transform: matrix(0.58, 1, -0.63, 0.64, 0, 0);
    left: 0;
    top: -50%;
  }

  .details {
    position: absolute;
    height: calc(100% - 130px);
    left: 100px;
    top: 60px;
    background: #fff;
    width: 40%;
    padding: 40px;
    border-radius: 5px;
    box-shadow: 0px 16px 20px rgba(7, 7, 7, 0.3);

    &__title {
      color: #000;
      font-size: 26px;
      font-weight: 900;
      display: flex;
      position: relative;
    }

    &__title-arrow {
      position: absolute;
      top: 50%;
      right: 25px;
      transform-origin: center;
      transform: translate3d(0, -50%, 0) rotate(180deg);
      transition: transform 150ms;
      display: none;
    }

    &__close {
      position: absolute;
      right: 40px;
      top: 40px;
      color: #2F80ED;
      font-size: 14px;
      text-decoration: none;
      cursor: pointer;
    }
  }

  .order {
    padding-right: 50px;
    margin-top: 35px;
    font-size: 16px;

    &__wishes {
      color: #000;
    }

    &__title,
    &__desc {
      color: #4C4C4C;
      opacity: 0.5;
      width: 40%;
    }

    &__desc {
      color: #000;
      opacity: 1;
      width: 60%;
    }

    &__row {
      display: flex;

      & + & {
        margin-top: 12px;
      }
    }
  }

  @media (max-width: 1024px) {
    .order {
      font-size: 12px;
    }
  }

  @media (max-width: 667px) {
    .map-shadow {
      display: none;
    }

    .details {
      width: 100%;
      position: relative;
      left: 0;
      top: initial;
      padding: 0 0 20px 0;
      box-shadow: none;

      &__title-arrow {
        display: block;
      }

      &__close {
        position: relative;
        top: 0;
        left: 0;
        margin-bottom: 25px;
        font-size: 12px;
      }

      &__title {
        width: 100%;
        line-height: 50px;
        border-top: 1px solid #D8D8E6;
        border-bottom: 1px solid #D8D8E6;
        padding-left: 25px;
        padding-right: 25px;
        font-size: 16px;

      }
    }

    .order {
      padding-left: 25px;
      padding-right: 25px;
      padding-top: 20px;
      margin-top: 0;
      max-height: 0;
      overflow: hidden;
      transition: 800ms max-height;

      &.active {
        max-height: 1000px;
      }
    }
  }
</style>
