<template>
  <div>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf for-planners-section">
      <div class="container">
        <!-- Hero -->
        <div class="planners-hero">
          <h1>{{ t.heroTitle }}</h1>
          <p class="hero-subtitle">{{ t.heroSubtitle }}</p>

          <div class="cta-group">
            <a href="/contact" class="btn btn--primary">{{ t.ctaPrimary }}</a>
            <a href="/#booking-widget" class="btn btn--secondary">{{ t.ctaSecondary }}</a>
          </div>
        </div>

        <!-- Problem Section -->
        <div class="planners-section">
          <h2>{{ t.problemTitle }}</h2>
          <p>{{ t.problemText }}</p>
        </div>

        <!-- Riderra Solution -->
        <div class="planners-section">
          <h2>{{ t.solutionTitle }}</h2>
          <p>{{ t.solutionText }}</p>
        </div>

        <!-- Economics Section -->
        <div class="planners-section">
          <h2>{{ t.economicsTitle }}</h2>
          <div class="economics-list">
            <div class="economics-item">
              <strong>{{ t.economics.fleetPrice }}</strong>
              <span>{{ t.economics.fleetPriceDesc }}</span>
            </div>
            <div class="economics-item">
              <strong>{{ t.economics.serviceFee }}</strong>
              <span>{{ t.economics.serviceFeeDesc }}</span>
            </div>
            <div class="economics-item">
              <strong>{{ t.economics.agencyMarkup }}</strong>
              <span>{{ t.economics.agencyMarkupDesc }}</span>
            </div>
            <div class="economics-item">
              <strong>{{ t.economics.clientPrice }}</strong>
              <span>{{ t.economics.clientPriceDesc }}</span>
            </div>
          </div>
        </div>

        <!-- Features Section -->
        <div class="planners-section">
          <h2>{{ t.featuresTitle }}</h2>
          <div class="features-grid">
            <div class="feature-item" v-for="(feature, index) in t.features" :key="index">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="#1a237e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>{{ feature }}</span>
            </div>
          </div>
        </div>

        <!-- How It Works -->
        <div class="planners-section">
          <h2>{{ t.howItWorksTitle }}</h2>
          <ol class="steps-list">
            <li v-for="(step, index) in t.steps" :key="index">
              <strong>{{ step.title }}</strong>
              <p>{{ step.desc }}</p>
            </li>
          </ol>
        </div>

        <!-- FAQ Section -->
        <div class="planners-section">
          <h2>{{ t.faqTitle }}</h2>
          <div class="faq-list">
            <div class="faq-item" v-for="(faq, index) in t.faq" :key="index">
              <h3>{{ faq.question }}</h3>
              <p>{{ faq.answer }}</p>
            </div>
          </div>
        </div>

        <!-- Final CTA -->
        <div class="final-cta">
          <h2>{{ t.finalCtaTitle }}</h2>
          <a href="/contact" class="btn btn--primary">{{ t.finalCtaButton }}</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  layout: 'default',
  computed: {
    lang() { return this.$store.state.language },
    t() {
      const dict = {
        ru: {
          heroTitle: 'Частные трансферы для клиентов турагентов',
          heroSubtitle: 'Получайте нетто-цены от локальных автопарков, добавляйте свою маржу, отправляйте клиенту готовый ваучер, а Riderra возьмёт операционную часть на себя.',
          ctaPrimary: 'Обсудить доступ агента',
          ctaSecondary: 'Создать запрос трансфера',
          problemTitle: 'Трансферы легко продать, но сложно сопровождать',
          problemText: 'Международный трансфер часто проходит через несколько коммерческих слоёв, прежде чем доходит до локального исполнителя. Каждый слой забирает маржу, а турагент всё равно отвечает перед клиентом, если что-то меняется.',
          solutionTitle: 'Один операционный центр между вами и локальными автопарками',
          solutionText: 'Riderra соединяет турагентов с проверенными локальными автопарками и держит цену, подтверждение доступности, ваучеры, поддержку и разбор изменений в одном управляемом процессе.',
          economicsTitle: 'Прозрачная экономика для агентов',
          economics: {
            fleetPrice: 'Нетто-цена автопарка',
            fleetPriceDesc: 'Оплачивается локальному оператору',
            serviceFee: 'Комиссия Riderra',
            serviceFeeDesc: 'Охватывает координацию, поддержку и операционный контроль',
            agencyMarkup: 'Ваша наценка агента',
            agencyMarkupDesc: 'Устанавливается вами',
            clientPrice: 'Финальная цена клиента',
            clientPriceDesc: 'Показывается вашему клиенту'
          },
          featuresTitle: 'Создано для турагентов',
          features: [
            'Нетто-цены от локальных автопарков',
            'Ваша собственная наценка агента',
            'Готовый к отправке PDF ваучер',
            'WhatsApp-сообщение для пассажира',
            'Ссылка на статус заявки',
            'Отслеживание рейсов и правила ожидания',
            'Опция ежемесячного счета-фактуры',
            'Ссылка для клиента с белым брендом',
            'Повторные бронирования'
          ],
          howItWorksTitle: 'Как это работает',
          steps: [
            { title: '1. Отправьте детали поездки', desc: 'Маршрут, дата, номер рейса, пассажиры, багаж и специальные пожелания.' },
            { title: '2. Получите проверенное предложение', desc: 'Riderra проверяет доступность и цену у локального автопарка перед финальным бронированием.' },
            { title: '3. Отправьте ваучер', desc: 'Добавьте свою маржу, отправьте готовый ваучер клиенту и позвольте Riderra управлять трансфером.' },
            { title: '4. Оставайтесь под контролем', desc: 'Отслеживайте статус заявки и обращайтесь в поддержку Riderra, если что-то изменится.' }
          ],
          faqTitle: 'Часто задаваемые вопросы',
          faq: [
            { question: 'Увидит ли пассажир мою нетто-цену?', answer: 'Нет. Клиент получает готовый ваучер без вашей внутренней цены.' },
            { question: 'Кто управляет локальным автопарком?', answer: 'Riderra управляет коммуникацией, подтверждением и обработкой изменений с локальным автопарком.' },
            { question: 'Могу ли я добавить свою маржу?', answer: 'Да. Вы можете установить клиентскую цену выше проверенной нетто-цены и комиссии Riderra.' },
            { question: 'Нужна ли интеграция API?', answer: 'Нет. Можно начать с формы запроса и ручного согласования доступа. API является дополнительным.' },
            { question: 'Что происходит, если рейс задерживается?', answer: 'Riderra использует данные о рейсе и местные правила ожидания для координации встречи.' }
          ],
          finalCtaTitle: 'Начните отправлять трансферные заявки для своих клиентов',
          finalCtaButton: 'Обсудить доступ агента'
        },
        en: {
          heroTitle: 'Private transfers for your travel clients',
          heroSubtitle: 'Get local fleet net rates, add your margin, send a client-ready voucher, and let Riderra handle the operation.',
          ctaPrimary: 'Discuss agency access',
          ctaSecondary: 'Create transfer request',
          problemTitle: 'Transfers are simple to sell, but hard to operate',
          problemText: 'International transfers often move through several commercial layers before reaching the local operator. Each layer takes a margin, and the tour agency still has to deal with the problem if something changes.',
          solutionTitle: 'One managed transfer desk between you and local fleets',
          solutionText: 'Riderra connects tour agencies to verified local fleet partners while keeping pricing, availability confirmation, vouchers, support and issue handling in one managed workflow.',
          economicsTitle: 'Clear economics for agents',
          economics: {
            fleetPrice: 'Fleet net price',
            fleetPriceDesc: 'paid to the local operator',
            serviceFee: 'Riderra service fee',
            serviceFeeDesc: 'covers coordination, support and operational control',
            agencyMarkup: 'Your agency markup',
            agencyMarkupDesc: 'set by you',
            clientPrice: 'Final client price',
            clientPriceDesc: 'shown to your client'
          },
          featuresTitle: 'Built for tour agencies',
          features: [
            'Net rates from local fleets',
            'Your own agency markup',
            'Client-ready PDF voucher',
            'WhatsApp message for the passenger',
            'Request status link',
            'Flight tracking and waiting rules',
            'Monthly invoice option',
            'White-label client link',
            'Repeat bookings'
          ],
          howItWorksTitle: 'How it works',
          steps: [
            { title: '1. Send the trip details', desc: 'Route, date, flight number, passengers, luggage and special requests.' },
            { title: '2. Get a reviewed offer', desc: 'Riderra checks availability and the local fleet price before final booking.' },
            { title: '3. Send the voucher', desc: 'Add your margin, send the client-ready voucher, and let Riderra manage the transfer.' },
            { title: '4. Stay in control', desc: 'Track the request status and contact Riderra support if anything changes.' }
          ],
          faqTitle: 'Frequently asked questions',
          faq: [
            { question: 'Does the passenger see my net price?', answer: 'No. The client receives a client-ready voucher without your internal pricing.' },
            { question: 'Who handles the local fleet?', answer: 'Riderra manages communication, confirmation and issue handling with the local fleet.' },
            { question: 'Can I add my own margin?', answer: 'Yes. You can set your own client price above the reviewed net price and Riderra service fee.' },
            { question: 'Do I need API integration?', answer: 'No. You can start with the request form and manually approved access. API is optional.' },
            { question: 'What happens if the flight is delayed?', answer: 'Riderra uses flight details and local waiting rules to coordinate the pickup.' }
          ],
          finalCtaTitle: 'Start sending transfer requests for your clients',
          finalCtaButton: 'Discuss agency access'
        }
      };
      return dict[this.lang] || dict.en;
    }
  },
  data() {
    return {
      siteData: {}
    };
  }
}
</script>

