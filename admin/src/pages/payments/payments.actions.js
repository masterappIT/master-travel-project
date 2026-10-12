// Presentation only: the backend stays the source of truth for validation.
const alipayHkErrorText = {
  'AlipayHK RSA2 key format is invalid': '金鑰格式不正確：請貼上完整的 PKCS8 私鑰與 SPKI 公鑰（包含 BEGIN／END 行）。',
  'AlipayHK privateKey and publicKey are required for new configurations': '新增配置必須同時提供應用私鑰與支付寶公鑰。',
  'AlipayHK environment or partner format is invalid': '商戶 ID 格式不正確：必須是 2160 開頭的 16 位數字。',
  'AlipayHK gateway URL must use HTTPS': '支付網關必須使用 HTTPS 地址。',
  'AlipayHK payment currencies are required': '請至少選擇一種乘客收款貨幣。',
  'AlipayHK name or description is too long': '配置名稱不可超過 80 字，說明不可超過 500 字。',
  'AlipayHK configuration is not saved': '找不到已保存的配置，請先保存。',
  'AlipayHK saved RSA2 key cannot be parsed': '已保存的金鑰無法解析，請重新輸入金鑰後保存。'
}

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
    const response = await api('/settings/alipayhk')
    configs.value = response.data.map(item => ({ id: item.id, name: item.name || `香港 AlipayHK (${item.environment})`, provider: 'AlipayHK', environment: item.environment, method: 'WAP', region: '香港', currency: item.paymentCurrency, paymentCurrencies: item.paymentCurrencies || [item.paymentCurrency], settlementCurrency: item.settlementCurrency || 'HKD', status: 'draft', connection: item.lastTestStatus === 'success' ? 'success' : 'untested', scope: 'passenger', capabilities: { trip: true, wallet: false, refund: true, partialRefund: false }, api: { baseUrl: item.gatewayUrl, createUrl: 'create_forex_trade_wap', queryUrl: 'single_trade_query', refundUrl: 'forex_refund' }, merchant: { merchantId: item.partner, appId: item.appId || '' }, secrets: { apiKey: '', apiSecret: '', privateKey: '', publicKey: '', callbackSecret: '' }, privateKeyConfigured: item.privateKeyConfigured, publicKeyConfigured: item.publicKeyConfigured, callbacks: { paymentUrl: item.notifyUrl || '', refundUrl: item.returnUrl || '' }, description: item.description || '' }))
  }
  const closePaymentEditor = () => { editorOpen.value = false; selectedConfig.value = null }
  const savePaymentConfigDraft = async value => {
    if (!value || editorBusy.value) return
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
