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

            <form @submit.prevent="login" class="auth-form">
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
                <label for="password">{{ t.password }}</label>
                <input
                  id="password"
                  v-model="form.password"
                  type="password"
                  :placeholder="t.passwordPlaceholder"
                  required
                  class="form-input"
                />
              </div>

              <div v-if="error" class="error-message">
                {{ error }}
              </div>

              <button type="submit" class="btn btn--primary btn--full" :disabled="loading">
                <span v-if="loading">{{ t.loading }}</span>
                <span v-else>{{ t.login }}</span>
              </button>
            </form>
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
    lang () { return this.$store.state.language },
    t () {
      const dict = {
        ru: {
          title: 'Вход для сотрудников Riderra',
          subtitle: 'Диспетчер, оператор, продажи, аудит, финансы',
          email: 'Email',
          emailPlaceholder: 'Введите ваш email',
          password: 'Пароль',
          passwordPlaceholder: 'Введите пароль',
          login: 'Войти',
          loading: 'Вход...',
          loginError: 'Ошибка входа',
          onlyStaff: 'Этот вход только для сотрудников. Для перевозчиков используйте /driver-login.'
        },
        en: {
          title: 'Riderra Staff Login',
          subtitle: 'Dispatcher, operator, sales, audit, finance',
          email: 'Email',
          emailPlaceholder: 'Enter your email',
          password: 'Password',
          passwordPlaceholder: 'Enter password',
          login: 'Sign In',
          loading: 'Signing in...',
          loginError: 'Login error',
          onlyStaff: 'This login is for staff only. Carriers should use /driver-login.'
        }
      }
      return dict[this.lang]
    }
  },
  data () {
    return {
      form: {
        email: '',
        password: ''
      },
      loading: false,
      error: ''
    }
  },
  methods: {
    async login () {
      this.loading = true
      this.error = ''

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.form)
        })

        const data = await response.json()

        if (!response.ok) {
          this.error = data.error || this.t.loginError
          return
        }

        const permissions = data.user.permissions || []
        const isDriverOnly = data.user.role === 'driver' && permissions.length === 0
        if (isDriverOnly) {
          this.error = this.t.onlyStaff
          return
        }

        localStorage.setItem('authToken', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))

        if (data.user.role === 'admin' || permissions.includes('admin.panel')) {
          this.$router.push('/admin-drivers')
        } else if (permissions.includes('crm.read')) {
          this.$router.push('/admin-crm')
        } else {
          this.$router.push('/')
        }
      } catch (error) {
        console.error('Staff login error:', error)
        this.error = this.t.loginError
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
  max-width: 420px;
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
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  background: rgba(255,255,255,0.15);
}

.form-input::placeholder {
  color: rgba(255,255,255,0.5);
}

.error-message {
  background: rgba(220,53,69,0.2);
  color: #ff9aa8;
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
}

.btn:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--full {
  width: 100%;
}
</style>
