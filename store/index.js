import Vuex from 'vuex'

import {data} from '~/static/lang.js'

const createStore = () => {
  return new Vuex.Store({

    state: {
      siteData: data,
      language: 'ru',
      media: '',
      popup: false,
      menu: false,
      country: '',
      time: '',
      current: {
        name: 'economy',
        src: '/img/cars/econom.png',
        color: '#E5006D',
        subColor: '#C01984',
        title: 'Эконом',
        desc: 'Багаж для 3 человек 3 места',
        price: 5000,
        models: 'Ford Focus, Hyndai Solaris, Opel Astra.'
      },
      distance: '',
      tarifs:{
        'economy':{
          'Россия': 1,
          'Белоруссия': 1,
          'Украина': 1,
          'Казахстан': 1,
          'Узбекистан': 1,
          'Таджикистан': 1,
          'Киргизия': 1,
          'Хельсинки': 2,
          'Стокгольм': 2,
          'Рига': 2,
          'Таллин': 2,
          'Вильнюс': 2
        },
        'business':{
          'Россия': 2,
          'Белоруссия': 2,
          'Украина': 2,
          'Казахстан': 2,
          'Узбекистан': 2,
          'Таджикистан': 2,
          'Киргизия': 2,
          'Хельсинки': 4,
          'Стокгольм': 4,
          'Рига': 4,
          'Таллин': 4,
          'Вильнюс': 4
        },
        'luxury':{
          'Россия': 2,
          'Белоруссия': 2,
          'Украина': 2,
          'Казахстан': 2,
          'Узбекистан': 2,
          'Таджикистан': 2,
          'Киргизия': 2,
          'Хельсинки': 4,
          'Стокгольм': 4,
          'Рига': 4,
          'Таллин': 4,
          'Вильнюс': 4
        },

      },
      cars: [
        {
          name: 'standard',
          src: '/img/cars/Stnadard.png',
          interior1: '/img/cars/Standard interior 1.png',
          interior2: '/img/cars/standard interior 2.png',
          color: '#E5006D',
          subColor: '#C01984',
          title: 'Стандарт',
          desc: 'Багаж для 3 человек 3 места',
          models: 'Ford Focus, Hyndai Solaris, Opel Astra.'
        }, {
          name: 'business',
          src: '/img/cars/business.png',
          interior1: '/img/cars/business interior 1.png',
          interior2: '/img/cars/business interior 2.png',
          color: '#C80D7D',
          subColor: '#C01984',
          title: 'Бизнес',
          desc: 'Багаж для 3 человек 3 места',
          models: 'Ford Focus, Hyndai Solaris, Opel Astra.'
        }, {
          name: 'first',
          src: '/img/cars/first.png',
          interior1: '/img/cars/First interior 1.png',
          interior2: '/img/cars/First interior 2.png',
          color: '#702283',
          subColor: '#C01984',
          title: 'Первый',
          desc: 'Багаж для 3 человек 3 места',
          models: 'Ford Focus, Hyndai Solaris, Opel Astra.'
        }, {
          name: 'minivan',
          src: '/img/cars/minivan.png',
          interior1: '/img/cars/minivan interior 1.png',
          interior2: '/img/cars/minivan interior 2.png',
          color: '#8B008B',
          subColor: '#C01984',
          title: 'Минивэн',
          desc: 'Багаж для 3 человек 3 места',
          models: 'Ford Focus, Hyndai Solaris, Opel Astra.'
        }, {
          name: 'mpv',
          src: '/img/cars/mpv.png',
          interior1: '/img/cars/mpv interior 1.jpg',
          interior2: '/img/cars/mpv interior 2.jpg',
          color: '#4B0082',
          subColor: '#C01984',
          title: 'MPV',
          desc: 'Багаж для 3 человек 3 места',
          models: 'Ford Focus, Hyndai Solaris, Opel Astra.'
        }, {
          name: 'suv_lux',
          src: '/img/cars/SUV lux.png',
          interior1: '/img/cars/SUV lux interior 1.jpg',
          interior2: '/img/cars/SUV lux interior 2.jpg',
          color: '#FF4500',
          subColor: '#C01984',
          title: 'SUV lux',
          desc: 'Багаж для 3 человек 3 места',
          models: 'Ford Focus, Hyndai Solaris, Opel Astra.'
        }, {
          name: 'business_van',
          src: '/img/cars/businessvan.png',
          interior1: '/img/cars/businessvan interior 1.png',
          interior2: '/img/cars/businessvan interior 2.png',
          color: '#DC143C',
          subColor: '#C01984',
          title: 'Бизнесвэн',
          desc: 'Багаж для 3 человек 3 места',
          models: 'Ford Focus, Hyndai Solaris, Opel Astra.'
        }, {
          name: 'bus',
          src: '/img/cars/bus_new.png',
          interior1: '/img/cars/Bus interior 1.png',
          interior2: '/img/cars/Bus interior 2.png',
          color: '#B22222',
          subColor: '#C01984',
          title: 'Автобус',
          desc: 'Багаж для 3 человек 3 места',
          models: 'Ford Focus, Hyndai Solaris, Opel Astra.'
        }, {
          name: 'minibus',
          src: '/img/cars/minibus.png',
          interior1: '/img/cars/Minibus interior 1.png',
          interior2: '/img/cars/Minibus interior 2.png',
          color: '#FF6347',
          subColor: '#C01984',
          title: 'Минибус',
          desc: 'Багаж для 3 человек 3 места',
          models: 'Ford Focus, Hyndai Solaris, Opel Astra.'
        }, {
          name: 'electric_standard',
          src: '/img/cars/e-vehicle.png',
          interior1: '/img/cars/e-vehicle interior 1.jpg',
          interior2: '/img/cars/e-vehicle interior 2.jpg',
          color: '#32CD32',
          subColor: '#C01984',
          title: 'Электрический стандарт',
          desc: 'Багаж для 3 человек 3 места',
          models: 'Ford Focus, Hyndai Solaris, Opel Astra.'
        }
      ],
      points: {
        from: null,
        to: null
      },
      formData: null

    },
    getters: {
      getMenu: state => {
        return state.menu
      },
      getPoints: state => {
        return state.points
      },
      getTime: state => {
        return state.time
      },
      getCurrentCar: state => {
        return state.current;
      },
      getDistance: state => {
        return state.distance;
      },
	    textData: state => {
        return state.siteData[state.language];
      }
    },
    mutations: {
      setQuery(state, payload) {
        state.media = payload
      },
      setTime(state, payload) {
        state.time = payload
      },
      toggleMenu(state, payload) {
        state.menu = payload
      },
      fromPointUpdate(state, payload) {
        state.points.from = payload;
      },
      toPointUpdate(state, payload) {
        state.points.to = payload;
      },
      currentCar(state, payload) {
        state.current = state.cars[payload];
      },
      sliderChangeCar(state, payload){
        state.current = state.cars[payload];
      },
      showPopup(state, payload){
        state.popup = payload;
      },
      setCountry(state, payload){
        state.country = payload;
      },
      setFormData(state, payload){
        state.formData = payload;
      },
      setDistance(state, payload){
        state.distance = payload;
      },
      setCar(state, payload){
        state.current = payload;
      },
      setData(state, payload){
        state.formData = payload;
      },
      setSiteData(state, payload){
        state.siteData = payload;
      },
      setLang(state, payload){
        state.language = payload;
      }
    }
  });
};

export default createStore
