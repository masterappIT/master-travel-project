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
    overviewPeriod: ref('本月'),
    reportCurrency: ref('原始貨幣'),
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
    pricingChecks: [
      { label: '車型定價貨幣一致性', detail: '檢查所有車型是否使用統一報價貨幣。', status: '尚未檢查', tone: 'warning' },
      { label: '路線最低價完整性', detail: '檢查地區與路線是否已設定最低報價。', status: '尚未檢查', tone: 'warning' },
      { label: '匯率資料狀態', detail: '目前沒有已接入的匯率服務。', status: 'UI 原型', tone: 'warning' }
    ],
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
    incomeSummary: [
      { label: '乘客實收', value: 'RMB 0.00', note: '付款成功後統計' },
      { label: '退款金額', value: 'RMB 0.00', note: '包含原路及部分退款' },
      { label: '司機應付', value: 'RMB 0.00', note: '尚未完成結算' },
      { label: '平台淨收入', value: 'RMB 0.00', note: '扣除退款、手續費及司機應付' }
    ],
    incomeBreakdown: [
      { currency: 'RMB', region: '中國內地', received: '0.00', refund: '0.00', driver: '0.00', net: '0.00' },
      { currency: 'HKD', region: '香港', received: '0.00', refund: '0.00', driver: '0.00', net: '0.00' }
    ],
    regions: [
      { name: '中國內地', code: 'CN', currency: 'RMB', status: '待設定', methods: '微信支付、支付寶' },
      { name: '香港', code: 'HK', currency: 'HKD', status: '待設定', methods: '微信支付、支付寶、FPS' }
    ],
    flowStatuses: [
      { title: '乘客收款', description: '乘客 → 平台', status: '待配置', tone: 'warning' },
      { title: '乘客退款', description: '平台 → 乘客（原路／部分退款）', status: '待配置', tone: 'warning' },
      { title: '司機結算', description: '平台 → 司機', status: '待配置', tone: 'warning' }
    ],
    rates,
    passengerItems: [{ title: '付款方式設定', description: '管理地區、貨幣及乘客收款渠道。', status: '前往支付設定', tone: 'info' }, { title: '退款設定與管理', description: '管理原路退款、審批及部分退款。', status: 'UI 原型' }, { title: '付款交易', description: '查看乘客付款狀態及第三方交易編號。', status: '尚未接入 API' }],
    driverItems: [{ title: '結算方式設定', description: '管理司機原始收入貨幣、結算貨幣及出款渠道。', status: '前往支付設定' }, { title: '待結算帳款', description: '查看待計算、待審批及可結算金額。', status: '尚未接入 API' }, { title: '結算批次與出款記錄', description: '追蹤平台付款給司機的執行狀態。', status: '尚未接入 API' }],
    auditItems: [{ title: '對帳管理', description: '統一比對付款、退款及司機出款結果。', status: '尚未接入 API' }, { title: '財務操作日誌', description: '追蹤配置、啟用、退款及出款操作。', status: '尚未接入 API' }]
  }
}
