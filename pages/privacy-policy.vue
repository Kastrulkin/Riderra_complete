<template>
  <section class="policy-page">
    <div class="container policy-page__container">
      <div class="policy-page__card">
        <p class="policy-page__eyebrow">Riderra</p>
        <h1 class="policy-page__title">
          {{ isRu ? 'Политика конфиденциальности' : 'Privacy Policy' }}
        </h1>

        <p class="policy-page__updated">
          {{ isRu ? 'Дата обновления: 13 апреля 2026' : 'Last updated: April 13, 2026' }}
        </p>

        <div class="policy-page__content">
          <template v-if="isRu">
            <p>
              Riderra уважает конфиденциальность клиентов, пассажиров, водителей, партнеров и
              сотрудников. Эта страница объясняет, какие данные мы собираем, зачем мы их
              используем и как с ними работаем.
            </p>

            <h2>1. Какие данные мы собираем</h2>
            <p>
              Мы можем обрабатывать имя, номер телефона, адрес электронной почты, детали поездки,
              маршрут, дату и время трансфера, информацию о рейсе, платежные и договорные данные,
              а также переписку по заказу и служебные комментарии.
            </p>

            <h2>2. Для чего мы используем данные</h2>
            <p>
              Данные используются для обработки заявок, организации трансферов, связи с клиентом,
              подбора водителя, контроля качества сервиса, финансовых сверок, предотвращения
              ошибок и исполнения юридических обязательств.
            </p>

            <h2>3. С кем мы можем делиться данными</h2>
            <p>
              Мы передаем только необходимый минимум данных исполнителям поездок, диспетчерским
              системам, платежным и техническим провайдерам, если это требуется для выполнения
              заказа или работы сервиса.
            </p>

            <h2>4. Хранение и защита</h2>
            <p>
              Riderra применяет организационные и технические меры защиты для ограничения доступа
              к данным, их утраты, несанкционированного изменения или раскрытия. Доступ к рабочим
              данным предоставляется только уполномоченным сотрудникам и подрядчикам.
            </p>

            <h2>5. Ваши права</h2>
            <p>
              Вы можете запросить уточнение, обновление или удаление персональных данных, если это
              не противоречит договорным, бухгалтерским или иным обязательствам по хранению
              информации.
            </p>

            <h2>6. Контакты</h2>
            <p>
              По вопросам обработки данных и конфиденциальности можно написать на
              <a href="mailto:info@riderra.com">info@riderra.com</a>.
            </p>
          </template>

          <template v-else>
            <p>
              Riderra respects the privacy of customers, passengers, drivers, partners, and staff.
              This page explains what data we collect, why we use it, and how we handle it.
            </p>

            <h2>1. Data we collect</h2>
            <p>
              We may process names, phone numbers, email addresses, trip details, routes, transfer
              date and time, flight information, payment and contract data, order-related
              communications, and operational notes.
            </p>

            <h2>2. Why we use the data</h2>
            <p>
              We use data to process bookings, organize transfers, communicate with customers,
              assign drivers, maintain service quality, reconcile payments, prevent errors, and
              comply with legal obligations.
            </p>

            <h2>3. Who we may share data with</h2>
            <p>
              We share only the minimum necessary information with trip executors, dispatch
              systems, payment providers, and technical service providers when required to deliver
              the service.
            </p>

            <h2>4. Storage and protection</h2>
            <p>
              Riderra applies organizational and technical safeguards to protect data from
              unauthorized access, loss, alteration, or disclosure. Access is limited to authorized
              personnel and contractors.
            </p>

            <h2>5. Your rights</h2>
            <p>
              You may request clarification, correction, or deletion of personal data unless we are
              required to retain it for contractual, accounting, or legal reasons.
            </p>

            <h2>6. Contact</h2>
            <p>
              For privacy-related inquiries, contact
              <a href="mailto:info@riderra.com">info@riderra.com</a>.
            </p>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  computed: {
    isRu() {
      return !this.$store || !this.$store.state || this.$store.state.language !== 'en'
    }
  },
  head() {
    const title = this.isRu ? 'Политика конфиденциальности | Riderra' : 'Privacy Policy | Riderra'
    const description = this.isRu
      ? 'Политика конфиденциальности Riderra.'
      : 'Riderra privacy policy.'

    return {
      title,
      meta: [
        { hid: 'description', name: 'description', content: description }
      ]
    }
  }
}
</script>

<style scoped lang="scss">
.policy-page {
  background: linear-gradient(180deg, #f6f8fc 0%, #ffffff 100%);
  min-height: calc(100vh - 120px);
}

.policy-page__container {
  padding-top: 56px;
  padding-bottom: 72px;
}

.policy-page__card {
  max-width: 900px;
  margin: 0 auto;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 24px 80px rgba(20, 35, 90, 0.12);
  padding: 48px 56px;
}

.policy-page__eyebrow {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2d4f9f;
}

.policy-page__title {
  margin: 0;
  font-size: 42px;
  line-height: 1.08;
  color: #101828;
}

.policy-page__updated {
  margin: 18px 0 0;
  color: #667085;
  font-size: 15px;
}

.policy-page__content {
  margin-top: 32px;
  color: #1f2937;
  font-size: 17px;
  line-height: 1.7;
}

.policy-page__content h2 {
  margin: 28px 0 10px;
  font-size: 24px;
  line-height: 1.3;
  color: #101828;
}

.policy-page__content p {
  margin: 0 0 16px;
}

.policy-page__content a {
  color: #2d4f9f;
  text-decoration: none;
  font-weight: 600;
}

.policy-page__content a:hover {
  text-decoration: underline;
}

@media (max-width: 767px) {
  .policy-page__container {
    padding-top: 24px;
    padding-bottom: 40px;
  }

  .policy-page__card {
    border-radius: 18px;
    padding: 28px 20px;
  }

  .policy-page__title {
    font-size: 30px;
  }

  .policy-page__content {
    font-size: 16px;
  }

  .policy-page__content h2 {
    font-size: 21px;
  }
}
</style>
