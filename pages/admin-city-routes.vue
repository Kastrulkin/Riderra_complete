<template>
  <div>
    <navigation></navigation>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <div class="admin-header">
          <h1 class="h2 admin-title">{{ t.title }}</h1>
          <div class="header-actions">
            <button class="btn btn--secondary" @click="downloadTemplate">
              {{ t.downloadTemplate }}
            </button>
            <label class="btn btn--secondary btn--link" for="file-upload">
              {{ t.importFile }}
              <input 
                id="file-upload" 
                type="file" 
                accept=".csv" 
                @change="handleFileUpload" 
                style="display: none;"
              />
            </label>
            <nuxt-link to="/admin-drivers" class="btn btn--primary btn--link">
              {{ t.manageDrivers }}
            </nuxt-link>
          </div>
        </div>
        
        <!-- Вкладки по странам -->
        <div class="tabs-container">
          <div class="tabs">
            <button
              v-for="country in countries"
              :key="country"
              @click="selectedCountry = country"
              :class="['tab', { active: selectedCountry === country }]"
            >
              {{ country }}
            </button>
            <button class="tab tab--add" @click="showAddCountry = true">+ {{ t.addCountry }}</button>
          </div>
        </div>
        
        <!-- Вкладки по городам (для выбранной страны) -->
        <div v-if="selectedCountry" class="tabs-container">
          <div class="tabs tabs--cities">
            <button
              v-for="city in cities"
              :key="city"
              @click="selectedCity = city"
              :class="['tab', { active: selectedCity === city }]"
            >
              {{ city }}
            </button>
            <button class="tab tab--add" @click="showAddCity = true">+ {{ t.addCity }}</button>
          </div>
        </div>
        
        <!-- Таблица маршрутов для выбранного города -->
        <div v-if="selectedCountry && selectedCity" class="routes-section">
          <div class="section-header">
            <h3>{{ t.routesFor }} {{ selectedCity }}, {{ selectedCountry }}</h3>
            <button class="btn btn--primary" @click="showAddRoute = true">{{ t.addRoute }}</button>
          </div>
          
          <div class="routes-table-wrapper" v-if="filteredRoutes.length > 0">
            <table class="routes-table">
              <thead>
                <tr>
                  <th>{{ t.from }}</th>
                  <th>{{ t.to }}</th>
                  <th>{{ t.vehicleType }}</th>
                  <th>{{ t.passengers }}</th>
                  <th>{{ t.distance }}</th>
                  <th>{{ t.targetFare }}</th>
                  <th>{{ t.currency }}</th>
                  <th>{{ t.actions }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="route in filteredRoutes" :key="route.id">
                  <td>{{ route.fromPoint }}</td>
                  <td>{{ route.toPoint }}</td>
                  <td>{{ route.vehicleType }}</td>
                  <td>{{ route.passengers }}</td>
                  <td>{{ route.distance }} km</td>
                  <td>{{ route.targetFare }}</td>
                  <td>{{ route.currency }}</td>
                  <td>
                    <button class="btn btn--small" @click="editRoute(route)">{{ t.edit }}</button>
                    <button class="btn btn--small btn--danger" @click="deleteRoute(route.id)">{{ t.delete }}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div v-else class="empty-state">
            <p>{{ t.noRoutes }}</p>
          </div>
        </div>
        
        <div v-else-if="selectedCountry && !selectedCity" class="empty-state">
          <p>{{ t.selectCity }}</p>
        </div>
        
        <div v-else class="empty-state">
          <p>{{ t.selectCountry }}</p>
        </div>
      </div>
    </section>
    
    <!-- Модальное окно для добавления/редактирования маршрута -->
    <div v-if="showAddRoute || editingRoute" class="modal-overlay" @click="closeRouteModal">
      <div class="modal" @click.stop>
        <h3>{{ editingRoute ? t.editRoute : t.addRoute }}</h3>
        <div class="form-group">
          <label>{{ t.from }}</label>
          <input v-model="routeForm.fromPoint" type="text" required />
        </div>
        <div class="form-group">
          <label>{{ t.to }}</label>
          <input v-model="routeForm.toPoint" type="text" required />
        </div>
        <div class="form-group">
          <label>{{ t.vehicleType }}</label>
          <input v-model="routeForm.vehicleType" type="text" required />
        </div>
        <div class="form-group">
          <label>{{ t.passengers }}</label>
          <input v-model.number="routeForm.passengers" type="number" min="1" required />
        </div>
        <div class="form-group">
          <label>{{ t.distance }} (km)</label>
          <input v-model.number="routeForm.distance" type="number" step="0.1" min="0" required />
        </div>
        <div class="form-group">
          <label>{{ t.targetFare }}</label>
          <input v-model.number="routeForm.targetFare" type="number" step="0.01" min="0" required />
        </div>
        <div class="form-group">
          <label>{{ t.currency }}</label>
          <select v-model="routeForm.currency" required>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="RUB">RUB</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn--primary" @click="saveRoute">{{ t.save }}</button>
          <button class="btn btn--ghost" @click="closeRouteModal">{{ t.cancel }}</button>
        </div>
      </div>
    </div>
    
    <!-- Модальное окно для добавления страны -->
    <div v-if="showAddCountry" class="modal-overlay" @click="showAddCountry = false">
      <div class="modal modal--small" @click.stop>
        <h3>{{ t.addCountry }}</h3>
        <div class="form-group">
          <label>{{ t.countryName }}</label>
          <input v-model="newCountry" type="text" @keyup.enter="addCountry" />
        </div>
        <div class="modal-actions">
          <button class="btn btn--primary" @click="addCountry">{{ t.add }}</button>
          <button class="btn btn--ghost" @click="showAddCountry = false">{{ t.cancel }}</button>
        </div>
      </div>
    </div>
    
    <!-- Модальное окно для добавления города -->
    <div v-if="showAddCity" class="modal-overlay" @click="showAddCity = false">
      <div class="modal modal--small" @click.stop>
        <h3>{{ t.addCity }}</h3>
        <div class="form-group">
          <label>{{ t.cityName }}</label>
          <input v-model="newCity" type="text" @keyup.enter="addCity" />
        </div>
        <div class="modal-actions">
          <button class="btn btn--primary" @click="addCity">{{ t.add }}</button>
          <button class="btn btn--ghost" @click="showAddCity = false">{{ t.cancel }}</button>
        </div>
      </div>
    </div>
    
    <!-- Модальное окно результатов импорта -->
    <div v-if="showImportResults" class="modal-overlay" @click="showImportResults = false">
      <div class="modal" @click.stop>
        <h3>{{ t.importSuccess }}</h3>
        <div v-if="importResults" class="import-results">
          <div class="result-item">
            <span class="result-label">{{ t.importAdded }}:</span>
            <span class="result-value result-value--success">{{ importResults.added }}</span>
          </div>
          <div class="result-item">
            <span class="result-label">{{ t.importSkipped }}:</span>
            <span class="result-value result-value--warning">{{ importResults.skipped }}</span>
          </div>
          <div v-if="importResults.errors && importResults.errors.length > 0" class="result-errors">
            <h4>{{ t.importErrors }}:</h4>
            <ul>
              <li v-for="(error, idx) in importResults.errors" :key="idx">
                {{ lang === 'ru' ? 'Строка' : 'Row' }} {{ error.row }}: {{ error.error }}
              </li>
            </ul>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn--primary" @click="showImportResults = false">{{ t.close || 'Закрыть' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import navigation from '~/components/partials/nav.vue'
import Papa from 'papaparse'

export default {
  layout: 'default',
  middleware: 'admin',
  components: {
    navigation
  },
  computed: {
    lang() { return this.$store.state.language },
    t() {
      const dict = {
        ru: {
          title: 'Управление предустановленными маршрутами',
          addCountry: 'Добавить страну',
          addCity: 'Добавить город',
          routesFor: 'Маршруты для',
          addRoute: 'Добавить маршрут',
          editRoute: 'Редактировать маршрут',
          from: 'Откуда',
          to: 'Куда',
          vehicleType: 'Класс машины',
          passengers: 'Пассажиры',
          distance: 'Расстояние',
          targetFare: 'Целевая стоимость',
          currency: 'Валюта',
          actions: 'Действия',
          edit: 'Изменить',
          delete: 'Удалить',
          save: 'Сохранить',
          cancel: 'Отмена',
          add: 'Добавить',
          noRoutes: 'Нет маршрутов для этого города',
          selectCountry: 'Выберите страну',
          selectCity: 'Выберите город',
          countryName: 'Название страны',
          cityName: 'Название города',
          manageDrivers: 'Управление водителями',
          importFile: 'Импорт из файла',
          importSuccess: 'Импорт завершен',
          importAdded: 'Добавлено',
          importSkipped: 'Пропущено',
          importErrors: 'Ошибки',
          downloadTemplate: 'Скачать шаблон',
          fileFormat: 'Формат файла: CSV. Столбцы: Страна, Откуда, Куда, Класс машины, Пассажиры, Расстояние (км), Целевая стоимость, Валюта'
        },
        en: {
          title: 'Fixed Rates Management',
          addCountry: 'Add Country',
          addCity: 'Add City',
          routesFor: 'Routes for',
          addRoute: 'Add Route',
          editRoute: 'Edit Route',
          from: 'From',
          to: 'To',
          vehicleType: 'Vehicle type',
          passengers: 'Pax',
          distance: 'Distance',
          targetFare: 'Target fare',
          currency: 'Currency',
          actions: 'Actions',
          edit: 'Edit',
          delete: 'Delete',
          save: 'Save',
          cancel: 'Cancel',
          add: 'Add',
          noRoutes: 'No routes for this city',
          selectCountry: 'Select a country',
          selectCity: 'Select a city',
          countryName: 'Country name',
          cityName: 'City name',
          manageDrivers: 'Manage Drivers',
          importFile: 'Import from file',
          importSuccess: 'Import completed',
          importAdded: 'Added',
          importSkipped: 'Skipped',
          importErrors: 'Errors',
          downloadTemplate: 'Download template',
          fileFormat: 'File format: CSV. Columns: Country, From, To, Vehicle type, Passengers, Distance (km), Target fare, Currency',
          close: 'Close'
        }
      }
      return dict[this.lang]
    },
    filteredRoutes() {
      if (!this.selectedCountry || !this.selectedCity) return []
      return this.routes.filter(r => r.country === this.selectedCountry && r.city === this.selectedCity)
    }
  },
  data() {
    return {
      countries: [],
      cities: [],
      routes: [],
      selectedCountry: null,
      selectedCity: null,
      showAddRoute: false,
      showAddCountry: false,
      showAddCity: false,
      editingRoute: null,
      newCountry: '',
      newCity: '',
      importResults: null,
      showImportResults: false,
      routeForm: {
        fromPoint: '',
        toPoint: '',
        vehicleType: '',
        passengers: 1,
        distance: 0,
        targetFare: 0,
        currency: 'EUR'
      }
    }
  },
  watch: {
    selectedCountry() {
      this.selectedCity = null
      this.loadCities()
    }
  },
  async mounted() {
    await this.loadCountries()
    await this.loadRoutes()
  },
  methods: {
    getAuthHeaders() {
      const token = localStorage.getItem('authToken')
      return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    },
    async loadCountries() {
      try {
        const response = await fetch('/api/admin/city-routes/countries', {
          headers: this.getAuthHeaders()
        })
        if (response.ok) {
          this.countries = await response.json()
          if (this.countries.length > 0 && !this.selectedCountry) {
            this.selectedCountry = this.countries[0]
          }
        }
      } catch (error) {
        console.error('Error loading countries:', error)
      }
    },
    async loadCities() {
      if (!this.selectedCountry) return
      try {
        const response = await fetch(`/api/admin/city-routes/cities?country=${encodeURIComponent(this.selectedCountry)}`, {
          headers: this.getAuthHeaders()
        })
        if (response.ok) {
          this.cities = await response.json()
          if (this.cities.length > 0 && !this.selectedCity) {
            this.selectedCity = this.cities[0]
          }
        }
      } catch (error) {
        console.error('Error loading cities:', error)
      }
    },
    async loadRoutes() {
      try {
        const response = await fetch('/api/admin/city-routes', {
          headers: this.getAuthHeaders()
        })
        if (response.ok) {
          this.routes = await response.json()
        }
      } catch (error) {
        console.error('Error loading routes:', error)
      }
    },
    addCountry() {
      if (this.newCountry && !this.countries.includes(this.newCountry)) {
        this.countries.push(this.newCountry)
        this.selectedCountry = this.newCountry
        this.newCountry = ''
        this.showAddCountry = false
      }
    },
    addCity() {
      if (this.newCity && !this.cities.includes(this.newCity)) {
        this.cities.push(this.newCity)
        this.selectedCity = this.newCity
        this.newCity = ''
        this.showAddCity = false
      }
    },
    editRoute(route) {
      this.editingRoute = route
      this.routeForm = {
        fromPoint: route.fromPoint,
        toPoint: route.toPoint,
        vehicleType: route.vehicleType,
        passengers: route.passengers,
        distance: route.distance,
        targetFare: route.targetFare,
        currency: route.currency
      }
    },
    async saveRoute() {
      try {
        const data = {
          country: this.selectedCountry,
          city: this.selectedCity,
          ...this.routeForm
        }
        
        let response
        if (this.editingRoute) {
          response = await fetch(`/api/admin/city-routes/${this.editingRoute.id}`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data)
          })
        } else {
          response = await fetch('/api/admin/city-routes', {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data)
          })
        }
        
        if (response.ok) {
          await this.loadRoutes()
          await this.loadCountries()
          await this.loadCities()
          this.closeRouteModal()
        } else {
          alert(this.lang === 'ru' ? 'Ошибка при сохранении маршрута' : 'Error saving route')
        }
      } catch (error) {
        console.error('Error saving route:', error)
        alert(this.lang === 'ru' ? 'Ошибка при сохранении маршрута' : 'Error saving route')
      }
    },
    async deleteRoute(routeId) {
      if (!confirm(this.lang === 'ru' ? 'Удалить этот маршрут?' : 'Delete this route?')) return
      
      try {
        const response = await fetch(`/api/admin/city-routes/${routeId}`, {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        })
        
        if (response.ok) {
          await this.loadRoutes()
        } else {
          alert(this.lang === 'ru' ? 'Ошибка при удалении маршрута' : 'Error deleting route')
        }
      } catch (error) {
        console.error('Error deleting route:', error)
        alert(this.lang === 'ru' ? 'Ошибка при удалении маршрута' : 'Error deleting route')
      }
    },
    closeRouteModal() {
      this.showAddRoute = false
      this.editingRoute = null
      this.routeForm = {
        fromPoint: '',
        toPoint: '',
        vehicleType: '',
        passengers: 1,
        distance: 0,
        targetFare: 0,
        currency: 'EUR'
      }
    },
    async handleFileUpload(event) {
      const file = event.target.files[0]
      if (!file) return

      // Проверяем расширение файла
      const fileName = file.name.toLowerCase()
      if (!fileName.endsWith('.csv')) {
        alert(this.lang === 'ru' ? 'Поддерживаются только CSV файлы' : 'Only CSV files are supported')
        return
      }

      try {
        // Читаем файл
        const text = await this.readFileAsText(file)
        
        // Парсим CSV
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => {
            // Нормализуем названия столбцов
            const headerMap = {
              'страна': 'country',
              'country': 'country',
              'откуда': 'fromPoint',
              'from': 'fromPoint',
              'frompoint': 'fromPoint',
              'куда': 'toPoint',
              'to': 'toPoint',
              'topoint': 'toPoint',
              'класс машины': 'vehicleType',
              'vehicle type': 'vehicleType',
              'vehicletype': 'vehicleType',
              'пассажиры': 'passengers',
              'pax': 'passengers',
              'passengers': 'passengers',
              'расстояние': 'distance',
              'distance': 'distance',
              'distance, km': 'distance',
              'целевая стоимость': 'targetFare',
              'target fare': 'targetFare',
              'targetfare': 'targetFare',
              'валюта': 'currency',
              'currency': 'currency'
            }
            return headerMap[header.toLowerCase().trim()] || header.trim()
          }
        })

        if (parsed.errors && parsed.errors.length > 0) {
          alert(this.lang === 'ru' ? 'Ошибка при парсинге CSV файла' : 'Error parsing CSV file')
          return
        }

        const routes = parsed.data.filter(row => {
          // Фильтруем пустые строки
          return row.country || row.fromPoint || row.toPoint
        })

        if (routes.length === 0) {
          alert(this.lang === 'ru' ? 'Файл не содержит данных' : 'File contains no data')
          return
        }

        // Отправляем на сервер
        const response = await fetch('/api/admin/city-routes/bulk-import', {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ routes })
        })

        if (response.ok) {
          const result = await response.json()
          this.importResults = result.results
          this.showImportResults = true
          
          // Обновляем данные
          await this.loadRoutes()
          await this.loadCountries()
          await this.loadCities()
        } else {
          const error = await response.json()
          alert(this.lang === 'ru' ? `Ошибка при импорте: ${error.error}` : `Import error: ${error.error}`)
        }
      } catch (error) {
        console.error('Error importing file:', error)
        alert(this.lang === 'ru' ? 'Ошибка при обработке файла' : 'Error processing file')
      } finally {
        // Сбрасываем input
        event.target.value = ''
      }
    },
    readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = (e) => reject(e)
        reader.readAsText(file, 'UTF-8')
      })
    },
    downloadTemplate() {
      const csvContent = 'Страна,Откуда,Куда,Класс машины,Пассажиры,Расстояние (км),Целевая стоимость,Валюта\nRussia,Аэропорт Шереметьево,Центр Москвы,Business class car,3,30,51,EUR\nFrance,Charles de Gaulle Airport (CDG),Paris,Standard class car,3,30,45,EUR'
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'routes_template.csv'
      link.click()
    }
  }
}
</script>

