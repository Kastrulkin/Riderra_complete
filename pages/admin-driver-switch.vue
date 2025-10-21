<template>
  <div>
    <navigation></navigation>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <h1 class="h2 admin-title">{{ t.title }}</h1>
        
        <!-- Фильтры -->
        <div class="admin-filters">
          <div class="filter-group">
            <label>{{ t.search }}</label>
            <input v-model="searchQuery" type="text" :placeholder="t.searchPlaceholder" />
          </div>
          
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
        </div>
        
        <!-- Список водителей -->
        <div class="drivers-grid">
          <div v-for="driver in filteredDrivers" :key="driver.id" class="driver-card">
            <div class="driver-header">
              <div class="driver-avatar">
                <span>{{ driver.name.charAt(0).toUpperCase() }}</span>
              </div>
              <div class="driver-info">
                <h3 class="driver-name">{{ driver.name }}</h3>
                <p class="driver-email">{{ driver.email }}</p>
                <p class="driver-phone">{{ driver.phone }}</p>
              </div>
              <div class="driver-status">
                <span class="status-badge" :class="driver.verificationStatus">
                  {{ t[driver.verificationStatus] }}
                </span>
                <span class="active-badge" :class="{ active: driver.isActive }">
                  {{ driver.isActive ? t.active : t.inactive }}
                </span>
              </div>
            </div>
            
            <div class="driver-stats">
              <div class="stat">
                <span class="stat-label">{{ t.commission }}</span>
                <span class="stat-value">{{ driver.commissionRate }}%</span>
              </div>
              <div class="stat">
                <span class="stat-label">{{ t.rating }}</span>
                <div class="rating-display">
                  <span v-for="i in 5" :key="i" :class="['star', { active: i <= driver.rating }]">★</span>
                  <span class="rating-number">{{ driver.rating }}</span>
                </div>
              </div>
              <div class="stat">
                <span class="stat-label">{{ t.trips }}</span>
                <span class="stat-value">{{ driver.totalTrips }}</span>
              </div>
            </div>
            
            <div class="driver-actions">
              <button class="btn btn--primary" @click="viewDriver(driver)">
                {{ t.viewProfile }}
              </button>
              <button class="btn btn--secondary" @click="switchToDriver(driver)">
                {{ t.switchToDriver }}
              </button>
            </div>
          </div>
        </div>
        
        <!-- Пустое состояние -->
        <div v-if="filteredDrivers.length === 0" class="empty-state">
          <p>{{ t.noDrivers }}</p>
        </div>
      </div>
    </section>
    
    <!-- Модальное окно просмотра водителя -->
    <div v-if="selectedDriver" class="modal-overlay" @click="selectedDriver = null">
      <div class="modal large-modal" @click.stop>
        <h3>{{ t.driverProfile }}</h3>
        <div class="driver-profile">
          <div class="profile-header">
            <div class="profile-avatar">
              <span>{{ selectedDriver.name.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="profile-info">
              <h2>{{ selectedDriver.name }}</h2>
              <p>{{ selectedDriver.email }}</p>
              <p>{{ selectedDriver.phone }}</p>
              <p>{{ selectedDriver.city }}</p>
            </div>
          </div>
          
          <div class="profile-stats">
            <div class="stat-card">
              <h4>{{ t.commission }}</h4>
              <div class="stat-value">{{ selectedDriver.commissionRate }}%</div>
            </div>
            <div class="stat-card">
              <h4>{{ t.rating }}</h4>
              <div class="stat-value">{{ selectedDriver.rating }}/5</div>
            </div>
            <div class="stat-card">
              <h4>{{ t.trips }}</h4>
              <div class="stat-value">{{ selectedDriver.totalTrips }}</div>
            </div>
            <div class="stat-card">
              <h4>{{ t.reviews }}</h4>
              <div class="stat-value">{{ selectedDriver.totalReviews || 0 }}</div>
            </div>
          </div>
          
          <!-- Маршруты водителя -->
          <div v-if="selectedDriver.routes && selectedDriver.routes.length > 0" class="profile-routes">
            <h4>{{ t.driverRoutes }}</h4>
            <div class="routes-list">
              <div v-for="route in selectedDriver.routes" :key="route.id" class="route-item">
                <span class="route-path">{{ route.fromPoint }} → {{ route.toPoint }}</span>
                <span class="route-price">{{ route.driverPrice }} {{ route.currency }}</span>
              </div>
            </div>
          </div>
          
          <!-- Отзывы водителя -->
          <div v-if="selectedDriver.reviews && selectedDriver.reviews.length > 0" class="profile-reviews">
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
        </div>
        
        <div class="modal-actions">
          <button class="btn btn--primary" @click="switchToDriver(selectedDriver)">{{ t.switchToDriver }}</button>
          <button class="btn btn--ghost" @click="selectedDriver = null">{{ t.close }}</button>
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
          title: 'Переключение между водителями',
          search: 'Поиск',
          searchPlaceholder: 'Поиск по имени, email или телефону',
          status: 'Статус',
          active: 'Активен',
          all: 'Все',
          pending: 'Ожидает',
          verified: 'Подтвержден',
          rejected: 'Отклонен',
          yes: 'Да',
          no: 'Нет',
          inactive: 'Неактивен',
          commission: 'Комиссия',
          rating: 'Рейтинг',
          trips: 'Поездок',
          reviews: 'Отзывов',
          viewProfile: 'Профиль',
          switchToDriver: 'Переключиться',
          noDrivers: 'Водители не найдены',
          driverProfile: 'Профиль водителя',
          driverRoutes: 'Маршруты водителя',
          driverReviews: 'Отзывы водителя',
          noComment: 'Без комментария',
          close: 'Закрыть'
        },
        en: {
          title: 'Driver Switching',
          search: 'Search',
          searchPlaceholder: 'Search by name, email or phone',
          status: 'Status',
          active: 'Active',
          all: 'All',
          pending: 'Pending',
          verified: 'Verified',
          rejected: 'Rejected',
          yes: 'Yes',
          no: 'No',
          inactive: 'Inactive',
          commission: 'Commission',
          rating: 'Rating',
          trips: 'Trips',
          reviews: 'Reviews',
          viewProfile: 'Profile',
          switchToDriver: 'Switch to Driver',
          noDrivers: 'No drivers found',
          driverProfile: 'Driver Profile',
          driverRoutes: 'Driver Routes',
          driverReviews: 'Driver Reviews',
          noComment: 'No comment',
          close: 'Close'
        }
      }
      return dict[this.lang]
    },
    filteredDrivers() {
      let filtered = this.drivers
      
      // Поиск
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(d => 
          d.name.toLowerCase().includes(query) ||
          d.email.toLowerCase().includes(query) ||
          d.phone.toLowerCase().includes(query)
        )
      }
      
      // Фильтр по статусу
      if (this.filters.status) {
        filtered = filtered.filter(d => d.verificationStatus === this.filters.status)
      }
      
      // Фильтр по активности
      if (this.filters.active) {
        const isActive = this.filters.active === 'true'
        filtered = filtered.filter(d => d.isActive === isActive)
      }
      
      return filtered
    }
  },
  data() {
    return {
      drivers: [],
      selectedDriver: null,
      searchQuery: '',
      filters: {
        status: '',
        active: ''
      }
    }
  },
  async mounted() {
    await this.loadDrivers()
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
            totalReviews: 12,
            verificationStatus: 'verified',
            isActive: true,
            createdAt: new Date('2024-01-15'),
            routes: [
              { id: '1', fromPoint: 'Аэропорт', toPoint: 'Центр', driverPrice: 2000, currency: 'RUB' },
              { id: '2', fromPoint: 'Вокзал', toPoint: 'Аэропорт', driverPrice: 1800, currency: 'RUB' }
            ],
            reviews: [
              { id: '1', rating: 5, comment: 'Отличный водитель', clientName: 'Анна С.', createdAt: new Date('2024-01-20') },
              { id: '2', rating: 4, comment: 'Хорошая поездка', clientName: 'Петр И.', createdAt: new Date('2024-01-18') }
            ]
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
            totalReviews: 8,
            verificationStatus: 'pending',
            isActive: false,
            createdAt: new Date('2024-02-01'),
            routes: [],
            reviews: []
          },
          {
            id: '3',
            name: 'Алексей Козлов',
            email: 'alex@example.com',
            phone: '+7 900 345 67 89',
            city: 'Казань',
            commissionRate: 15.0,
            rating: 4.9,
            totalTrips: 67,
            totalReviews: 15,
            verificationStatus: 'verified',
            isActive: true,
            createdAt: new Date('2024-01-10'),
            routes: [
              { id: '3', fromPoint: 'Центр', toPoint: 'Аэропорт', driverPrice: 1500, currency: 'RUB' }
            ],
            reviews: [
              { id: '3', rating: 5, comment: 'Лучший водитель!', clientName: 'Елена В.', createdAt: new Date('2024-01-22') }
            ]
          }
        ]
      } catch (error) {
        console.error('Error loading drivers:', error)
      }
    },
    viewDriver(driver) {
      this.selectedDriver = driver
    },
    switchToDriver(driver) {
      // В реальном приложении здесь будет переключение на аккаунт водителя
      console.log('Switching to driver:', driver.name)
      // Можно перенаправить на дашборд водителя с его ID
      // this.$router.push(`/driver-dashboard?driverId=${driver.id}`)
      alert(`Переключение на аккаунт водителя: ${driver.name}`)
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

.admin-title { 
  margin-bottom: 30px; 
  color: #fff;
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
  
  input, select {
    padding: 8px 12px;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 6px;
    background: rgba(255,255,255,0.1);
    color: #fff;
    font-size: 14px;
    min-width: 200px;
    
    &:focus {
      outline: none;
      border-color: #007bff;
    }
    
    &::placeholder {
      color: rgba(255,255,255,0.5);
    }
  }
  
  select option {
    background: #1a1a1a;
    color: #fff;
  }
}

.drivers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.driver-card {
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
  }
}

