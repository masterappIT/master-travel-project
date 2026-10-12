import { reactive, ref } from 'vue'

export function createFinancePageState() {
  const rateEditorOpen = ref(false)
  const currencyEditorOpen = ref(false)
  const settings = reactive({ pricingCurrency: 'RMB', settlementCurrency: 'RMB', passengerDefaultCurrency: 'RMB', driverDefaultCurrency: 'RMB', paymentCurrencies: ['RMB', 'HKD'], quoteCurrency: 'RMB', baseCurrency: 'RMB', decimalPlaces: '2', roundingMode: '四捨五入', activeConfigs: 0, rateVersion: '未建立', updatedAt: '尚未設定' })
  const rateForm = reactive({ pair: 'RMB → HKD', value: '', source: '人工設定' })
  const rates = reactive([{ pair: 'RMB → HKD', value: '未設定', source: '人工／API（待接入）', status: '待設定' }])
  const currencyDraft = reactive({ pricingCurrency: 'RMB', settlementCurrency: 'RMB', passengerDefaultCurrency: 'RMB', driverDefaultCurrency: 'RMB' })
  const quotePreview = reactive({ origin: '中國內地', destination: '香港', vehicle: '舒適型', distance: '12', duration: '0', baseFare: '100', currency: 'RMB', result: '待輸入報價資料', loading: false, error: '', quote: null })
  const syncCurrencySettings = source => {
    settings.pricingCurrency = source.pricingCurrency === 'HKD' ? 'HKD' : 'RMB'
    settings.settlementCurrency = source.settlementCurrency === 'HKD' ? 'HKD' : 'RMB'
    settings.passengerDefaultCurrency = source.passengerDefaultCurrency === 'HKD' ? 'HKD' : 'RMB'
    settings.driverDefaultCurrency = source.driverDefaultCurrency === 'HKD' ? 'HKD' : 'RMB'
    const exchangeRate = Number(source.exchangeRate)
    if (Number.isFinite(exchangeRate) && exchangeRate > 0) {
      const rate = rates.find(item => item.pair === 'RMB → HKD')
      if (rate) { rate.value = exchangeRate.toFixed(4); rate.source = '正式設定'; rate.status = '已生效' }
    }
    quotePreview.currency = settings.pricingCurrency
    currencyDraft.pricingCurrency = settings.pricingCurrency
    currencyDraft.settlementCurrency = settings.settlementCurrency
    currencyDraft.passengerDefaultCurrency = settings.passengerDefaultCurrency
    currencyDraft.driverDefaultCurrency = settings.driverDefaultCurrency
  }
  const saveCurrencySettings = async api => {
    const payload = { pricingCurrency: currencyDraft.pricingCurrency, settlementCurrency: currencyDraft.settlementCurrency, passengerDefaultCurrency: currencyDraft.passengerDefaultCurrency, driverDefaultCurrency: currencyDraft.driverDefaultCurrency }
    const saved = await api('/settings', { method: 'POST', body: JSON.stringify(payload) })
    syncCurrencySettings(saved)
    currencyEditorOpen.value = false
    return saved
  }
  const openCurrencyEditor = () => {
    currencyDraft.pricingCurrency = settings.pricingCurrency
    currencyDraft.settlementCurrency = settings.settlementCurrency
    currencyDraft.passengerDefaultCurrency = settings.passengerDefaultCurrency
    currencyDraft.driverDefaultCurrency = settings.driverDefaultCurrency
    currencyEditorOpen.value = true
  }
  const closeCurrencyEditor = () => { currencyEditorOpen.value = false }
  const updateCurrencyDraft = ({ key, value }) => {
    if (key === 'pricingCurrency' || key === 'settlementCurrency' || key === 'passengerDefaultCurrency' || key === 'driverDefaultCurrency') currencyDraft[key] = value
  }
  const finishCurrencyEditor = () => {
    settings.pricingCurrency = currencyDraft.pricingCurrency
    settings.settlementCurrency = currencyDraft.settlementCurrency
    settings.passengerDefaultCurrency = currencyDraft.passengerDefaultCurrency
    settings.driverDefaultCurrency = currencyDraft.driverDefaultCurrency
    currencyEditorOpen.value = false
  }
  const openRateEditor = () => {
    rateForm.pair = 'RMB → HKD'
    rateForm.value = ''
    rateForm.source = '人工設定'
    rateEditorOpen.value = true
  }
  const closeRateEditor = () => { rateEditorOpen.value = false }
  const saveRateSettings = async api => {
    const value = Number(rateForm.value)
    if (!Number.isFinite(value) || value <= 0) return false
    const saved = await api('/settings', { method: 'POST', body: JSON.stringify({ exchangeRate: value }) })
    const existing = rates.find(rate => rate.pair === rateForm.pair)
    if (existing) {
      existing.value = value.toFixed(4)
      existing.source = rateForm.source
      existing.status = '已生效'
    }
    settings.rateVersion = '目前設定'
    settings.updatedAt = new Date().toLocaleString('zh-Hant')
    rateEditorOpen.value = false
    return saved
  }
  return {
    activeTab: ref('overview'),
    rateEditorOpen,
    currencyEditorOpen,
    currencyDraft,
    quotePreview,
    syncCurrencySettings,
    saveCurrencySettings,
    updateCurrencyDraft,
    rateForm,
    openCurrencyEditor,
    closeCurrencyEditor,
    finishCurrencyEditor,
    openRateEditor,
    closeRateEditor,
    saveRateSettings,
    tabs: [
      { id: 'overview', label: '總覽' },
      { id: 'currency', label: '全域貨幣與報價' },
      { id: 'passenger', label: '乘客資金' },
      { id: 'driver', label: '司機資金' },
      { id: 'audit', label: '對帳與記錄' }
    ],
    settings,
    previewQuote: async api => {
      const preview = quotePreview
      preview.loading = true
      preview.error = ''
      try {
        const catalog = await api('/vehicles')
        const categoryId = preview.vehicle === '豪華型' ? 'premium-mpv' : preview.vehicle === '商務型' ? 'standard-mpv' : 'standard-car'
        const vehicle = (catalog.data || []).find(item => item.enabled !== false && item.categoryId === categoryId)
        const category = (catalog.categories || []).find(item => item.id === categoryId && item.enabled !== false)
        const durationSeconds = Number(preview.duration)
        const distanceKm = Number(preview.distance)
        if (!vehicle || !category || !Number.isFinite(distanceKm) || distanceKm < 0 || !Number.isFinite(durationSeconds) || durationSeconds < 0) throw new Error('請先提供有效距離、時長及可用車型')
        const quote = await api('/quotes', { method: 'POST', body: JSON.stringify({ adminPreview: true, categoryId, vehicleId: vehicle.id, distanceMeters: Math.round(distanceKm * 1000), durationSeconds: Math.round(durationSeconds), displayCurrency: preview.currency, reservePromotion: false, originRegion: preview.origin, destinationRegion: preview.destination }) })
        preview.quote = quote
        preview.result = `${quote.total ?? quote.totalAmount ?? 0} ${quote.currency || preview.currency}`
        preview.baseFare = String(quote.total ?? quote.totalAmount ?? 0)
      } catch (error) {
        preview.quote = null
        preview.error = error?.message || '正式報價取得失敗'
        preview.result = '報價取得失敗'
      } finally { preview.loading = false }
    },
    rates
  }
}
