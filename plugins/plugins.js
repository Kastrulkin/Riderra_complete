import Vue from 'vue'
// import Datepicker from 'vuejs-datepicker';
import moment from 'moment'
import VueMoment from 'vue-moment'
import vSelect from 'vue-select'
import vueScrollto from 'vue-scrollto'
import Vuebar from 'vuebar';
import ClickOutside from 'vue-click-outside'
import DatePicker from 'vue2-datepicker'
import VueScrollactive from 'vue-scrollactive'
import VScrollLock from 'v-scroll-lock'

// Datepicker
Vue.use(DatePicker);
// Vue.use(DatePicker2);

class RiderraSlider {
  constructor(el, options = {}) {
    this.el = el;
    this.options = options;
    this.wrapper = el.querySelector('.swiper-wrapper');
    this.activeIndex = 0;
    this.events = {};
    this.cleanup = [];
    this.resize = () => this.update();
    window.addEventListener('resize', this.resize);
    this.cleanup.push(() => window.removeEventListener('resize', this.resize));
    this.bindNavigation();
    this.bindSwipe();
    this.update();
  }

  settings() {
    const settings = { ...this.options };
    const width = window.innerWidth;
    Object.keys(this.options.breakpoints || {})
      .map(Number)
      .sort((a, b) => a - b)
      .some((breakpoint) => {
        if (width <= breakpoint) {
          Object.assign(settings, this.options.breakpoints[breakpoint]);
          return true;
        }
        return false;
      });
    return settings;
  }

  bindNavigation() {
    const navigation = this.options.navigation || {};
    const bind = (selector, handler) => {
      if (!selector) return;
      const control = this.el.querySelector(selector) || document.querySelector(selector);
      if (!control) return;
      control.addEventListener('click', handler);
      this.cleanup.push(() => control.removeEventListener('click', handler));
    };
    bind(navigation.nextEl, () => this.slideTo(this.activeIndex + 1));
    bind(navigation.prevEl, () => this.slideTo(this.activeIndex - 1));
  }

  bindSwipe() {
    let startX = null;
    const start = (event) => { startX = event.touches ? event.touches[0].clientX : event.clientX; };
    const end = (event) => {
      if (startX === null) return;
      const point = event.changedTouches ? event.changedTouches[0].clientX : event.clientX;
      const distance = point - startX;
      startX = null;
      if (Math.abs(distance) < 40) return;
      this.slideTo(this.activeIndex + (distance < 0 ? 1 : -1));
      this.emit('touchMove');
    };
    this.el.addEventListener('touchstart', start, { passive: true });
    this.el.addEventListener('touchend', end, { passive: true });
    this.cleanup.push(() => {
      this.el.removeEventListener('touchstart', start);
      this.el.removeEventListener('touchend', end);
    });
  }

  updatePagination() {
    const pagination = this.options.pagination || {};
    const target = pagination.el && (this.el.querySelector(pagination.el) || document.querySelector(pagination.el));
    if (!target) return;
    target.innerHTML = '';
    this.slides.forEach((slide, index) => {
      const holder = document.createElement('span');
      holder.innerHTML = pagination.renderBullet
        ? pagination.renderBullet(index, 'swiper-pagination-bullet')
        : '<span class="swiper-pagination-bullet"></span>';
      const bullet = holder.firstElementChild;
      if (!bullet) return;
      bullet.classList.toggle('swiper-pagination-bullet-active', index === this.activeIndex);
      if (pagination.clickable) bullet.addEventListener('click', () => this.slideTo(index));
      target.appendChild(bullet);
    });
  }

  update() {
    if (!this.wrapper) return;
    this.slides = Array.from(this.wrapper.querySelectorAll('.swiper-slide'));
    const settings = this.settings();
    const gap = Number(settings.spaceBetween || 0);
    this.wrapper.style.display = 'flex';
    this.wrapper.style.gap = `${gap}px`;
    this.wrapper.style.transition = `transform ${Number(settings.speed || 400)}ms ease`;
    if (settings.slidesPerView !== 'auto') {
      const count = Math.max(1, Number(settings.slidesPerView || 1));
      const width = Math.max(0, (this.el.clientWidth - gap * (count - 1)) / count);
      this.slides.forEach((slide) => {
        slide.style.width = `${width}px`;
        slide.style.flex = `0 0 ${width}px`;
      });
    }
    this.slideTo(this.activeIndex, false);
  }

  slideTo(index, notify = true) {
    if (!this.wrapper || !this.slides.length) return;
    const next = Math.max(0, Math.min(Number(index) || 0, this.slides.length - 1));
    const changed = next !== this.activeIndex;
    this.activeIndex = next;
    const slide = this.slides[next];
    this.wrapper.style.transform = `translate3d(${-slide.offsetLeft}px, 0, 0)`;
    this.slides.forEach((item, itemIndex) => {
      item.classList.toggle('swiper-slide-active', itemIndex === next);
      item.classList.toggle('swiper-slide-prev', itemIndex === next - 1);
      item.classList.toggle('swiper-slide-next', itemIndex === next + 1);
    });
    this.updatePagination();
    if (notify && changed) this.emit('slideChange');
  }

  on(event, handler) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(handler);
  }

  emit(event) {
    (this.events[event] || []).forEach((handler) => handler.call(this));
  }

  destroy() {
    this.cleanup.forEach((handler) => handler());
    this.cleanup = [];
    this.events = {};
  }
}

// Keep the existing v-swiper API without the abandoned wrapper dependency.
Vue.directive('swiper', {
  inserted(el, binding, vnode) {
    const instance = new RiderraSlider(el, binding.value || {});
    el.swiper = instance;
    if (binding.arg && vnode.context) {
      vnode.context[binding.arg] = instance;
    }
  },
  componentUpdated(el) {
    if (el.swiper && typeof el.swiper.update === 'function') {
      el.swiper.update();
    }
  },
  unbind(el) {
    if (el.swiper && typeof el.swiper.destroy === 'function') el.swiper.destroy();
  }
});

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


// SCROLLACTIVE

Vue.use(VueScrollactive);

Vue.use(VScrollLock);

// Scroll Bar
Vue.use(Vuebar);

// Click outside event

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
