import Vue from 'vue'
import * as VueGoogleMaps from 'vue2-google-maps'

import datepicker from 'vuejs-datepicker';
import VueAwesomeSwiper from 'vue-awesome-swiper/dist/ssr'

import moment from 'moment'
import VueMoment from 'vue-moment'
import vSelect from 'vue-select'
import vueScrollto from 'vue-scrollto'
import Vuebar from 'vuebar';



// Maps (map key from Serenity)
Vue.use(VueGoogleMaps, {
  load: {
    key: 'AIzaSyBf3Lh9cG-h6AjZlUPKyAFUxNhKbC7QKZs',
    libraries: 'places, drawing',
    region: ['ru']
  }
});


// Datepicker
Vue.use(datepicker);

// Swiper
Vue.use(VueAwesomeSwiper);

// moment js
Vue.use(VueMoment, moment);

// Vue Select
Vue.component('v-select', vSelect);


// ScrollTo
Vue.use(vueScrollto, {
  container: "body",
  duration: 500,
  easing: "ease",
  offset: 0,
  force: true,
  // cancelable: true,
  onStart: false,
  onDone: false,
  onCancel: false,
  x: false,
  y: true
});

// Scroll Bar
Vue.use(Vuebar);
