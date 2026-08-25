<template>
  <section class="auth-section">
    <div class="auth-shell">
      <aside class="auth-story">
        <nuxt-link to="/" class="auth-brand"><img src="/img/logo.svg" alt="Riderra" /></nuxt-link>
        <div>
          <span class="auth-kicker">Рабочее пространство команды</span>
          <h2>Заказы, клиенты и AI-помощники — в одном месте.</h2>
          <p>После входа вы сразу увидите, что требует внимания и какую работу система уже выполняет.</p>
        </div>
        <div class="auth-system"><i></i><span><strong>Система готова</strong><small>Данные сотрудников защищены</small></span></div>
      </aside>
      <div class="auth-main">
        <div class="auth-card">
            <nuxt-link to="/" class="auth-brand auth-brand--mobile"><img src="/img/logo.svg" alt="Riderra" /></nuxt-link>
            <h1 class="auth-title">{{ t.title }}</h1>
            <p class="auth-subtitle">Войдите, чтобы продолжить работу с заказами.</p>

            <form class="auth-form" @submit.prevent="login">
              <div class="form-group">
                <label for="email">{{ t.email }}</label>
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  :placeholder="t.emailPlaceholder"
                  required
                  autocomplete="username"
                  autofocus
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label for="password">{{ t.password }}</label>
                <div class="password-field">
                  <input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'" :placeholder="t.passwordPlaceholder" required autocomplete="current-password" class="form-input" />
                  <button type="button" :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'" @click="showPassword = !showPassword">{{ showPassword ? 'Скрыть' : 'Показать' }}</button>
                </div>
              </div>

              <div v-if="error" class="error-message" role="alert">
                {{ error }}
              </div>

              <button type="submit" class="btn btn--primary btn--full" :disabled="loading">
                <span v-if="loading" class="button-progress"><i></i>{{ t.loading }}</span>
                <span v-else>{{ t.login }}</span>
              </button>
            </form>
            <p class="auth-help">Проблема со входом? Обратитесь к владельцу рабочего пространства.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  layout: 'auth',
  computed: {
    lang () { return this.$store.state.language },
    t () {
      const dict = {
        ru: {
          title: 'Вход для сотрудников Riderra',
          subtitle: '',
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
          subtitle: '',
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
      showPassword: false,
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
          this.$router.push('/admin-orders')
        } else if (permissions.includes('orders.read')) {
          this.$router.push('/admin-orders')
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
  min-height: 100vh;
  padding: 20px;
  color: #17233d;
  background: #f5f7fa;
}
.auth-shell {
  display: grid;
  grid-template-columns: minmax(320px, .9fr) minmax(420px, 1.1fr);
  min-height: calc(100vh - 40px);
  max-width: 1180px;
  margin: auto;
  overflow: hidden;
  border: 1px solid #e1e6ee;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 70px rgba(28, 41, 66, .09);
}
.auth-story {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 44px;
  background: #17233d;
  color: #fff;
}
.auth-brand { display: inline-flex; width: fit-content; }
.auth-brand img { width: 118px; }
.auth-story h2 { max-width: 460px; margin: 14px 0; color: #fff; font-size: clamp(30px, 4vw, 50px); line-height: 1.08; letter-spacing: -.035em; }
.auth-story p { max-width: 470px; margin: 0; color: rgba(255,255,255,.68); font-size: 16px; line-height: 1.6; }
.auth-kicker { color: #a9b9d4; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.auth-system { display: flex; align-items: center; gap: 11px; }
.auth-system i { width: 10px; height: 10px; border-radius: 50%; background: #65c489; box-shadow: 0 0 0 6px rgba(101,196,137,.12); }
.auth-system span { display: grid; }
.auth-system strong { font-size: 13px; }
.auth-system small { color: rgba(255,255,255,.55); font-size: 11px; }
.auth-main { display: grid; place-items: center; padding: 44px; }
.auth-brand--mobile { display: none; }
.auth-card { width: 100%; max-width: 390px; }
.auth-help { margin: 22px 0 0; color: #7a879b; text-align: center; font-size: 12px; line-height: 1.5; }
.button-progress { display: inline-flex; align-items: center; justify-content: center; gap: 9px; }
.button-progress i { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%; animation: authSpin .8s linear infinite; }
@keyframes authSpin { to { transform: rotate(360deg); } }
.password-field { position: relative; }
.password-field .form-input { padding-right: 82px; }
.password-field button { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); border: 0; border-radius: 7px; background: transparent; padding: 7px; color: #52627b; font-size: 12px; cursor: pointer; }
.password-field button:hover { background: #f1f4f8; }
.password-field .form-input { width: 100%; }

@media(max-width: 820px) {
  .auth-section { padding: 0; }
  .auth-shell { grid-template-columns: 1fr; min-height: 100vh; border: 0; border-radius: 0; }
  .auth-story { display: none; }
  .auth-main { padding: 28px 20px; }
  .auth-brand--mobile { display: inline-flex; margin-bottom: 42px; }
  .auth-brand--mobile img { filter: brightness(0) saturate(100%) invert(13%) sepia(17%) saturate(1597%) hue-rotate(181deg) brightness(94%); }
}

.auth-title {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
  text-align: left;
  text-wrap: balance;
}

.auth-subtitle {
  font-size: 16px;
  color: #4b5563;
  margin-bottom: 32px;
  text-align: left;
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
  color: #111827;
}

.form-input {
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  font-size: 16px;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #28456f;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(40, 69, 111, 0.13);
}

.form-input::placeholder {
  color: #9ca3af;
}

.error-message {
  background: #fff1f0;
  color: #9f241a;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #f3c3be;
  font-size: 14px;
  text-align: center;
}

.btn {
  background: #17233d;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
}

.btn:hover:not(:disabled) {
  background: #243757;
  transform: translateY(-1px);
}

.btn:active:not(:disabled) {
  transform: scale(0.96);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--full {
  width: 100%;
}
@media(prefers-reduced-motion:reduce){.button-progress i{animation:none}.btn:hover:not(:disabled){transform:none}}
</style>
