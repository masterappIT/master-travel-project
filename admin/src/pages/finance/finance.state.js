import { reactive, ref } from 'vue'

export function createFinancePageState() {
  const rateEditorOpen = ref(false)
  const rateForm = reactive({ pair: 'RMB → HKD', value: '', source: '人工設定' })
  const openRateEditor = () => {
    rateForm.pair = 'RMB → HKD'
    rateForm.value = ''
    rateForm.source = '人工設定'
    rateEditorOpen.value = true
  }
  const closeRateEditor = () => { rateEditorOpen.value = false }
  const saveRateDraft = () => {
    const value = Number(rateForm.value)
    if (!Number.isFinite(value) || value <= 0) return false
    const existing = rates.find(rate => rate.pair === rateForm.pair)
    if (existing) {
      existing.value = value.toFixed(4)
      existing.source = rateForm.source
      existing.status = '已設定'
    }
    rateEditorOpen.value = false
    return true
  }
  return {
    activeTab: ref('overview'),
    overviewPeriod: ref('本月'),
    reportCurrency: ref('原始貨幣'),
    rateEditorOpen,
    rateForm,
    openRateEditor,
    closeRateEditor,
    saveRateDraft,
    tabs: [
      { id: 'overview', label: '總覽' },
      { id: 'currency', label: '全域貨幣與報價' },
      { id: 'passenger', label: '乘客資金' },
      { id: 'driver', label: '司機資金' },
      { id: 'audit', label: '對帳與記錄' }
    ],
    settings: reactive({ quoteCurrency: 'RMB', baseCurrency: 'RMB', activeConfigs: 0, rateVersion: '未建立', updatedAt: '尚未設定' }),
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
    rates: [{ pair: 'RMB → HKD', value: '未設定', source: '人工／API（待接入）', status: '待設定' }, { pair: 'HKD → RMB', value: '未設定', source: '人工／API（待接入）', status: '待設定' }],
    passengerItems: [{ title: '付款方式設定', description: '管理地區、貨幣及乘客收款渠道。', status: '新增模組' }, { title: '退款設定與管理', description: '管理原路退款、審批及部分退款。', status: '新增模組' }, { title: '付款交易', description: '查看乘客付款狀態及第三方交易編號。', status: '新增模組' }],
    driverItems: [{ title: '結算方式設定', description: '管理司機原始收入貨幣、結算貨幣及出款渠道。', status: '新增模組' }, { title: '待結算帳款', description: '查看待計算、待審批及可結算金額。', status: '新增模組' }, { title: '結算批次與出款記錄', description: '追蹤平台付款給司機的執行狀態。', status: '新增模組' }],
    auditItems: [{ title: '對帳管理', description: '統一比對付款、退款及司機出款結果。', status: '新增模組' }, { title: '財務操作日誌', description: '追蹤配置、啟用、退款及出款操作。', status: '新增模組' }]
  }
}
