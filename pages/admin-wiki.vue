<template>
  <div>
    <navigation />
    <section class="site-section site-section--pf wiki-page">
      <div class="container">
        <admin-tabs />

        <div class="wiki-toolbar">
          <div>
            <h1>{{ t.title }}</h1>
            <p class="muted">{{ t.subtitle }}</p>
          </div>
          <button class="btn" type="button" @click="load">{{ loading ? t.loading : t.refresh }}</button>
        </div>

        <div v-if="notice.text" class="notice" :class="notice.type === 'error' ? 'notice--error' : 'notice--ok'">
          {{ notice.text }}
        </div>

        <div v-if="canManage" class="wiki-import">
          <div>
            <h3>{{ t.importTitle }}</h3>
            <p class="muted">{{ t.importHint }}</p>
          </div>
          <div class="wiki-import__controls">
            <input v-model="notionPageUrl" class="input" :placeholder="t.notionPlaceholder" />
            <button class="btn btn--primary" type="button" :disabled="importing" @click="importNotion">
              {{ importing ? t.importing : t.importAction }}
            </button>
          </div>
        </div>

        <div class="wiki-layout">
          <aside class="wiki-sidebar">
            <input v-model="query" class="input" :placeholder="t.search" @input="queueSearch" />
            <div v-if="!pages.length && !loading" class="empty-state">
              <strong>{{ t.emptyTitle }}</strong>
              <p>{{ canManage ? t.emptyAdmin : t.emptyStaff }}</p>
            </div>
            <button
              v-for="page in pages"
              :key="page.id"
              class="wiki-page-link"
              :class="{ 'wiki-page-link--active': selectedPage && selectedPage.id === page.id }"
              type="button"
              @click="openPage(page.id)"
            >
              <span>{{ page.title }}</span>
              <small>{{ formatDate(page.updatedAt) }}</small>
            </button>
          </aside>

          <article class="wiki-reader">
            <div v-if="selectedPage" class="wiki-reader__inner">
              <div class="wiki-reader__head">
                <div>
                  <h2>{{ selectedPage.title }}</h2>
                  <p class="muted">{{ [selectedPage.sourceProvider, formatDate(selectedPage.importedAt || selectedPage.updatedAt)].filter(Boolean).join(' · ') }}</p>
                </div>
                <div class="wiki-reader__actions">
                  <button v-if="canManage && !editing" class="btn btn--small" type="button" @click="startEdit">{{ t.edit }}</button>
                  <a v-if="selectedPage.sourceUrl" class="btn btn--small" :href="selectedPage.sourceUrl" target="_blank" rel="noopener">
                    {{ t.openSource }}
                  </a>
                </div>
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
                <div class="wiki-edit__actions">
                  <button class="btn btn--primary" type="button" :disabled="saving" @click="saveEdit">{{ saving ? t.saving : t.save }}</button>
                  <button class="btn" type="button" :disabled="saving" @click="cancelEdit">{{ t.cancel }}</button>
                </div>
              </div>
              <pre v-else class="wiki-content">{{ selectedPage.contentMarkdown || t.noContent }}</pre>
              <div v-if="selectedPage.children && selectedPage.children.length" class="wiki-children">
                <h3>{{ t.children }}</h3>
                <button v-for="child in selectedPage.children" :key="child.id" class="wiki-child" type="button" @click="openPage(child.id)">
                  {{ child.title }}
                </button>
              </div>
            </div>
            <div v-else class="wiki-reader__empty">
              <strong>{{ t.readerEmptyTitle }}</strong>
              <p>{{ t.readerEmptyHint }}</p>
            </div>
          </article>
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
    importing: false,
    saving: false,
    editing: false,
    canManage: false,
    editForm: { title: '', contentMarkdown: '' },
    notionPageUrl: 'https://app.notion.com/p/riderra/WIKI-457c36d317334a8fb59ae807a87532a5',
    notice: { type: 'ok', text: '' },
    searchTimer: null
  }),
  computed: {
    isRu () { return this.$store.state.language === 'ru' },
    t () {
      return this.isRu
        ? {
            title: 'Вики',
            subtitle: 'Внутренняя база знаний Riderra для сотрудников.',
            refresh: 'Обновить',
            loading: 'Загрузка...',
            search: 'Поиск по Вики',
            importTitle: 'Импорт из Notion',
            importHint: 'Разовый импорт WIKI. Страница Notion должна быть расшарена на интеграцию Riderra.',
            notionPlaceholder: 'Notion WIKI URL или page id',
            importAction: 'Импортировать',
            importing: 'Импорт...',
            emptyTitle: 'Вики ещё не импортирована',
            emptyAdmin: 'Вставьте ссылку на Notion WIKI и запустите импорт.',
            emptyStaff: 'Попросите администратора импортировать внутреннюю WIKI.',
            openSource: 'Открыть источник',
            noContent: 'В статье пока нет текста.',
            children: 'Вложенные страницы',
            readerEmptyTitle: 'Выберите статью',
            readerEmptyHint: 'Слева появятся разделы внутренней базы знаний после импорта.',
            edit: 'Редактировать',
            editTitle: 'Заголовок',
            editContent: 'Текст статьи',
            save: 'Сохранить',
            saving: 'Сохранение...',
            cancel: 'Отмена'
          }
        : {
            title: 'Wiki',
            subtitle: 'Internal Riderra knowledge base for staff.',
            refresh: 'Refresh',
            loading: 'Loading...',
            search: 'Search Wiki',
            importTitle: 'Import from Notion',
            importHint: 'One-time WIKI import. The Notion page must be shared with the Riderra integration.',
            notionPlaceholder: 'Notion WIKI URL or page id',
            importAction: 'Import',
            importing: 'Importing...',
            emptyTitle: 'Wiki has not been imported yet',
            emptyAdmin: 'Paste the Notion WIKI link and start import.',
            emptyStaff: 'Ask an administrator to import the internal WIKI.',
            openSource: 'Open source',
            noContent: 'This article has no text yet.',
            children: 'Child pages',
            readerEmptyTitle: 'Choose an article',
            readerEmptyHint: 'Internal knowledge base sections will appear on the left after import.',
            edit: 'Edit',
            editTitle: 'Title',
            editContent: 'Article text',
            save: 'Save',
            saving: 'Saving...',
            cancel: 'Cancel'
          }
    }
  },
  mounted () {
    this.load()
  },
  beforeDestroy () {
    if (this.searchTimer) clearTimeout(this.searchTimer)
  },
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
        if (!this.selectedPage && this.pages.length) await this.openPage(this.pages[0].id)
        if (this.selectedPage && !this.pages.some((page) => page.id === this.selectedPage.id)) {
          this.selectedPage = null
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
    async openPage (id) {
      this.notice = { type: 'ok', text: '' }
      try {
        const data = await this.jsonRequest(`/api/admin/wiki/pages/${id}`, { headers: this.headers() })
        this.selectedPage = data.page
        this.canManage = Boolean(data.canManage)
        this.editing = false
      } catch (error) {
        this.notice = { type: 'error', text: error.message }
      }
    },
    startEdit () {
      if (!this.selectedPage) return
      this.editForm = {
        title: this.selectedPage.title || '',
        contentMarkdown: this.selectedPage.contentMarkdown || ''
      }
      this.editing = true
    },
    cancelEdit () {
      this.editing = false
    },
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
    async importNotion () {
      if (!this.notionPageUrl.trim()) {
        this.notice = { type: 'error', text: this.isRu ? 'Укажите ссылку на Notion WIKI.' : 'Enter the Notion WIKI link.' }
        return
      }
      this.importing = true
      this.notice = { type: 'ok', text: '' }
      try {
        const data = await this.jsonRequest('/api/admin/wiki/import-notion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...this.headers() },
          body: JSON.stringify({ pageUrl: this.notionPageUrl })
        })
        this.notice = {
          type: 'ok',
          text: this.isRu ? `Импортировано страниц: ${data.imported || 0}.` : `Imported pages: ${data.imported || 0}.`
        }
        await this.load()
        if (data.rootPageId) await this.openPage(data.rootPageId)
      } catch (error) {
        this.notice = { type: 'error', text: error.message }
      } finally {
        this.importing = false
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
.wiki-page { min-height: 100vh; background: #f6f8fb; }
.wiki-toolbar { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin: 24px 0 18px; }
.wiki-toolbar h1 { margin: 0 0 6px; color: #1d2c4a; font-size: 32px; }
.muted { margin: 0; color: #64748b; }
.notice { border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; }
.notice--error { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }
.notice--ok { border-color: #bbf7d0; background: #f0fdf4; color: #166534; }
.wiki-import { display: grid; grid-template-columns: minmax(260px, .8fr) minmax(320px, 1.2fr); gap: 16px; align-items: end; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 18px; }
.wiki-import h3 { margin: 0 0 6px; color: #1d2c4a; }
.wiki-import__controls { display: flex; gap: 10px; }
.input { width: 100%; min-height: 42px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; background: #fff; color: #1f2937; }
.wiki-layout { display: grid; grid-template-columns: minmax(260px, 340px) minmax(0, 1fr); gap: 18px; align-items: start; }
.wiki-sidebar, .wiki-reader { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
.wiki-sidebar { padding: 14px; display: flex; flex-direction: column; gap: 10px; position: sticky; top: 130px; max-height: calc(100vh - 150px); overflow: auto; }
.wiki-page-link { text-align: left; border: 1px solid #e2e8f0; background: #fff; border-radius: 8px; padding: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; color: #1d2c4a; }
.wiki-page-link--active { border-color: #3152ff; background: #eef2ff; }
.wiki-page-link span { font-weight: 800; }
.wiki-page-link small { color: #64748b; }
.wiki-reader { min-height: 520px; }
.wiki-reader__inner { padding: 24px; }
.wiki-reader__head { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 18px; }
.wiki-reader__actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.wiki-reader h2 { margin: 0 0 8px; color: #1d2c4a; font-size: 28px; }
.wiki-content { white-space: pre-wrap; word-break: break-word; font-family: inherit; color: #1f2937; font-size: 15px; line-height: 1.65; margin: 0; }
.wiki-edit { display: grid; gap: 14px; }
.wiki-edit label { display: grid; gap: 6px; color: #1d2c4a; font-weight: 800; }
.wiki-edit__textarea { min-height: 360px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; resize: vertical; font: inherit; line-height: 1.55; color: #1f2937; }
.wiki-edit__actions { display: flex; gap: 10px; }
.wiki-reader__empty, .empty-state { padding: 24px; color: #64748b; }
.wiki-reader__empty strong, .empty-state strong { display: block; color: #1d2c4a; margin-bottom: 6px; }
.wiki-children { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 18px; }
.wiki-child { display: inline-flex; margin: 0 8px 8px 0; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; padding: 8px 10px; cursor: pointer; color: #1d2c4a; }
.btn { min-height: 42px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #1d2c4a; padding: 0 14px; font-weight: 800; cursor: pointer; }
.btn--primary { background: #3152ff; border-color: #3152ff; color: #fff; }
.btn--small { min-height: 34px; font-size: 13px; text-decoration: none; display: inline-flex; align-items: center; }
.btn:disabled { opacity: .65; cursor: not-allowed; }
@media (max-width: 900px) {
  .wiki-toolbar, .wiki-import, .wiki-layout { grid-template-columns: 1fr; }
  .wiki-toolbar { align-items: flex-start; flex-direction: column; }
  .wiki-import__controls { flex-direction: column; }
  .wiki-sidebar { position: static; max-height: none; }
}
</style>
