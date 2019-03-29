<template>
  <div>
    <div class="contact-map">
      <GmapMap
        :center="{lat:10, lng:10}"
        :zoom="7"
        map-type-id="terrain"
        style="width: 500px; height: 300px"
      >
        <GmapMarker
          :key="index"
          v-for="(m, index) in markers"
          :position="m.position"
          :clickable="true"
          :draggable="true"
        />
      </GmapMap>
    </div>
  </div>
</template>

<script>
  import {gmapApi} from 'vue2-google-maps'
  export default {
    computed:{
      google: gmapApi
    },
    data(){
      return {
        mapStyles: {
          disableDefaultUI: false,
        },
        cities: {
          spb: {
            coords: {lat: 59.9614229, lng: 30.2854096}
          },
          msc: {
            coords: {lat: 55.752202, lng: 37.665002}
          }

        },
      }
    },
    mounted(){
      console.log(google)
    }

  }
</script>

<style scoped>
  .contact-map{
    width: 600px;
    height: 600px;
  }
</style>
