<template>
  <div>
    <navigation />
    <section class="site-section site-section--pf wiki-page">
      <div class="container">
        <admin-tabs />

        <header class="wiki-hero">
          <div>
            <p class="wiki-eyebrow">{{ t.eyebrow }}</p>
            <h1>{{ t.title }}</h1>
            <p class="wiki-hero__subtitle">{{ t.subtitle }}</p>
          </div>
          <button class="btn" type="button" :disabled="loading" @click="load">
            {{ loading ? t.loading : t.refresh }}
          </button>
        </header>

        <div v-if="notice.text" class="notice" :class="notice.type === 'error' ? 'notice--error' : 'notice--ok'" role="status">
          {{ notice.text }}
        </div>

        <div class="wiki-layout">
          <aside class="wiki-sidebar" :aria-label="t.contents">
            <button
              class="wiki-home-link"
              :class="{ 'wiki-home-link--active': !selectedPage }"
              type="button"
              @click="goHome"
            >
              <span aria-hidden="true">⌂</span>
              {{ t.home }}
            </button>

            <label class="wiki-search">
              <span class="sr-only">{{ t.search }}</span>
              <input v-model="query" class="input" :placeholder="t.search" @input="queueSearch" />
            </label>

            <p v-if="pages.length" class="wiki-sidebar__label">
              {{ query.trim() ? t.searchResults : t.contents }}
            </p>

            <div v-if="!pages.length && !loading" class="empty-state">
              <strong>{{ query.trim() ? t.noResults : t.emptyTitle }}</strong>
              <p>{{ query.trim() ? t.noResultsHint : t.emptyHint }}</p>
            </div>

            <button
              v-for="row in navigationRows"
              :key="row.page.id"
              class="wiki-page-link"
              :class="{
                'wiki-page-link--active': selectedPage && selectedPage.id === row.page.id,
                'wiki-page-link--root': row.depth === 0
              }"
              :style="{ '--wiki-depth': row.depth }"
              type="button"
              @click="openPage(row.page.id)"
            >
              <span class="wiki-page-link__title">{{ row.page.title }}</span>
              <small v-if="needsPartnerDescription(row.page)" class="wiki-missing-badge">{{ t.notDescribed }}</small>
            </button>
          </aside>

          <main class="wiki-main">
            <div v-if="loading && !pages.length" class="wiki-loading">
              {{ t.loading }}
            </div>

            <section v-else-if="!selectedPage" class="wiki-home">
              <div class="wiki-welcome">
                <div>
                  <p class="wiki-eyebrow">{{ t.startHere }}</p>
                  <h2>{{ t.welcomeTitle }}</h2>
                  <p>{{ t.welcomeText }}</p>
                </div>
                <ol class="wiki-steps">
                  <li v-for="step in t.steps" :key="step">{{ step }}</li>
                </ol>
              </div>

              <div v-if="knowledgeAreas.length" class="wiki-sections">
                <div class="wiki-section-heading">
                  <div>
                    <p class="wiki-eyebrow">{{ t.allKnowledge }}</p>
                    <h2>{{ t.sections }}</h2>
                  </div>
                  <span>{{ t.materialsCount(pages.length) }}</span>
                </div>

                <div class="wiki-section-grid">
                  <article v-for="section in knowledgeAreas" :key="section.id" class="wiki-section-card" :class="{ 'wiki-section-card--empty': !section.pages.length }">
                    <button class="wiki-section-card__main" type="button" :disabled="!section.pages.length" @click="openPage(section.pages[0].id)">
                      <span class="wiki-section-card__icon" aria-hidden="true">{{ section.icon }}</span>
                      <span>
                        <strong>{{ section.title }}</strong>
                        <small>{{ section.description }}</small>
                      </span>
                      <span v-if="section.pages.length" class="wiki-arrow" aria-hidden="true">→</span>
                    </button>
                    <div v-if="section.pages.length" class="wiki-section-card__links">
                      <button
                        v-for="page in section.pages.slice(0, 5)"
                        :key="page.id"
                        type="button"
                        @click="openPage(page.id)"
                      >
                        <span>{{ page.title }}</span>
                        <small v-if="needsPartnerDescription(page)" class="wiki-missing-badge">{{ t.notDescribed }}</small>
                      </button>
                      <button v-if="section.pages.length > 5" type="button" @click="openPage(section.pages[0].id)">
                        {{ t.moreMaterials(section.pages.length - 5) }}
                      </button>
                    </div>
                    <p v-else class="wiki-section-card__missing">{{ t.needsContent }}</p>
                  </article>
                </div>
              </div>

              <div v-else-if="!loading" class="wiki-home__empty">
                <strong>{{ t.emptyTitle }}</strong>
                <p>{{ t.emptyHint }}</p>
              </div>
            </section>

            <article v-else class="wiki-reader">
              <nav v-if="breadcrumbs.length" class="wiki-breadcrumbs" :aria-label="t.breadcrumbs">
                <button type="button" @click="goHome">{{ t.home }}</button>
                <template v-for="crumb in breadcrumbs">
                  <span :key="`${crumb.id}-separator`" aria-hidden="true">/</span>
                  <button :key="crumb.id" type="button" @click="openPage(crumb.id)">{{ crumb.title }}</button>
                </template>
              </nav>

              <div class="wiki-reader__head">
                <div>
                  <p class="wiki-eyebrow">{{ t.article }}</p>
                  <h2 ref="articleTitle" tabindex="-1">{{ selectedPage.title }}</h2>
                  <p class="muted">{{ t.updated }} {{ formatDate(selectedPage.updatedAt) }}</p>
                </div>
                <button v-if="canManage && !editing" class="btn btn--small" type="button" @click="startEdit">
                  {{ t.edit }}
                </button>
              </div>

              <div v-if="needsPartnerDescription(selectedPage)" class="wiki-requirements-missing" role="status">
                <strong>{{ t.requirementsMissingTitle }}</strong>
                <p>{{ t.requirementsMissingText }}</p>
              </div>

              <div v-if="editing" class="wiki-edit">
                <label>
                  <span>{{ t.editTitle }}</span>
                  <input v-model="editForm.title" class="input" />
                </label>
                <label>
                  <span>{{ t.editContent }}</span>
                  <textarea v-model="editForm.contentMarkdown" class="wiki-edit__textarea"></textarea>
                </label>
                <div class="wiki-edit__hint">
                  <p>{{ t.linkHint }}</p>
                  <p>{{ t.imageHint }}</p>
                  <p>{{ t.videoHint }}</p>
                </div>
                <div class="wiki-edit__actions">
                  <button class="btn btn--primary" type="button" :disabled="saving" @click="saveEdit">
                    {{ saving ? t.saving : t.save }}
                  </button>
                  <button class="btn" type="button" :disabled="saving" @click="cancelEdit">{{ t.cancel }}</button>
                </div>
              </div>

              <div v-else class="wiki-content">
                <p v-if="!selectedPage.contentMarkdown" class="muted">{{ t.noContent }}</p>
                <template v-else>
                  <template v-for="(block, blockIndex) in contentBlocks">
                    <figure v-if="block.type === 'image'" :key="blockIndex" class="wiki-media wiki-media--image">
                      <img :src="block.url" :alt="block.caption || selectedPage.title" loading="lazy" />
                      <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
                    </figure>
                    <figure v-else-if="block.type === 'video'" :key="blockIndex" class="wiki-media wiki-media--video">
                      <div class="wiki-video-frame">
                        <iframe
                          v-if="block.embedUrl"
                          :src="block.embedUrl"
                          :title="block.caption || t.video"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowfullscreen
                        ></iframe>
                        <video v-else controls preload="metadata">
                          <source :src="block.url" />
                          {{ t.videoUnsupported }}
                        </video>
                      </div>
                      <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
                    </figure>
                    <component
                      :is="`h${block.level}`"
                      v-else-if="block.type === 'heading'"
                      :key="blockIndex"
                      class="wiki-content__heading"
                    >
                      <template v-for="(part, partIndex) in block.parts">
                        <button
                          v-if="part.type === 'wiki-link'"
                          :key="partIndex"
                          class="wiki-inline-link"
                          type="button"
                          @click="openWikiLink(part.title)"
                        >{{ part.title }}</button>
                        <a v-else-if="part.type === 'external-link'" :key="partIndex" :href="part.url" target="_blank" rel="noopener">{{ part.text }}</a>
                        <strong v-else-if="part.type === 'strong'" :key="partIndex">{{ part.text }}</strong>
                        <span v-else :key="partIndex">{{ part.text }}</span>
                      </template>
                    </component>
                    <ul v-else-if="block.type === 'list'" :key="blockIndex">
                      <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
                        <template v-for="(part, partIndex) in item">
                          <button v-if="part.type === 'wiki-link'" :key="partIndex" class="wiki-inline-link" type="button" @click="openWikiLink(part.title)">{{ part.title }}</button>
                          <a v-else-if="part.type === 'external-link'" :key="partIndex" :href="part.url" target="_blank" rel="noopener">{{ part.text }}</a>
                          <strong v-else-if="part.type === 'strong'" :key="partIndex">{{ part.text }}</strong>
                          <span v-else :key="partIndex">{{ part.text }}</span>
                        </template>
                      </li>
                    </ul>
                    <ol v-else-if="block.type === 'ordered-list'" :key="blockIndex">
                      <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
                        <template v-for="(part, partIndex) in item">
                          <button v-if="part.type === 'wiki-link'" :key="partIndex" class="wiki-inline-link" type="button" @click="openWikiLink(part.title)">{{ part.title }}</button>
                          <a v-else-if="part.type === 'external-link'" :key="partIndex" :href="part.url" target="_blank" rel="noopener">{{ part.text }}</a>
                          <strong v-else-if="part.type === 'strong'" :key="partIndex">{{ part.text }}</strong>
                          <span v-else :key="partIndex">{{ part.text }}</span>
                        </template>
                      </li>
                    </ol>
                    <blockquote v-else-if="block.type === 'quote'" :key="blockIndex">
                      <template v-for="(part, partIndex) in block.parts">
                        <button v-if="part.type === 'wiki-link'" :key="partIndex" class="wiki-inline-link" type="button" @click="openWikiLink(part.title)">{{ part.title }}</button>
                        <a v-else-if="part.type === 'external-link'" :key="partIndex" :href="part.url" target="_blank" rel="noopener">{{ part.text }}</a>
                        <strong v-else-if="part.type === 'strong'" :key="partIndex">{{ part.text }}</strong>
                        <span v-else :key="partIndex">{{ part.text }}</span>
                      </template>
                    </blockquote>
                    <pre v-else-if="block.type === 'code'" :key="blockIndex"><code>{{ block.text }}</code></pre>
                    <hr v-else-if="block.type === 'divider'" :key="blockIndex" />
                    <p v-else :key="blockIndex">
                      <template v-for="(part, partIndex) in block.parts">
                        <button v-if="part.type === 'wiki-link'" :key="partIndex" class="wiki-inline-link" type="button" @click="openWikiLink(part.title)">{{ part.title }}</button>
                        <a v-else-if="part.type === 'external-link'" :key="partIndex" :href="part.url" target="_blank" rel="noopener">{{ part.text }}</a>
                        <strong v-else-if="part.type === 'strong'" :key="partIndex">{{ part.text }}</strong>
                        <span v-else :key="partIndex">{{ part.text }}</span>
                      </template>
                    </p>
                  </template>
                </template>
              </div>

              <section v-if="articleLinks.length" class="wiki-related">
                <h3>{{ selectedPage.children && selectedPage.children.length ? t.nextInSection : t.related }}</h3>
                <div class="wiki-related__grid">
                  <button v-for="page in articleLinks" :key="page.id" type="button" @click="openPage(page.id)">
                    <span>{{ page.title }}</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </section>
            </article>
          </main>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import navigation from '~/components/partials/nav.vue'
