<template>

  <div class="wrap">
    <div class="map" ref="mapRef"></div>
    <div class="map-shadow"></div>
    <div class="details">
      <div class="details__title">Детали заказа</div>
      <div class="details__close">Изменить</div>
      <div class="order">
        <div class="order__row">
          <div class="order__title">Откуда</div>
          <div class="order__desc">
            Чек Лап Кок Инт-л Эйрпорт
          </div>
        </div>

        <div class="order__row">
          <div class="order__wishes">
            Нужна табличка синего цвета с приветствием и 2 бутылки холодной водки в салоне автомобиля.
          </div>
        </div>

        <!--<div class="order__title">Откуда</div>
        <div class="order__title">Куда</div>
        <div class="order__title">Дата</div>
        <div class="order__title">Время</div>
        <div class="order__title">Тариф</div>
        <div class="order__title">Пассажиров</div>
        <div class="order__title">Багаж</div>
        <div class="order__title">Детское кресло</div>
        <div class="order__col">
          <div class="order__desc">
            Чек Лап Кок Инт-л Эйрпорт
          </div>
        </div>-->
      </div>
    </div>

  </div>

</template>

<script>
  export default {
    data() {
      return {
        map: null
      }
    },
    mounted() {
      this.map = new google.maps.Map(
        this.$refs.mapRef, {
          center: {lat: 60.023539414725356, lng: 30.283663272857666},
          zoom: 15,
          mapTypeControl: false,
          disableDefaultUI: true
        });

      var directionsService = new google.maps.DirectionsService();
      var directionsDisplay = new google.maps.DirectionsRenderer();

      var request = {
        origin: new google.maps.LatLng(60.023539414725356,30.283663272857666), //точка старта
        destination: new google.maps.LatLng(59.79530896374892,30.410317182540894), //точка финиша
        travelMode: 'DRIVING', //режим прокладки маршрута

      };

      directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
          directionsDisplay.setDirections(response);
        }
      });

      var directionsOptions = {
        polylineOptions: {
          strokeColor: 'linear-gradient(to top, red 0%, green 100%)'
        }
      };

      directionsDisplay = new google.maps.DirectionsRenderer(directionsOptions);
      directionsDisplay.setMap(this.map);
    },
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
    width: 100%;
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

  .details{
    position: absolute;
    height: calc(100% - 130px);
    left: 100px;
    top: 60px;
    background: #fff;
    width: 40%;
    padding: 40px;
    border-radius: 5px;
    box-shadow: 0px 16px 20px rgba(7, 7, 7, 0.3);


    &__title{
      color: #000;
      font-size: 26px;
      font-weight: 900;
    }

    &__close{
      position: absolute;
      right: 40px;
      top: 40px;
      color: #2F80ED;
      font-size: 14px;
      text-decoration: none;
      cursor: pointer;
    }
  }

  .order{
    padding-right: 50px;
    margin-top: 35px;
    font-size: 16px;

    &__wishes{
      color: #000;
    }

    &__title,
    &__desc{
      color: #4C4C4C;
      opacity: 0.5;
      width: 40%;
    }

    &__desc{
      color: #000;
      opacity: 1;
      width: 60%;
    }

    &__row{
      display: flex;

      & + &{
        margin-top: 12px;
      }
    }
  }

  @media (max-width: 1024px){
    .order{
      font-size: 12px;
    }
  }

  @media (max-width: 667px) {
    .map-shadow{
      display: none;
    }

    .details{
      width: 100%;
      position: relative;
      left: 0;
      top: initial;
      padding: 0 0 20px 0;
      box-shadow: none;


      &__close{
        position: relative;
        top: 0;
        left: 0;
        margin-left: 25px;
        margin-top: 18px;
        margin-bottom: 25px;
      }

      &__title{
        width: 100%;
        line-height: 50px;
        border-top: 1px solid #D8D8E6;
        border-bottom: 1px solid #D8D8E6;
        padding-left: 25px;
        padding-right: 25px;
        font-size: 16px;

      }
    }

    .order{
      padding-left: 25px;
      padding-right: 25px;
    }
  }
</style>
