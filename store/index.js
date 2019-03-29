import Vuex from 'vuex'


const createStore = () => {
  return new Vuex.Store({

    state: {
      menu: false,
      current:{
        name: 'economy',
        src: '/img/cars/econom.png',
        color: '#E5006D',
        subColor: '#C01984',
        title: 'Эконом',
        desc: 'Багаж для 3 человек 3 места',
        price: 5000,
        models: 'Ford Focus, Hyndai Solaris, Opel Astra, Lada Largus.'
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
      ],
      points: {
        from: null,
        to: null
      },

    },
    getters: {
      getMenu: state => {
        return state.menu
      },
      getPointFrom: state => {
        return state.points.from
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
        state.current = payload;
      },
      sliderChangeCar(state, payload){
        state.current = state.cars[payload]
      }
    }
  });
};

export default createStore
