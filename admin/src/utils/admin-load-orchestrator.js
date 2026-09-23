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
  loadSettings,
  settings,
  resources,
  resourceLoaders
}) {
  let requestSequence = loadRequestId

  async function load() {
    const requestId = ++requestSequence.value
    api.beginReadScope()
    loading.value = true
    error.value = ''
    const requestedView = view.value

    try {
      const settingsPromise = loadSettings()
      if (!token.value) {
        const { settings: settingsResponse } = await settingsPromise
        applySettings(settingsResponse, settings)
        return
      }

      const administratorPromise = currentAdministrator.value
        ? Promise.resolve(currentAdministrator.value)
        : api('/admin/auth/me')
      let viewPromise = Promise.resolve()
      if (requestedView === 'dashboard') viewPromise = api('/admin/dashboard')
      if (['users', 'trips', 'charters'].includes(requestedView)) viewPromise = resourceLoaders.coreUsers()
      if (['drivers', 'driver-vehicles'].includes(requestedView)) viewPromise = resourceLoaders.drivers()
      if (requestedView === 'dispatch') viewPromise = resourceLoaders.dispatch()
      if (requestedView === 'settlements') viewPromise = resourceLoaders.settlements()
      if (requestedView === 'trips') viewPromise = viewPromise.then(() => resourceLoaders.trips())
      if (requestedView === 'charters') viewPromise = viewPromise.then(() => resourceLoaders.charters())
      if (requestedView === 'addresses') viewPromise = resourceLoaders.addresses()
      if (requestedView === 'membership') viewPromise = resourceLoaders.membership()
      if (requestedView === 'promotions') viewPromise = resourceLoaders.promotions()
      if (requestedView === 'administrators') viewPromise = resourceLoaders.administrators()
      if (requestedView === 'auditLogs') viewPromise = resourceLoaders.auditLogs()
      if (requestedView === 'notifications') viewPromise = resourceLoaders.notifications()
      if (requestedView === 'vehicles') viewPromise = resourceLoaders.vehicles()
      if (requestedView === 'route-pricing') viewPromise = resourceLoaders.routePricing()

      const [{ settings: settingsResponse }, administrator, viewResult] = await Promise.all([
        settingsPromise,
        administratorPromise,
        viewPromise
      ])
      if (requestId !== requestSequence.value) return
      applySettings(settingsResponse, settings)
      currentAdministrator.value = administrator
      if (requestedView === 'dashboard') dashboard.value = viewResult
      if (requestedView === 'addresses') error.value = viewResult
    } catch (requestError) {
      if (requestError.kind === 'cancelled') return
      error.value = displayError(requestError)
      if (requestError.kind === 'unauthorized' || requestError.status === 401) {
        token.value = ''
        currentAdministrator.value = null
      }
    } finally {
      if (requestId === requestSequence.value) loading.value = false
    }
  }

  return { load }
}
