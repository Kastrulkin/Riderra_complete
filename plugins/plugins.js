import Vue from 'vue'
import * as VueGoogleMaps from 'vue2-google-maps'

import datepicker from 'vuejs-datepicker';
import VueAwesomeSwiper from 'vue-awesome-swiper/dist/ssr'

import moment from 'moment'
import VueMoment from 'vue-moment'
import vSelect from 'vue-select'
import vueScrollto from 'vue-scrollto'
import Vuebar from 'vuebar';
import ClickOutside from 'vue-click-outside'

import DatePicker2 from 'vue2-datepicker'



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
Vue.use(DatePicker2);

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

Vue.use(ClickOutside);

Vue.directive('click-outside', {
  bind: function (el, binding, vnode) {
    el.clickOutsideEvent = function (event) {
      // here I check that click was outside the el and his childrens
      if (!(el == event.target || el.contains(event.target))) {
        // and if it did, call method provided in attribute value
        vnode.context[binding.expression](event);
      }
    };
    document.body.addEventListener('click', el.clickOutsideEvent)
  },
  unbind: function (el) {
    document.body.removeEventListener('click', el.clickOutsideEvent)
  },
});
