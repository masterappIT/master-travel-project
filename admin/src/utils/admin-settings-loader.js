export function applyAdminSettings(settings, { exchangeRate, pricingCurrency, severeWeatherEnabled, adminLogo, paymentSettings }) {
  exchangeRate.value = Number(settings.exchangeRate) || 0.92
  pricingCurrency.value = settings.pricingCurrency === 'HKD' ? 'HKD' : 'RMB'
  severeWeatherEnabled.value = Boolean(settings.severeWeatherEnabled)
  adminLogo.value = settings.adminLogo || ''
  paymentSettings.value = {
    driverRaceEnabled: Boolean(settings.driverRaceEnabled),
    fareBalancePayEnabled: settings.fareBalancePayEnabled !== false,
    cashBalancePayEnabled: settings.cashBalancePayEnabled !== false,
    wechatPayEnabled: settings.wechatPayEnabled !== false,
    alipayPayEnabled: settings.alipayPayEnabled !== false,
    bankCardPayEnabled: settings.bankCardPayEnabled !== false,
    sandboxMode: Boolean(settings.sandboxMode)
  }
}
