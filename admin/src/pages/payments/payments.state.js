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
    { ...createDraft('domestic-wechat'), name: '國內微信支付', provider: '微信支付', method: '微信', region: '中國內地', currency: 'RMB', environment: 'production', status: 'enabled', connection: 'success', capabilities: { trip: true, wallet: true, refund: true, partialRefund: true } },
    { ...createDraft('hk-card'), name: '香港信用卡支付', provider: '聚合支付 A', method: '信用卡', region: '香港', currency: 'HKD', status: 'disabled', connection: 'untested' }
  ])
  const selectedConfig = ref(null)
  const editorOpen = ref(false)
  const editorStep = ref(1)
  const filter = ref({ search: '', region: 'all', currency: 'all', status: 'all' })
  const testResult = ref('')
  const openEditor = config => {
    selectedConfig.value = config ? JSON.parse(JSON.stringify(config)) : createDraft(`config-${Date.now()}`)
    editorStep.value = 1
    testResult.value = ''
    editorOpen.value = true
  }
  const closeEditor = () => { editorOpen.value = false; selectedConfig.value = null }
  const visibleConfigs = () => configs.value.filter(item => {
    const query = filter.value.search.trim().toLowerCase()
    return (!query || `${item.name} ${item.provider} ${item.method}`.toLowerCase().includes(query)) && (filter.value.region === 'all' || item.region === filter.value.region) && (filter.value.currency === 'all' || item.currency === filter.value.currency) && (filter.value.status === 'all' || item.status === filter.value.status)
  })
  return { saved, raceSaving, configs, selectedConfig, editorOpen, editorStep, filter, testResult, openEditor, closeEditor, visibleConfigs }
}
