<template>
  <div>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>

    <section class="site-section site-section--pf map-section">
      <div class="container">
        <admin-tabs />

        <div class="map-head">
          <div>
            <h1>{{ t.title }}</h1>
            <p>{{ t.subtitle }}</p>
          </div>
          <div class="map-actions">
            <a v-if="mapInfo.googleMap" :href="mapInfo.googleMap.editUrl" target="_blank" rel="noopener" class="btn btn--primary">
              {{ t.openGoogleMap }}
            </a>
            <nuxt-link to="/admin-settings" class="btn btn--ghost">{{ t.updateSource }}</nuxt-link>
          </div>
        </div>

        <div class="map-status-grid">
          <article class="status-card">
            <strong>{{ mapInfo.polygonZoneCount || 0 }}</strong>
            <span>{{ t.polygons }}</span>
          </article>
          <article class="status-card">
            <strong>{{ mapInfo.londonPostcodes && mapInfo.londonPostcodes.districtCount || 0 }}</strong>
            <span>{{ t.londonPostcodes }}</span>
          </article>
          <article class="status-card">
            <strong>{{ mapInfo.latest && mapInfo.latest.originalFileName || '—' }}</strong>
            <span>{{ t.source }}</span>
          </article>
          <article class="status-card">
            <strong>{{ formattedUpdatedAt }}</strong>
            <span>{{ t.updated }}</span>
          </article>
        </div>

        <div v-if="loading" class="map-state">{{ t.loading }}</div>
        <div v-else-if="error" class="map-state map-state--error">
          <strong>{{ t.loadFailed }}</strong>
          <span>{{ error }}</span>
          <button type="button" class="btn btn--ghost" @click="loadMap">{{ t.retry }}</button>
        </div>
        <div v-else-if="!mapInfo.configured" class="map-state">
          <strong>{{ t.noZones }}</strong>
          <span>{{ t.noZonesHint }}</span>
          <nuxt-link to="/admin-settings" class="btn btn--primary">{{ t.upload }}</nuxt-link>
        </div>
        <div v-else-if="!mapInfo.googleMap" class="map-state">
          <strong>{{ t.mapNotLinked }}</strong>
          <span>{{ t.mapNotLinkedHint }}</span>
        </div>
        <div v-else class="map-workspace">
          <div class="map-note">
            <strong>{{ t.whatToDo }}</strong>
            <span>{{ t.whatToDoHint }}</span>
            <a v-if="mapInfo.londonPostcodes" :href="mapInfo.londonPostcodes.sourceUrl" target="_blank" rel="noopener">
              {{ mapInfo.londonPostcodes.attribution }}
            </a>
          </div>
          <iframe
            class="network-map"
            :src="mapInfo.googleMap.embedUrl"
            :title="t.frameTitle"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            allowfullscreen
          ></iframe>

          <section class="postcode-editor">
            <div class="postcode-editor__head">
              <div>
                <h2>{{ t.correctZone }}</h2>
                <p>{{ t.correctZoneHint }}</p>
              </div>
              <span v-if="postcodeLoading" class="postcode-badge">{{ t.loadingZones }}</span>
            </div>

            <div v-if="postcodeError" class="postcode-alert postcode-alert--error">{{ postcodeError }}</div>
            <div v-if="proposalNotice" class="postcode-alert">{{ proposalNotice }}</div>

            <label class="postcode-field">
              <span>{{ t.postcodeLabel }}</span>
              <input v-model.trim="postcodeSearch" type="text" :placeholder="t.postcodePlaceholder" @keyup.enter="selectExactPostcode">
            </label>

            <div v-if="postcodeSearch && postcodeMatches.length" class="postcode-results">
              <button
                v-for="row in postcodeMatches"
                :key="row.district"
                type="button"
                :class="['postcode-result', { 'postcode-result--selected': selectedDistrict === row.district }]"
                @click="selectPostcode(row)"
              >
                <strong>{{ row.district }}</strong>
                <span>{{ row.effectiveZone }}</span>
                <small v-if="row.changed">{{ t.approvedCorrection }}</small>
                <small v-else-if="row.pendingProposal">{{ t.pending }}</small>
              </button>
            </div>
            <div v-else-if="postcodeSearch && !postcodeLoading" class="postcode-empty">{{ t.noPostcode }}</div>

            <div v-if="selectedPostcode" class="postcode-selection">
              <div class="postcode-current">
                <span>{{ t.currentMapping }}</span>
                <strong>{{ selectedPostcode.district }} → {{ selectedPostcode.effectiveZone }}</strong>
                <small v-if="selectedPostcode.baseZone !== selectedPostcode.effectiveZone">
                  {{ t.baseMapping }}: {{ selectedPostcode.baseZone }}
                </small>
              </div>

              <div v-if="selectedPostcode.pendingProposal" class="postcode-alert postcode-alert--pending">
                <strong>{{ t.awaitingApproval }}</strong>
                <span>{{ selectedPostcode.pendingProposal.currentZone }} → {{ selectedPostcode.pendingProposal.proposedZone }}</span>
                <span>{{ selectedPostcode.pendingProposal.reason }}</span>
              </div>

              <form v-else class="postcode-form" @submit.prevent="submitProposal">
                <label class="postcode-field">
                  <span>{{ t.newZone }}</span>
                  <select v-model="proposedZone" required>
                    <option value="" disabled>{{ t.chooseZone }}</option>
                    <option v-for="zone in tariffZones" :key="zone" :value="zone">{{ zone }}</option>
                  </select>
                </label>
                <label class="postcode-field postcode-field--wide">
                  <span>{{ t.reason }}</span>
                  <textarea v-model.trim="proposalReason" rows="2" :placeholder="t.reasonPlaceholder" required></textarea>
                </label>
                <button type="submit" class="btn btn--primary" :disabled="proposalSaving || !canSubmitProposal">
                  {{ proposalSaving ? t.sending : t.submitForApproval }}
                </button>
              </form>
            </div>

            <div v-if="pendingProposals.length" class="approval-queue">
              <h3>{{ t.approvalQueue }} <span>{{ pendingProposals.length }}</span></h3>
              <article v-for="proposal in pendingProposals" :key="proposal.id" class="approval-row">
                <div>
                  <strong>{{ proposal.district }}: {{ proposal.currentZone }} → {{ proposal.proposedZone }}</strong>
                  <p>{{ proposal.reason }}</p>
                </div>
                <div v-if="canApprove" class="approval-actions">
                  <input v-model.trim="reviewReasons[proposal.id]" type="text" :placeholder="t.reviewComment">
                  <button type="button" class="btn btn--primary" :disabled="resolvingId === proposal.id" @click="resolveProposal(proposal, 'approved')">{{ t.approve }}</button>
                  <button type="button" class="btn btn--ghost" :disabled="resolvingId === proposal.id" @click="resolveProposal(proposal, 'rejected')">{{ t.reject }}</button>
                </div>
                <span v-else class="postcode-badge">{{ t.responsibleWillReview }}</span>
              </article>
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import adminTabs from '~/components/partials/adminTabs.vue'

