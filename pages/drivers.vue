<template>
  <div class="drivers-page">
    <section class="drivers-hero">
      <div class="container drivers-hero__inner">
        <div class="drivers-hero__copy">
          <p class="drivers-eyebrow">{{ t.eyebrow }}</p>
          <h1>{{ t.title }}</h1>
          <p class="drivers-hero__lead">{{ t.lead }}</p>
          <div class="drivers-hero__actions">
            <a href="#carrier-application" class="drivers-button drivers-button--light">{{ t.startButton }}</a>
            <nuxt-link to="/driver-login" class="drivers-link drivers-link--hero">{{ t.loginButton }}</nuxt-link>
          </div>
        </div>
        <ol class="drivers-steps" :aria-label="t.processTitle">
          <li v-for="(step, index) in t.steps" :key="step.title">
            <span class="drivers-steps__number">{{ index + 1 }}</span>
            <div><strong>{{ step.title }}</strong><p>{{ step.text }}</p></div>
          </li>
        </ol>
      </div>
    </section>

    <section id="carrier-application" class="drivers-content">
      <div class="container drivers-layout">
        <aside class="drivers-aside">
          <p class="drivers-eyebrow drivers-eyebrow--dark">{{ t.applicationEyebrow }}</p>
          <h2>{{ t.applicationTitle }}</h2>
          <p>{{ t.applicationText }}</p>
          <div class="drivers-aside__links">
            <a :href="wikiPath" class="drivers-link">{{ t.wikiButton }} →</a>
            <nuxt-link to="/driver-login" class="drivers-link">{{ t.alreadyRegistered }} →</nuxt-link>
          </div>
        </aside>

        <section class="application-card" :aria-labelledby="sent ? 'application-success' : 'application-form-title'">
          <div v-if="sent" class="application-success" role="status">
            <span class="application-success__mark" aria-hidden="true">✓</span>
            <p class="drivers-eyebrow drivers-eyebrow--dark">{{ t.successEyebrow }}</p>
            <h2 id="application-success">{{ t.successTitle }}</h2>
            <p>{{ t.note }}</p>
            <a :href="wikiPath" class="drivers-button">{{ t.wikiButton }}</a>
          </div>

          <form v-else class="application-form" @submit.prevent="submit">
            <div class="form-heading">
              <span>01</span>
              <div><h2 id="application-form-title">{{ t.companySection }}</h2><p>{{ t.requiredNote }}</p></div>
            </div>
            <div class="form-grid">
              <div class="form-field form-field--wide">
                <label for="carrier-name">{{ t.name }}</label>
                <input id="carrier-name" v-model.trim="form.name" type="text" autocomplete="organization" required />
              </div>
              <div class="form-field">
                <label for="carrier-email">{{ t.email }}</label>
                <input id="carrier-email" v-model.trim="form.email" type="email" autocomplete="email" required />
              </div>
              <div class="form-field">
                <label for="carrier-phone">{{ t.phone }}</label>
                <input id="carrier-phone" v-model.trim="form.phone" type="tel" autocomplete="tel" required />
              </div>
              <div class="form-field form-field--wide">
                <label for="carrier-city">{{ t.city }}</label>
                <input id="carrier-city" v-model.trim="form.city" type="text" autocomplete="address-level2" required />
                <small>{{ t.cityHelp }}</small>
              </div>
            </div>

            <div class="form-divider"></div>
            <div class="form-heading">
              <span>02</span>
              <div><h2>{{ t.ratesSection }}</h2><p>{{ t.ratesHelp }}</p></div>
            </div>
            <fieldset class="rates-fieldset">
              <legend>{{ t.fixedRatesTitle }}</legend>
              <p class="rates-fieldset__help">{{ t.fixedRatesHelp }}</p>
              <div class="routes">
                <div v-for="(route, index) in form.routes" :key="index" class="route-row">
                  <div class="form-field">
                    <label :for="`route-from-${index}`">{{ t.fixedFrom }}</label>
                    <input :id="`route-from-${index}`" v-model.trim="route.from" type="text" :placeholder="t.fromPlaceholder" />
                  </div>
                  <div class="form-field">
                    <label :for="`route-to-${index}`">{{ t.fixedTo }}</label>
                    <input :id="`route-to-${index}`" v-model.trim="route.to" type="text" :placeholder="t.toPlaceholder" />
                  </div>
                  <div class="form-field route-row__price">
                    <label :for="`route-price-${index}`">{{ t.fixedPrice }}</label>
                    <input :id="`route-price-${index}`" v-model.trim="route.price" type="number" min="0" step="0.01" inputmode="decimal" />
                  </div>
                  <div class="form-field route-row__currency">
                    <label :for="`route-currency-${index}`">{{ t.fixedCurrency }}</label>
                    <input :id="`route-currency-${index}`" v-model.trim="route.currency" type="text" maxlength="3" placeholder="EUR" />
                  </div>
                  <button type="button" class="route-remove" :aria-label="t.removeRoute" @click="removeRoute(index)">×</button>
                </div>
                <button class="route-add" type="button" @click="addRoute">+ {{ t.addRoute }}</button>
              </div>
            </fieldset>
            <div class="form-field distance-rate">
              <label for="carrier-per-km">{{ t.routesPerKm }}</label>
              <input id="carrier-per-km" v-model.trim="form.perkm" type="text" :placeholder="t.perKmPlaceholder" />
              <small>{{ t.perKmHelp }}</small>
            </div>

            <div class="form-divider"></div>
            <div class="form-heading">
              <span>03</span>
              <div><h2>{{ t.detailsSection }}</h2><p>{{ t.detailsHelp }}</p></div>
            </div>
            <div class="form-field">
              <label for="carrier-comment">{{ t.comment }}</label>
              <textarea id="carrier-comment" v-model.trim="form.comment" rows="5" :placeholder="t.commentPlaceholder"></textarea>
            </div>
            <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
            <div class="form-submit">
              <button class="drivers-button" type="submit" :disabled="submitting">{{ submitting ? t.submitting : t.submit }}</button>
              <p>{{ t.consent }}</p>
            </div>
          </form>
        </section>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  layout: 'default',
  head() {
    return {
      title: `${this.t.title} | Riderra`,
      meta: [{ hid: 'description', name: 'description', content: this.t.lead }]
    }
  },
  data() {
    return { sent: false, submitting: false, errorMessage: '', form: this.emptyForm() }
  },
  computed: {
    lang() { return this.$store.state.language },
    t() {
      const dict = {
        ru: {
          eyebrow: 'Транспортным компаниям', title: 'Станьте перевозчиком Riderra',
          lead: 'Получайте заказы на аэропортовые и городские трансферы от Riderra и наших партнёров. Вы сами указываете географию, автопарк и нетто-тарифы.',
          startButton: 'Заполнить заявку', loginButton: 'Войти в кабинет', processTitle: 'Как начать работу',
          steps: [
            { title: 'Расскажите о компании', text: 'Контакты и регионы работы.' },
            { title: 'Предложите тарифы', text: 'Фиксированные маршруты или цена за километр.' },
            { title: 'Согласуем условия', text: 'Проверим данные и свяжемся с вами.' }
          ],
          applicationEyebrow: 'Заявка перевозчика', applicationTitle: 'Один шаг до знакомства',
          applicationText: 'Заполните только то, что уже известно. Тарифы можно уточнить вместе с менеджером после заявки.',
          wikiButton: 'Правила работы с Riderra', alreadyRegistered: 'Уже зарегистрированы? Войти',
          successEyebrow: 'Заявка отправлена', successTitle: 'Спасибо за интерес к Riderra',
          companySection: 'Компания и контакты', requiredNote: 'Поля со звёздочкой обязательны.',
          name: 'Название компании / ваше имя *', email: 'Рабочий email *', phone: 'Телефон или WhatsApp *',
          city: 'Города и регионы работы *', cityHelp: 'Например: Los Angeles, Orange County, LAX.',
          ratesSection: 'Нетто-тарифы', ratesHelp: 'Можно указать фиксированные маршруты, ставку за километр или оба варианта.',
          fixedRatesTitle: 'Фиксированные маршруты', fixedRatesHelp: 'Цена перевозчика за трансфер в одну сторону.',
          fixedFrom: 'Откуда', fixedTo: 'Куда', fixedPrice: 'Цена', fixedCurrency: 'Валюта',
          fromPlaceholder: 'LAX Airport', toPlaceholder: 'Downtown LA', addRoute: 'Добавить маршрут', removeRoute: 'Удалить маршрут',
          routesPerKm: 'Ставка за километр', perKmPlaceholder: 'Например, 1.20 EUR/km', perKmHelp: 'Если работаете только по фиксированным ценам, оставьте поле пустым.',
          detailsSection: 'Автопарк и условия', detailsHelp: 'Эти данные помогут быстрее проверить заявку.',
          comment: 'Комментарий', commentPlaceholder: 'Количество и классы машин, вместимость, лицензии, аэропортовые разрешения, условия ожидания и другие важные детали.',
          submit: 'Отправить заявку', submitting: 'Отправляем…', consent: 'Отправляя заявку, вы разрешаете Riderra связаться с вами по вопросам сотрудничества.',
          note: 'Мы получили ваши данные и свяжемся с вами, чтобы проверить географию, автомобили и тарифы.',
          error: 'Не удалось отправить заявку. Проверьте данные и попробуйте ещё раз.'
        },
        en: {
          eyebrow: 'For transport companies', title: 'Become a Riderra fleet partner',
          lead: 'Receive airport and city transfer requests from Riderra and our partners. You choose your service area, fleet and net rates.',
          startButton: 'Complete the application', loginButton: 'Partner login', processTitle: 'How to get started',
          steps: [
            { title: 'Tell us about your company', text: 'Contacts and operating regions.' },
            { title: 'Share your rates', text: 'Fixed routes or a per-kilometre rate.' },
            { title: 'Agree the terms', text: 'We review the details and contact you.' }
          ],
          applicationEyebrow: 'Fleet partner application', applicationTitle: 'Let’s get acquainted',
          applicationText: 'Share what you already know. Rates can be clarified with a manager after you apply.',
          wikiButton: 'How working with Riderra works', alreadyRegistered: 'Already registered? Log in',
          successEyebrow: 'Application sent', successTitle: 'Thank you for your interest in Riderra',
          companySection: 'Company and contact details', requiredNote: 'Fields marked with an asterisk are required.',
          name: 'Company name / your name *', email: 'Business email *', phone: 'Phone or WhatsApp *',
          city: 'Cities and operating regions *', cityHelp: 'For example: Los Angeles, Orange County, LAX.',
          ratesSection: 'Your net rates', ratesHelp: 'Add fixed routes, a per-kilometre rate, or both.',
          fixedRatesTitle: 'Fixed routes', fixedRatesHelp: 'Your one-way net transfer price.',
          fixedFrom: 'From', fixedTo: 'To', fixedPrice: 'Price', fixedCurrency: 'Currency',
          fromPlaceholder: 'LAX Airport', toPlaceholder: 'Downtown LA', addRoute: 'Add another route', removeRoute: 'Remove route',
          routesPerKm: 'Rate per kilometre', perKmPlaceholder: 'For example, 1.20 EUR/km', perKmHelp: 'Leave this blank if you only use fixed prices.',
          detailsSection: 'Fleet and operating terms', detailsHelp: 'This information helps us review your application faster.',
          comment: 'Additional information', commentPlaceholder: 'Fleet size, vehicle classes and capacity, licences, airport permits, waiting terms and anything else we should know.',
          submit: 'Send application', submitting: 'Sending…', consent: 'By submitting, you allow Riderra to contact you about a potential partnership.',
          note: 'We have received your details and will contact you to review your coverage, vehicles and rates.',
          error: 'We could not send the application. Please check the details and try again.'
        }
      }
      return dict[this.lang] || dict.en
    },
    wikiPath() { return this.lang === 'en' ? '/vendor-wiki' : `/${this.lang}/vendor-wiki` }
  },
  methods: {
    emptyForm() {
      return {
        name: '', email: '', phone: '', city: '',
        routes: [{ from: '', to: '', price: '', currency: '' }],
        perkm: '', comment: '', commissionRate: 15
      }
    },
    normalizedRoutes() { return this.form.routes.filter(route => route.from || route.to || route.price || route.currency) },
    async submit() {
      this.submitting = true
      this.errorMessage = ''
      const routes = this.normalizedRoutes()
      try {
        const response = await this.$axios.$post('/api/drivers', {
          name: this.form.name, email: this.form.email, phone: this.form.phone, city: this.form.city,
          pricePerKm: this.form.perkm, fixedRoutesJson: JSON.stringify(routes), routes,
          comment: this.form.comment, lang: this.lang, commissionRate: this.form.commissionRate
        })
        if (!response || response.success === false) throw new Error('Application was not accepted')
        this.sent = true
        this.form = this.emptyForm()
        if (process.browser) window.scrollTo({ top: document.querySelector('#carrier-application').offsetTop - 90, behavior: 'smooth' })
      } catch (error) {
        console.error('Error submitting carrier application:', error)
        this.errorMessage = this.t.error
      } finally {
        this.submitting = false
      }
    },
    addRoute() { this.form.routes.push({ from: '', to: '', price: '', currency: '' }) },
    removeRoute(index) {
      this.form.routes.splice(index, 1)
      if (!this.form.routes.length) this.addRoute()
    }
  }
}
</script>

