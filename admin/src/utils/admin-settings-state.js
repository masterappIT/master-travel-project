import { ref } from 'vue'

export function createAdminSettingsState() {
  const exchangeRate = ref(0.92)
  const pricingCurrency = ref('RMB')
  const severeWeatherEnabled = ref(false)
  const adminLogo = ref('')
  const paymentSettings = ref({
    driverRaceEnabled: false,
    driverPayoutPercentage: 100,
    fareBalancePayEnabled: true,
    cashBalancePayEnabled: true,
    wechatPayEnabled: true,
    alipayPayEnabled: true,
    bankCardPayEnabled: true,
    sandboxMode: false
  })
  return { exchangeRate, pricingCurrency, severeWeatherEnabled, adminLogo, paymentSettings }
}
