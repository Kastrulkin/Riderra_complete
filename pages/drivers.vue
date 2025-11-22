<template>
  <div>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf drivers-section">
      <div class="container">
        <!-- Секция авторизации перевозчика -->
        <div class="auth-section">
          <div class="auth-card">
            <h3 class="auth-title">{{ t.authTitle }}</h3>
            <p class="auth-subtitle">{{ t.authSubtitle }}</p>
            <div class="auth-actions">
              <nuxt-link to="/driver-login" class="btn btn--primary">{{ t.loginButton }}</nuxt-link>
            </div>
          </div>
        </div>

        <h1 class="h2 drivers-title">{{ t.title }}</h1>

        <form class="form" @submit.prevent="submit">
          <div class="form__row">
            <label class="form__label">{{ t.name }}</label>
            <input class="form__input" v-model="form.name" type="text" required />
          </div>
          <div class="form__row grid">
            <div>
              <label class="form__label">{{ t.email }}</label>
              <input class="form__input" v-model="form.email" type="email" required />
            </div>
            <div>
              <label class="form__label">{{ t.phone }}</label>
              <input class="form__input" v-model="form.phone" type="tel" required />
            </div>
          </div>

          <div class="form__row">
            <label class="form__label">{{ t.city }}</label>
            <input class="form__input" v-model="form.city" type="text" required />
          </div>

          <div class="routes">
            <div class="routes__head">
              <div class="routes__th">{{ t.fixedFrom }}</div>
              <div class="routes__th">{{ t.fixedTo }}</div>
              <div class="routes__th">{{ t.fixedPrice }}</div>
              <div class="routes__th">{{ t.fixedCurrency }}</div>
              <div class="routes__th"></div>
            </div>
            <div class="routes__row" v-for="(r, idx) in form.routes" :key="idx">
              <input class="routes__input" v-model="r.from" />
              <input class="routes__input" v-model="r.to" />
              <input class="routes__input routes__input--sm" v-model="r.price" />
              <input class="routes__input routes__input--sm" v-model="r.currency" />
              <button type="button" class="btn btn--icon" @click="removeRoute(idx)" aria-label="remove">−</button>
            </div>
            <button class="btn btn--ghost" type="button" @click="addRoute">+ {{ t.addRoute }}</button>
          </div>
          <div class="form__row">
            <label class="form__label">{{ t.routesPerKm }}</label>
            <textarea class="form__input" v-model="form.perkm" rows="3" placeholder="1.2 €/km"></textarea>
          </div>
          
          <div class="form__row">
            <label class="form__label">{{ t.commissionRate }}</label>
            <div class="commission-input">
              <input class="form__input" v-model="form.commissionRate" type="number" min="5" max="30" step="0.1" />
              <span class="commission-suffix">%</span>
            </div>
            <small class="form__help">{{ t.commissionHelp }}</small>
          </div>
          <div class="form__row">
            <label class="form__label">{{ t.comment }}</label>
            <textarea class="form__input" v-model="form.comment" rows="4"></textarea>
          </div>
          <div class="form__actions">
            <button class="btn" type="submit">{{ t.submit }}</button>
            <button v-if="$supabase" class="btn btn--ghost" type="button" @click="saveToSupabase">{{ t.save }}</button>
          </div>
        </form>

        <p v-if="sent" class="note">{{ t.note }}</p>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  layout: 'default',
  computed: {
    lang(){ return this.$store.state.language },
    t(){
      const dict = {
        ru: {
          title: 'Заявление на регистрацию перевозчика',
          authTitle: 'Авторизация перевозчика',
          authSubtitle: 'Уже зарегистрированы? Войдите в свой кабинет для управления заказами и маршрутами.',
          loginButton: 'Войти в кабинет',
          registerButton: 'Регистрация',
          name: 'Ваше имя / компания', email: 'Email', phone: 'Телефон', city: 'Город / регион работы',
          fixedFrom: 'Откуда (фиксированный маршрут)', fixedTo: 'Куда (фиксированный маршрут)', fixedPrice: 'Цена', fixedCurrency: 'Валюта', routesPerKm: 'Цена за километр', comment: 'Комментарий',
          commissionRate: 'Комиссия, которую готовы платить', commissionHelp: 'Поставьте комиссию от 5%, сколько вы готовы платить сервису за заказы - чем выше, тем больше заказов будет',
          submit: 'Регистрация', save: 'Сохранить в базе',
          note: 'Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в ближайшее время.'
        },
        en: {
          title: 'Driver registration',
          authTitle: 'Driver Authorization',
          authSubtitle: 'Already registered? Log in to your dashboard to manage orders and routes.',
          loginButton: 'Login to Dashboard',
          registerButton: 'Registration',
          name: 'Your name / company', email: 'Email', phone: 'Phone', city: 'City / operating region',
          fixedFrom: 'From (fixed route)', fixedTo: 'To (fixed route)', fixedPrice: 'Price', fixedCurrency: 'Currency', routesPerKm: 'Price per kilometer', comment: 'Comment',
          commissionRate: 'Commission rate you are willing to pay', commissionHelp: 'Set commission from 5%, how much you are willing to pay the service for orders - the higher, the more orders you will get',
          submit: 'Registration', save: 'Save to DB',
          note: 'Thank you! Your application has been sent. We will contact you soon.'
        }
      }
      return dict[this.lang]
    }
  },
  data(){
    return {
      sent: false,
      form: { 
        name: '', email: '', phone: '', city: '', 
        routes: [{ from: '', to: '', price: '', currency: '' }], 
        perkm: '', comment: '', commissionRate: 15.0 
      }
    }
  },
  methods: {
    async submit(){
      try {
        const response = await this.$axios.$post('/api/drivers', {
          name: this.form.name,
          email: this.form.email,
          phone: this.form.phone,
          city: this.form.city,
          pricePerKm: this.form.perkm,
          fixedRoutesJson: JSON.stringify(this.form.routes),
          routes: this.form.routes,
          comment: this.form.comment,
          lang: this.lang,
          commissionRate: parseFloat(this.form.commissionRate)
        })
        
        if (response.success) {
      this.sent = true
          // Очищаем форму после успешной отправки
          this.form = {
            name: '', email: '', phone: '', city: '',
            routes: [{ from: '', to: '', price: '', currency: '' }],
            perkm: '', comment: '', commissionRate: 15.0
          }
        }
      } catch (error) {
        console.error('Error submitting form:', error)
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
        console.error('Error details:', errorMessage)
        alert(this.lang === 'ru' 
          ? `Ошибка при отправке заявки: ${errorMessage}. Попробуйте позже.` 
          : `Error submitting form: ${errorMessage}. Please try again later.`)
      }
    },
    async saveToSupabase(){
      if(!this.$supabase){
        await this.$axios.$post('/api/drivers', {
          name: this.form.name, email: this.form.email, phone: this.form.phone,
          city: this.form.city, pricePerKm: this.form.perkm,
          fixedRoutesJson: JSON.stringify(this.form.routes),
          comment: this.form.comment, lang: this.lang,
          commissionRate: parseFloat(this.form.commissionRate)
        })
        this.sent = true; return
      }
      await this.$supabase.from('drivers').insert({
        name: this.form.name, email: this.form.email, phone: this.form.phone,
        city: this.form.city, price_per_km: this.form.perkm,
        fixedRoutesJson: JSON.stringify(this.form.routes),
        comment: this.form.comment, lang: this.lang,
        commissionRate: parseFloat(this.form.commissionRate)
      })
      this.sent = true
    }
  ,
    addRoute(){
      this.form.routes.push({ from: '', to: '', price: '', currency: '' })
    },
    removeRoute(idx){
      this.form.routes.splice(idx, 1)
      if(this.form.routes.length === 0){
        this.form.routes.push({ from: '', to: '', price: '', currency: '' })
      }
    }
  }
}
</script>

