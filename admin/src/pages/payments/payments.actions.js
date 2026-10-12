// Presentation only: the backend stays the source of truth for validation.
const alipayHkErrorText = {
  'AlipayHK RSA2 key format is invalid': '金鑰格式不正確：請貼上完整的 PKCS8 私鑰與 SPKI 公鑰（包含 BEGIN／END 行）。',
  'AlipayHK privateKey and publicKey are required for new configurations': '新增配置必須同時提供應用私鑰與支付寶公鑰。',
  'AlipayHK environment or partner format is invalid': '商戶 ID 格式不正確：必須是 2160 開頭的 16 位數字。',
  'AlipayHK gateway URL must use HTTPS': '支付網關必須使用 HTTPS 地址。',
  'AlipayHK payment currencies are required': '請至少選擇一種乘客收款貨幣。',
  'AlipayHK name or description is too long': '配置名稱不可超過 80 字，說明不可超過 500 字。',
  'AlipayHK configuration is not saved': '找不到已保存的配置，請先保存。',
  'AlipayHK saved RSA2 key cannot be parsed': '已保存的金鑰無法解析，請重新輸入金鑰後保存。',
  'Stripe environment is invalid': '配置模式不正確，請關閉後重新開啟配置。',
  'Stripe name or description is too long': '配置名稱不可超過 80 字，說明不可超過 500 字。',
  'Stripe publishable key does not match the environment': 'Publishable Key 格式不正確，或不屬於此模式（測試模式為 pk_test_，正式模式為 pk_live_）。',
  'Stripe secret key is required for new configurations': '新增配置必須提供 Secret Key。',
  'Stripe secret key does not match the environment': 'Secret Key 格式不正確，或不屬於此模式（測試模式為 sk_test_／rk_test_，正式模式為 sk_live_／rk_live_）。',
  'Stripe payment methods are required': '請至少選擇一種付款方式。',
  'Stripe webhook signing secret format is invalid': 'Webhook 簽名密鑰格式不正確，應以 whsec_ 開頭。',
  'Stripe configuration is not saved': '找不到已保存的 Stripe 配置，請先保存。',
  'Stripe saved secret key cannot be read': '已保存的 Secret Key 無法讀取，請重新輸入後保存。',
  'WeChat Pay HK merchant mode is invalid': '請選擇商戶模式：普通商戶或機構／服務商模式。',
  'WeChat Pay HK name or description is too long': '配置名稱不可超過 80 字，說明不可超過 500 字。',
  'WeChat Pay HK merchant ID format is invalid': '商戶號格式不正確：應為 8 位以上的數字。',
  'WeChat Pay HK App ID format is invalid': 'App ID 格式不正確：應以 wx 開頭，共 18 位。',
  'WeChat Pay HK sub-merchant ID format is invalid': '機構／服務商模式必須填寫子商戶號（8 位以上的數字）。',
  'WeChat Pay HK sub App ID format is invalid': '子商戶 App ID 格式不正確：應以 wx 開頭，共 18 位。',
  'WeChat Pay HK certificate serial number format is invalid': '商戶 API 證書序號格式不正確：應為十六進位字元。',
  'WeChat Pay HK private key is required for new configurations': '新增配置必須提供商戶 API 私鑰。',
  'WeChat Pay HK private key format is invalid': '商戶 API 私鑰無法解析：請貼上完整的 apiclient_key.pem 內容（包含 BEGIN／END 行）。',
  'WeChat Pay HK APIv3 key is required for new configurations': '新增配置必須提供 APIv3 密鑰。',
  'WeChat Pay HK APIv3 key must be 32 characters': 'APIv3 密鑰必須是 32 位字元。',
  'WeChat Pay HK notify URL must use HTTPS': '支付結果通知地址必須使用 HTTPS。',
  'WeChat Pay HK configuration is not saved': '找不到已保存的 WeChat Pay HK 配置，請先保存。',
  'WeChat Pay HK saved keys cannot be read': '已保存的金鑰無法讀取，請重新輸入私鑰與 APIv3 密鑰後保存。',
  'PayMe environment is invalid': '配置環境不正確，請關閉後重新開啟配置。',
  'PayMe name or description is too long': '配置名稱不可超過 80 字，說明不可超過 500 字。',
  'PayMe client ID format is invalid': 'Client ID 格式不正確：應為 UUID 格式。',
  'PayMe signing key ID format is invalid': 'Signing Key ID 格式不正確：應為 UUID 格式。',
  'PayMe client secret is required for new configurations': '新增配置必須提供 Client Secret。',
  'PayMe client secret format is invalid': 'Client Secret 格式不正確。',
  'PayMe signing key is required for new configurations': '新增配置必須提供 Signing Key。',
  'PayMe signing key format is invalid': 'Signing Key 格式不正確：應為 PayMe 提供的 Base64 簽名金鑰。',
  'PayMe configuration is not saved': '找不到已保存的 PayMe 配置，請先保存。',
  'PayMe saved keys cannot be read': '已保存的金鑰無法讀取，請重新輸入 Client Secret 與 Signing Key 後保存。'
}

