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

const createWechatPayDraft = (id, cn) => ({
  id,
  name: cn ? '內地微信支付' : 'WeChat Pay HK',
  description: '',
  provider: cn ? '內地微信支付' : 'WeChat Pay HK',
  method: 'APIv3',
  region: cn ? '中國內地' : '香港',
  paymentCurrencies: [cn ? 'RMB' : 'HKD'],
  settlementCurrency: cn ? 'RMB' : 'HKD',
  environment: 'production',
  status: 'draft',
  connection: 'untested',
  lastTestMessage: '',
  scope: 'passenger',
  merchantMode: 'direct',
  merchantId: '',
  appId: '',
  subMerchantId: '',
  subAppId: '',
  certificateSerialNo: '',
  privateKey: '',
  privateKeyConfigured: false,
  apiV3Key: '',
  apiV3KeyConfigured: false,
  notifyUrl: '',
  account: null
})

const createPaymeDraft = (id, environment) => ({
  id,
  name: `PayMe 香港${environment === 'production' ? '' : '（Sandbox）'}`,
  description: '',
  provider: 'PayMe',
  method: 'API',
  region: '香港',
  paymentCurrencies: ['HKD'],
  settlementCurrency: 'HKD',
  environment,
  status: 'draft',
  connection: 'untested',
  lastTestMessage: '',
  scope: 'passenger',
  clientId: '',
  clientSecret: '',
  clientSecretConfigured: false,
  signingKeyId: '',
  signingKey: '',
  signingKeyConfigured: false,
  account: null
})

const ALIPAY_CN_GATEWAYS = { sandbox: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do', production: 'https://openapi.alipay.com/gateway.do' }

const createAlipayCnDraft = (id, environment) => ({
  id,
  name: `內地支付寶${environment === 'production' ? '' : '（沙箱）'}`,
  description: '',
  provider: '內地支付寶',
  method: 'OpenAPI',
  region: '中國內地',
  paymentCurrencies: ['RMB'],
  settlementCurrency: 'RMB',
  environment,
  status: 'draft',
  connection: 'untested',
  lastTestMessage: '',
  scope: 'passenger',
  merchantMode: 'merchant',
  appId: '',
  gatewayUrl: ALIPAY_CN_GATEWAYS[environment],
  privateKey: '',
  privateKeyConfigured: false,
  alipayPublicKey: '',
  alipayPublicKeyConfigured: false,
  appAuthToken: '',
  appAuthTokenConfigured: false,
  providerId: '',
  products: ['wap'],
  notifyUrl: '',
  returnUrl: '',
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
    selectedConfig.value = config ? JSON.parse(JSON.stringify(config)) : provider === 'Stripe' ? createStripeDraft(`config-${Date.now()}`, environment || 'sandbox') : provider === 'WeChat Pay HK' || provider === '內地微信支付' ? createWechatPayDraft(`config-${Date.now()}`, provider === '內地微信支付') : provider === 'PayMe' ? createPaymeDraft(`config-${Date.now()}`, environment || 'sandbox') : provider === '內地支付寶' ? createAlipayCnDraft(`config-${Date.now()}`, environment || 'sandbox') : { ...createDraft(`config-${Date.now()}`), scope: filter.value.scope === 'all' ? 'passenger' : filter.value.scope, environment: environment || 'sandbox', name: environment ? `香港 AlipayHK ${environment === 'production' ? 'Production' : 'Sandbox'}` : '' }
    editorStep.value = 1
    testResult.value = ''
    editorError.value = ''
    editorOpen.value = true
  }
  const closeEditor = () => { editorOpen.value = false; selectedConfig.value = null }
  const currencyConfigCount = currency => configs.value.filter(item => {
    const settlementCurrency = item.settlementCurrency || item.currency
    return (currency === 'all' || settlementCurrency === currency) && (filter.value.scope === 'all' || item.scope === filter.value.scope)
  }).length
  return { saved, raceSaving, configs, selectedConfig, editorOpen, editorStep, filter, testResult, editorBusy, editorError, openEditor, closeEditor, currencyConfigCount }
}
