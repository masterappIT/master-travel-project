import { ref } from 'vue'

const createDraft = id => ({
  id,
  name: '',
  provider: 'AlipayHK',
  method: 'WAP',
  region: '香港',
  paymentCurrencies: ['HKD', 'RMB'],
  settlementCurrency: 'HKD',
  environment: 'sandbox',
  status: 'draft',
  connection: 'untested',
  scope: 'passenger',
  capabilities: { trip: true, wallet: false, refund: true, partialRefund: false },
  api: { baseUrl: '', createUrl: '', queryUrl: '', refundUrl: '' },
  merchant: { merchantId: '', appId: '' },
  secrets: { apiKey: '', apiSecret: '', privateKey: '', callbackSecret: '' },
  callbacks: { paymentUrl: '', refundUrl: '' },
  description: ''
})

const createStripeDraft = (id, environment) => ({
  id,
  name: `Stripe 香港${environment === 'production' ? '' : '（測試）'}`,
  description: '',
  provider: 'Stripe',
  method: 'API',
  region: '香港',
  paymentCurrencies: ['HKD'],
  settlementCurrency: 'HKD',
  environment,
  status: 'draft',
  connection: 'untested',
  lastTestMessage: '',
  scope: 'passenger',
  publishableKey: '',
  secretKey: '',
  secretKeyConfigured: false,
  webhookSecret: '',
  webhookSecretConfigured: false,
  lastWebhookAt: null,
  lastWebhookEvent: '',
  paymentMethods: ['card'],
  account: null
})

export function createPaymentsPageState() {
  const saved = ref(false)
  const raceSaving = ref(false)
  const configs = ref([])
  const selectedConfig = ref(null)
  const editorOpen = ref(false)
  const editorStep = ref(1)
  const filter = ref({ search: '', region: 'all', currency: 'all', status: 'all', scope: 'passenger' })
  const testResult = ref('')
  const editorBusy = ref('')
  const editorError = ref('')
  const openEditor = (config, environment, provider) => {
    selectedConfig.value = config ? JSON.parse(JSON.stringify(config)) : provider === 'Stripe' ? createStripeDraft(`config-${Date.now()}`, environment || 'sandbox') : { ...createDraft(`config-${Date.now()}`), scope: filter.value.scope === 'all' ? 'passenger' : filter.value.scope, environment: environment || 'sandbox', name: environment ? `香港 AlipayHK ${environment === 'production' ? 'Production' : 'Sandbox'}` : '' }
    editorStep.value = 1
    testResult.value = ''
    editorError.value = ''
    editorOpen.value = true
  }
  const closeEditor = () => { editorOpen.value = false; selectedConfig.value = null }
  const visibleConfigs = () => configs.value.filter(item => {
    const query = filter.value.search.trim().toLowerCase()
    const currencies = item.paymentCurrencies || [item.currency]
    return (!query || `${item.name} ${item.provider} ${item.method}`.toLowerCase().includes(query)) && (filter.value.scope === 'all' || item.scope === filter.value.scope) && (filter.value.region === 'all' || item.region === filter.value.region) && (filter.value.currency === 'all' || currencies.includes(filter.value.currency)) && (filter.value.status === 'all' || item.status === filter.value.status)
  })
  const currencyConfigCount = currency => configs.value.filter(item => {
    const settlementCurrency = item.settlementCurrency || item.currency
    return (currency === 'all' || settlementCurrency === currency) && (filter.value.scope === 'all' || item.scope === filter.value.scope)
  }).length
  return { saved, raceSaving, configs, selectedConfig, editorOpen, editorStep, filter, testResult, editorBusy, editorError, openEditor, closeEditor, visibleConfigs, currencyConfigCount }
}