<style scoped lang="scss">
.admin-section {
  padding-top: 160px;
  padding-bottom: 40px;
  position: relative;
  z-index: 10;
  color: #fff;
  min-height: 100vh;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  gap: 20px;
}

.admin-title {
  margin: 0;
  color: #fff;
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn--link {
  text-decoration: none;
  display: inline-block;
  white-space: nowrap;
}

.tabs-container {
  margin-bottom: 30px;
}

.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  border-bottom: 2px solid rgba(255,255,255,0.2);
  padding-bottom: 8px;
}

.tab {
  padding: 10px 20px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px 8px 0 0;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  
  &:hover {
    background: rgba(255,255,255,0.15);
    color: #fff;
  }
  
  &.active {
    background: rgba(255,255,255,0.2);
    color: #fff;
    border-bottom-color: transparent;
  }
  
  &--add {
    background: rgba(0,123,255,0.2);
    border-color: rgba(0,123,255,0.5);
    
    &:hover {
      background: rgba(0,123,255,0.3);
    }
  }
}

.tabs--cities {
  margin-left: 20px;
}

.routes-section {
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h3 {
    color: #fff;
    font-size: 18px;
    margin: 0;
  }
}

.routes-table-wrapper {
  overflow-x: auto;
}

.routes-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  overflow: hidden;
  
  thead {
    background: rgba(255,255,255,0.1);
    
    th {
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid rgba(255,255,255,0.2);
    }
  }
  
  tbody {
    tr {
      border-bottom: 1px solid rgba(255,255,255,0.1);
      
      &:hover {
        background: rgba(255,255,255,0.05);
      }
    }
    
    td {
      padding: 12px;
      font-size: 14px;
      color: rgba(255,255,255,0.9);
    }
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255,255,255,0.7);
  
  p {
    font-size: 16px;
    margin: 0;
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #1a1a1a;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  
  &--small {
    max-width: 400px;
  }
  
  h3 {
    color: #fff;
    margin-bottom: 20px;
    font-size: 20px;
  }
}

