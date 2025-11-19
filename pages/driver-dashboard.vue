<template>
  <div>
    <navigation></navigation>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    
    <section class="site-section site-section--pf driver-dashboard">
      <div class="container">
        <h1 class="h2 dashboard-title">{{ t.title }}</h1>
        
        <!-- Статистика водителя -->
        <div class="dashboard-stats">
          <div class="stat-card">
            <h3>{{ t.commissionRate }}</h3>
            <div class="stat-value">{{ driver.commissionRate }}%</div>
            <button class="btn btn--small" @click="editCommission = true">{{ t.edit }}</button>
          </div>
          
          <div class="stat-card">
            <h3>{{ t.rating }}</h3>
            <div class="stat-value">{{ driver.rating }}/5</div>
            <div class="rating-stars">
              <span v-for="i in 5" :key="i" :class="['star', { active: i <= driver.rating }]">★</span>
            </div>
          </div>
          
          <div class="stat-card">
            <h3>{{ t.totalTrips }}</h3>
            <div class="stat-value">{{ driver.totalTrips }}</div>
          </div>
          
          <div class="stat-card">
            <h3>{{ t.status }}</h3>
            <div class="stat-value" :class="['status', driver.verificationStatus]">
              {{ t[driver.verificationStatus] }}
            </div>
          </div>
        </div>
        
        <!-- Управление маршрутами -->
        <div class="dashboard-section">
          <h3>{{ t.routes }}</h3>
          <button class="btn btn--primary" @click="addRoute = true">{{ t.addRoute }}</button>
          
          <div class="routes-list" v-if="routes.length > 0">
            <div v-for="route in routes" :key="route.id" class="route-item">
              <div class="route-info">
                <span class="route-path">{{ route.fromPoint }} → {{ route.toPoint }}</span>
                <div class="route-prices">
                  <span class="route-price driver-price">{{ route.driverPrice }} {{ route.currency }}</span>
                  <span class="route-price our-price">{{ t.ourPrice }}: {{ route.ourPrice }} {{ route.currency }}</span>
                </div>
                <div class="route-competitiveness" :class="getCompetitivenessClass(route)">
                  {{ getCompetitivenessText(route) }}
                </div>
              </div>
              <div class="route-actions">
                <button class="btn btn--small" @click="editRoute(route)">{{ t.edit }}</button>
                <button class="btn btn--small btn--danger" @click="deleteRoute(route.id)">{{ t.delete }}</button>
              </div>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <p>{{ t.noRoutes }}</p>
          </div>
        </div>
        
        <!-- Отзывы клиентов -->
        <div class="dashboard-section">
          <h3>{{ t.reviews }}</h3>
          
          <div class="reviews-list" v-if="reviews.length > 0">
            <div v-for="review in reviews" :key="review.id" class="review-item">
              <div class="review-rating">
                <span v-for="i in 5" :key="i" :class="['star', { active: i <= review.rating }]">★</span>
              </div>
              <div class="review-comment">{{ review.comment || t.noComment }}</div>
              <div class="review-meta">
                <span class="review-client">{{ review.clientName }}</span>
                <span class="review-date">{{ formatDate(review.createdAt) }}</span>
              </div>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <p>{{ t.noReviews }}</p>
          </div>
        </div>
        
        <!-- Предустановленные маршруты -->
        <div class="dashboard-section">
          <h3>{{ t.fixedRates }}</h3>
          <p class="section-subtitle">{{ t.fixedRatesSubtitle }}</p>
          
          <div class="fixed-rates-table-wrapper" v-if="cityRoutes.length > 0">
            <table class="fixed-rates-table">
              <thead>
                <tr>
                  <th>{{ t.country }}</th>
                  <th>{{ t.from }}</th>
                  <th>{{ t.to }}</th>
                  <th>{{ t.vehicleType }}</th>
                  <th>{{ t.passengers }}</th>
                  <th>{{ t.distance }}</th>
                  <th class="target-fare">{{ t.targetFare }}</th>
                  <th>{{ t.yourBestPrice }}</th>
                  <th>{{ t.currency }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="route in cityRoutes" :key="route.id">
                  <td>{{ route.country }}</td>
                  <td>{{ route.fromPoint }}</td>
                  <td>{{ route.toPoint }}</td>
                  <td>{{ route.vehicleType }}</td>
                  <td>{{ route.passengers }}</td>
                  <td>{{ route.distance }} km</td>
                  <td class="target-fare">{{ route.targetFare }} {{ route.currency }}</td>
                  <td>
                    <input 
                      type="number" 
                      step="0.01"
                      :value="route.bestPrice || ''" 
                      @blur="updateBestPrice(route.id, $event.target.value)"
                      class="best-price-input"
                      :placeholder="t.enterPrice"
                    />
                  </td>
                  <td>{{ route.currency }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div v-else class="empty-state">
            <p>{{ t.noFixedRates }}</p>
          </div>
        </div>
        
        <!-- Выполненные заказы -->
        <div class="dashboard-section">
          <h3>{{ t.recentOrders }}</h3>
          <div class="orders-list" v-if="orders.length > 0">
            <div v-for="order in orders" :key="order.id" class="order-item">
              <div class="order-info">
                <span class="order-route">{{ order.fromPoint }} → {{ order.toPoint }}</span>
                <span class="order-price">{{ order.clientPrice }} €</span>
                <span class="order-status" :class="order.status">{{ t[order.status] }}</span>
              </div>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <p>{{ t.noOrders }}</p>
          </div>
        </div>
      </div>
    </section>
    
    <!-- Модальное окно для редактирования комиссии -->
    <div v-if="editCommission" class="modal-overlay" @click="editCommission = false">
      <div class="modal" @click.stop>
        <h3>{{ t.editCommission }}</h3>
        <div class="form-group">
          <label>{{ t.commissionRate }}</label>
          <input v-model="newCommissionRate" type="number" min="5" max="30" step="0.1" />
          <span>%</span>
        </div>
        <div class="modal-actions">
          <button class="btn btn--primary" @click="saveCommission">{{ t.save }}</button>
          <button class="btn btn--ghost" @click="editCommission = false">{{ t.cancel }}</button>
        </div>
      </div>
    </div>
    
    <!-- Модальное окно для добавления маршрута -->
    <div v-if="addRoute" class="modal-overlay" @click="addRoute = false">
      <div class="modal" @click.stop>
        <h3>{{ t.addRoute }}</h3>
        <div class="form-group">
          <label>{{ t.fromPoint }}</label>
          <input v-model="newRoute.fromPoint" type="text" />
        </div>
        <div class="form-group">
          <label>{{ t.toPoint }}</label>
          <input v-model="newRoute.toPoint" type="text" />
        </div>
        <div class="form-group">
          <label>{{ t.driverPrice }}</label>
          <input v-model="newRoute.driverPrice" type="number" step="0.01" />
          <span>{{ newRoute.currency }}</span>
        </div>
        <div class="form-group">
          <label>{{ t.ourPrice }}</label>
          <input v-model="newRoute.ourPrice" type="number" step="0.01" />
          <span>{{ newRoute.currency }}</span>
        </div>
        <div class="modal-actions">
          <button class="btn btn--primary" @click="saveRoute">{{ t.save }}</button>
          <button class="btn btn--ghost" @click="addRoute = false">{{ t.cancel }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import navigation from '~/components/partials/nav.vue'

export default {
  layout: 'default',
  middleware: 'driver',
  components: {
    navigation
  },
  computed: {
    lang(){ return this.$store.state.language },
    t(){
      const dict = {
        ru: {
          title: 'Панель водителя',
          commissionRate: 'Комиссия',
          rating: 'Рейтинг',
          totalTrips: 'Поездок',
          status: 'Статус',
          routes: 'Мои маршруты',
          recentOrders: 'Выполненные заказы',
          reviews: 'Отзывы клиентов',
          fixedRates: 'Предустановленные маршруты',
          fixedRatesSubtitle: 'Целевые тарифы основаны на запросах',
          country: 'Страна',
          from: 'Откуда',
          to: 'Куда',
          vehicleType: 'Класс машины',
          passengers: 'Пассажиры',
          distance: 'Расстояние',
          targetFare: 'Целевая стоимость',
          yourBestPrice: 'Ваше лучшее предложение',
          currency: 'Валюта',
          enterPrice: 'Введите цену',
          noFixedRates: 'Нет предустановленных маршрутов',
          edit: 'Изменить',
          addRoute: 'Добавить маршрут',
          noRoutes: 'У вас пока нет маршрутов',
          noOrders: 'У вас пока нет заказов',
          noReviews: 'У вас пока нет отзывов',
          noComment: 'Без комментария',
          editCommission: 'Изменить комиссию',
          fromPoint: 'Откуда',
          toPoint: 'Куда',
          driverPrice: 'Ваша цена',
          ourPrice: 'Наша цена',
          save: 'Сохранить',
          cancel: 'Отмена',
          delete: 'Удалить',
          pending: 'Ожидает',
          verified: 'Подтвержден',
          rejected: 'Отклонен',
          assigned: 'Назначен',
          accepted: 'Принят',
          completed: 'Завершен',
          cancelled: 'Отменен',
          highlyCompetitive: 'Очень конкурентоспособно',
          moderate: 'Умеренно',
          notCompetitive: 'Не конкурентоспособно'
        },
        en: {
          title: 'Driver Dashboard',
          commissionRate: 'Commission',
          rating: 'Rating',
          totalTrips: 'Trips',
          status: 'Status',
          routes: 'My Routes',
          recentOrders: 'Completed Orders',
          reviews: 'Client Reviews',
          fixedRates: 'Fixed Rates',
          fixedRatesSubtitle: 'Target rates are based on the request from',
          country: 'Country',
          from: 'From',
          to: 'To',
          vehicleType: 'Vehicle type',
          passengers: 'Pax',
          distance: 'Distance, km',
          targetFare: 'Target fare',
          yourBestPrice: 'Your best price',
          currency: 'Currency',
          enterPrice: 'Enter price',
          noFixedRates: 'No fixed rates available',
          edit: 'Edit',
          addRoute: 'Add Route',
          noRoutes: 'You have no routes yet',
          noOrders: 'You have no orders yet',
          noReviews: 'You have no reviews yet',
          noComment: 'No comment',
          editCommission: 'Edit Commission',
          fromPoint: 'From',
          toPoint: 'To',
          driverPrice: 'Your Price',
          ourPrice: 'Our Price',
          save: 'Save',
          cancel: 'Cancel',
          delete: 'Delete',
          pending: 'Pending',
          verified: 'Verified',
          rejected: 'Rejected',
          assigned: 'Assigned',
          accepted: 'Accepted',
          completed: 'Completed',
          cancelled: 'Cancelled',
          highlyCompetitive: 'Highly competitive',
          moderate: 'Moderate',
          notCompetitive: 'Not competitive'
        }
      }
      return dict[this.lang]
    }
  },
  data(){
    return {
      driver: {
        commissionRate: 15.0,
        rating: 5.0,
        totalTrips: 0,
        verificationStatus: 'pending'
      },
      routes: [],
      orders: [],
      reviews: [],
      cityRoutes: [],
      editCommission: false,
      addRoute: false,
      newCommissionRate: 15.0,
      newRoute: {
        fromPoint: '',
        toPoint: '',
        driverPrice: 0,
        ourPrice: 0,
        currency: 'EUR'
      }
    }
  },
  async mounted() {
    await this.loadDriverData()
    await this.loadRoutes()
    await this.loadOrders()
    await this.loadReviews()
    await this.loadCityRoutes()
  },
  methods: {
    getAuthHeaders() {
      const token = localStorage.getItem('authToken')
      return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    },
    async loadDriverData() {
      try {
        const response = await fetch('/api/drivers/me', {
          headers: this.getAuthHeaders()
        })
        
        if (response.ok) {
          const data = await response.json()
          this.driver = {
            id: data.id,
            commissionRate: data.commissionRate || 15.0,
            rating: data.rating || 5.0,
            totalTrips: data.totalTrips || 0,
            verificationStatus: data.verificationStatus || 'pending'
          }
          this.newCommissionRate = this.driver.commissionRate
        } else {
          console.error('Failed to load driver data')
        }
      } catch (error) {
        console.error('Error loading driver data:', error)
      }
    },
    async loadRoutes() {
      try {
        if (!this.driver.id) {
          await this.loadDriverData()
        }
        
        const response = await fetch(`/api/drivers/${this.driver.id}/routes`, {
          headers: this.getAuthHeaders()
        })
        
        if (response.ok) {
          const data = await response.json()
          this.routes = data.map(route => ({
            id: route.id,
            fromPoint: route.fromPoint,
            toPoint: route.toPoint,
            driverPrice: route.driverPrice,
            ourPrice: route.ourPrice,
            currency: route.currency || 'EUR'
          }))
        } else {
          console.error('Failed to load routes')
        }
      } catch (error) {
        console.error('Error loading routes:', error)
      }
    },
    async loadOrders() {
      try {
        const response = await fetch('/api/drivers/me/orders', {
          headers: this.getAuthHeaders()
        })
        
        if (response.ok) {
          const data = await response.json()
          this.orders = data.map(order => ({
            id: order.id,
            fromPoint: order.fromPoint,
            toPoint: order.toPoint,
            clientPrice: order.clientPrice,
            status: order.status
          }))
        } else {
          console.error('Failed to load orders')
        }
      } catch (error) {
        console.error('Error loading orders:', error)
      }
    },
    async loadReviews() {
      try {
        if (!this.driver.id) {
          await this.loadDriverData()
        }
        
        const response = await fetch(`/api/drivers/${this.driver.id}/reviews`, {
          headers: this.getAuthHeaders()
        })
        
        if (response.ok) {
          const data = await response.json()
          this.reviews = data.map(review => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            clientName: review.clientName || 'Анонимный клиент',
            createdAt: review.createdAt
          }))
        } else {
          console.error('Failed to load reviews')
        }
      } catch (error) {
        console.error('Error loading reviews:', error)
      }
    },
    async saveCommission() {
      try {
        if (!this.driver.id) {
          await this.loadDriverData()
        }
        
        const response = await fetch('/api/drivers/me', {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            commissionRate: parseFloat(this.newCommissionRate)
          })
        })
        
        if (response.ok) {
          this.driver.commissionRate = this.newCommissionRate
          this.editCommission = false
        } else {
          alert(this.lang === 'ru' ? 'Ошибка при сохранении комиссии' : 'Error saving commission')
        }
      } catch (error) {
        console.error('Error saving commission:', error)
        alert(this.lang === 'ru' ? 'Ошибка при сохранении комиссии' : 'Error saving commission')
      }
    },
    async saveRoute() {
      try {
        if (!this.driver.id) {
          await this.loadDriverData()
        }
        
        const response = await fetch(`/api/drivers/${this.driver.id}/routes`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            fromPoint: this.newRoute.fromPoint,
            toPoint: this.newRoute.toPoint,
            driverPrice: parseFloat(this.newRoute.driverPrice),
            ourPrice: parseFloat(this.newRoute.ourPrice),
            currency: this.newRoute.currency
          })
        })
        
        if (response.ok) {
          await this.loadRoutes() // Перезагружаем маршруты
          this.addRoute = false
          this.newRoute = {
            fromPoint: '',
            toPoint: '',
            driverPrice: 0,
            ourPrice: 0,
            currency: 'EUR'
          }
        } else {
          alert(this.lang === 'ru' ? 'Ошибка при сохранении маршрута' : 'Error saving route')
        }
      } catch (error) {
        console.error('Error saving route:', error)
        alert(this.lang === 'ru' ? 'Ошибка при сохранении маршрута' : 'Error saving route')
      }
    },
    editRoute(route) {
      // Логика редактирования маршрута
      this.newRoute = {
        fromPoint: route.fromPoint,
        toPoint: route.toPoint,
        driverPrice: route.driverPrice,
        ourPrice: route.ourPrice,
        currency: route.currency
      }
      this.deleteRoute(route.id) // Удаляем старый
      this.addRoute = true // Открываем форму для редактирования
    },
    async deleteRoute(routeId) {
      try {
        const response = await fetch(`/api/drivers/routes/${routeId}`, {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        })
        
        if (response.ok) {
          this.routes = this.routes.filter(r => r.id !== routeId)
        } else {
          alert(this.lang === 'ru' ? 'Ошибка при удалении маршрута' : 'Error deleting route')
        }
      } catch (error) {
        console.error('Error deleting route:', error)
        // Временно удаляем из UI, даже если запрос не прошел
        this.routes = this.routes.filter(r => r.id !== routeId)
      }
    },
    getCompetitivenessClass(route) {
      const priceDiff = ((route.driverPrice - route.ourPrice) / route.ourPrice) * 100
      if (priceDiff <= 0) return 'highly-competitive'
      if (priceDiff <= 10) return 'moderate'
      return 'not-competitive'
    },
    getCompetitivenessText(route) {
      const priceDiff = ((route.driverPrice - route.ourPrice) / route.ourPrice) * 100
      if (priceDiff <= 0) return this.t.highlyCompetitive
      if (priceDiff <= 10) return this.t.moderate
      return this.t.notCompetitive
    },
    formatDate(date) {
      return new Date(date).toLocaleDateString(this.lang === 'ru' ? 'ru-RU' : 'en-US')
    },
    async loadCityRoutes() {
      try {
        const response = await fetch('/api/drivers/me/city-routes', {
          headers: this.getAuthHeaders()
        })
        
        if (response.ok) {
          const data = await response.json()
          this.cityRoutes = data
        } else {
          console.error('Failed to load city routes')
        }
      } catch (error) {
        console.error('Error loading city routes:', error)
      }
    },
    async updateBestPrice(routeId, bestPrice) {
      try {
        const response = await fetch(`/api/drivers/me/city-routes/${routeId}`, {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            bestPrice: bestPrice ? parseFloat(bestPrice) : null
          })
        })
        
        if (response.ok) {
          // Обновляем локальные данные
          const route = this.cityRoutes.find(r => r.id === routeId)
          if (route) {
            route.bestPrice = bestPrice ? parseFloat(bestPrice) : null
          }
        } else {
          alert(this.lang === 'ru' ? 'Ошибка при сохранении цены' : 'Error saving price')
        }
      } catch (error) {
        console.error('Error updating best price:', error)
        alert(this.lang === 'ru' ? 'Ошибка при сохранении цены' : 'Error saving price')
      }
    }
  }
}
</script>

