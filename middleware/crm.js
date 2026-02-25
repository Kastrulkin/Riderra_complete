export default function ({ store, redirect }) {
  if (process.client) {
    const token = localStorage.getItem('authToken')
    const user = localStorage.getItem('user')

    if (!token || !user) {
      return redirect('/login')
    }

    try {
      const userData = JSON.parse(user)
      const permissions = userData.permissions || []
      const canReadCrm = userData.role === 'admin' || permissions.includes('crm.read')

      if (!canReadCrm) {
        return redirect('/driver-dashboard')
      }

      store.commit('setUser', userData)
    } catch (error) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      return redirect('/login')
    }
  }
}