<style scoped lang="scss">
.drivers-page {
  --drivers-navy: #101b3f;
  --drivers-blue: #2f80ed;
  --drivers-ink: #17233d;
  --drivers-muted: #5d6981;
  --drivers-line: #dfe5ef;
  --drivers-soft: #f4f7fb;
  color: var(--drivers-ink);
  background: var(--drivers-soft);
}
.drivers-hero { padding: 168px 0 76px; color: #fff; background: #101827; }
.drivers-hero__inner { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(320px, .75fr); gap: 72px; align-items: center; }
.drivers-hero__inner::before, .drivers-hero__inner::after, .drivers-layout::before, .drivers-layout::after { display: none; }
.drivers-eyebrow { margin: 0 0 16px; color: #a8c8ff; font-size: 13px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.drivers-eyebrow--dark { color: var(--drivers-blue); }
.drivers-hero h1 { max-width: 760px; margin: 0; color: #fff; font-size: clamp(42px, 5.4vw, 68px); line-height: 1.03; letter-spacing: -.035em; }
.drivers-hero__lead { max-width: 720px; margin: 24px 0 0; color: rgba(255, 255, 255, .78); font-size: 18px; line-height: 1.7; }
.drivers-hero__actions { display: flex; flex-wrap: wrap; gap: 20px; align-items: center; margin-top: 32px; }
.drivers-button { display: inline-flex; min-height: 50px; align-items: center; justify-content: center; padding: 0 22px; color: #fff; background: var(--drivers-navy); border: 0; border-radius: 6px; font: inherit; font-size: 14px; font-weight: 800; text-decoration: none; cursor: pointer; transition: background .2s ease, transform .2s ease; }
.drivers-button:hover, .drivers-button:focus-visible { background: #192b5f; outline: 3px solid rgba(47, 128, 237, .24); }
.drivers-button:disabled { opacity: .6; cursor: wait; }
.drivers-button--light { color: var(--drivers-navy); background: #fff; }
.drivers-button--light:hover, .drivers-button--light:focus-visible { color: var(--drivers-navy); background: #eef5ff; }
.drivers-link { color: var(--drivers-blue); font-size: 14px; font-weight: 700; text-decoration: none; }
.drivers-link:hover, .drivers-link:focus-visible { text-decoration: underline; outline: none; }
.drivers-link--hero { color: #fff; }
.drivers-steps { margin: 0; padding: 26px 28px; background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .14); border-radius: 8px; list-style: none; }
.drivers-steps li { display: flex; gap: 16px; align-items: flex-start; }
.drivers-steps li + li { margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, .12); }
.drivers-steps__number { display: inline-flex; width: 28px; height: 28px; flex: 0 0 28px; align-items: center; justify-content: center; color: var(--drivers-navy); background: #fff; border-radius: 50%; font-size: 12px; font-weight: 800; }
.drivers-steps strong { display: block; color: #fff; font-size: 15px; }
.drivers-steps p { margin: 6px 0 0; color: rgba(255, 255, 255, .68); font-size: 13px; line-height: 1.55; }
.drivers-content { padding: 72px 0 92px; }
.drivers-layout { display: grid; grid-template-columns: minmax(230px, 320px) minmax(0, 820px); gap: 64px; align-items: start; }
.drivers-aside { position: sticky; top: 112px; }
.drivers-aside h2 { margin: 0; color: var(--drivers-navy); font-size: 30px; line-height: 1.2; letter-spacing: -.02em; }
.drivers-aside > p:not(.drivers-eyebrow) { margin: 18px 0 0; color: var(--drivers-muted); font-size: 15px; line-height: 1.7; }
.drivers-aside__links { display: flex; flex-direction: column; gap: 14px; margin-top: 28px; }
.application-card { min-width: 0; padding: 38px 40px 42px; background: #fff; border: 1px solid var(--drivers-line); border-radius: 8px; box-shadow: 0 16px 48px rgba(23, 35, 61, .07); }
.form-heading { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 24px; }
.form-heading > span { margin-top: 4px; color: var(--drivers-blue); font-size: 12px; font-weight: 800; letter-spacing: .08em; }
.form-heading h2 { margin: 0; color: var(--drivers-navy); font-size: 23px; line-height: 1.25; }
.form-heading p { margin: 5px 0 0; color: var(--drivers-muted); font-size: 13px; line-height: 1.5; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.form-field--wide { grid-column: 1 / -1; }
.form-field label { display: block; margin-bottom: 8px; color: var(--drivers-ink); font-size: 13px; font-weight: 700; }
.form-field input, .form-field textarea { width: 100%; min-height: 46px; padding: 11px 13px; color: var(--drivers-ink); background: #fff; border: 1px solid #cbd4e3; border-radius: 6px; font: inherit; font-size: 14px; transition: border-color .2s ease, box-shadow .2s ease; }
.form-field textarea { resize: vertical; line-height: 1.55; }
.form-field input:focus, .form-field textarea:focus { border-color: var(--drivers-blue); box-shadow: 0 0 0 3px rgba(47, 128, 237, .14); outline: none; }
.form-field input::placeholder, .form-field textarea::placeholder { color: #9ba7ba; }
.form-field small { display: block; margin-top: 7px; color: var(--drivers-muted); font-size: 12px; line-height: 1.45; }
.form-divider { height: 1px; margin: 36px 0; background: var(--drivers-line); }
.rates-fieldset { margin: 0; padding: 0; border: 0; }
.rates-fieldset legend { padding: 0; color: var(--drivers-ink); font-size: 14px; font-weight: 800; }
.rates-fieldset__help { margin: 6px 0 18px; color: var(--drivers-muted); font-size: 12px; line-height: 1.5; }
.routes { display: flex; flex-direction: column; gap: 14px; }
.route-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 96px 78px 36px; gap: 10px; align-items: end; }
.route-remove { width: 36px; height: 46px; padding: 0; color: #68758d; background: #f6f8fb; border: 1px solid var(--drivers-line); border-radius: 6px; font-size: 22px; cursor: pointer; }
.route-remove:hover, .route-remove:focus-visible { color: #a92e3a; background: #fff3f4; border-color: #e7b8bd; outline: none; }
.route-add { align-self: flex-start; min-height: 40px; padding: 0; color: var(--drivers-blue); background: transparent; border: 0; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
.route-add:hover, .route-add:focus-visible { text-decoration: underline; outline: none; }
.distance-rate { max-width: 360px; margin-top: 26px; }
.form-error { margin: 24px 0 0; padding: 13px 15px; color: #8b2530; background: #fff1f2; border-radius: 6px; font-size: 13px; line-height: 1.5; }
.form-submit { display: flex; gap: 20px; align-items: center; margin-top: 28px; }
.form-submit p { max-width: 380px; margin: 0; color: var(--drivers-muted); font-size: 11px; line-height: 1.55; }
.application-success { max-width: 560px; padding: 28px 8px; }
.application-success__mark { display: inline-flex; width: 48px; height: 48px; align-items: center; justify-content: center; margin-bottom: 24px; color: #fff; background: var(--drivers-blue); border-radius: 50%; font-size: 24px; font-weight: 800; }
.application-success h2 { margin: 0; color: var(--drivers-navy); font-size: 30px; line-height: 1.2; }
.application-success > p:not(.drivers-eyebrow) { margin: 18px 0 28px; color: var(--drivers-muted); font-size: 15px; line-height: 1.7; }
@media (max-width: 1024px) {
  .drivers-hero { padding-top: 144px; }
  .drivers-hero__inner { gap: 42px; }
  .drivers-layout { grid-template-columns: 1fr; gap: 34px; }
  .drivers-aside { position: static; max-width: 680px; }
}
@media (max-width: 767px) {
  .drivers-hero { padding: 116px 0 52px; }
  .drivers-hero__inner { grid-template-columns: 1fr; gap: 36px; }
  .drivers-hero h1 { font-size: 40px; }
  .drivers-hero__lead { font-size: 16px; }
  .drivers-content { padding: 42px 0 60px; }
  .application-card { padding: 28px 20px 32px; }
  .form-grid { grid-template-columns: 1fr; }
  .form-field--wide { grid-column: auto; }
  .route-row { grid-template-columns: 1fr 1fr; padding: 16px; background: var(--drivers-soft); border-radius: 8px; }
  .route-remove { grid-column: 2; justify-self: end; height: 36px; }
  .form-submit { align-items: flex-start; flex-direction: column; }
  .form-submit .drivers-button { width: 100%; }
}
@media (max-width: 480px) {
  .drivers-hero h1 { font-size: 35px; }
  .drivers-hero__actions { align-items: stretch; flex-direction: column; }
  .drivers-button--light { width: 100%; }
  .drivers-link--hero { align-self: center; }
  .drivers-steps { padding: 22px 20px; }
  .route-row { grid-template-columns: 1fr; }
  .route-remove { grid-column: 1; }
}
</style>