export default {
  layout: 'admin',
  middleware: 'staff',
  components: { adminTabs },
  data: () => ({
    loading: true,
    error: '',
    mapInfo: {},
    postcodeLoading: true,
    postcodeError: '',
    postcodeRows: [],
    postcodeSearch: '',
    selectedDistrict: '',
    proposedZone: '',
    proposalReason: '',
    proposalSaving: false,
    proposalNotice: '',
    pendingProposals: [],
    tariffZones: [],
    canApprove: false,
    resolvingId: '',
    reviewReasons: {}
  }),
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'Карта сети Riderra',
            subtitle: 'Проверьте границы геозон, найдите нужный город или аэропорт и убедитесь, что адрес попадает в правильный тарифный район.',
            openGoogleMap: 'Редактировать в Google My Maps',
            updateSource: 'Обновить файл геозон',
            polygons: 'активных полигонов',
            londonPostcodes: 'район Лондона по индексу',
            source: 'источник карты',
            updated: 'обновлено',
            loading: 'Загружаем карту сети…',
            loadFailed: 'Не удалось загрузить карту',
            retry: 'Повторить',
            noZones: 'Файл геозон ещё не подключён',
            noZonesHint: 'Загрузите мастер-файл KML или GeoJSON, чтобы Riderra могла определять тарифную зону адреса.',
            upload: 'Загрузить геозоны',
            mapNotLinked: 'Геозоны подключены, но Google-карта не привязана',
            mapNotLinkedHint: 'Добавьте GOOGLE_MY_MAPS_ID в конфигурацию сервера.',
            whatToDo: 'Как пользоваться картой',
            whatToDoHint: 'Для Лондона найдите почтовый район, например NW6: в его названии указана тарифная зона Riderra. Для остальных городов найдите зону по названию и сравните её с адресом заказа.',
            frameTitle: 'Геозоны Riderra в Google My Maps',
            correctZone: 'Исправить тарифную зону Лондона',
            correctZoneHint: 'Граница почтового района остаётся прежней. Укажите правильную тарифную зону и причину: изменение начнёт действовать в расчётах бота только после согласования.',
            loadingZones: 'Загружаем индексы…',
            postcodeLabel: 'Почтовый индекс или район',
            postcodePlaceholder: 'Например, NW6 или NW6 1AA',
            approvedCorrection: 'подтверждённое исправление',
            pending: 'ждёт согласования',
            noPostcode: 'Такой почтовый район не найден на карте Лондона.',
            currentMapping: 'Сейчас используется',
            baseMapping: 'исходная зона карты',
            awaitingApproval: 'Предложение уже ждёт согласования',
            newZone: 'Правильная тарифная зона',
            chooseZone: 'Выберите зону',
            reason: 'Почему нужно изменить',
            reasonPlaceholder: 'Например: подтверждено прайс-листом Royal Taxis',
            sending: 'Отправляем…',
            submitForApproval: 'Отправить на согласование',
            approvalQueue: 'Ожидают проверки',
            reviewComment: 'Комментарий проверяющего',
            approve: 'Одобрить',
            reject: 'Отклонить',
            responsibleWillReview: 'Проверит ответственный за цены',
            proposalCreated: 'Предложение отправлено. До одобрения действует прежняя зона.',
            proposalApproved: 'Исправление одобрено и уже применяется в расчётах.',
            proposalRejected: 'Предложение отклонено.'
          }
        : {
            title: 'Riderra network map',
            subtitle: 'Review geo-zone boundaries, find a city or airport, and confirm that an address belongs to the correct pricing area.',
            openGoogleMap: 'Edit in Google My Maps',
            updateSource: 'Update geo-zone file',
            polygons: 'active polygons',
            londonPostcodes: 'London postcode districts',
            source: 'map source',
            updated: 'updated',
            loading: 'Loading the network map…',
            loadFailed: 'Could not load the map',
            retry: 'Retry',
            noZones: 'No geo-zone file is connected',
            noZonesHint: 'Upload a master KML or GeoJSON file so Riderra can resolve an address to its pricing zone.',
            upload: 'Upload geo zones',
            mapNotLinked: 'Geo zones are ready, but the Google map is not linked',
            mapNotLinkedHint: 'Add GOOGLE_MY_MAPS_ID to the server configuration.',
            whatToDo: 'How to use this map',
            whatToDoHint: 'For London, find a postcode district such as NW6: its name includes the Riderra tariff zone. For other cities, find the zone by name and compare it with the order address.',
            frameTitle: 'Riderra geo zones in Google My Maps',
            correctZone: 'Correct a London tariff zone',
            correctZoneHint: 'The postcode boundary stays unchanged. Select the correct tariff zone and explain why; the bot will use it only after approval.',
            loadingZones: 'Loading postcodes…', postcodeLabel: 'Postcode or district', postcodePlaceholder: 'For example, NW6 or NW6 1AA',
            approvedCorrection: 'approved correction', pending: 'awaiting approval', noPostcode: 'This London postcode district was not found.',
            currentMapping: 'Currently used', baseMapping: 'base map zone', awaitingApproval: 'A proposal is already awaiting approval',
            newZone: 'Correct tariff zone', chooseZone: 'Choose a zone', reason: 'Reason for change', reasonPlaceholder: 'For example: confirmed by the Royal Taxis price list',
            sending: 'Sending…', submitForApproval: 'Submit for approval', approvalQueue: 'Awaiting review', reviewComment: 'Reviewer comment',
            approve: 'Approve', reject: 'Reject', responsibleWillReview: 'Pricing owner will review', proposalCreated: 'Proposal sent. The previous zone remains active until approval.',
            proposalApproved: 'The correction is approved and is now used in calculations.', proposalRejected: 'The proposal was rejected.'
          }
    },
    formattedUpdatedAt () {
      const value = this.mapInfo.latest && this.mapInfo.latest.uploadedAt
      if (!value) return '—'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '—'
      return date.toLocaleString(this.$store.state.language === 'ru' ? 'ru-RU' : 'en-GB')
    },
    postcodeMatches () {
      const query = this.normalizedPostcodeSearch()
      if (!query) return []
      return this.postcodeRows.filter(row => row.district.includes(query)).slice(0, 8)
    },
    selectedPostcode () {
      return this.postcodeRows.find(row => row.district === this.selectedDistrict) || null
    },
    canSubmitProposal () {
      return Boolean(this.selectedPostcode && this.proposedZone && this.proposedZone !== this.selectedPostcode.effectiveZone && this.proposalReason.length >= 3)
    }
  },
  mounted () {
    this.loadMap()
    this.loadPostcodes()
  },
  methods: {
    authHeaders () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
    async loadMap () {
      this.loading = true
      this.error = ''
      try {
        const response = await fetch('/api/admin/geo-zones/map', { headers: this.authHeaders() })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
        this.mapInfo = data
      } catch (error) {
        this.error = error.message || String(error)
      } finally {
        this.loading = false
      }
    },
    normalizedPostcodeSearch () {
      return String(this.postcodeSearch || '').toUpperCase().replace(/[^A-Z0-9]/g, '').match(/^[A-Z]{1,2}\d{1,2}[A-Z]?/)?.[0] || ''
    },
    selectExactPostcode () {
      const query = this.normalizedPostcodeSearch()
      const exact = this.postcodeRows.find(row => row.district === query)
      if (exact) this.selectPostcode(exact)
    },
    selectPostcode (row) {
      this.selectedDistrict = row.district
      this.postcodeSearch = row.district
      this.proposedZone = ''
      this.proposalReason = ''
      this.proposalNotice = ''
    },
    async loadPostcodes () {
      this.postcodeLoading = true
      this.postcodeError = ''
      try {
        const response = await fetch('/api/admin/geo-zones/london-postcodes', { headers: this.authHeaders() })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
        this.postcodeRows = data.rows || []
        this.pendingProposals = data.pending || []
        this.tariffZones = data.tariffZones || []
        this.canApprove = Boolean(data.canApprove)
      } catch (error) {
        this.postcodeError = error.message || String(error)
      } finally {
        this.postcodeLoading = false
      }
    },
    async submitProposal () {
      if (!this.canSubmitProposal) return
      this.proposalSaving = true
      this.postcodeError = ''
      try {
        const response = await fetch(`/api/admin/geo-zones/london-postcodes/${encodeURIComponent(this.selectedDistrict)}/proposals`, {
          method: 'POST',
          headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposedZone: this.proposedZone, reason: this.proposalReason })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
        this.proposalNotice = this.t.proposalCreated
        await this.loadPostcodes()
      } catch (error) {
        this.postcodeError = error.message || String(error)
      } finally {
        this.proposalSaving = false
      }
    },
    async resolveProposal (proposal, decision) {
      this.resolvingId = proposal.id
      this.postcodeError = ''
      try {
        const response = await fetch(`/api/admin/geo-zones/london-postcodes/proposals/${encodeURIComponent(proposal.id)}/resolve`, {
          method: 'POST',
          headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision, reason: this.reviewReasons[proposal.id] || '' })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
        this.proposalNotice = decision === 'approved' ? this.t.proposalApproved : this.t.proposalRejected
        await this.loadPostcodes()
      } catch (error) {
        this.postcodeError = error.message || String(error)
      } finally {
        this.resolvingId = ''
      }
    }
  }
}
</script>

