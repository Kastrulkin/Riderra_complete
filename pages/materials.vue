<template>
  <div class="materials-page">
    <section class="materials-hero">
      <div class="container materials-hero__inner">
        <p class="materials-eyebrow">{{ t.eyebrow }}</p>
        <h1>{{ t.title }}</h1>
        <p class="materials-hero__lead">{{ t.lead }}</p>
        <div class="materials-hero__actions">
          <a href="#publications" class="materials-button materials-button--light">{{ t.publicationsButton }}</a>
          <a :href="wikiPath" class="materials-text-link materials-text-link--hero">{{ t.wikiButton }} →</a>
        </div>
      </div>
    </section>

    <section class="materials-library" :aria-label="t.libraryTitle">
      <div class="container">
        <div class="materials-categories">
          <a
            v-for="category in categories"
            :key="category.title"
            :href="category.href"
            class="material-category"
          >
            <span class="material-category__index">{{ category.index }}</span>
            <div>
              <h2>{{ category.title }}</h2>
              <p>{{ category.description }}</p>
              <span class="material-category__action">{{ category.action }} →</span>
            </div>
          </a>
        </div>

        <div class="materials-content">
          <section id="publications" class="materials-section">
            <div class="materials-section__heading">
              <div>
                <p class="materials-eyebrow materials-eyebrow--dark">{{ t.publicationsEyebrow }}</p>
                <h2>{{ t.publicationsTitle }}</h2>
                <p>{{ t.publicationsLead }}</p>
              </div>
              <span class="materials-status">{{ t.updating }}</span>
            </div>

            <div class="publication-card">
              <div>
                <h3>{{ t.publicationsEmptyTitle }}</h3>
                <p>{{ t.publicationsEmptyText }}</p>
              </div>
              <div class="publication-links" :aria-label="t.officialChannels">
                <a href="https://www.linkedin.com/company/riderracs" target="_blank" rel="noopener">LinkedIn ↗</a>
                <a href="https://vk.com/riderra" target="_blank" rel="noopener">VK ↗</a>
                <a href="https://www.facebook.com/profile.php?id=61564219065685" target="_blank" rel="noopener">Facebook ↗</a>
              </div>
            </div>
          </section>

          <section id="documents" class="materials-section materials-section--documents">
            <div class="materials-section__heading">
              <div>
                <p class="materials-eyebrow materials-eyebrow--dark">{{ t.documentsEyebrow }}</p>
                <h2>{{ t.documentsTitle }}</h2>
                <p>{{ t.documentsLead }}</p>
              </div>
            </div>

            <div class="documents-list">
              <a v-for="document in documents" :key="document.href" :href="document.href" class="document-row">
                <span class="document-row__type">{{ document.type }}</span>
                <div>
                  <h3>{{ document.title }}</h3>
                  <p>{{ document.description }}</p>
                </div>
                <span class="document-row__arrow" aria-hidden="true">→</span>
              </a>
            </div>
          </section>
        </div>
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
  computed: {
    lang() { return this.$store.state.language },
    wikiPath() { return this.lang === 'en' ? '/vendor-wiki' : `/${this.lang}/vendor-wiki` },
    docsPath() { return this.lang === 'ru' ? '/ru/docs' : '/docs' },
    t() {
      const copy = {
        ru: {
          eyebrow: 'Материалы Riderra', title: 'Публикации, руководства и документы',
          lead: 'Одна библиотека для материалов о Riderra, правил работы перевозчиков и публичной документации.',
          publicationsButton: 'Смотреть публикации', wikiButton: 'Открыть Vendor Wiki', libraryTitle: 'Разделы материалов',
          publications: 'Публикации', publicationsDescription: 'Статьи, новости, интервью и упоминания Riderra.', publicationsAction: 'Перейти к публикациям',
          wiki: 'Vendor Wiki', wikiDescription: 'Правила работы для транспортных компаний, диспетчеров и водителей.', wikiAction: 'Открыть руководство',
          documents: 'Документы', documentsDescription: 'Публичная документация, API и машиночитаемые источники.', documentsAction: 'Смотреть документы',
          publicationsEyebrow: 'Публикации', publicationsTitle: 'Riderra в публикациях',
          publicationsLead: 'Здесь будем собирать статьи, интервью, обзоры и другие публичные материалы о Riderra.', updating: 'Раздел пополняется',
          publicationsEmptyTitle: 'Новые материалы готовятся',
          publicationsEmptyText: 'До появления библиотеки публикаций последние новости Riderra можно найти в официальных каналах.',
          officialChannels: 'Официальные каналы Riderra', documentsEyebrow: 'Документы', documentsTitle: 'Открытые руководства и данные',
          documentsLead: 'Проверенные ссылки для партнёров, клиентов, разработчиков и AI-агентов.',
          guideType: 'Руководство', wikiDocumentTitle: 'Vendor Wiki Riderra', wikiDocumentText: 'Подключение, выполнение поездок, коммуникация, доказательства и платежи.',
          docsType: 'Документация', docsDocumentTitle: 'Публичная документация Riderra', docsDocumentText: 'Услуги, правила подтверждения и источники истины.',
          apiType: 'API', apiTitle: 'OpenAPI', apiText: 'Машиночитаемое описание публичного API Riderra.',
          aiType: 'AI', aiTitle: 'llms.txt', aiText: 'Краткая карта публичных возможностей и ограничений Riderra для AI-систем.'
        },
        en: {
          eyebrow: 'Riderra resources', title: 'Publications, guides and documents',
          lead: 'One library for Riderra publications, fleet operating guidance and public documentation.',
          publicationsButton: 'View publications', wikiButton: 'Open Vendor Wiki', libraryTitle: 'Resource sections',
          publications: 'Publications', publicationsDescription: 'Riderra articles, news, interviews and mentions.', publicationsAction: 'View publications',
          wiki: 'Vendor Wiki', wikiDescription: 'Operating guidance for transport companies, fleet managers and drivers.', wikiAction: 'Open the guide',
          documents: 'Documents', documentsDescription: 'Public documentation, APIs and machine-readable sources.', documentsAction: 'View documents',
          publicationsEyebrow: 'Publications', publicationsTitle: 'Riderra publications',
          publicationsLead: 'Articles, interviews, reviews and other public materials about Riderra will be collected here.', updating: 'Library in progress',
          publicationsEmptyTitle: 'New materials are being prepared',
          publicationsEmptyText: 'Until the publication library is available, follow the official Riderra channels for updates.',
          officialChannels: 'Official Riderra channels', documentsEyebrow: 'Documents', documentsTitle: 'Public guides and data',
          documentsLead: 'Verified links for partners, customers, developers and AI agents.',
          guideType: 'Guide', wikiDocumentTitle: 'Riderra Vendor Wiki', wikiDocumentText: 'Onboarding, trip execution, communication, evidence and payments.',
          docsType: 'Documentation', docsDocumentTitle: 'Riderra public documentation', docsDocumentText: 'Services, confirmation rules and sources of truth.',
          apiType: 'API', apiTitle: 'OpenAPI', apiText: 'Machine-readable description of the Riderra public API.',
          aiType: 'AI', aiTitle: 'llms.txt', aiText: 'A concise map of Riderra public capabilities and constraints for AI systems.'
        }
      }
      return copy[this.lang] || copy.en
    },
    categories() {
      return [
        { index: '01', title: this.t.publications, description: this.t.publicationsDescription, action: this.t.publicationsAction, href: '#publications' },
        { index: '02', title: this.t.wiki, description: this.t.wikiDescription, action: this.t.wikiAction, href: this.wikiPath },
        { index: '03', title: this.t.documents, description: this.t.documentsDescription, action: this.t.documentsAction, href: '#documents' }
      ]
    },
    documents() {
      return [
        { type: this.t.guideType, title: this.t.wikiDocumentTitle, description: this.t.wikiDocumentText, href: this.wikiPath },
        { type: this.t.docsType, title: this.t.docsDocumentTitle, description: this.t.docsDocumentText, href: this.docsPath },
        { type: this.t.apiType, title: this.t.apiTitle, description: this.t.apiText, href: '/api/public/openapi.json' },
        { type: this.t.aiType, title: this.t.aiTitle, description: this.t.aiText, href: '/llms.txt' }
      ]
    }
  }
}
</script>

