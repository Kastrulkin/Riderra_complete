<template>
  <div>
    <navigation></navigation>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    
    <section class="site-section site-section--pf auth-section">
      <div class="container">
        <div class="auth-container">
          <div class="auth-card">
            <h1 class="auth-title">{{ t.title }}</h1>
            <p class="auth-subtitle">{{ t.subtitle }}</p>
            
            <form @submit.prevent="register" class="auth-form">
              <div class="form-group">
                <label for="name">{{ t.name }}</label>
                <input
                  id="name"
                  v-model="form.name"
                  type="text"
                  :placeholder="t.namePlaceholder"
                  required
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label for="email">{{ t.email }}</label>
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  :placeholder="t.emailPlaceholder"
                  required
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label for="phone">{{ t.phone }}</label>
                <input
                  id="phone"
                  v-model="form.phone"
                  type="tel"
                  :placeholder="t.phonePlaceholder"
                  required
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label for="city">{{ t.city }}</label>
                <input
                  id="city"
                  v-model="form.city"
                  type="text"
                  :placeholder="t.cityPlaceholder"
                  required
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label for="commissionRate">{{ t.commissionRate }}</label>
                <div class="commission-input">
                  <input
                    id="commissionRate"
                    v-model.number="form.commissionRate"
                    type="number"
                    min="5"
                    max="30"
                    step="0.1"
                    required
                    class="form-input"
                  />
                  <span class="commission-suffix">%</span>
                </div>
                <p class="commission-help">{{ t.commissionHelp }}</p>
              </div>
              
              <div class="form-group">
                <label for="password">{{ t.password }}</label>
                <input
                  id="password"
                  v-model="form.password"
                  type="password"
                  :placeholder="t.passwordPlaceholder"
                  required
                  minlength="6"
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label for="confirmPassword">{{ t.confirmPassword }}</label>
                <input
                  id="confirmPassword"
                  v-model="form.confirmPassword"
                  type="password"
                  :placeholder="t.confirmPasswordPlaceholder"
                  required
                  class="form-input"
                />
              </div>
              
              <div v-if="error" class="error-message">
                {{ error }}
              </div>
              
              <button type="submit" class="btn btn--primary btn--full" :disabled="loading">
                <span v-if="loading">{{ t.loading }}</span>
                <span v-else>{{ t.register }}</span>
              </button>
            </form>
            
            <div class="auth-links">
              <p>{{ t.haveAccount }} <nuxt-link to="/login" class="auth-link">{{ t.login }}</nuxt-link></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import navigation from '~/components/partials/nav.vue'

export default {
  layout: 'default',
  components: {
    navigation
  },
  computed: {
    lang(){ return this.$store.state.language },
    t(){
      const dict = {
        ru: {
          title: 'Регистрация водителя',
          subtitle: 'Создайте аккаунт водителя',
          name: 'Имя',
          namePlaceholder: 'Введите ваше имя',
          email: 'Email',
          emailPlaceholder: 'Введите ваш email',
          phone: 'Телефон',
          phonePlaceholder: 'Введите номер телефона',
          city: 'Город',
          cityPlaceholder: 'Введите ваш город',
          commissionRate: 'Комиссия',
          commissionHelp: 'Комиссия, которую вы готовы платить платформе (5-30%)',
          password: 'Пароль',
          passwordPlaceholder: 'Введите пароль (минимум 6 символов)',
          confirmPassword: 'Подтверждение пароля',
          confirmPasswordPlaceholder: 'Повторите пароль',
          register: 'Зарегистрироваться',
          loading: 'Регистрация...',
          haveAccount: 'Уже есть аккаунт?',
          login: 'Войти',
          registerSuccess: 'Регистрация успешна!',
          registerError: 'Ошибка регистрации',
          passwordMismatch: 'Пароли не совпадают'
        },
        en: {
          title: 'Driver Registration',
          subtitle: 'Create a driver account',
          name: 'Name',
          namePlaceholder: 'Enter your name',
          email: 'Email',
          emailPlaceholder: 'Enter your email',
          phone: 'Phone',
          phonePlaceholder: 'Enter phone number',
          city: 'City',
          cityPlaceholder: 'Enter your city',
          commissionRate: 'Commission',
          commissionHelp: 'Commission you are willing to pay to the platform (5-30%)',
          password: 'Password',
          passwordPlaceholder: 'Enter password (minimum 6 characters)',
          confirmPassword: 'Confirm Password',
          confirmPasswordPlaceholder: 'Repeat password',
          register: 'Register',
          loading: 'Registering...',
          haveAccount: 'Already have an account?',
          login: 'Sign In',
          registerSuccess: 'Registration successful!',
          registerError: 'Registration error',
          passwordMismatch: 'Passwords do not match'
        }
      }
      return dict[this.lang]
    }
  },
  data() {
    return {
      form: {
        name: '',
        email: '',
        phone: '',
        city: '',
        commissionRate: 15.0,
        password: '',
        confirmPassword: ''
      },
      loading: false,
      error: ''
    }
  },
  methods: {
    async register() {
      this.loading = true
      this.error = ''
      
      // Проверяем совпадение паролей
      if (this.form.password !== this.form.confirmPassword) {
        this.error = this.t.passwordMismatch
        this.loading = false
        return
      }
      
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...this.form,
            role: 'driver'
          })
        })
        
        const data = await response.json()
        
        if (response.ok) {
          // Сохраняем токен в localStorage
          localStorage.setItem('authToken', data.token)
          localStorage.setItem('user', JSON.stringify(data.user))
          
          // Перенаправляем на дашборд водителя
          this.$router.push('/driver-dashboard')
        } else {
          this.error = data.error || this.t.registerError
        }
      } catch (error) {
        console.error('Registration error:', error)
        this.error = this.t.registerError
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped lang="scss">
.auth-section { 
  padding-top: 160px; 
  padding-bottom: 40px; 
  position: relative;
  z-index: 10;
  color: #fff;
  min-height: 100vh;
  display: flex;
  align-items: center;
}

.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.auth-card {
  background: rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 40px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  width: 100%;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

.auth-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
  text-align: center;
}

.auth-subtitle {
  font-size: 16px;
  color: rgba(255,255,255,0.7);
  margin-bottom: 32px;
  text-align: center;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
}

.form-input {
  padding: 12px 16px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  font-size: 16px;
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

.commission-input {
  position: relative;
  
  .form-input {
    padding-right: 40px;
  }
  
  .commission-suffix {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255,255,255,0.7);
    font-weight: 600;
  }
}

.commission-help {
  font-size: 12px;
  color: rgba(255,255,255,0.6);
  margin: 4px 0 0 0;
}

.error-message {
  background: rgba(220,53,69,0.2);
  color: #dc3545;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(220,53,69,0.3);
  font-size: 14px;
  text-align: center;
}

.btn {
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: #0056b3;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &--primary {
    background: #007bff;
    
    &:hover:not(:disabled) {
      background: #0056b3;
    }
  }
  
  &--full {
    width: 100%;
  }
}

.auth-links {
  margin-top: 24px;
  text-align: center;
  
  p {
    margin: 8px 0;
    color: rgba(255,255,255,0.7);
    font-size: 14px;
  }
}

.auth-link {
  color: #007bff;
  text-decoration: none;
  font-weight: 600;
  
  &:hover {
    color: #0056b3;
    text-decoration: underline;
  }
}

@media (max-width: 767px) {
  .auth-section {
    padding-top: 120px;
  }
  
  .auth-card {
    padding: 24px;
    margin: 0 16px;
  }
  
  .auth-title {
    font-size: 24px;
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