.form-group {
  margin-bottom: 16px;
  
  label {
    display: block;
    color: #fff;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
  }
  
  input,
  select {
    width: 100%;
    padding: 12px;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 6px;
    background: rgba(255,255,255,0.1);
    color: #fff;
    font-size: 14px;
    
    &:focus {
      outline: none;
      border-color: #007bff;
    }
  }
  
  select {
    cursor: pointer;
  }
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn {
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  
  &:hover {
    background: #0056b3;
  }
  
  &--primary {
    background: #007bff;
    
    &:hover {
      background: #0056b3;
    }
  }
  
  &--small {
    padding: 6px 12px;
    font-size: 12px;
    margin-right: 8px;
  }
  
  &--ghost {
    background: transparent;
    color: #fff;
    border: 1px solid rgba(255,255,255,0.3);
    
    &:hover {
      background: rgba(255,255,255,0.1);
    }
  }
  
  &--danger {
    background: #dc3545;
    
    &:hover {
      background: #c82333;
    }
  }
  
  &--secondary {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.3);
    
    &:hover {
      background: rgba(255,255,255,0.15);
    }
  }
}

.import-results {
  margin: 20px 0;
  
  .result-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    
    &:last-child {
      border-bottom: none;
    }
    
    .result-label {
      color: rgba(255,255,255,0.8);
      font-size: 14px;
    }
    
    .result-value {
      font-size: 18px;
      font-weight: 700;
      
      &--success {
        color: #28a745;
      }
      
      &--warning {
        color: #ffc107;
      }
    }
  }
  
  .result-errors {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.2);
    
    h4 {
      color: #dc3545;
      margin-bottom: 12px;
      font-size: 16px;
    }
    
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      
      li {
        color: rgba(255,255,255,0.8);
        padding: 6px 0;
        font-size: 13px;
      }
    }
  }
}

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

@media (max-width: 767px) {
  .admin-section {
    padding-top: 120px;
  }
  
  .admin-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .tabs {
    flex-direction: column;
  }
  
  .routes-table-wrapper {
    overflow-x: scroll;
  }
  
  .routes-table {
    min-width: 700px;
  }
}
</style>