<style scoped lang="scss">
.materials-page { --navy: #101b3f; --blue: #2f80ed; --ink: #17233d; --muted: #5d6981; --line: #dfe5ef; --soft: #f4f7fb; color: var(--ink); background: var(--soft); }
.materials-hero { padding: 166px 0 122px; color: #fff; background: #101827; }
.materials-hero__inner::before, .materials-hero__inner::after, .materials-library > .container::before, .materials-library > .container::after { display: none; }
.materials-eyebrow { margin: 0 0 16px; color: #a8c8ff; font-size: 13px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.materials-eyebrow--dark { color: var(--blue); }
.materials-hero h1 { max-width: 900px; margin: 0; color: #fff; font-size: clamp(42px, 5.4vw, 68px); line-height: 1.04; letter-spacing: -.035em; }
.materials-hero__lead { max-width: 720px; margin: 24px 0 0; color: rgba(255, 255, 255, .76); font-size: 18px; line-height: 1.7; }
.materials-hero__actions { display: flex; flex-wrap: wrap; gap: 22px; align-items: center; margin-top: 32px; }
.materials-button { display: inline-flex; min-height: 50px; align-items: center; justify-content: center; padding: 0 22px; color: #fff; background: var(--navy); border-radius: 6px; font-size: 14px; font-weight: 800; text-decoration: none; }
.materials-button--light { color: var(--navy); background: #fff; }
.materials-button:hover, .materials-button:focus-visible { background: #eef5ff; outline: 3px solid rgba(47, 128, 237, .24); }
.materials-text-link { color: var(--blue); font-size: 14px; font-weight: 800; text-decoration: none; }
.materials-text-link:hover, .materials-text-link:focus-visible { text-decoration: underline; outline: none; }
.materials-text-link--hero { color: #fff; }
.materials-library { padding: 0 0 96px; }
.materials-categories { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: -52px; }
.material-category { display: flex; min-width: 0; gap: 18px; padding: 28px; color: inherit; background: #fff; border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 16px 42px rgba(23, 35, 61, .09); text-decoration: none; transition: border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease; }
.material-category:hover, .material-category:focus-visible { border-color: #b8cef2; box-shadow: 0 20px 48px rgba(23, 35, 61, .13); transform: translateY(-3px); outline: none; }
.material-category__index { flex: 0 0 auto; color: var(--blue); font-size: 12px; font-weight: 800; letter-spacing: .08em; }
.material-category h2 { margin: 0; color: var(--navy); font-size: 22px; line-height: 1.25; }
.material-category p { min-height: 72px; margin: 10px 0 18px; color: var(--muted); font-size: 14px; line-height: 1.65; }
.material-category__action { color: var(--blue); font-size: 13px; font-weight: 800; }
.materials-content { max-width: 960px; margin: 84px auto 0; }
.materials-section { scroll-margin-top: 100px; }
.materials-section + .materials-section { margin-top: 86px; }
.materials-section__heading { display: flex; justify-content: space-between; gap: 30px; align-items: flex-start; margin-bottom: 28px; }
.materials-section__heading h2 { margin: 0; color: var(--navy); font-size: 34px; line-height: 1.2; letter-spacing: -.025em; }
.materials-section__heading p:not(.materials-eyebrow) { max-width: 680px; margin: 12px 0 0; color: var(--muted); font-size: 15px; line-height: 1.7; }
.materials-status { flex: 0 0 auto; padding: 8px 11px; color: #49617f; background: #eaf0f8; border-radius: 999px; font-size: 11px; font-weight: 800; }
.publication-card { display: flex; justify-content: space-between; gap: 36px; align-items: center; padding: 30px 32px; background: #fff; border: 1px solid var(--line); border-radius: 8px; }
.publication-card h3 { margin: 0; color: var(--navy); font-size: 20px; }
.publication-card p { max-width: 590px; margin: 10px 0 0; color: var(--muted); font-size: 14px; line-height: 1.65; }
.publication-links { display: flex; flex: 0 0 auto; flex-direction: column; gap: 9px; }
.publication-links a { color: var(--blue); font-size: 13px; font-weight: 800; text-decoration: none; }
.publication-links a:hover, .publication-links a:focus-visible { text-decoration: underline; outline: none; }
.documents-list { overflow: hidden; background: #fff; border: 1px solid var(--line); border-radius: 8px; }
.document-row { display: grid; grid-template-columns: 112px minmax(0, 1fr) auto; gap: 24px; align-items: center; min-height: 112px; padding: 22px 26px; color: inherit; text-decoration: none; transition: background-color 160ms ease; }
.document-row + .document-row { border-top: 1px solid var(--line); }
.document-row:hover, .document-row:focus-visible { background: #f8faff; outline: none; }
.document-row__type { color: var(--blue); font-size: 11px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }
.document-row h3 { margin: 0; color: var(--navy); font-size: 17px; }
.document-row p { margin: 7px 0 0; color: var(--muted); font-size: 13px; line-height: 1.55; }
.document-row__arrow { color: var(--blue); font-size: 22px; }
@media (max-width: 1024px) {
  .materials-categories { grid-template-columns: 1fr; max-width: 760px; margin-right: auto; margin-left: auto; }
  .material-category p { min-height: 0; }
}
@media (max-width: 767px) {
  .materials-hero { padding: 116px 0 92px; }
  .materials-hero h1 { font-size: 39px; }
  .materials-hero__lead { font-size: 16px; }
  .materials-library { padding-bottom: 64px; }
  .materials-categories { margin-top: -42px; }
  .material-category { padding: 23px 20px; }
  .materials-content { margin-top: 60px; }
  .materials-section + .materials-section { margin-top: 64px; }
  .materials-section__heading { flex-direction: column; gap: 14px; }
  .materials-section__heading h2 { font-size: 28px; }
  .publication-card { align-items: flex-start; flex-direction: column; padding: 24px 22px; }
  .publication-links { flex-direction: row; flex-wrap: wrap; }
  .document-row { grid-template-columns: 1fr auto; gap: 8px 18px; padding: 20px; }
  .document-row__type { grid-column: 1 / -1; }
}
@media (max-width: 480px) {
  .materials-hero h1 { font-size: 34px; }
  .materials-hero__actions { align-items: stretch; flex-direction: column; }
  .materials-button { width: 100%; }
  .materials-text-link--hero { align-self: center; }
}
</style>
