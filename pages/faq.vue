<template>
  <div>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf faq-section">
      <div class="container">
        <!-- Hero -->
        <div class="faq-hero">
          <h1>{{ t.heroTitle }}</h1>
          <p class="hero-subtitle">{{ t.heroSubtitle }}</p>
        </div>

        <!-- FAQ List -->
        <div class="faq-list">
          <div class="faq-item" v-for="(item, index) in t.questions" :key="index">
            <h3>{{ item.question }}</h3>
            <p>{{ item.answer }}</p>
          </div>
        </div>

        <!-- CTA -->
        <div class="faq-cta">
          <h2>{{ t.ctaTitle }}</h2>
          <a href="/#booking-widget" class="btn btn--primary">{{ t.cta }}</a>
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
          heroTitle: 'Часто задаваемые вопросы',
          heroSubtitle: 'Ответы на популярные вопросы о наших услугах',
          questions: [
            {
              question: 'Что такое Riderra?',
              answer: 'Riderra — это платформа для управления перевозками, которая соединяет клиентов с проверенными локальными перевозчиками.'
            },
            {
              question: 'Для кого предназначен Riderra?',
              answer: 'Riderra подходит для путешественников, бизнес-клиентов, агентов по путешествиям и AI-агентов, которым нужна надежная система перевозок.'
            },
            {
              question: 'Могут ли агенты по путешествиям бронировать для клиентов?',
              answer: 'Да, агенты по путешествиям могут создавать перевозки для своих клиентов через платформу Riderra с собственной наценкой.'
            },
            {
              question: 'Могут ли AI-агенты создавать бронирования?',
              answer: 'AI-агенты могут создавать черновики запросов перевозок. Riderra подтверждает цену и доступность перед окончательным бронированием.'
            },
            {
              question: 'Подтверждает ли Riderra цену и доступность?',
              answer: 'Да, Riderra проверяет доступность у локального перевозчика и подтверждает окончательную цену перед бронированием.'
            },
            {
              question: 'Что происходит, если рейс задерживается?',
              answer: 'Riderra использует данные о рейсе и местные правила ожидания для координации встречи водителя с пассажиром.'
            },
            {
              question: 'Видит ли пассажир внутренние цены?',
              answer: 'Нет, пассажир видит только финальную цену услуги. Внутренние цены видны только клиентам с доступом к бронированию (агентам, бизнес-клиентам).'
            }
          ],
          ctaTitle: 'Не нашли ответ на свой вопрос?',
          cta: 'Связаться с поддержкой'
        },
        en: {
          heroTitle: 'Frequently Asked Questions',
          heroSubtitle: 'Answers to common questions about our services',
          questions: [
            {
              question: 'What is Riderra?',
              answer: 'Riderra is a transfer management platform that connects clients with verified local fleet partners.'
            },
            {
              question: 'Who is Riderra for?',
              answer: 'Riderra is designed for travelers, business clients, travel agencies, and AI agents who need a reliable transfer system.'
            },
            {
              question: 'Can travel agencies book for clients?',
              answer: 'Yes, travel agencies can create transfers for their clients through the Riderra platform with their own markup.'
            },
            {
              question: 'Can AI agents create bookings?',
              answer: 'AI agents can create draft transfer requests. Riderra confirms price and availability before final booking.'
            },
            {
              question: 'Does Riderra confirm price and availability?',
              answer: 'Yes, Riderra checks availability with the local fleet and confirms the final price before booking.'
            },
            {
              question: 'What happens if the flight is delayed?',
              answer: 'Riderra uses flight data and local waiting rules to coordinate the driver pickup for the passenger.'
            },
            {
              question: 'Does the passenger see internal pricing?',
              answer: 'No, the passenger only sees the final service price. Internal pricing is visible only to booking-access clients (agencies, business clients).'
            }
          ],
          ctaTitle: 'Don’t see your question answered?',
          cta: 'Contact support'
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
.faq-section {
  padding-top: 100px;
  padding-bottom: 80px;

  .faq-hero {
    text-align: center;
    margin-bottom: 60px;

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
      margin: 0 auto;
      line-height: 1.6;
    }
  }

  .faq-list {
    max-width: 800px;
    margin: 0 auto 60px;

    .faq-item {
      background: #f7fafc;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      margin-bottom: 16px;

      h3 {
        font-size: 18px;
        font-weight: 700;
        color: #1a237e;
        margin-bottom: 12px;
      }

      p {
        font-size: 15px;
        color: #4a5568;
        line-height: 1.6;
      }
    }
  }

  .faq-cta {
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
  .faq-section {
    padding-top: 60px;
    padding-bottom: 40px;

    .faq-hero {
      h1 {
        font-size: 28px;
      }
    }

    .faq-list {
      .faq-item {
        padding: 20px;
      }
    }
  }
}
</style>
