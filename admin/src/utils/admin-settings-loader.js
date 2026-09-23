export function applyAdminSettings(settings, { exchangeRate, pricingCurrency, severeWeatherEnabled, adminLogo, paymentSettings }) {
  exchangeRate.value = Number(settings.exchangeRate) || 0.92
  pricingCurrency.value = settings.pricingCurrency === 'HKD' ? 'HKD' : 'RMB'
  severeWeatherEnabled.value = Boolean(settings.severeWeatherEnabled)
  adminLogo.value = settings.adminLogo || ''
  paymentSettings.value = {
    driverRaceEnabled: Boolean(settings.driverRaceEnabled),
    dispatchSchedulingEnabled: Boolean(settings.dispatchSchedulingEnabled),
    driverPayoutPercentage: Number.isFinite(Number(settings.driverPayoutPercentage)) ? Number(settings.driverPayoutPercentage) : 100,
    fareBalancePayEnabled: settings.fareBalancePayEnabled !== false,
    cashBalancePayEnabled: settings.cashBalancePayEnabled !== false,
    wechatPayEnabled: settings.wechatPayEnabled !== false,
    alipayPayEnabled: settings.alipayPayEnabled !== false,
    bankCardPayEnabled: settings.bankCardPayEnabled !== false,
    sandboxMode: Boolean(settings.sandboxMode)
  }
}

export function createAdminSettingsLoader({ api, staleTime = 5 * 60 * 1000 }) {
  let cachedAt = 0
  let cachedSettings = null
  let pendingRequest = null
  let cacheVersion = 0

  async function load({ force = false } = {}) {
    const now = Date.now()
    if (!force && cachedSettings && now - cachedAt < staleTime) {
      return { settings: cachedSettings, fresh: false }
    }
    if (!force && pendingRequest) return pendingRequest

    const requestVersion = cacheVersion
    const request = api('/settings', { cancelOnNavigate: false })
      .then(settings => {
        if (requestVersion === cacheVersion) {
          cachedSettings = settings
          cachedAt = Date.now()
        }
        return { settings, fresh: true }
      })
      .finally(() => { if (pendingRequest === request) pendingRequest = null })
    pendingRequest = request

    return request
  }

  function invalidate() {
    cacheVersion += 1
    cachedAt = 0
    cachedSettings = null
    pendingRequest = null
  }

  return { load, invalidate }
}
