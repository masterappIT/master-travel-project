import { ref } from 'vue'

export function createAdminSettingsState() {
  const exchangeRate = ref(0.92)
  const pricingCurrency = ref('RMB')
  const settlementCurrency = ref('RMB')
  const passengerDefaultCurrency = ref('RMB')
  const driverDefaultCurrency = ref('RMB')
  const paymentCurrencies = ref(['RMB', 'HKD'])
  const severeWeatherEnabled = ref(false)
  const adminLogo = ref('')
  const supportSettings = ref({
    enabled: false,
    guestEnabled: true,
    directContactEnabled: true,
    orderContextEnabled: true,
    imageUploadEnabled: true,
    maxUploadSizeMb: 50
  })
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
  return { exchangeRate, pricingCurrency, settlementCurrency, passengerDefaultCurrency, driverDefaultCurrency, paymentCurrencies, severeWeatherEnabled, adminLogo, supportSettings, paymentSettings }
}
