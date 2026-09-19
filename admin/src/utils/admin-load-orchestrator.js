export function createAdminResourceLoader({
  api,
  token,
  currentAdministrator,
  view,
  loading,
  error,
  dashboard,
  loadRequestId,
  displayError,
  applySettings,
  settings,
  resources,
  resourceLoaders
}) {
  let requestSequence = loadRequestId

  async function load() {
    const requestId = ++requestSequence.value
    loading.value = true
    error.value = ''
    const requestedView = view.value

    try {
      const settingsResponse = await api('/settings')
      applySettings(settingsResponse, settings)
      if (!token.value) return
      if (!currentAdministrator.value) currentAdministrator.value = await api('/admin/auth/me')

      if (requestedView === 'dashboard') dashboard.value = await api('/admin/dashboard')
      if (['users', 'trips', 'charters'].includes(requestedView)) await resourceLoaders.coreUsers()
      if (requestedView === 'drivers') await resourceLoaders.drivers()
      if (requestedView === 'dispatch') await resourceLoaders.dispatch()
      if (requestedView === 'settlements') await resourceLoaders.settlements()
      if (requestedView === 'trips') await resourceLoaders.trips()
      if (requestedView === 'charters') await resourceLoaders.charters()
      if (requestedView === 'addresses') error.value = await resourceLoaders.addresses()
      if (requestedView === 'membership') await resourceLoaders.membership()
      if (requestedView === 'promotions') await resourceLoaders.promotions()
      if (requestedView === 'administrators') await resourceLoaders.administrators()
      if (requestedView === 'notifications') await resourceLoaders.notifications()
      if (requestedView === 'vehicles') await resourceLoaders.vehicles()
      if (requestedView === 'route-pricing') await resourceLoaders.routePricing()
    } catch (requestError) {
      error.value = displayError(requestError)
      if (requestError.message?.includes('session')) {
        token.value = ''
        localStorage.removeItem('admin_token')
      }
    } finally {
      if (requestId === requestSequence.value) loading.value = false
    }
  }

  return { load }
}
