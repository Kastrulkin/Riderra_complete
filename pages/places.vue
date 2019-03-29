<!--
<template>


  <div class="wrap">
    <h1>Autocomplete Example (#164)</h1>
    <label>
      AutoComplete
      <p>{{latLng.lat}}</p>,
      <p>{{latLng.lng}}</p>

      <gmap-autocomplete
        placeholder="This is a placeholder text"
        @place_changed="setPlace"
        :selectFirstOnEnter="selectFirst"
        ref="autocomplete"

      >
      </gmap-autocomplete>

      &lt;!&ndash;<input type="text" ref="autocomplete">&ndash;&gt;

      <button @click="usePlace">Add</button>
    </label>
    <br/>

    <no-ssr>
      <Gmap-Map style="width: 600px; height: 300px;" :zoom="16" :center="{lat: 0, lng: 0}" ref="mapRef">
        &lt;!&ndash;<Gmap-Marker v-for="(marker, index) in markers"
                     :key="index"
                     :position="marker.position"
        ></Gmap-Marker>
        <Gmap-Marker
          v-if="this.place"
          label="&#x2605;"
          :position="{
            lat: this.place.geometry.location.lat(),
            lng: this.place.geometry.location.lng(),
          }"
        ></Gmap-Marker>&ndash;&gt;
      </Gmap-Map>
    </no-ssr>

  </div>
</template>

<script>

  export default {
    components: {
    },
    data() {
      return {
        markers: [],
        place: null,
        latLng: {},
        selectFirst: true
      }

    },
    mounted(){


    },
    methods: {
      sum(){
      },
      setDescription(description) {
        this.description = description;
      },
      setPlace(place) {
        this.place = place;

        console.log(place)

        if (!place) return;

        this.latLng = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };

        var componentForm = {
          street_number: 'short_name',
          route: 'long_name',
          locality: 'long_name',
          administrative_area_level_1: 'short_name',
          country: 'long_name',
          postal_code: 'short_name'
        };





      },
      usePlace(place) {
        if (this.place) {
          this.markers.push({
            position: {
              lat: this.place.geometry.location.lat(),
              lng: this.place.geometry.location.lng(),
            }
          })
          this.place = null;
        }
      }
    },

  }

</script>

<style scoped lang="scss">
  .wrap{
    margin-top: 200px;
    padding: 20px 100px;

    input{
      border: 1px solid red;
    }
  }


</style>

-->