<style scoped lang="scss">
.driver-dashboard { 
  padding-top: 160px; 
  padding-bottom: 40px; 
  position: relative;
  z-index: 10;
  color: #fff;
}

.dashboard-title { 
  margin-bottom: 30px; 
  color: #fff;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  
  h3 {
    font-size: 14px;
    color: rgba(255,255,255,0.7);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
  }
  
  .rating-stars {
    display: flex;
    gap: 2px;
    
    .star {
      color: rgba(255,255,255,0.3);
      font-size: 16px;
      
      &.active {
        color: #ffd700;
      }
    }
  }
  
  .status {
    font-size: 14px;
    padding: 4px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 600;
    
    &.pending {
      background: rgba(255,193,7,0.2);
      color: #ffc107;
    }
    
    &.verified {
      background: rgba(40,167,69,0.2);
      color: #28a745;
    }
    
    &.rejected {
      background: rgba(220,53,69,0.2);
      color: #dc3545;
    }
  }
}

.dashboard-section {
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 30px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  
  h3 {
    font-size: 18px;
    color: #fff;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .section-subtitle {
    font-size: 14px;
    color: rgba(255,255,255,0.7);
    margin-bottom: 20px;
  }
}

/* Стили для таблицы предустановленных маршрутов */
.fixed-rates-table-wrapper {
  overflow-x: auto;
  margin-top: 16px;
}