<style scoped lang="scss">
.for-planners-section {
  padding-top: 100px;
  padding-bottom: 80px;

  .planners-hero {
    text-align: center;
    margin-bottom: 80px;

    h1 {
      font-size: 42px;
      font-weight: 800;
      color: #17233d;
      margin-bottom: 20px;
    }

    .hero-subtitle {
      font-size: 18px;
      color: #4a5568;
      max-width: 700px;
      margin: 0 auto 40px;
      line-height: 1.6;
    }
  }

  .cta-group {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .planners-section {
    margin-bottom: 60px;

    h2 {
      font-size: 28px;
      font-weight: 700;
      color: #17233d;
      margin-bottom: 16px;
    }

    p {
      font-size: 16px;
      color: #4a5568;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
    }
  }

  .economics-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    max-width: 600px;
    margin: 0 auto;

    .economics-item {
      background: #f7fafc;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;

      strong {
        display: block;
        font-weight: 700;
        color: #1a237e;
        margin-bottom: 8px;
      }

      span {
        font-size: 14px;
        color: #4a5568;
      }
    }
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    max-width: 900px;
    margin: 0 auto;

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: #f7fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;

      svg {
        flex-shrink: 0;
      }

      span {
        font-size: 14px;
        color: #4a5568;
        line-height: 1.5;
      }
    }
  }

  .steps-list {
    max-width: 700px;
    margin: 0 auto;
    padding-left: 24px;

    li {
      margin-bottom: 24px;

      strong {
        display: block;
        font-weight: 700;
        color: #1a237e;
        margin-bottom: 8px;
        font-size: 16px;
      }

      p {
        font-size: 14px;
        color: #4a5568;
        line-height: 1.5;
      }
    }
  }

  .faq-list {
    max-width: 800px;
    margin: 0 auto;

    .faq-item {
      background: #f7fafc;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 16px;

      h3 {
        font-size: 16px;
        font-weight: 700;
        color: #1a237e;
        margin-bottom: 8px;
      }

      p {
        font-size: 14px;
        color: #4a5568;
        line-height: 1.6;
      }
    }
  }

  .final-cta {
    text-align: center;
    margin-top: 60px;

    h2 {
      font-size: 28px;
      font-weight: 700;
      color: #17233d;
      margin-bottom: 20px;
    }
  }
}

@media (max-width: 767px) {
  .for-planners-section {
    padding-top: 60px;
    padding-bottom: 40px;

    .planners-hero {
      h1 {
        font-size: 28px;
      }
    }

    .economics-list {
      grid-template-columns: 1fr;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }

    .faq-list {
      .faq-item {
        padding: 16px;
      }
    }
  }
}
</style>
