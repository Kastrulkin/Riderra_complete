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
          <nuxt-link to="/admin-city-routes" class="btn btn--primary btn--link">
            {{ t.manageRoutes }}
          </nuxt-link>
        </div>
        
        <!-- Фильтры -->
        <div class="admin-filters">
          <div class="filter-group">
            <label>{{ t.status }}</label>
            <select v-model="filters.status">
              <option value="">{{ t.all }}</option>
              <option value="pending">{{ t.pending }}</option>
              <option value="verified">{{ t.verified }}</option>
              <option value="rejected">{{ t.rejected }}</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>{{ t.active }}</label>
            <select v-model="filters.active">
              <option value="">{{ t.all }}</option>
              <option value="true">{{ t.yes }}</option>
              <option value="false">{{ t.no }}</option>
            </select>
          </div>
          
          <button class="btn btn--primary" @click="loadDrivers">{{ t.refresh }}</button>
        </div>
        
        <!-- Таблица водителей -->
        <div class="drivers-table">
          <div class="table-header">
            <div class="col-name">{{ t.name }}</div>
            <div class="col-email">{{ t.email }}</div>
            <div class="col-phone">{{ t.phone }}</div>
            <div class="col-city">{{ t.city }}</div>
            <div class="col-commission">{{ t.commission }}</div>
            <div class="col-rating">{{ t.rating }}</div>
            <div class="col-status">{{ t.status }}</div>
            <div class="col-actions">{{ t.actions }}</div>
          </div>
          
          <div v-for="driver in filteredDrivers" :key="driver.id" class="table-row">
            <div class="col-name">
              <strong>{{ driver.name }}</strong>
            </div>
            <div class="col-email">{{ driver.email }}</div>
            <div class="col-phone">{{ driver.phone }}</div>
            <div class="col-city">{{ driver.city }}</div>
            <div class="col-commission">
              <span class="commission-badge">{{ driver.commissionRate }}%</span>
            </div>
            <div class="col-rating">
              <div class="rating-display">
                <span v-for="i in 5" :key="i" :class="['star', { active: i <= driver.rating }]">★</span>
                <span class="rating-number">{{ driver.rating }}</span>
              </div>
            </div>
            <div class="col-status">
              <span class="status-badge" :class="driver.verificationStatus">
                {{ t[driver.verificationStatus] }}
              </span>
            </div>
            <div class="col-actions">
              <div class="action-buttons">
                <button 
                  class="btn btn--small" 
                  :class="driver.isActive ? 'btn--danger' : 'btn--success'"
                  @click="toggleActive(driver)"
                >
                  {{ driver.isActive ? t.deactivate : t.activate }}
                </button>
                <button 
                  class="btn btn--small btn--primary" 
                  @click="verifyDriver(driver, 'verified')"
                  v-if="driver.verificationStatus === 'pending'"
                >
                  {{ t.verify }}
                </button>
                <button 
                  class="btn btn--small btn--danger" 
                  @click="verifyDriver(driver, 'rejected')"
                  v-if="driver.verificationStatus === 'pending'"
                >
                  {{ t.reject }}
                </button>
                <button 
                  class="btn btn--small btn--ghost" 
                  @click="viewDriver(driver)"
                >
                  {{ t.view }}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Статистика -->
        <div class="admin-stats">
          <div class="stat-card">
            <h3>{{ t.totalDrivers }}</h3>
            <div class="stat-value">{{ drivers.length }}</div>
          </div>
          <div class="stat-card">
            <h3>{{ t.verifiedDrivers }}</h3>
            <div class="stat-value">{{ verifiedCount }}</div>
          </div>
          <div class="stat-card">
            <h3>{{ t.activeDrivers }}</h3>
            <div class="stat-value">{{ activeCount }}</div>
          </div>
          <div class="stat-card">
            <h3>{{ t.avgCommission }}</h3>
            <div class="stat-value">{{ avgCommission }}%</div>
          </div>
        </div>
        
        <!-- Управление отзывами -->
        <div class="reviews-section">
          <h3>{{ t.reviewsManagement }}</h3>
          <button class="btn btn--primary" @click="showAddReview = true">{{ t.addReview }}</button>
          
          <div class="reviews-list" v-if="reviews.length > 0">
            <div v-for="review in reviews" :key="review.id" class="review-item">
              <div class="review-info">
                <div class="review-driver">{{ review.driver.name }}</div>
                <div class="review-rating">
                  <span v-for="i in 5" :key="i" :class="['star', { active: i <= review.rating }]">★</span>
                </div>
                <div class="review-comment">{{ review.comment || t.noComment }}</div>
                <div class="review-meta">
                  <span class="review-client">{{ review.clientName }}</span>
                  <span class="review-date">{{ formatDate(review.createdAt) }}</span>
                </div>
              </div>
              <div class="review-actions">
                <button class="btn btn--small btn--danger" @click="deleteReview(review.id)">{{ t.delete }}</button>
              </div>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <p>{{ t.noReviews }}</p>
          </div>
        </div>
      </div>
    </section>
    
    <!-- Модальное окно просмотра водителя -->
    <div v-if="selectedDriver" class="modal-overlay" @click="selectedDriver = null">
      <div class="modal large-modal" @click.stop>
        <h3>{{ t.driverDetails }}</h3>
        <div class="driver-details">
          <div class="detail-group">
            <label>{{ t.name }}</label>
            <span>{{ selectedDriver.name }}</span>
          </div>
          <div class="detail-group">
            <label>{{ t.email }}</label>
            <span>{{ selectedDriver.email }}</span>
          </div>
          <div class="detail-group">
            <label>{{ t.phone }}</label>
            <span>{{ selectedDriver.phone }}</span>
          </div>
          <div class="detail-group">
            <label>{{ t.city }}</label>
            <span>{{ selectedDriver.city }}</span>
          </div>
          <div class="detail-group">
            <label>{{ t.commission }}</label>
            <span>{{ selectedDriver.commissionRate }}%</span>
          </div>
          <div class="detail-group">
            <label>{{ t.rating }}</label>
            <span>{{ selectedDriver.rating }}/5</span>
          </div>
          <div class="detail-group">
            <label>{{ t.totalTrips }}</label>
            <span>{{ selectedDriver.totalTrips }}</span>
          </div>
          <div class="detail-group">
            <label>{{ t.registrationDate }}</label>
            <span>{{ formatDate(selectedDriver.createdAt) }}</span>
          </div>
          <div class="detail-group" v-if="selectedDriver.comment">
            <label>{{ t.comment }}</label>
            <span>{{ selectedDriver.comment }}</span>
          </div>
        </div>
        
        <!-- Маршруты водителя -->
        <div v-if="selectedDriver.routes && selectedDriver.routes.length > 0" class="driver-routes">
          <h4>{{ t.driverRoutes }}</h4>
          <div class="routes-list">
            <div v-for="route in selectedDriver.routes" :key="route.id" class="route-item">
              <span class="route-path">{{ route.fromPoint }} → {{ route.toPoint }}</span>
              <span class="route-price">{{ route.driverPrice }} {{ route.currency }}</span>
            </div>
          </div>
        </div>
        
        <!-- Отзывы водителя -->
        <div v-if="selectedDriver.reviews && selectedDriver.reviews.length > 0" class="driver-reviews">
          <h4>{{ t.driverReviews }}</h4>
          <div class="reviews-list">
            <div v-for="review in selectedDriver.reviews" :key="review.id" class="review-item">
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
        </div>
        
        <div class="modal-actions">
          <button class="btn btn--primary" @click="addReviewForDriver(selectedDriver)">{{ t.addReview }}</button>
          <button class="btn btn--ghost" @click="selectedDriver = null">{{ t.close }}</button>
        </div>
      </div>
    </div>
    
    <!-- Модальное окно добавления отзыва -->
    <div v-if="showAddReview" class="modal-overlay" @click="showAddReview = false">
      <div class="modal" @click.stop>
        <h3>{{ t.addReview }}</h3>
        <div class="form-group">
          <label>{{ t.selectDriver }}</label>
          <select v-model="newReview.driverId">
            <option value="">{{ t.selectDriver }}</option>
            <option v-for="driver in drivers" :key="driver.id" :value="driver.id">
              {{ driver.name }} ({{ driver.email }})
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>{{ t.rating }}</label>
          <div class="rating-input">
            <span v-for="i in 5" :key="i" 
                  :class="['star', { active: i <= newReview.rating }]" 
                  @click="newReview.rating = i">★</span>
          </div>
        </div>
        <div class="form-group">
          <label>{{ t.comment }}</label>
          <textarea v-model="newReview.comment" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label>{{ t.clientName }}</label>
          <input v-model="newReview.clientName" type="text" />
        </div>
        <div class="modal-actions">
          <button class="btn btn--primary" @click="saveReview">{{ t.save }}</button>
          <button class="btn btn--ghost" @click="showAddReview = false">{{ t.cancel }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import navigation from '~/components/partials/nav.vue'

export default {
  layout: 'default',
  middleware: 'admin',
  components: {
    navigation
  },
  computed: {
    lang(){ return this.$store.state.language },
    t(){
      const dict = {
        ru: {
          title: 'Управление водителями',
          status: 'Статус',
          active: 'Активен',
          all: 'Все',
          pending: 'Ожидает',
          verified: 'Подтвержден',
          rejected: 'Отклонен',
          yes: 'Да',
          no: 'Нет',
          refresh: 'Обновить',
          name: 'Имя',
          email: 'Email',
          phone: 'Телефон',
          city: 'Город',
          commission: 'Комиссия',
          rating: 'Рейтинг',
          actions: 'Действия',
          activate: 'Активировать',
          deactivate: 'Деактивировать',
          verify: 'Подтвердить',
          reject: 'Отклонить',
          view: 'Просмотр',
          totalDrivers: 'Всего водителей',
          verifiedDrivers: 'Подтвержденных',
          activeDrivers: 'Активных',
          avgCommission: 'Средняя комиссия',
          driverDetails: 'Данные водителя',
          totalTrips: 'Поездок',
          registrationDate: 'Дата регистрации',
          comment: 'Комментарий',
          close: 'Закрыть',
          reviewsManagement: 'Управление отзывами',
          addReview: 'Добавить отзыв',
          noReviews: 'Нет отзывов',
          noComment: 'Без комментария',
          driverRoutes: 'Маршруты водителя',
          driverReviews: 'Отзывы водителя',
          selectDriver: 'Выберите водителя',
          rating: 'Рейтинг',
          clientName: 'Имя клиента',
          save: 'Сохранить',
          cancel: 'Отмена',
          manageRoutes: 'Управление маршрутами'
        },
        en: {
          title: 'Driver Management',
          status: 'Status',
          active: 'Active',
          all: 'All',
          pending: 'Pending',
          verified: 'Verified',
          rejected: 'Rejected',
          yes: 'Yes',
          no: 'No',
          refresh: 'Refresh',
          name: 'Name',
          email: 'Email',
          phone: 'Phone',
          city: 'City',
          commission: 'Commission',
          rating: 'Rating',
          actions: 'Actions',
          activate: 'Activate',
          deactivate: 'Deactivate',
          verify: 'Verify',
          reject: 'Reject',
          view: 'View',
          totalDrivers: 'Total Drivers',
          verifiedDrivers: 'Verified',
          activeDrivers: 'Active',
          avgCommission: 'Avg Commission',
          driverDetails: 'Driver Details',
          totalTrips: 'Trips',
          registrationDate: 'Registration Date',
          comment: 'Comment',
          close: 'Close',
          reviewsManagement: 'Reviews Management',
          addReview: 'Add Review',
          noReviews: 'No reviews',
          noComment: 'No comment',
          driverRoutes: 'Driver Routes',
          driverReviews: 'Driver Reviews',
          selectDriver: 'Select Driver',
          rating: 'Rating',
          clientName: 'Client Name',
          save: 'Save',
          cancel: 'Cancel',
          manageRoutes: 'Manage Routes'
        }
      }
      return dict[this.lang]
    },
    filteredDrivers() {
      let filtered = this.drivers
      
      if (this.filters.status) {
        filtered = filtered.filter(d => d.verificationStatus === this.filters.status)
      }
      
      if (this.filters.active) {
        const isActive = this.filters.active === 'true'
        filtered = filtered.filter(d => d.isActive === isActive)
      }
      
      return filtered
    },
    verifiedCount() {
      return this.drivers.filter(d => d.verificationStatus === 'verified').length
    },
    activeCount() {
      return this.drivers.filter(d => d.isActive).length
    },
    avgCommission() {
      if (this.drivers.length === 0) return 0
      const sum = this.drivers.reduce((acc, d) => acc + d.commissionRate, 0)
      return Math.round(sum / this.drivers.length * 10) / 10
    }
  },
  data() {
    return {
      drivers: [],
      selectedDriver: null,
      reviews: [],
      showAddReview: false,
      filters: {
        status: '',
        active: ''
      },
      newReview: {
        driverId: '',
        rating: 5,
        comment: '',
        clientName: ''
      }
    }
  },
  async mounted() {
    await this.loadDrivers()
    await this.loadReviews()
  },
  methods: {
    async loadDrivers() {
      try {
        // В реальном приложении здесь будет загрузка данных с сервера
        // Пока используем моковые данные
        this.drivers = [
          {
            id: '1',
            name: 'Иван Петров',
            email: 'ivan@example.com',
            phone: '+7 900 123 45 67',
            city: 'Москва',
            commissionRate: 12.5,
            rating: 4.8,
            totalTrips: 45,
            verificationStatus: 'verified',
            isActive: true,
            createdAt: new Date('2024-01-15'),
            comment: 'Опытный водитель'
          },
          {
            id: '2',
            name: 'Мария Сидорова',
            email: 'maria@example.com',
            phone: '+7 900 234 56 78',
            city: 'Санкт-Петербург',
            commissionRate: 18.0,
            rating: 4.5,
            totalTrips: 23,
            verificationStatus: 'pending',
            isActive: false,
            createdAt: new Date('2024-02-01'),
            comment: 'Новый водитель'
          }
        ]
      } catch (error) {
        console.error('Error loading drivers:', error)
      }
    },
    async loadReviews() {
      try {
        // В реальном приложении здесь будет загрузка отзывов с сервера
        // Пока используем моковые данные
        this.reviews = [
          {
            id: '1',
            driver: { name: 'Иван Петров' },
            rating: 5,
            comment: 'Отличный водитель, очень вежливый',
            clientName: 'Анна Смирнова',
            createdAt: new Date('2024-01-20')
          },
          {
            id: '2',
            driver: { name: 'Мария Сидорова' },
            rating: 4,
            comment: 'Хорошая поездка, но немного опоздала',
            clientName: 'Петр Иванов',
            createdAt: new Date('2024-01-18')
          }
        ]
      } catch (error) {
        console.error('Error loading reviews:', error)
      }
    },
    async toggleActive(driver) {
      try {
        // В реальном приложении здесь будет API вызов
        driver.isActive = !driver.isActive
        console.log(`Driver ${driver.name} ${driver.isActive ? 'activated' : 'deactivated'}`)
      } catch (error) {
        console.error('Error toggling driver status:', error)
      }
    },
    async verifyDriver(driver, status) {
      try {
        // В реальном приложении здесь будет API вызов
        driver.verificationStatus = status
        console.log(`Driver ${driver.name} ${status}`)
      } catch (error) {
        console.error('Error verifying driver:', error)
      }
    },
    viewDriver(driver) {
      this.selectedDriver = driver
    },
    async addReviewForDriver(driver) {
      this.newReview.driverId = driver.id
      this.showAddReview = true
    },
    async saveReview() {
      try {
        // В реальном приложении здесь будет API вызов
        const review = {
          id: Date.now().toString(),
          driver: this.drivers.find(d => d.id === this.newReview.driverId),
          rating: this.newReview.rating,
          comment: this.newReview.comment,
          clientName: this.newReview.clientName,
          createdAt: new Date()
        }
        
        this.reviews.unshift(review)
        this.showAddReview = false
        this.newReview = {
          driverId: '',
          rating: 5,
          comment: '',
          clientName: ''
        }
        
        console.log('Review saved:', review)
      } catch (error) {
        console.error('Error saving review:', error)
      }
    },
    async deleteReview(reviewId) {
      try {
        // В реальном приложении здесь будет API вызов
        this.reviews = this.reviews.filter(r => r.id !== reviewId)
        console.log('Review deleted:', reviewId)
      } catch (error) {
        console.error('Error deleting review:', error)
      }
    },
    formatDate(date) {
      return new Date(date).toLocaleDateString(this.lang === 'ru' ? 'ru-RU' : 'en-US')
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

.btn--link {
  text-decoration: none;
  display: inline-block;
  white-space: nowrap;
}

.admin-filters {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  align-items: end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  label {
    font-size: 14px;
    color: rgba(255,255,255,0.7);
    font-weight: 500;
  }
  
  select {
    padding: 8px 12px;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 6px;
    background: rgba(255,255,255,0.1);
    color: #fff;
    font-size: 14px;
    min-width: 120px;
    
    &:focus {
      outline: none;
      border-color: #007bff;
    }
    
    option {
      background: #1a1a1a;
      color: #fff;
    }
  }
}

.drivers-table {
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  margin-bottom: 30px;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 2fr 1.5fr 1fr 1fr 1fr 1fr 2fr;
  gap: 16px;
  padding: 16px;
  background: rgba(255,255,255,0.05);
  font-weight: 600;
  font-size: 14px;
  color: rgba(255,255,255,0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 2fr 1.5fr 1fr 1fr 1fr 1fr 2fr;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  align-items: center;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: rgba(255,255,255,0.05);
  }
}

.commission-badge {
  background: rgba(0,123,255,0.2);
  color: #007bff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.rating-display {
  display: flex;
  align-items: center;
  gap: 4px;
  
  .star {
    color: rgba(255,255,255,0.3);
    font-size: 14px;
    
    &.active {
      color: #ffd700;
    }
  }
  
  .rating-number {
    font-size: 12px;
    color: rgba(255,255,255,0.7);
    margin-left: 4px;
  }
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  
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

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.admin-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  text-align: center;
  
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
  }
}

/* Модальные окна */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal {
  background: linear-gradient(135deg, rgba(26, 35, 126, 0.95) 0%, rgba(13, 20, 33, 0.95) 50%, rgba(0, 0, 0, 0.95) 100%);
  border-radius: 16px;
  padding: 32px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid rgba(255,255,255,0.2);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  animation: slideUp 0.3s ease;
  
  h3 {
    color: #fff;
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 24px;
    text-align: center;
  }
  
  &.large-modal {
    max-width: 800px;
    max-height: 90vh;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Секция отзывов */
.reviews-section {
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 30px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  
  h3 {
    font-size: 18px;
    color: #fff;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: rgba(255,255,255,0.05);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  
  .review-info {
    flex: 1;
    
    .review-driver {
      font-weight: 600;
      color: #fff;
      margin-bottom: 8px;
    }
    
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
    }
    
    .review-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: rgba(255,255,255,0.6);
      
      .review-client {
        font-weight: 500;
      }
    }
  }
  
  .review-actions {
    display: flex;
    gap: 8px;
  }
}

.driver-routes,
.driver-reviews {
  margin-top: 20px;
  
  h4 {
    color: #fff;
    margin-bottom: 12px;
    font-size: 16px;
  }
  
  .routes-list,
  .reviews-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .route-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255,255,255,0.05);
    padding: 12px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.1);
    
    .route-path {
      font-weight: 500;
      color: #fff;
    }
    
    .route-price {
      color: #28a745;
      font-weight: 600;
    }
  }
}

.form-group {
  margin-bottom: 20px;
  
  label {
    display: block;
    color: rgba(255,255,255,0.9);
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
  }
  
  input,
  textarea,
  select {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 8px;
    background: rgba(255,255,255,0.1);
    color: #fff;
    font-size: 14px;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    
    &:focus {
      outline: none;
      border-color: #007bff;
      background: rgba(255,255,255,0.15);
      box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
    }
    
    &::placeholder {
      color: rgba(255,255,255,0.5);
    }
  }
  
  textarea {
    resize: vertical;
    min-height: 80px;
    font-family: inherit;
  }
  
  select {
    cursor: pointer;
    
    option {
      background: #1a1a1a;
      color: #fff;
    }
  }
}

.rating-input {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  
  .star {
    color: rgba(255,255,255,0.3);
    font-size: 28px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &.active {
      color: #ffd700;
      transform: scale(1.1);
    }
    
    &:hover {
      color: #ffd700;
      transform: scale(1.15);
    }
  }
}

.driver-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  
  &:last-child {
    border-bottom: none;
  }
  
  label {
    font-weight: 600;
    color: rgba(255,255,255,0.7);
    min-width: 120px;
  }
  
  span {
    color: #fff;
    text-align: right;
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
  
  &--success {
    background: #28a745;
    
    &:hover {
      background: #218838;
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
  .admin-section {
    padding-top: 130px;
  }
  
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .table-header {
    display: none;
  }
  
  .table-row {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    
    > div {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      &::before {
        content: attr(data-label);
        font-weight: 600;
        color: rgba(255,255,255,0.7);
        text-transform: uppercase;
        font-size: 12px;
        letter-spacing: 0.5px;
      }
    }
  }
}

@media (max-width: 767px) {
  .admin-section {
    padding-top: 110px;
  }
  
  .admin-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .admin-filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .action-buttons {
    flex-direction: column;
    width: 100%;
    
    .btn {
      width: 100%;
      margin-bottom: 4px;
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