import adminTabs from '~/components/partials/adminTabs.vue'

export default {
  middleware: 'staff',
  components: { navigation, adminTabs },
  data: () => ({
    pages: [],
    selectedPage: null,
    query: '',
    loading: false,
    saving: false,
    editing: false,
    canManage: false,
    editForm: { title: '', contentMarkdown: '' },
    notice: { type: 'ok', text: '' },
    searchTimer: null
  }),
  computed: {
    isRu () { return this.$store.state.language === 'ru' },
    pageIndex () {
      return this.pages.reduce((index, page) => {
        index[page.id] = page
        return index
      }, {})
    },
    pageTitleIndex () {
      return this.pages.reduce((index, page) => {
        const title = String(page.title || '').trim().toLowerCase()
        if (title) index[title] = page.id
        return index
      }, {})
    },
    navigationRows () {
      if (this.query.trim()) return this.pages.map(page => ({ page, depth: 0 }))
      const childrenByParent = this.pages.reduce((index, page) => {
        const key = page.parentId || 'root'
        if (!index[key]) index[key] = []
        index[key].push(page)
        return index
      }, {})
      const rows = []
      const visit = (page, depth) => {
        rows.push({ page, depth })
        ;(childrenByParent[page.id] || []).forEach(child => visit(child, depth + 1))
      }
      ;(childrenByParent.root || []).forEach(page => visit(page, 0))
      return rows
    },
    knowledgeAreas () {
      const configs = this.isRu
        ? [
            { id: 'departments', icon: '🏢', title: 'Подразделения', description: 'Кто за что отвечает, ежедневная работа, зоны ответственности и передача задач.', pattern: /подраздел|отдел|команд|роль|оператор|диспетчер|финанс|аудит|администратор/i },
            { id: 'customers', icon: '🤝', title: 'Заказчики', description: 'Список заказчиков и отдельные правила заказа, изменения, отмены, оплаты и связи.', pattern: /заказчик|клиент|customer|client|агентств|корпоратив/i },
            { id: 'partners', icon: '🚘', title: 'Вендоры и исполнители', description: 'Правила работы с вендорами, перевозчиками и водителями: принятие, подтверждение, оплата и контроль.', pattern: /вендор|vendor|исполнител|водител|перевозчик|поставщик|supplier|driver/i },
            { id: 'regular', icon: '✓', title: 'Штатная работа', description: 'Пошаговые инструкции для обычного заказа: создание, подтверждение, выполнение, отмена и оплата.', pattern: /штатн|регламент|заказ|бронирован|подтвержден|оформлен|отмен|оплат|order|booking|payment/i },
            { id: 'incidents', icon: '!', title: 'Нештатные ситуации', description: 'Что делать при опоздании, невыходе, замене, жалобе, сбое и других отклонениях.', pattern: /нештат|инцидент|опоздан|невыход|замен|жалоб|сбой|ошиб|проблем|emergency|incident|delay|no.?show/i }
          ]
        : [
            { id: 'departments', icon: '🏢', title: 'Departments', description: 'Responsibilities, daily work, ownership, and handoffs between teams.', pattern: /department|team|role|operator|dispatcher|finance|audit|admin/i },
            { id: 'customers', icon: '🤝', title: 'Customers', description: 'Customer list and specific booking, change, cancellation, payment, and contact rules.', pattern: /customer|client|agency|corporate/i },
            { id: 'partners', icon: '🚘', title: 'Vendors and performers', description: 'Rules for vendors, carriers, and drivers: acceptance, confirmation, payment, and control.', pattern: /vendor|performer|driver|carrier|supplier/i },
            { id: 'regular', icon: '✓', title: 'Standard operations', description: 'Step-by-step guidance for booking, confirmation, fulfilment, cancellation, and payment.', pattern: /standard|policy|order|booking|confirm|cancel|payment/i },
            { id: 'incidents', icon: '!', title: 'Incidents and exceptions', description: 'Actions for delays, no-shows, replacements, complaints, failures, and other exceptions.', pattern: /incident|exception|delay|no.?show|replacement|complaint|failure|problem|emergency/i }
          ]
      return configs.map(config => ({
        ...config,
        pages: this.pages.filter(page => config.pattern.test(this.pageContextText(page)))
      }))
    },
    breadcrumbs () {
      if (!this.selectedPage) return []
      const crumbs = []
      let parentId = this.selectedPage.parentId
      const visited = new Set()
      while (parentId && this.pageIndex[parentId] && !visited.has(parentId)) {
        visited.add(parentId)
        crumbs.unshift(this.pageIndex[parentId])
        parentId = this.pageIndex[parentId].parentId
      }
      return crumbs
    },
    articleLinks () {
      if (!this.selectedPage) return []
      if (this.selectedPage.children && this.selectedPage.children.length) return this.selectedPage.children
      return this.pages
        .filter(page => page.parentId === this.selectedPage.parentId && page.id !== this.selectedPage.id)
        .slice(0, 6)
    },
    contentBlocks () {
      const source = String((this.selectedPage && this.selectedPage.contentMarkdown) || '').replace(/\r/g, '')
      const lines = source.split('\n')
      const blocks = []
      let codeLines = null
      lines.forEach((rawLine) => {
        const line = rawLine.trimEnd()
        if (/^```/.test(line)) {
          if (codeLines) {
            blocks.push({ type: 'code', text: codeLines.join('\n') })
            codeLines = null
          } else {
            codeLines = []
          }
          return
        }
        if (codeLines) {
          codeLines.push(rawLine)
          return
        }
        if (!line.trim()) return
        const image = line.trim().match(/^!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)$/i)
        if (image) {
          blocks.push({ type: 'image', caption: image[1].trim(), url: image[2] })
          return
        }
        const video = line.trim().match(/^\[video(?::([^\]]+))?\]\((https:\/\/[^)\s]+)\)$/i)
        if (video) {
          blocks.push({ type: 'video', caption: String(video[1] || '').trim(), url: video[2], embedUrl: this.videoEmbedUrl(video[2]) })
          return
        }
        if (/^---+$/.test(line.trim())) {
          blocks.push({ type: 'divider' })
          return
        }
        const heading = line.match(/^(#{1,3})\s+(.+)$/)
        if (heading) {
          blocks.push({ type: 'heading', level: heading[1].length, parts: this.inlineParts(heading[2]) })
          return
        }
        const bullet = line.match(/^[-*]\s+(?:\[[ xX]\]\s*)?(.+)$/)
        if (bullet) {
          const previous = blocks[blocks.length - 1]
          const item = this.inlineParts(bullet[1])
          if (previous && previous.type === 'list') previous.items.push(item)
          else blocks.push({ type: 'list', items: [item] })
          return
        }
        const numbered = line.match(/^\d+[.)]\s+(.+)$/)
        if (numbered) {
          const previous = blocks[blocks.length - 1]
          const item = this.inlineParts(numbered[1])
          if (previous && previous.type === 'ordered-list') previous.items.push(item)
          else blocks.push({ type: 'ordered-list', items: [item] })
          return
        }
        if (/^>\s?/.test(line)) {
          blocks.push({ type: 'quote', parts: this.inlineParts(line.replace(/^>\s?/, '')) })
          return
        }
        blocks.push({ type: 'paragraph', parts: this.inlineParts(line) })
      })
      if (codeLines) blocks.push({ type: 'code', text: codeLines.join('\n') })
      return blocks
    },
    t () {
      return this.isRu
        ? {
            eyebrow: 'База знаний для команды', title: 'Вики Riderra',
            subtitle: 'Инструкции, правила и ответы для ежедневной работы. Найдите задачу или выберите нужный раздел.',
            refresh: 'Обновить', loading: 'Загрузка…', search: 'Найти инструкцию или ответ',
            home: 'Главная Вики', contents: 'Содержание', searchResults: 'Результаты поиска',
            noResults: 'Ничего не найдено', noResultsHint: 'Попробуйте другое слово или более короткий запрос.',
            emptyTitle: 'Вики пока пуста', emptyHint: 'Материалы появятся здесь после публикации администратором.',
            startHere: 'С чего начать', welcomeTitle: 'Быстро найдите ответ и продолжайте работу',
            welcomeText: 'Здесь описаны работа подразделений, правила каждого заказчика, вендора и исполнителя, а также действия в штатных и нештатных ситуациях.',
            steps: ['Выберите задачу или найдите её через поиск.', 'Откройте инструкцию и выполните шаги по порядку.', 'Если ответа не хватает — сообщите руководителю раздела.'],
            allKnowledge: 'Навигация', sections: 'Разделы базы знаний',
            materialsCount: count => `${count} ${count % 10 === 1 && count % 100 !== 11 ? 'материал' : 'материалов'}`,
            moreMaterials: count => `Ещё ${count}`,
            breadcrumbs: 'Путь к статье', article: 'Инструкция', updated: 'Обновлено', noContent: 'В статье пока нет текста.',
            nextInSection: 'Дальше в этом разделе', related: 'Связанные материалы', needsContent: 'Раздел требует дополнения',
            notDescribed: 'Нужно дополнить', requirementsMissingTitle: 'Требования по заказам не описаны',
            requirementsMissingText: 'Карточка намеренно оставлена пустой. Нужно добавить правила создания и принятия заказа, изменений, отмены, оплаты, связи и исключений.',
            edit: 'Редактировать', editTitle: 'Заголовок', editContent: 'Текст статьи',
            linkHint: 'Чтобы связать статью с другой, укажите её точное название в двойных скобках: [[Название статьи]].',
            imageHint: 'Изображение или скриншот: ![Подпись](https://адрес-изображения)',
            videoHint: 'Видео YouTube, Vimeo, Rutube или прямой MP4: [video:Подпись](https://адрес-видео)',
            video: 'Видеоинструкция', videoUnsupported: 'Ваш браузер не поддерживает встроенное видео.',
            save: 'Сохранить', saving: 'Сохранение…', cancel: 'Отмена'
          }
        : {
            eyebrow: 'Knowledge base for the team', title: 'Riderra Wiki',
            subtitle: 'Guides, policies, and answers for daily work. Search for a task or choose a section.',
            refresh: 'Refresh', loading: 'Loading…', search: 'Find a guide or answer',
            home: 'Wiki home', contents: 'Contents', searchResults: 'Search results',
            noResults: 'No results', noResultsHint: 'Try another word or a shorter query.',
            emptyTitle: 'The Wiki is empty', emptyHint: 'Published team materials will appear here.',
            startHere: 'Start here', welcomeTitle: 'Find an answer and get back to work',
            welcomeText: 'This Wiki covers departments, each customer, vendor and performer, plus actions for standard operations and incidents.',
            steps: ['Choose a task or find it with search.', 'Open the guide and follow the steps in order.', 'If an answer is missing, tell the section owner.'],
            allKnowledge: 'Navigation', sections: 'Knowledge base sections',
            materialsCount: count => `${count} materials`, moreMaterials: count => `${count} more`,
            breadcrumbs: 'Article path', article: 'Guide', updated: 'Updated', noContent: 'This article has no content yet.',
            nextInSection: 'Next in this section', related: 'Related materials', needsContent: 'This section needs content',
            notDescribed: 'Needs details', requirementsMissingTitle: 'Order requirements are not documented',
            requirementsMissingText: 'This entry is intentionally empty. Add booking and acceptance rules, changes, cancellation, payment, contacts, and exceptions.',
            edit: 'Edit', editTitle: 'Title', editContent: 'Article text',
            linkHint: 'To link another article, enter its exact title in double brackets: [[Article title]].',
            imageHint: 'Image or screenshot: ![Caption](https://image-address)',
            videoHint: 'YouTube, Vimeo, Rutube, or direct MP4 video: [video:Caption](https://video-address)',
            video: 'Video guide', videoUnsupported: 'Your browser does not support embedded video.',
            save: 'Save', saving: 'Saving…', cancel: 'Cancel'
          }
    }
  },
  mounted () { this.load() },
  beforeDestroy () { if (this.searchTimer) clearTimeout(this.searchTimer) },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
    async jsonRequest (url, options = {}) {
      const response = await fetch(url, options)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.message || body.details || body.error || `HTTP ${response.status}`)
      return body
    },
    async load () {
      this.loading = true
      this.notice = { type: 'ok', text: '' }
      try {
        const params = new URLSearchParams()
        if (this.query.trim()) params.set('q', this.query.trim())
        const data = await this.jsonRequest(`/api/admin/wiki/pages?${params.toString()}`, { headers: this.headers() })
        this.pages = data.rows || []
        this.canManage = Boolean(data.canManage)
        if (this.query.trim()) {
          if (this.selectedPage && !this.pages.some(page => page.id === this.selectedPage.id)) this.selectedPage = null
          return
        }
        const articleSlug = String(this.$route.query.article || '').trim()
        if (articleSlug && (!this.selectedPage || this.selectedPage.slug !== articleSlug)) {
          const target = this.pages.find(page => page.slug === articleSlug)
          if (target) await this.openPage(target.id, false)
        }
      } catch (error) {
        this.notice = { type: 'error', text: error.message }
      } finally {
        this.loading = false
      }
    },
    queueSearch () {
      if (this.searchTimer) clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => this.load(), 250)
    },
    pageContextText (page) {
      const values = [page.title, page.contentPreview]
      let parentId = page.parentId
      const visited = new Set()
      while (parentId && this.pageIndex[parentId] && !visited.has(parentId)) {
        visited.add(parentId)
        const parent = this.pageIndex[parentId]
        values.push(parent.title, parent.contentPreview)
        parentId = parent.parentId
      }
      return values.filter(Boolean).join(' ')
    },
    needsPartnerDescription (page) {
      if (!page) return false
      const context = this.pageContextText(page)
      const isPartner = /партн[её]р|заказчик|клиент|customer|client|вендор|vendor|исполнител|водител|перевозчик|поставщик|supplier|driver/i.test(context)
      return isPartner && !String(page.contentPreview || page.contentText || '').trim()
    },
    videoEmbedUrl (value) {
      try {
        const url = new URL(String(value || ''))
        const host = url.hostname.toLowerCase().replace(/^www\./, '')
        if (host === 'youtu.be') {
          const id = url.pathname.split('/').filter(Boolean)[0]
          return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null
        }
        if (host === 'youtube.com' || host === 'm.youtube.com') {
          const id = url.searchParams.get('v') || (url.pathname.match(/^\/shorts\/([^/]+)/) || [])[1] || (url.pathname.match(/^\/embed\/([^/]+)/) || [])[1]
          return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null
        }
        if (host === 'vimeo.com' || host === 'player.vimeo.com') {
          const id = url.pathname.split('/').filter(Boolean).pop()
          return /^\d+$/.test(id || '') ? `https://player.vimeo.com/video/${id}` : null
        }
        if (host === 'rutube.ru') {
          const match = url.pathname.match(/\/(?:video|play\/embed)\/([a-z0-9]+)/i)
          return match ? `https://rutube.ru/play/embed/${encodeURIComponent(match[1])}` : null
        }
      } catch (_) {}
      return null
    },
    inlineParts (text) {
      const source = String(text || '')
      const parts = []
      const pattern = /\[\[([^\]]+)\]\]|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*/g
      let lastIndex = 0
      let match
      while ((match = pattern.exec(source))) {
        if (match.index > lastIndex) parts.push({ type: 'text', text: source.slice(lastIndex, match.index) })
        if (match[1]) parts.push({ type: 'wiki-link', title: String(match[1]).trim() })
        else if (match[2]) parts.push({ type: 'external-link', text: match[2], url: match[3] })
        else parts.push({ type: 'strong', text: match[4] })
        lastIndex = pattern.lastIndex
      }
      if (lastIndex < source.length) parts.push({ type: 'text', text: source.slice(lastIndex) })
      return parts.length ? parts : [{ type: 'text', text: source }]
    },
    async openPage (id, updateRoute = true) {
      this.notice = { type: 'ok', text: '' }
      try {
        const data = await this.jsonRequest(`/api/admin/wiki/pages/${id}`, { headers: this.headers() })
        this.selectedPage = data.page
        this.canManage = Boolean(data.canManage)
        this.editing = false
        if (updateRoute && this.selectedPage.slug) {
          await this.$router.replace({ path: this.$route.path, query: { article: this.selectedPage.slug } }).catch(() => {})
        }
        this.$nextTick(() => {
          if (this.$refs.articleTitle) this.$refs.articleTitle.focus()
          if (window.innerWidth < 901) window.scrollTo({ top: 0, behavior: 'smooth' })
        })
      } catch (error) {
        this.notice = { type: 'error', text: error.message }
      }
    },
    goHome () {
      this.selectedPage = null
      this.editing = false
      this.$router.replace({ path: this.$route.path, query: {} }).catch(() => {})
    },
    async openWikiLink (title) {
      const id = this.pageTitleIndex[String(title || '').trim().toLowerCase()]
      if (!id) {
        this.notice = { type: 'error', text: this.isRu ? `Статья не найдена: ${title}` : `Article not found: ${title}` }
        return
      }
      await this.openPage(id)
    },
    startEdit () {
      if (!this.selectedPage) return
      this.editForm = { title: this.selectedPage.title || '', contentMarkdown: this.selectedPage.contentMarkdown || '' }
      this.editing = true
    },
    cancelEdit () { this.editing = false },
    async saveEdit () {
      if (!this.selectedPage) return
      this.saving = true
      this.notice = { type: 'ok', text: '' }
      try {
        const data = await this.jsonRequest(`/api/admin/wiki/pages/${this.selectedPage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...this.headers() },
          body: JSON.stringify(this.editForm)
        })
        this.selectedPage = { ...this.selectedPage, ...(data.page || {}) }
        this.editing = false
        await this.load()
        this.notice = { type: 'ok', text: this.isRu ? 'Статья сохранена.' : 'Article saved.' }
      } catch (error) {
        this.notice = { type: 'error', text: error.message }
      } finally {
        this.saving = false
      }
    },
    formatDate (value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleDateString(this.isRu ? 'ru-RU' : 'en-US')
    }
  }
}
</script>

<style scoped>
.wiki-page { min-height: 100vh; background: #f6f8fb; color: #17233d; }
.wiki-hero { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin: 28px 0 22px; }
.wiki-hero h1 { margin: 2px 0 8px; color: #17233d; font-size: 36px; line-height: 1.12; }
.wiki-hero__subtitle { max-width: 720px; margin: 0; color: #64748b; font-size: 16px; line-height: 1.5; }
.wiki-eyebrow { margin: 0; color: #3152ff; font-size: 12px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
.muted { margin: 0; color: #64748b; }
.notice { border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; }
.notice--error { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }
.wiki-layout { display: grid; grid-template-columns: minmax(240px, 300px) minmax(0, 1fr); gap: 20px; align-items: start; padding-bottom: 50px; }
.wiki-sidebar, .wiki-main { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 8px 28px rgba(23, 35, 61, .05); }
.wiki-sidebar { padding: 12px; display: flex; flex-direction: column; gap: 6px; position: sticky; top: 116px; max-height: calc(100vh - 136px); overflow: auto; }
.wiki-main { min-height: 620px; overflow: hidden; }
.wiki-home-link, .wiki-page-link { width: 100%; border: 0; background: transparent; border-radius: 9px; color: #334155; cursor: pointer; text-align: left; }
.wiki-home-link { display: flex; align-items: center; gap: 9px; padding: 11px 12px; font-weight: 900; }
.wiki-home-link--active, .wiki-page-link--active { color: #2444e8; background: #eef2ff; }
.wiki-search { display: block; margin: 6px 0 8px; }
.input { width: 100%; min-height: 42px; border: 1px solid #cbd5e1; border-radius: 9px; padding: 0 12px; background: #fff; color: #1f2937; }
.input:focus, .btn:focus, button:focus, a:focus { outline: 3px solid rgba(49, 82, 255, .24); outline-offset: 2px; }
.wiki-sidebar__label { margin: 7px 10px 3px; color: #94a3b8; font-size: 11px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
.wiki-page-link { padding: 9px 10px 9px calc(10px + var(--wiki-depth) * 14px); font-size: 13px; line-height: 1.35; }
.wiki-page-link__title { display: block; }
.wiki-missing-badge { display: inline-flex; width: fit-content; margin-top: 5px; border-radius: 999px; background: #fff1cf; padding: 3px 7px; color: #9a5800; font-size: 10px; font-weight: 900; text-decoration: none; }
.wiki-page-link--root { color: #17233d; font-weight: 900; }
.wiki-page-link:hover, .wiki-home-link:hover { background: #f1f5f9; }
.wiki-page-link--active:hover, .wiki-home-link--active:hover { background: #eef2ff; }
.wiki-loading, .wiki-home__empty { padding: 48px; color: #64748b; }
.wiki-welcome { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(280px, .9fr); gap: 32px; padding: 34px; background: linear-gradient(135deg, #f8faff 0%, #eef2ff 100%); border-bottom: 1px solid #e2e8f0; }
.wiki-welcome h2, .wiki-section-heading h2 { margin: 5px 0 10px; color: #17233d; font-size: 25px; }
.wiki-welcome p:not(.wiki-eyebrow) { max-width: 620px; margin: 0; color: #52617a; line-height: 1.6; }
.wiki-steps { margin: 0; padding: 0; list-style: none; counter-reset: wiki-step; display: grid; gap: 10px; }
.wiki-steps li { position: relative; min-height: 38px; padding-left: 48px; color: #334155; line-height: 1.45; counter-increment: wiki-step; }
.wiki-steps li::before { content: counter(wiki-step); position: absolute; left: 0; top: 0; display: grid; width: 32px; height: 32px; place-items: center; border-radius: 50%; background: #3152ff; color: #fff; font-weight: 900; }
.wiki-sections { padding: 32px; }
.wiki-section-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 20px; }
.wiki-section-heading h2 { margin-bottom: 0; }
.wiki-section-heading > span { color: #64748b; font-size: 13px; }
.wiki-section-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.wiki-section-card { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
.wiki-section-card__main { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 12px; width: 100%; border: 0; background: #fff; padding: 17px; color: #17233d; text-align: left; cursor: pointer; }
.wiki-section-card__main:hover { background: #f8fafc; }
.wiki-section-card__main:disabled { cursor: default; opacity: .82; }
.wiki-section-card__main:disabled:hover { background: #fff; }
.wiki-section-card__main strong, .wiki-section-card__main small { display: block; }
.wiki-section-card__main strong { margin-bottom: 5px; font-size: 16px; }
.wiki-section-card__main small { color: #64748b; line-height: 1.4; }
.wiki-section-card__icon { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 10px; background: #eef2ff; color: #3152ff; font-size: 19px; font-weight: 900; }
.wiki-arrow { color: #3152ff; font-size: 21px; }
.wiki-section-card__links { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 17px 17px 69px; }
.wiki-section-card__links button { display: inline-flex; flex-direction: column; align-items: flex-start; border: 0; background: transparent; padding: 0; color: #3152ff; cursor: pointer; font-size: 12px; text-align: left; text-decoration: underline; text-underline-offset: 3px; }
.wiki-section-card__links .wiki-missing-badge { text-decoration: none; }
.wiki-section-card__missing { margin: 0; padding: 0 17px 17px 69px; color: #b45309; font-size: 12px; font-weight: 800; }
.wiki-section-card--empty { border-style: dashed; background: #fffdf7; }
.wiki-reader { padding: 30px 34px 38px; }
.wiki-breadcrumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 25px; color: #94a3b8; font-size: 12px; }
.wiki-breadcrumbs button { border: 0; background: transparent; padding: 0; color: #64748b; cursor: pointer; }
.wiki-breadcrumbs button:hover { color: #3152ff; }
.wiki-reader__head { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 22px; margin-bottom: 26px; }
.wiki-requirements-missing { margin: -6px 0 26px; border: 1px solid #f2c469; border-radius: 10px; background: #fffaf0; padding: 14px 16px; color: #7c4a03; }
.wiki-requirements-missing strong { display: block; margin-bottom: 5px; }
.wiki-requirements-missing p { margin: 0; line-height: 1.5; }
.wiki-reader h2 { margin: 5px 0 8px; color: #17233d; font-size: 30px; line-height: 1.2; }
.wiki-reader h2:focus { outline: none; }
.wiki-content { max-width: 800px; color: #26344d; font-size: 15px; line-height: 1.7; overflow-wrap: anywhere; }
.wiki-content p { margin: 0 0 14px; }
.wiki-content ul, .wiki-content ol { margin: 0 0 18px; padding-left: 24px; }
.wiki-content li { margin-bottom: 7px; }
.wiki-content__heading { margin: 28px 0 12px; color: #17233d; line-height: 1.3; }
.wiki-content h1 { font-size: 25px; }
.wiki-content h2 { font-size: 21px; }
.wiki-content h3 { font-size: 17px; }
.wiki-content blockquote { margin: 18px 0; border-left: 4px solid #3152ff; border-radius: 0 8px 8px 0; background: #f8faff; padding: 14px 18px; color: #40506b; }
.wiki-content pre { max-width: 100%; overflow: auto; border-radius: 10px; background: #17233d; padding: 16px; color: #f8fafc; }
.wiki-content hr { border: 0; border-top: 1px solid #e2e8f0; margin: 26px 0; }
.wiki-media { margin: 26px 0; }
.wiki-media img { display: block; width: 100%; max-height: 680px; border: 1px solid #dbe3ef; border-radius: 12px; background: #f8fafc; object-fit: contain; box-shadow: 0 12px 30px rgba(23, 35, 61, .09); }
.wiki-media figcaption { margin-top: 9px; color: #64748b; font-size: 12px; line-height: 1.5; text-align: center; }
.wiki-video-frame { position: relative; overflow: hidden; width: 100%; aspect-ratio: 16 / 9; border-radius: 12px; background: #101827; box-shadow: 0 12px 30px rgba(23, 35, 61, .16); }
.wiki-video-frame iframe, .wiki-video-frame video { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.wiki-content a, .wiki-inline-link { color: #3152ff; font: inherit; font-weight: 800; text-decoration: underline; text-underline-offset: 3px; }
.wiki-inline-link { border: 0; background: transparent; padding: 0; cursor: pointer; }
.wiki-related { margin-top: 34px; border-top: 1px solid #e2e8f0; padding-top: 24px; }
.wiki-related h3 { margin: 0 0 14px; color: #17233d; font-size: 18px; }
.wiki-related__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.wiki-related__grid button { display: flex; justify-content: space-between; gap: 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; padding: 13px 14px; color: #26344d; cursor: pointer; text-align: left; }
.wiki-related__grid button:hover { border-color: #a5b4fc; background: #f8faff; }
.wiki-edit { display: grid; gap: 14px; }
.wiki-edit label { display: grid; gap: 6px; color: #17233d; font-weight: 900; }
.wiki-edit__textarea { min-height: 420px; border: 1px solid #cbd5e1; border-radius: 9px; padding: 12px; resize: vertical; font: inherit; line-height: 1.55; color: #1f2937; }
.wiki-edit__hint { border-radius: 9px; background: #f8fafc; padding: 10px 12px; color: #64748b; font-size: 12px; }
.wiki-edit__hint p { margin: 0 0 4px; }
.wiki-edit__hint p:last-child { margin-bottom: 0; }
.wiki-edit__actions { display: flex; gap: 10px; }
.empty-state { padding: 18px 12px; color: #64748b; font-size: 13px; }
.empty-state strong, .wiki-home__empty strong { display: block; color: #17233d; margin-bottom: 6px; }
.btn { min-height: 42px; border: 1px solid #cbd5e1; border-radius: 9px; background: #fff; color: #17233d; padding: 0 14px; font-weight: 900; cursor: pointer; }
.btn--primary { background: #3152ff; border-color: #3152ff; color: #fff; }
.btn--small { min-height: 36px; font-size: 13px; }
.btn:disabled { opacity: .65; cursor: not-allowed; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 1000px) {
  .wiki-layout { grid-template-columns: 240px minmax(0, 1fr); }
  .wiki-welcome { grid-template-columns: 1fr; }
  .wiki-section-grid { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .wiki-hero { align-items: flex-start; flex-direction: column; }
  .wiki-hero h1 { font-size: 30px; }
  .wiki-layout { grid-template-columns: 1fr; }
  .wiki-sidebar { position: static; max-height: 380px; }
  .wiki-welcome, .wiki-sections, .wiki-reader { padding: 24px 20px; }
  .wiki-related__grid { grid-template-columns: 1fr; }
  .wiki-reader__head { flex-direction: column; }
}
</style>