<style scoped lang="scss">
.drivers-section { 
  padding-top: 160px; 
  padding-bottom: 40px; 
  position: relative;
  z-index: 10;
  color: #fff;
}
.drivers-title { 
  margin-bottom: 20px; 
  color: #fff;
}

/* Стили для секции авторизации */
.auth-section {
  margin-bottom: 40px;
  display: flex;
  justify-content: flex-end;
}

.auth-card {
  background: rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 32px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  max-width: 500px;
  margin: 0;
}

.auth-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12px;
  text-align: center;
}

.auth-subtitle {
  font-size: 16px;
  color: rgba(255,255,255,0.8);
  margin-bottom: 24px;
  text-align: center;
  line-height: 1.5;
}

.auth-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.auth-actions .btn {
  min-width: 160px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
}

.btn--primary {
  background: #007bff;
  color: #fff;
  border: none;
}

.btn--primary:hover {
  background: #0056b3;
  color: #fff;
}
.form { max-width: 720px; }
.form__row { margin-bottom: 24px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
.form__label { 
  display:block; 
  margin-bottom: 6px; 
  font-size: 14px; 
  color: #fff;
}
.form__input { 
  width:100%; 
  border:1px solid rgba(255,255,255,0.3); 
  border-radius:6px; 
  padding:10px 12px; 
  font-size:14px; 
  background: rgba(255,255,255,0.1);
  color: #fff;
  backdrop-filter: blur(10px);
}
.form__input::placeholder {
  color: rgba(255,255,255,0.7);
}
.form__actions { margin-top: 20px; }
.btn { background:#1F2E4D; color:#FFFFFF; border:0; border-radius:6px; line-height:48px; padding:0 22px; cursor:pointer; font-weight:600; font-size:16px; transition: background .2s ease; }
.btn:hover { background:#19253E; }
.btn--ghost { 
  background: transparent; 
  color:#fff; 
  border:1px solid #fff; 
  margin-left: 8px; 
}
.btn--ghost:hover { 
  background: rgba(255,255,255,0.1); 
  color: #fff;
}
.routes { margin-top: 6px; margin-bottom: 10px; }
.routes__head { 
  display:grid; 
  grid-template-columns: 2fr 2fr 1fr 1fr auto; 
  gap: 8px; 
  font-size:12px; 
  color:rgba(255,255,255,0.7); 
  margin-bottom: 6px; 
}
.routes__th { }
.routes__row { 
  display: grid; 
  grid-template-columns: 2fr 2fr 1fr 1fr auto; 
  gap: 8px; 
  margin-bottom: 8px; 
  align-items: center; 
}
.routes__input { 
  width: 100%; 
  border:1px solid rgba(255,255,255,0.3); 
  border-radius:6px; 
  padding:8px 10px; 
  background: rgba(255,255,255,0.1);
  color: #fff;
  backdrop-filter: blur(10px);
}
.routes__input--sm { max-width: 120px; }
.btn--icon { 
  width: 36px; 
  height: 36px; 
  border-radius: 18px; 
  padding: 0; 
  line-height: 36px; 
  text-align: center; 
  background: transparent; 
  color:#fff; 
  border:1px solid #fff; 
}

/* Стили для поля комиссии */
.commission-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.commission-input .form__input {
  max-width: 120px;
}

.commission-suffix {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.form__help {
  display: block;
  margin-top: 4px;
  color: rgba(255,255,255,0.7);
  font-size: 12px;
  line-height: 1.4;
}
@media (max-width: 767px){ .routes__row{ grid-template-columns: 1fr 1fr; } }
.note { 
  margin-top: 12px; 
  color:rgba(255,255,255,0.7); 
}
@media (max-width: 1024px){ 
  .drivers-section{ padding-top: 130px; } 
  .auth-card {
    padding: 24px;
  }
}
@media (max-width: 767px){ 
  .drivers-section{ padding-top: 110px; } 
  .grid{ grid-template-columns: 1fr; } 
  .auth-section {
    justify-content: center;
  }
  
  .auth-card {
    padding: 20px;
    margin: 0 16px;
  }
  .auth-actions {
    justify-content: center;
  }
  .auth-actions .btn {
    width: 100%;
    max-width: 280px;
  }
}

/* Фон страницы как на главной */
.page-background {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
}

.page-background__gradient {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a237e 0%, #0d1421 50%, #000000 100%);
  z-index: 1;
}

.page-background__overlay {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  height: 200vh;
  width: 35vh;
  background: linear-gradient(180deg, rgba(255, 80, 41, 0.256) 0%, rgba(229, 0, 109, 0.8) 52.49%, rgba(112, 34, 131, 0.8) 64.64%);
  filter: blur(100px);
  transform: matrix(0.58, 1, -0.63, 0.64, 0, 0) translate3d(-120%, -40%, 0);
  z-index: 3;
}
</style>