const stripeConfigFromApi = item => ({
  id: item.id, name: item.name || `Stripe (${item.environment === 'production' ? '正式模式' : '測試模式'})`, description: item.description || '', provider: 'Stripe', environment: item.environment, method: 'API', region: '香港',
  currency: 'HKD', paymentCurrencies: ['HKD'], settlementCurrency: item.settlementCurrency || 'HKD', status: 'draft', scope: 'passenger',
  connection: ['success', 'warning', 'error'].includes(item.lastTestStatus) ? item.lastTestStatus : 'untested', lastTestMessage: item.lastTestMessage || '',
  publishableKey: item.publishableKey || '', secretKey: '', secretKeyConfigured: item.secretKeyConfigured, webhookSecret: '', webhookSecretConfigured: Boolean(item.webhookSecretConfigured), lastWebhookAt: item.lastWebhookAt || null, lastWebhookEvent: item.lastWebhookEvent || '', paymentMethods: item.paymentMethods || [], account: item.account || null
})

const wechatPayHkConfigFromApi = item => ({
  id: item.id, name: item.name || 'WeChat Pay HK', description: item.description || '', provider: 'WeChat Pay HK', environment: item.environment, method: 'APIv3', region: '香港',
  currency: 'HKD', paymentCurrencies: ['HKD'], settlementCurrency: item.settlementCurrency || 'HKD', status: 'draft', scope: 'passenger',
  connection: ['success', 'warning', 'error'].includes(item.lastTestStatus) ? item.lastTestStatus : 'untested', lastTestMessage: item.lastTestMessage || '',
  merchantMode: item.merchantMode || 'direct', merchantId: item.merchantId || '', appId: item.appId || '', subMerchantId: item.subMerchantId || '', subAppId: item.subAppId || '', certificateSerialNo: item.certificateSerialNo || '',
  privateKey: '', privateKeyConfigured: Boolean(item.privateKeyConfigured), apiV3Key: '', apiV3KeyConfigured: Boolean(item.apiV3KeyConfigured), notifyUrl: item.notifyUrl || '', account: item.account || null
})

const paymeConfigFromApi = item => ({
  id: item.id, name: item.name || `PayMe (${item.environment === 'production' ? 'Production' : 'Sandbox'})`, description: item.description || '', provider: 'PayMe', environment: item.environment, method: 'API', region: '香港',
  currency: 'HKD', paymentCurrencies: ['HKD'], settlementCurrency: item.settlementCurrency || 'HKD', status: 'draft', scope: 'passenger',
  connection: ['success', 'warning', 'error'].includes(item.lastTestStatus) ? item.lastTestStatus : 'untested', lastTestMessage: item.lastTestMessage || '',
  clientId: item.clientId || '', clientSecret: '', clientSecretConfigured: Boolean(item.clientSecretConfigured), signingKeyId: item.signingKeyId || '', signingKey: '', signingKeyConfigured: Boolean(item.signingKeyConfigured), account: item.account || null
})

