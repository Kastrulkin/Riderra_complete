<template>
  <div class="lang-select" :class="data.class">
    <div class="lang-select__wrap" v-click-outside="hideList">
      <div class="lang-select__current" @click="toggleList" :class="{'active': state}">
        <span class="lang-select__flag">{{selectedLanguage.flag}}</span>
        <span class="lang-select__name">{{media === 'mobile' ? selectedLanguage.country : selectedLanguage.name}}</span>
        <svg class="lang-select__arrow" width="10" height="6" viewBox="0 0 13 8" fill="none"
             xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L6.5 6L12 1" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <transition name="list-fade">
        <div class="lang-select__list" v-show="state">
          <div class="lang-select__list-item" v-for="(item, i) in languages" :key="i" @click="chooseLang(item)" :class="{'active': selectedLanguage.shortcut === item.shortcut}">
            <span class="lang-select__list-flag">{{item.flag}}</span>
            <span class="lang-select__list-name">{{item.country}}</span>
            <span v-if="selectedLanguage.shortcut === item.shortcut" class="lang-select__check">✓</span>
          </div>
        </div>
      </transition>
    </div>


  </div>
</template>

<script>
	export default {
		props: ['data'],
		computed: {
			media() {
				return this.$store.state.media;
			},
			selectedLanguage() {
				return this.languages.find((item) => item.shortcut === this.$store.state.language) || this.languages[0];
			},
		},
		watch: {
			'$route.path': function (nv, ov) {
				this.state = false;
			}
		},
		data() {
			return {
				state: false,
				languages: [
					{
						shortcut: 'ru',
						lang: 'русский',
						country: 'Русский',
						name: 'Русский',
						flag: '🇷🇺'
					}, {
						shortcut: 'en',
						lang: 'english',
						country: 'English',
						name: 'English',
						flag: '🇬🇧'
					}, {
						shortcut: 'es',
						lang: 'español',
						country: 'Español',
						name: 'Español',
						flag: '🇪🇸'
					}, {
						shortcut: 'de',
						lang: 'deutsch',
						country: 'Deutsch',
						name: 'Deutsch',
						flag: '🇩🇪'
					}, {
						shortcut: 'fr',
						lang: 'français',
						country: 'Français',
						name: 'Français',
						flag: '🇫🇷'
					}, {
						shortcut: 'el',
						lang: 'ελληνικά',
						country: 'Ελληνικά',
						name: 'Ελληνικά',
						flag: '🇬🇷'
					}, {
						shortcut: 'th',
						lang: 'ไทย',
						country: 'ไทย',
						name: 'ไทย',
						flag: '🇹🇭'
					}, {
						shortcut: 'ar',
						lang: 'العربية',
						country: 'العربية',
						name: 'العربية',
						flag: '🇸🇦'
					}, {
						shortcut: 'ha',
						lang: 'hausa',
						country: 'Hausa',
						name: 'Hausa',
						flag: '🇳🇬'
					}
				],
				current: null

			}
		},
		methods: {
			toggleList() {
				this.state = !this.state;
			},
			hideList() {
				this.state = false;
			},
			chooseLang(lang) {
				this.current = lang;
				this.state = false;

				this.$store.commit('setLang', lang.shortcut)
				if (process.browser) {
					localStorage.setItem('riderra_language', lang.shortcut)
					document.cookie = `riderra_lang=${lang.shortcut}; path=/; max-age=31536000; SameSite=Lax`
				}
			}
		},
		mounted() {
			const path = window.location.pathname || '/'
			const requested = new URLSearchParams(window.location.search || '').get('lang')
			const saved = localStorage.getItem('riderra_language')
			const nextLang = path.startsWith('/ru') ? 'ru' : (requested || saved || this.$store.state.language)
			if (nextLang && nextLang !== this.$store.state.language) {
				this.$store.commit('setLang', nextLang)
			}
			if (nextLang) {
				document.cookie = `riderra_lang=${nextLang}; path=/; max-age=31536000; SameSite=Lax`
			}
		}
	}
</script>
<style lang="scss" scoped>

  .lang-select {
    margin-left: 25px;
    position: relative;
    cursor: pointer;
    flex: 0 0 auto;

    &__wrap {
      display: flex;
      align-items: flex-end;
      margin-bottom: -2px;
    }

    &__list {
      position: absolute;
      top: 100%;
      left: 100%;
      padding: 10px;
      background: #fff;
      border-radius: 0 0 5px 5px;
      color: #000;
      box-shadow: 0px 5px 12px rgba(0, 0, 0, 0.4);
      z-index: 10;
    }

    &__list-item {
      display: flex;
      align-items: center;
      line-height: 40px;
      white-space: nowrap;
      transition: 150ms all ease;
      padding: 0 10px;
      border-radius: 5px;
      gap: 8px;

      &:hover {
        background: #2F80ED;
        color: #fff;
      }

      &.active {
        background: rgba(47, 128, 237, 0.1);
      }
    }

    &__flag {
      font-size: 18px;
      margin-right: 6px;
    }

    &__name {
      display: inline-block;
    }

    &__list-flag {
      font-size: 18px;
    }

    &__list-name {
      flex: 1;
    }

    &__check {
      color: #FF6B35;
      font-weight: bold;
      font-size: 16px;
    }

    &__arrow {
      margin-left: 4px;
      stroke: #fff;
      display: inline-block;
      transform-origin: center;
      transition: all 250ms ease;

    }

    &__current {
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 6px;

      &.active {

        .lang-select__arrow {
          transform: rotateX(180deg);
        }
      }
    }

    &.blue {
      color: #2F80ED;
    }

    &.blue &__arrow {
      stroke: #2F80ED;
    }
  }

  .blue {

    .lang-select {

      &__list {
        bottom: 100%;
        top: initial;
        border-radius: 5px 5px 0 0;
      }
    }

  }

  .list-fade-enter-active {
    transition: all .3s ease;
  }

  .list-fade-leave-active {
    transition: none;
  }

  .list-fade-enter, .list-fade-leave-to
    /* .slide-fade-leave-active до версии 2.1.8 */
  {
    transform: translateY(10px);
    opacity: 0;
  }

  @media (max-width: 1024px) {

    .lang-select {

      &__current {
        font-size: 12px;
      }
    }
  }

  @media (max-width: 767px) {
    .lang-select {
      display: none;
    }

    .mobile-menu {

      .lang-select {
        border: 1px solid #fff;
        width: 100%;
        display: block;
        margin-left: 0;
        margin-bottom: 30px;
        border-radius: 5px;

        &__wrap {
          line-height: 40px;
          color: #fff;
          font-size: 14px;
        }

        &__list {
          left: 0;
          width: 100%;
          top: calc(100% - 2px);
          transition: all 100ms;
        }

        &__current {
          width: 100%;
          padding: 0 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;

        }
      }
    }
  }
</style>