.fixed-rates-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  overflow: hidden;
  
  thead {
    background: rgba(255,255,255,0.1);
    
    th {
      padding: 12px 8px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid rgba(255,255,255,0.2);
      
      &.target-fare {
        background: rgba(76, 175, 80, 0.2);
      }
    }
  }
  
  tbody {
    tr {
      border-bottom: 1px solid rgba(255,255,255,0.1);
      transition: background 0.2s ease;
      
      &:hover {
        background: rgba(255,255,255,0.05);
      }
      
      &:last-child {
        border-bottom: none;
      }
    }
    
    td {
      padding: 12px 8px;
      font-size: 14px;
      color: rgba(255,255,255,0.9);
      border-right: 1px solid rgba(255,255,255,0.05);
      
      &:last-child {
        border-right: none;
      }
      
      &.target-fare {
        background: rgba(76, 175, 80, 0.15);
        font-weight: 600;
        color: #4caf50;
      }
    }
  }
  
  .best-price-input {
    width: 100%;
    max-width: 120px;
    padding: 6px 8px;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 4px;
    background: rgba(255,255,255,0.1);
    color: #fff;
    font-size: 14px;
    transition: all 0.2s ease;
    
    &:focus {
      outline: none;
      border-color: #007bff;
      background: rgba(255,255,255,0.15);
    }
    
    &::placeholder {
      color: rgba(255,255,255,0.5);
    }
  }
}

