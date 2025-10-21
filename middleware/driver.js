export default function ({ store, redirect, route }) {
  // Проверяем, есть ли токен в localStorage
  if (process.client) {
    const token = localStorage.getItem('authToken')
    const user = localStorage.getItem('user')
    
    if (!token || !user) {
      // Если нет токена, перенаправляем на страницу входа
      return redirect('/login')
    }
    
    try {
      const userData = JSON.parse(user)
      
      // Проверяем, что пользователь - водитель
      if (userData.role !== 'driver') {
        return redirect('/admin-drivers')
      }
      
      store.commit('setUser', userData)
    } catch (error) {
      console.error('Error parsing user data:', error)
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      return redirect('/login')
    }
  }
}
