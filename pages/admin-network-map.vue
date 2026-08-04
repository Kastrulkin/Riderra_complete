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
          </div>
          <iframe
            class="network-map"
            :src="mapInfo.googleMap.embedUrl"
            :title="t.frameTitle"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            allowfullscreen
          ></iframe>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import adminTabs from '~/components/partials/adminTabs.vue'

export default {
  layout: 'admin',
  middleware: 'crm',
  components: { adminTabs },
  data: () => ({
    loading: true,
    error: '',
    mapInfo: {}
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
            whatToDoHint: 'Найдите зону по названию, приблизьте границы и сравните их с адресом заказа. Изменения в Google нужно экспортировать в KML и загрузить в Riderra.',
            frameTitle: 'Геозоны Riderra в Google My Maps'
          }
        : {
            title: 'Riderra network map',
            subtitle: 'Review geo-zone boundaries, find a city or airport, and confirm that an address belongs to the correct pricing area.',
            openGoogleMap: 'Edit in Google My Maps',
            updateSource: 'Update geo-zone file',
            polygons: 'active polygons',
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
            whatToDoHint: 'Find a zone by name, zoom into its boundary, and compare it with the order address. Export Google changes to KML and upload them back to Riderra.',
            frameTitle: 'Riderra geo zones in Google My Maps'
          }
    },
    formattedUpdatedAt () {
      const value = this.mapInfo.latest && this.mapInfo.latest.uploadedAt
      if (!value) return '—'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '—'
      return date.toLocaleString(this.$store.state.language === 'ru' ? 'ru-RU' : 'en-GB')
    }
  },
  mounted () {
    this.loadMap()
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
  grid-template-columns: 0.6fr 1.5fr 0.8fr;
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
.network-map { display: block; width: 100%; height: min(68vh, 760px); min-height: 520px; border: 0; }

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
}
</style>
