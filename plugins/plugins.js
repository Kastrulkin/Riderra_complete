import Vue from 'vue'
import * as VueGoogleMaps from 'vue2-google-maps'

import datepicker from 'vuejs-datepicker';
import VueAwesomeSwiper from 'vue-awesome-swiper/dist/ssr'

import moment from 'moment'
import VueMoment from 'vue-moment'

// import VueGoogleAutocomplete from 'vue-google-autocomplete'
// import {GmapMarker} from 'vue2-google-maps/src/components/marker'

// Vue.component('GmapMarker', GmapMarker)

Vue.use(VueGoogleMaps, {
  load: {
    key: 'AIzaSyBf3Lh9cG-h6AjZlUPKyAFUxNhKbC7QKZs',
    libraries: 'places, drawing',
    region: ['ru']
  }
});

Vue.use(datepicker);
Vue.use(VueAwesomeSwiper);
// Vue.use(VueGoogleAutocomplete);

Vue.use(VueMoment, moment);