.driver-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.driver-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #007bff, #0056b3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.driver-info {
  flex: 1;
  
  .driver-name {
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    margin: 0 0 4px 0;
  }
  
  .driver-email,
  .driver-phone {
    font-size: 14px;
    color: rgba(255,255,255,0.7);
    margin: 2px 0;
  }
}

.driver-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
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

.active-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  background: rgba(220,53,69,0.2);
  color: #dc3545;
  
  &.active {
    background: rgba(40,167,69,0.2);
    color: #28a745;
  }
}

.driver-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px 0;
  border-top: 1px solid rgba(255,255,255,0.1);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.stat {
  text-align: center;
  
  .stat-label {
    display: block;
    font-size: 12px;
    color: rgba(255,255,255,0.7);
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .stat-value {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
  }
}

.rating-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  
  .star {
    color: rgba(255,255,255,0.3);
    font-size: 14px;
    
    &.active {
      color: #ffd700;
    }
  }
  
  .rating-number {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    margin-left: 4px;
  }
}

.driver-actions {
  display: flex;
  gap: 8px;
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
  
  &.large-modal {
    max-width: 800px;
    max-height: 90vh;
  }
  
  h3 {
    color: #fff;
    margin-bottom: 20px;
    font-size: 20px;
  }
}

.driver-profile {
  .profile-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  
  .profile-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, #007bff, #0056b3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: 700;
    color: #fff;
  }
  
  .profile-info {
    h2 {
      color: #fff;
      margin: 0 0 8px 0;
      font-size: 24px;
    }
    
    p {
      color: rgba(255,255,255,0.7);
      margin: 4px 0;
      font-size: 14px;
    }
  }
  
  .profile-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
  
  .stat-card {
    text-align: center;
    background: rgba(255,255,255,0.05);
    padding: 16px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    
    h4 {
      font-size: 12px;
      color: rgba(255,255,255,0.7);
      margin: 0 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
    }
  }
  
  .profile-routes,
  .profile-reviews {
    margin-bottom: 20px;
    
    h4 {
      color: #fff;
      margin-bottom: 12px;
      font-size: 16px;
    }
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
  
  .review-item {
    background: rgba(255,255,255,0.05);
    padding: 12px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.1);
    
    .review-rating {
      display: flex;
      gap: 2px;
      margin-bottom: 8px;
      
      .star {
        color: rgba(255,255,255,0.3);
        font-size: 14px;
        
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
      justify-content: space-between;
      font-size: 12px;
      color: rgba(255,255,255,0.6);
    }
  }
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255,255,255,0.7);
  
  p {
    font-size: 18px;
    margin: 0;
  }
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
  
  &--secondary {
    background: #6c757d;
    
    &:hover {
      background: #545b62;
    }
  }
  
  &--ghost {
    background: transparent;
    color: #fff;
    border: 1px solid rgba(255,255,255,0.3);
    
    &:hover {
      background: rgba(255,255,255,0.1);
    }
  }
}

@media (max-width: 1024px) {
  .admin-section {
    padding-top: 130px;
  }
  
  .drivers-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (max-width: 767px) {
  .admin-section {
    padding-top: 110px;
  }
  
  .admin-filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group {
    width: 100%;
    
    input, select {
      min-width: auto;
      width: 100%;
    }
  }
  
  .drivers-grid {
    grid-template-columns: 1fr;
  }
  
  .driver-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .profile-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .driver-actions {
    flex-direction: column;
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
