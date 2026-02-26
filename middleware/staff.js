export default function ({ redirect }) {
  if (process.client) {
    const token = localStorage.getItem('authToken')
    const user = localStorage.getItem('user')

    if (!token || !user) {
      return redirect('/staff-login')
    }

    try {
      const userData = JSON.parse(user)
      const permissions = userData.permissions || []
      const canAccess =
        userData.role === 'admin' ||
        permissions.includes('*') ||
        permissions.includes('admin.panel') ||
        permissions.includes('orders.read') ||
        permissions.includes('drivers.read') ||
        permissions.includes('crm.read') ||
        permissions.includes('pricing.read') ||
        permissions.includes('ops.read')

      if (!canAccess) {
        return redirect('/staff-login')
      }
    } catch (e) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      return redirect('/staff-login')
    }
  }
}