export function createPaymentsActions({ api, paymentSettings, paymentCurrencies, paymentSettingsSaved, driverRaceSaving, error, displayError, configs, selectedConfig, editorOpen, editorStep, testResult, editorBusy, editorError }) {
  const editorErrorText = err => { const text = displayError(err); return alipayHkErrorText[text] || alipayHkErrorText[err?.message] || text }
  async function savePaymentSettings() {
    try {
      error.value = ''
      paymentSettingsSaved.value = false
      driverRaceSaving.value = true
      await api('/settings', { method: 'POST', body: JSON.stringify({ driverRaceEnabled: paymentSettings.value.driverRaceEnabled, dispatchSchedulingEnabled: paymentSettings.value.dispatchSchedulingEnabled, driverPayoutPercentage: Number(paymentSettings.value.driverPayoutPercentage), fareBalancePayEnabled: paymentSettings.value.fareBalancePayEnabled, cashBalancePayEnabled: paymentSettings.value.cashBalancePayEnabled, wechatPayEnabled: paymentSettings.value.wechatPayEnabled, alipayPayEnabled: paymentSettings.value.alipayPayEnabled, bankCardPayEnabled: paymentSettings.value.bankCardPayEnabled, sandboxMode: paymentSettings.value.sandboxMode, paymentCurrencies: paymentCurrencies.value }) })
      paymentSettingsSaved.value = true
      setTimeout(() => { paymentSettingsSaved.value = false }, 3000)
    } catch (err) { error.value = displayError(err) } finally { driverRaceSaving.value = false }
  }
  async function loadPaymentConfigs() {
    // The providers load independently so one failing endpoint does not hide the other's saved configs.
    const optional = path => api(path).catch(err => { error.value = displayError(err); return { data: [] } })
    const [response, stripeResponse, wechatPayHkResponse, paymeResponse] = await Promise.all([api('/settings/alipayhk'), optional('/settings/stripe'), optional('/settings/wechatpay-hk'), optional('/settings/payme')])
    configs.value = [...stripeResponse.data.map(stripeConfigFromApi), ...wechatPayHkResponse.data.map(wechatPayHkConfigFromApi), ...paymeResponse.data.map(paymeConfigFromApi), ...response.data.map(item => ({ id: item.id, name: item.name || `香港 AlipayHK (${item.environment})`, provider: 'AlipayHK', environment: item.environment, method: 'WAP', region: '香港', currency: item.paymentCurrency, paymentCurrencies: item.paymentCurrencies || [item.paymentCurrency], settlementCurrency: item.settlementCurrency || 'HKD', status: 'draft', connection: item.lastTestStatus === 'success' ? 'success' : 'untested', scope: 'passenger', capabilities: { trip: true, wallet: false, refund: true, partialRefund: false }, api: { baseUrl: item.gatewayUrl, createUrl: 'create_forex_trade_wap', queryUrl: 'single_trade_query', refundUrl: 'forex_refund' }, merchant: { merchantId: item.partner, appId: item.appId || '' }, secrets: { apiKey: '', apiSecret: '', privateKey: '', publicKey: '', callbackSecret: '' }, privateKeyConfigured: item.privateKeyConfigured, publicKeyConfigured: item.publicKeyConfigured, callbacks: { paymentUrl: item.notifyUrl || '', refundUrl: item.returnUrl || '' }, description: item.description || '' }))]
  }
  const closePaymentEditor = () => { editorOpen.value = false; selectedConfig.value = null }
  const replaceConfig = config => {
    const index = configs.value.findIndex(item => item.id === config.id)
    if (index === -1) configs.value.push(config)
    else configs.value[index] = config
    selectedConfig.value = JSON.parse(JSON.stringify(config))
  }
  // Stripe needs no further input after the keys, so a successful save goes straight on to the connection test.
  const saveStripeConfig = async value => {
    try {
      editorError.value = ''
      editorBusy.value = 'saving'
      const response = await api('/settings/stripe', { method: 'POST', body: JSON.stringify({ environment: value.environment, name: value.name, description: value.description, publishableKey: value.publishableKey, secretKey: value.secretKey, webhookSecret: value.webhookSecret, paymentMethods: value.paymentMethods }) })
      replaceConfig(stripeConfigFromApi(response.data))
      editorBusy.value = ''
      await testStripeConfig()
    } catch (err) { editorError.value = editorErrorText(err) } finally { editorBusy.value = '' }
  }
  const testStripeConfig = async () => {
    try {
      editorError.value = ''
      editorBusy.value = 'testing'
      const result = await api('/settings/stripe/test', { method: 'POST', body: JSON.stringify({ environment: selectedConfig.value.environment }) })
      replaceConfig(stripeConfigFromApi(result.data))
    } catch (err) { editorError.value = editorErrorText(err) } finally { editorBusy.value = '' }
  }
  // Same flow as Stripe: the credentials are complete once saved, so the connection test follows immediately.
  const saveWechatPayHkConfig = async value => {
    try {
      editorError.value = ''
      editorBusy.value = 'saving'
      const response = await api('/settings/wechatpay-hk', { method: 'POST', body: JSON.stringify({ merchantMode: value.merchantMode, name: value.name, description: value.description, merchantId: value.merchantId, appId: value.appId, subMerchantId: value.subMerchantId, subAppId: value.subAppId, certificateSerialNo: value.certificateSerialNo, privateKey: value.privateKey, apiV3Key: value.apiV3Key, notifyUrl: value.notifyUrl }) })
      replaceConfig(wechatPayHkConfigFromApi(response.data))
      editorBusy.value = ''
      await testWechatPayHkConfig()
    } catch (err) { editorError.value = editorErrorText(err) } finally { editorBusy.value = '' }
  }
  const testWechatPayHkConfig = async () => {
    try {
      editorError.value = ''
      editorBusy.value = 'testing'
      const result = await api('/settings/wechatpay-hk/test', { method: 'POST' })
      replaceConfig(wechatPayHkConfigFromApi(result.data))
    } catch (err) { editorError.value = editorErrorText(err) } finally { editorBusy.value = '' }
  }
  const savePaymeConfig = async value => {
    try {
      editorError.value = ''
      editorBusy.value = 'saving'
      const response = await api('/settings/payme', { method: 'POST', body: JSON.stringify({ environment: value.environment, name: value.name, description: value.description, clientId: value.clientId, clientSecret: value.clientSecret, signingKeyId: value.signingKeyId, signingKey: value.signingKey }) })
      replaceConfig(paymeConfigFromApi(response.data))
      editorBusy.value = ''
      await testPaymeConfig()
    } catch (err) { editorError.value = editorErrorText(err) } finally { editorBusy.value = '' }
  }
  const testPaymeConfig = async () => {
    try {
      editorError.value = ''
      editorBusy.value = 'testing'
      const result = await api('/settings/payme/test', { method: 'POST', body: JSON.stringify({ environment: selectedConfig.value.environment }) })
      replaceConfig(paymeConfigFromApi(result.data))
    } catch (err) { editorError.value = editorErrorText(err) } finally { editorBusy.value = '' }
  }
  const savePaymentConfigDraft = async value => {
    if (!value || editorBusy.value) return
    if (value.provider === 'Stripe') return saveStripeConfig(value)
    if (value.provider === 'WeChat Pay HK') return saveWechatPayHkConfig(value)
    if (value.provider === 'PayMe') return savePaymeConfig(value)
    try {
      editorError.value = ''
      editorBusy.value = 'saving'
      const response = await api('/settings/alipayhk', { method: 'POST', body: JSON.stringify({ environment: value.environment, name: value.name, description: value.description, partner: value.merchant.merchantId, appId: value.merchant.appId, gatewayUrl: value.api.baseUrl, paymentCurrencies: value.paymentCurrencies, privateKey: value.secrets.privateKey, publicKey: value.secrets.publicKey, notifyUrl: value.callbacks.paymentUrl, returnUrl: value.callbacks.refundUrl }) })
      const saved = response.data
      const config = { ...value, id: saved.id, name: saved.name || value.name, description: saved.description || '', provider: 'AlipayHK', method: 'WAP', region: '香港', currency: saved.paymentCurrency, paymentCurrencies: saved.paymentCurrencies || value.paymentCurrencies, settlementCurrency: saved.settlementCurrency || 'HKD', connection: saved.lastTestStatus === 'success' ? 'success' : 'untested', privateKeyConfigured: saved.privateKeyConfigured, publicKeyConfigured: saved.publicKeyConfigured, merchant: { ...value.merchant, merchantId: saved.partner, appId: saved.appId }, secrets: { ...value.secrets, privateKey: '', publicKey: '', callbackSecret: '' }, api: { ...value.api, baseUrl: saved.gatewayUrl }, callbacks: { ...value.callbacks, paymentUrl: saved.notifyUrl || '', refundUrl: saved.returnUrl || '' } }
      const index = configs.value.findIndex(item => item.id === config.id)
      if (index === -1) configs.value.push(config)
      else configs.value[index] = config
      selectedConfig.value = JSON.parse(JSON.stringify(config))
      editorStep.value = 5
      testResult.value = ''
      paymentSettingsSaved.value = true
      setTimeout(() => { paymentSettingsSaved.value = false }, 3000)
    } catch (err) { editorError.value = editorErrorText(err) } finally { editorBusy.value = '' }
  }
  const duplicatePaymentConfig = config => {
    // One saved config per environment: a copy only makes sense as a draft for the other one, and secrets never leave the backend.
    const environment = config.environment === 'production' ? 'sandbox' : 'production'
    if (configs.value.some(item => item.provider === config.provider && item.environment === environment)) return
    selectedConfig.value = { ...JSON.parse(JSON.stringify(config)), id: `config-${Date.now()}`, environment, name: `香港 AlipayHK (${environment})`, status: 'draft', connection: 'untested', privateKeyConfigured: false, publicKeyConfigured: false, description: '' }
    editorStep.value = 1
    testResult.value = ''
    editorError.value = ''
    editorOpen.value = true
  }
  const testPaymentConfig = async () => {
    const configId = selectedConfig.value?.id
    if (editorBusy.value) return
    if (selectedConfig.value?.provider === 'Stripe' && configId && !configId.startsWith('config-')) return testStripeConfig()
    if (selectedConfig.value?.provider === 'WeChat Pay HK' && configId && !configId.startsWith('config-')) return testWechatPayHkConfig()
    if (selectedConfig.value?.provider === 'PayMe' && configId && !configId.startsWith('config-')) return testPaymeConfig()
    if (!configId || configId.startsWith('config-') || !selectedConfig.value?.environment) {
      editorError.value = '請先保存技術配置，再執行金鑰格式檢查'
      testResult.value = 'error'
      return
    }
    try {
      editorError.value = ''
      editorBusy.value = 'testing'
      const result = await api('/settings/alipayhk/test', { method: 'POST', body: JSON.stringify({ environment: selectedConfig.value.environment }) })
      testResult.value = result.status === 'success' ? 'success' : 'error'
      const saved = configs.value.find(item => item.id === configId)
      if (saved) saved.connection = testResult.value === 'success' ? 'success' : 'untested'
    } catch (err) { testResult.value = 'error'; editorError.value = editorErrorText(err) } finally { editorBusy.value = '' }
  }
  return { savePaymentSettings, loadPaymentConfigs, closePaymentEditor, savePaymentConfigDraft, duplicatePaymentConfig, testPaymentConfig }
}
