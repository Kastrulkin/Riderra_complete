import Vuex from 'vuex'


const createStore = () => {
  return new Vuex.Store({

    state: {
      popup: false,
      menu: false,
      country: '',
      current: {
        name: 'economy',
        src: '/img/cars/econom.png',
        color: '#E5006D',
        subColor: '#C01984',
        title: 'Эконом',
        desc: 'Багаж для 3 человек 3 места',
        price: 5000,
        models: 'Ford Focus, Hyndai Solaris, Opel Astra, Lada Largus.'
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
          name: 'economy',
          src: '/img/cars/econom.png',
          color: '#E5006D',
          subColor: '#C01984',
          title: 'Эконом',
          desc: 'Багаж для 3 человек 3 места',
          price: 5000,
          models: 'Ford Focus, Hyndai Solaris, Opel Astra, Lada Largus.'

        }, {
          name: 'business',
          src: '/img/cars/business.png',
          color: '#C80D7D',
          subColor: '#C01984',
          title: 'Бизнес',
          desc: 'Багаж для 3 человек 3 места',
          price: 10000,
          prevPrice: 7000,
          models: 'Ford Focus, Hyndai Solaris, Opel Astra, Lada Largus.'

        }, {
          name: 'luxury',
          src: '/img/cars/lux.png',
          color: '#702283',
          subColor: '#C01984',
          title: 'Люкс',
          desc: 'Багаж для 3 человек 3 места',
          price: 15000,
          models: 'Ford Focus, Hyndai Solaris, Opel Astra, Lada Largus.'

        },
        {
          name: 'luxury',
          src: '/img/cars/lux.png',
          color: '#702283',
          subColor: '#C01984',
          title: 'Люкс',
          desc: 'Багаж для 3 человек 3 места',
          price: 15000,
          models: 'Ford Focus, Hyndai Solaris, Opel Astra, Lada Largus.'

        },
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
      getCurrentCar: state => {
        return state.current;
      },
      getDistance: state => {
        return state.distance;
      }
    },
    mutations: {
      toggleMenu(state, pageName) {
        state.menu = pageName
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

      }
    }
  });
};

export default createStore
