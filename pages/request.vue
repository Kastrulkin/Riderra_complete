<template>
  <div>
    <section class="site-section site-section--pf request-section">
      <div class="container">
        <h1 class="h2 request-title">{{ t.title }}</h1>

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
          <div class="form__row grid">
            <div>
              <label class="form__label">{{ t.from }}</label>
              <input class="form__input" v-model="form.from" type="text" required />
            </div>
            <div>
              <label class="form__label">{{ t.to }}</label>
              <input class="form__input" v-model="form.to" type="text" required />
            </div>
          </div>
          <div class="form__row grid">
            <div>
              <label class="form__label">{{ t.date }}</label>
              <input class="form__input" v-model="form.date" type="date" />
            </div>
            <div>
              <label class="form__label">{{ t.time }}</label>
              <input class="form__input" v-model="form.time" type="time" />
            </div>
          </div>
          <div class="form__row grid">
            <div>
              <label class="form__label">{{ t.passengers }}</label>
              <input class="form__input" v-model.number="form.pax" type="number" min="1" />
            </div>
            <div>
              <label class="form__label">{{ t.luggage }}</label>
              <input class="form__input" v-model.number="form.luggage" type="number" min="0" />
            </div>
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
  computed: {
    lang(){ return this.$store.state.language },
    t(){
      const dict = {
        ru: {
          title: 'Заявка для водителя',
          name: 'Ваше имя', email: 'Email', phone: 'Телефон',
          from: 'Откуда', to: 'Куда', date: 'Дата', time: 'Время',
          passengers: 'Пассажиры', luggage: 'Багаж (мест)', comment: 'Комментарий',
          submit: 'Отправить заявку', save: 'Сохранить в базе',
          note: 'Мы открыли ваше почтовое приложение с подготовленным письмом. Просто отправьте его.'
        },
        en: {
          title: 'Request for driver',
          name: 'Your name', email: 'Email', phone: 'Phone',
          from: 'From', to: 'To', date: 'Date', time: 'Time',
          passengers: 'Passengers', luggage: 'Luggage (pcs)', comment: 'Comment',
          submit: 'Send request', save: 'Save to DB',
          note: 'We opened your mail app with a prepared email. Just send it.'
        }
      }
      return dict[this.lang]
    }
  },
  data(){
    return {
      sent: false,
      form: { name: '', email: '', phone: '', from: '', to: '', date: '', time: '', pax: 1, luggage: 0, comment: '' }
    }
  },
  methods: {
    submit(){
      const subject = encodeURIComponent(`[Riderra] ${this.lang==='ru'?'Заявка для водителя':'Driver request'}`)
      const body = encodeURIComponent(
        `Name: ${this.form.name}\nEmail: ${this.form.email}\nPhone: ${this.form.phone}\nFrom: ${this.form.from}\nTo: ${this.form.to}\nDate: ${this.form.date} ${this.form.time}\nPassengers: ${this.form.pax}\nLuggage: ${this.form.luggage}\nComment: ${this.form.comment}`
      )
      window.location.href = `mailto:info@riderra.com?subject=${subject}&body=${body}`
      this.sent = true
    },
    async saveToSupabase(){
      // Fallback to own backend if Supabase not configured
      if(!this.$supabase){
        await this.$axios.$post('/api/requests', {
          name: this.form.name, email: this.form.email, phone: this.form.phone,
          fromPoint: this.form.from, toPoint: this.form.to,
          date: this.form.date, passengers: this.form.pax, luggage: this.form.luggage,
          comment: this.form.comment, lang: this.lang
        })
        this.sent = true
        return
      }
      await this.$supabase.from('requests').insert({
        name: this.form.name, email: this.form.email, phone: this.form.phone,
        from_point: this.form.from, to_point: this.form.to,
        date: this.form.date, time: this.form.time,
        passengers: this.form.pax, luggage: this.form.luggage,
        comment: this.form.comment,
        lang: this.lang
      })
      this.sent = true
    }
  }
}
</script>

<style scoped lang="scss">
.request-section { padding-top: 160px; padding-bottom: 40px; }
.request-title { margin-bottom: 20px; }
.form { max-width: 720px; }
.form__row { margin-bottom: 16px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form__label { display:block; margin-bottom: 6px; font-size: 14px; }
.form__input { width:100%; border:1px solid #D8D8E6; border-radius:6px; padding:10px 12px; font-size:14px; }
.form__actions { margin-top: 20px; }
.btn { background:#1F2E4D; color:#FFFFFF; border:0; border-radius:6px; line-height:48px; padding:0 22px; cursor:pointer; font-weight:600; font-size:16px; transition: background .2s ease; }
.btn:hover { background:#19253E; }
.btn--ghost { background: transparent; color:#1F2E4D; border:1px solid #1F2E4D; margin-left: 8px; }
.btn--ghost:hover { background: rgba(31,46,77,0.08); }
.note { margin-top: 12px; color:#7D7D7D; }

@media (max-width: 1024px){ .request-section{ padding-top: 130px; } }
@media (max-width: 767px){ .request-section{ padding-top: 110px; } .grid{ grid-template-columns: 1fr; } }
</style>