.routes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.route-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: rgba(255,255,255,0.05);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  
  .route-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    .route-path {
      font-weight: 600;
      color: #fff;
      font-size: 16px;
    }
    
    .route-prices {
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      .route-price {
        font-size: 14px;
        
        &.driver-price {
          color: #28a745;
          font-weight: 600;
        }
        
        &.our-price {
          color: rgba(255,255,255,0.7);
        }
      }
    }
    
    .route-competitiveness {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      
      &.highly-competitive {
        background: rgba(40,167,69,0.2);
        color: #28a745;
      }
      
      &.moderate {
        background: rgba(255,193,7,0.2);
        color: #ffc107;
      }
      
      &.not-competitive {
        background: rgba(220,53,69,0.2);
        color: #dc3545;
      }
    }
  }
  
  .route-actions {
    display: flex;
    gap: 8px;
    flex-direction: column;
  }
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item {
  background: rgba(255,255,255,0.05);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  
  .order-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .order-route {
      font-weight: 600;
      color: #fff;
    }
    
    .order-price {
      font-size: 16px;
      font-weight: 700;
      color: #28a745;
    }
    
    .order-status {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 600;
      
      &.pending {
        background: rgba(255,193,7,0.2);
        color: #ffc107;
      }
      
      &.assigned {
        background: rgba(0,123,255,0.2);
        color: #007bff;
      }
      
      &.accepted {
        background: rgba(40,167,69,0.2);
        color: #28a745;
      }
      
      &.completed {
        background: rgba(40,167,69,0.2);
        color: #28a745;
      }
      
      &.cancelled {
        background: rgba(220,53,69,0.2);
        color: #dc3545;
      }
    }
  }
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-item {
  background: rgba(255,255,255,0.05);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  
  .review-rating {
    display: flex;
    gap: 2px;
    margin-bottom: 8px;
    
    .star {
      color: rgba(255,255,255,0.3);
      font-size: 16px;
      
      &.active {
        color: #ffd700;
      }
    }
  }
  
  .review-comment {
    color: rgba(255,255,255,0.8);
    margin-bottom: 8px;
    font-size: 14px;
    line-height: 1.4;
  }
  
  .review-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: rgba(255,255,255,0.6);
    
    .review-client {
      font-weight: 500;
    }
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255,255,255,0.7);
  
  p {
    font-size: 16px;
    margin: 0;
  }
}

/* Модальные окна */
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
  
  input {
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
  
  span {
    color: #fff;
    margin-left: 8px;
  }
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

/* Кнопки */
.btn {
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
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
}

@media (max-width: 1024px) {
  .driver-dashboard {
    padding-top: 130px;
  }
}

@media (max-width: 767px) {
  .driver-dashboard {
    padding-top: 110px;
  }
  
  .dashboard-stats {
    grid-template-columns: 1fr;
  }
  
  .route-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    
    .route-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
  
  .order-item .order-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .fixed-rates-table-wrapper {
    overflow-x: scroll;
    -webkit-overflow-scrolling: touch;
  }
  
  .fixed-rates-table {
    min-width: 800px;
    
    thead th,
    tbody td {
      padding: 8px 6px;
      font-size: 12px;
    }
  }
}

/* Фон страницы как на главной */
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
</style>