<style scoped>
.map-section { padding-top: 150px; min-height: 100vh; }

.map-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin: 6px 0 18px;
}

.map-head h1 { margin: 0; color: #17233d; font-size: 30px; }
.map-head p { margin: 7px 0 0; max-width: 780px; color: #60708f; line-height: 1.5; }
.map-actions { display: flex; flex-wrap: wrap; gap: 8px; }

.map-status-grid {
  display: grid;
  grid-template-columns: 0.6fr 0.7fr 1.5fr 0.8fr;
  gap: 10px;
  margin-bottom: 14px;
}

.status-card {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 13px 15px;
  border: 1px solid #d8e0ef;
  border-radius: 14px;
  background: #fff;
}

.status-card strong { overflow: hidden; color: #17233d; text-overflow: ellipsis; white-space: nowrap; }
.status-card span { color: #6b7280; font-size: 12px; }

.map-workspace {
  overflow: hidden;
  border: 1px solid #d8e0ef;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 14px 30px rgba(16, 30, 67, 0.08);
}

.map-note { display: grid; gap: 3px; padding: 13px 16px; border-bottom: 1px solid #e5eaf2; color: #52627b; }
.map-note strong { color: #17233d; }
.map-note span { font-size: 13px; line-height: 1.45; }
.map-note a { color: #315fba; font-size: 11px; }
.network-map { display: block; width: 100%; height: min(68vh, 760px); min-height: 520px; border: 0; }

.postcode-editor { padding: 20px; border-top: 1px solid #e5eaf2; }
.postcode-editor__head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
.postcode-editor__head h2 { margin: 0; color: #17233d; font-size: 21px; }
.postcode-editor__head p { max-width: 840px; margin: 5px 0 0; color: #60708f; font-size: 13px; line-height: 1.5; }
.postcode-badge { align-self: center; padding: 5px 9px; border-radius: 999px; background: #eef3fb; color: #52627b; font-size: 11px; }
.postcode-field { display: grid; gap: 6px; max-width: 420px; color: #52627b; font-size: 12px; font-weight: 600; }
.postcode-field input, .postcode-field select, .postcode-field textarea, .approval-actions input {
  box-sizing: border-box;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cfd8e8;
  border-radius: 10px;
  background: #fff;
  color: #17233d;
  font: inherit;
}
.postcode-field textarea { resize: vertical; }
.postcode-results { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.postcode-result { display: grid; gap: 2px; min-width: 150px; padding: 9px 11px; border: 1px solid #d8e0ef; border-radius: 10px; background: #fff; color: #52627b; text-align: left; cursor: pointer; }
.postcode-result strong { color: #17233d; }
.postcode-result small { color: #96701e; }
.postcode-result--selected { border-color: #315fba; background: #f4f7fd; }
.postcode-empty { margin-top: 10px; color: #9a3b3b; font-size: 13px; }
.postcode-selection { display: grid; gap: 14px; margin-top: 16px; padding: 15px; border: 1px solid #d8e0ef; border-radius: 14px; background: #f9fbff; }
.postcode-current { display: grid; gap: 3px; color: #60708f; font-size: 12px; }
.postcode-current strong { color: #17233d; font-size: 16px; }
.postcode-form { display: grid; grid-template-columns: minmax(220px, 0.7fr) minmax(320px, 1.3fr) auto; gap: 12px; align-items: end; }
.postcode-field--wide { max-width: none; }
.postcode-alert { display: grid; gap: 3px; margin-bottom: 12px; padding: 10px 12px; border: 1px solid #b8d5c3; border-radius: 10px; background: #f2fbf5; color: #356446; font-size: 13px; }
.postcode-alert--pending { margin: 0; border-color: #ead6a4; background: #fff9e9; color: #735919; }
.postcode-alert--error { border-color: #efb5b5; background: #fff6f6; color: #9a3030; }
.approval-queue { margin-top: 20px; }
.approval-queue h3 { margin: 0 0 10px; color: #17233d; font-size: 17px; }
.approval-queue h3 span { display: inline-block; min-width: 22px; padding: 2px 6px; border-radius: 999px; background: #eef3fb; text-align: center; }
.approval-row { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(300px, auto); gap: 16px; align-items: center; padding: 12px 0; border-top: 1px solid #e5eaf2; }
.approval-row p { margin: 4px 0 0; color: #60708f; font-size: 12px; }
.approval-actions { display: grid; grid-template-columns: minmax(180px, 1fr) auto auto; gap: 7px; align-items: center; }

.map-state {
  display: grid;
  justify-items: start;
  gap: 10px;
  padding: 28px;
  border: 1px dashed #cbd5e1;
  border-radius: 16px;
  background: #fff;
  color: #60708f;
}

.map-state strong { color: #17233d; font-size: 18px; }
.map-state--error { border-color: #f0b8b8; background: #fff8f8; }

@media (max-width: 760px) {
  .map-head { flex-direction: column; }
  .map-status-grid { grid-template-columns: 1fr; }
  .network-map { min-height: 560px; }
  .postcode-editor__head { flex-direction: column; }
  .postcode-form, .approval-row, .approval-actions { grid-template-columns: 1fr; }
}
</style>
