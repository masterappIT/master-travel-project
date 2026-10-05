import { ref } from 'vue'

const createDraft = id => ({
  id,
  name: '',
  provider: '聚合支付 A',
  method: '信用卡',
  region: '香港',
  currency: 'HKD',
  environment: 'sandbox',
  status: 'draft',
  connection: 'untested',
  scope: 'passenger',
  capabilities: { trip: true, wallet: false, refund: true, partialRefund: false },
  api: { baseUrl: '', createUrl: '', queryUrl: '', refundUrl: '' },
  merchant: { merchantId: '', appId: '', storeId: '' },
  secrets: { apiKey: '', apiSecret: '', privateKey: '', callbackSecret: '' },
  callbacks: { paymentUrl: '', refundUrl: '' },
  minAmount: '',
  maxAmount: '',
  description: ''
})

export function createPaymentsPageState() {
  const saved = ref(false)
  const raceSaving = ref(false)
  const configs = ref([
    { ...createDraft('domestic-wechat'), name: '國內微信支付', provider: '微信支付', method: '微信', region: '中國內地', currency: 'RMB', environment: 'production', status: 'enabled', connection: 'success', scope: 'passenger', capabilities: { trip: true, wallet: true, refund: true, partialRefund: true } },
    { ...createDraft('hk-wechat-pay'), name: '香港 WeChat Pay', provider: 'WeChat Pay', method: 'WeChat Pay', region: '香港', currency: 'HKD', status: 'disabled', connection: 'untested', scope: 'passenger', capabilities: { trip: true, wallet: true, refund: true, partialRefund: false } },
    { ...createDraft('hk-alipay'), name: '香港 Alipay', provider: 'Alipay', method: 'Alipay', region: '香港', currency: 'HKD', status: 'disabled', connection: 'untested', scope: 'passenger', capabilities: { trip: true, wallet: true, refund: true, partialRefund: false } },
    { ...createDraft('hk-card'), name: '香港信用卡支付', provider: '聚合支付 A', method: '信用卡', region: '香港', currency: 'HKD', status: 'disabled', connection: 'untested', scope: 'passenger' },
    { ...createDraft('hk-driver-payout'), name: '香港司機結算渠道', provider: '出款服務 B', method: '銀行轉帳', region: '香港', currency: 'HKD', status: 'draft', connection: 'untested', scope: 'driver-settlement', capabilities: { trip: false, wallet: false, refund: false, partialRefund: false } }
  ])
  const selectedConfig = ref(null)
  const editorOpen = ref(false)
  const editorStep = ref(1)
  const filter = ref({ search: '', region: 'all', currency: 'all', status: 'all', scope: 'passenger' })
  const testResult = ref('')
  const openEditor = config => {
    selectedConfig.value = config ? JSON.parse(JSON.stringify(config)) : { ...createDraft(`config-${Date.now()}`), scope: filter.value.scope === 'all' ? 'passenger' : filter.value.scope }
    editorStep.value = 1
    testResult.value = ''
    editorOpen.value = true
  }
  const closeEditor = () => { editorOpen.value = false; selectedConfig.value = null }
  const visibleConfigs = () => configs.value.filter(item => {
    const query = filter.value.search.trim().toLowerCase()
    return (!query || `${item.name} ${item.provider} ${item.method}`.toLowerCase().includes(query)) && (filter.value.scope === 'all' || item.scope === filter.value.scope) && (filter.value.region === 'all' || item.region === filter.value.region) && (filter.value.currency === 'all' || item.currency === filter.value.currency) && (filter.value.status === 'all' || item.status === filter.value.status)
  })
  const currencyConfigCount = currency => configs.value.filter(item => currency === 'all' || item.currency === currency).length
  return { saved, raceSaving, configs, selectedConfig, editorOpen, editorStep, filter, testResult, openEditor, closeEditor, visibleConfigs, currencyConfigCount }
}
