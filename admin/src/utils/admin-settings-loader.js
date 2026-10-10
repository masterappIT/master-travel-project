export function applyAdminSettings(settings, { exchangeRate, pricingCurrency, settlementCurrency, passengerDefaultCurrency, driverDefaultCurrency, paymentCurrencies, severeWeatherEnabled, adminLogo, supportSettings, paymentSettings }) {
  exchangeRate.value = Number(settings.exchangeRate) || 0.92
  pricingCurrency.value = settings.pricingCurrency === 'HKD' ? 'HKD' : 'RMB'
  settlementCurrency.value = settings.settlementCurrency === 'HKD' ? 'HKD' : 'RMB'
  passengerDefaultCurrency.value = settings.passengerDefaultCurrency === 'HKD' ? 'HKD' : 'RMB'
  driverDefaultCurrency.value = settings.driverDefaultCurrency === 'HKD' ? 'HKD' : 'RMB'
  paymentCurrencies.value = Array.isArray(settings.paymentCurrencies) ? settings.paymentCurrencies.filter(currency => ['RMB', 'HKD'].includes(currency)) : ['RMB', 'HKD']
  severeWeatherEnabled.value = Boolean(settings.severeWeatherEnabled)
  adminLogo.value = settings.adminLogo || ''
  supportSettings.value = {
    enabled: settings.support?.enabled === true,
    guestEnabled: settings.support?.guestEnabled !== false,
    directContactEnabled: settings.support?.directContactEnabled !== false,
    orderContextEnabled: settings.support?.orderContextEnabled !== false,
    imageUploadEnabled: settings.support?.imageUploadEnabled !== false,
    videoUploadEnabled: settings.support?.videoUploadEnabled !== false,
    voiceMessageEnabled: settings.support?.voiceMessageEnabled !== false,
    voiceCallEnabled: settings.support?.voiceCallEnabled !== false,
    maxUploadSizeMb: Number.isInteger(Number(settings.support?.maxUploadSizeMb)) ? Number(settings.support.maxUploadSizeMb) : 50
  }
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
