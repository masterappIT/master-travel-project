import { ref } from 'vue'

export function createAdminSettingsState() {
  const exchangeRate = ref(0.92)
  const pricingCurrency = ref('RMB')
  const settlementCurrency = ref('RMB')
  const paymentCurrencies = ref(['RMB', 'HKD'])
  const severeWeatherEnabled = ref(false)
  const adminLogo = ref('')
  const paymentSettings = ref({
    driverRaceEnabled: false,
    dispatchSchedulingEnabled: true,
    driverPayoutPercentage: 100,
    fareBalancePayEnabled: true,
    cashBalancePayEnabled: true,
    wechatPayEnabled: true,
    alipayPayEnabled: true,
    bankCardPayEnabled: true,
    sandboxMode: false
  })
  return { exchangeRate, pricingCurrency, settlementCurrency, paymentCurrencies, severeWeatherEnabled, adminLogo, paymentSettings }
}
