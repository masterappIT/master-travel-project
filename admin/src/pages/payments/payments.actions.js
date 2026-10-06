export function createPaymentsActions({ api, paymentSettings, paymentCurrencies, paymentSettingsSaved, driverRaceSaving, error, displayError, configs, selectedConfig, editorOpen, editorStep, testResult }) {
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
    configs.value = response.data.map(item => ({ id: item.id, name: `香港 AlipayHK (${item.environment})`, provider: 'AlipayHK', method: 'WAP', region: '香港', currency: item.paymentCurrency, paymentCurrencies: item.paymentCurrencies || [item.paymentCurrency], settlementCurrency: item.settlementCurrency || 'HKD', status: 'draft', connection: item.lastTestStatus === 'success' ? 'success' : 'untested', scope: 'passenger', capabilities: { trip: true, wallet: false, refund: true, partialRefund: false }, api: { baseUrl: item.gatewayUrl, createUrl: 'create_forex_trade_wap', queryUrl: 'single_trade_query', refundUrl: 'forex_refund' }, merchant: { merchantId: item.partner, appId: item.appId || '', storeId: '' }, secrets: { apiKey: '', apiSecret: '', privateKey: '', publicKey: '', callbackSecret: '' }, privateKeyConfigured: item.privateKeyConfigured, publicKeyConfigured: item.publicKeyConfigured, callbacks: { paymentUrl: item.notifyUrl || '', refundUrl: item.returnUrl || '' }, description: item.lastTestMessage || '' }))
  }
  const closePaymentEditor = () => { editorOpen.value = false; selectedConfig.value = null }
  const savePaymentConfigDraft = async value => {
    if (!value) return
    try {
      error.value = ''
      const response = await api('/settings/alipayhk', { method: 'POST', body: JSON.stringify({ environment: value.environment, partner: value.merchant.merchantId, appId: value.merchant.appId, gatewayUrl: value.api.baseUrl, paymentCurrencies: value.paymentCurrencies, privateKey: value.secrets.privateKey, publicKey: value.secrets.publicKey, notifyUrl: value.callbacks.paymentUrl, returnUrl: value.callbacks.refundUrl }) })
      const saved = response.data
      const config = { ...value, id: saved.id, provider: 'AlipayHK', method: 'WAP', region: '香港', currency: saved.paymentCurrency, paymentCurrencies: saved.paymentCurrencies || value.paymentCurrencies, settlementCurrency: saved.settlementCurrency || 'HKD', connection: saved.lastTestStatus === 'success' ? 'success' : 'untested', privateKeyConfigured: saved.privateKeyConfigured, publicKeyConfigured: saved.publicKeyConfigured, merchant: { ...value.merchant, merchantId: saved.partner, appId: saved.appId }, secrets: { ...value.secrets, privateKey: '', publicKey: '', callbackSecret: '' }, api: { ...value.api, baseUrl: saved.gatewayUrl }, callbacks: { ...value.callbacks, paymentUrl: saved.notifyUrl || '', refundUrl: saved.returnUrl || '' } }
      const index = configs.value.findIndex(item => item.id === config.id)
      if (index === -1) configs.value.push(config)
      else configs.value[index] = config
      paymentSettingsSaved.value = true
      setTimeout(() => { paymentSettingsSaved.value = false }, 3000)
      closePaymentEditor()
    } catch (err) { error.value = displayError(err) }
  }
  const duplicatePaymentConfig = config => { selectedConfig.value = { ...JSON.parse(JSON.stringify(config)), id: `config-${Date.now()}`, name: `${config.name}（副本）`, status: 'draft', connection: 'untested' }; editorStep.value = 1; editorOpen.value = true }
  const testPaymentConfig = async () => {
    const configId = selectedConfig.value?.id
    if (!configId || configId.startsWith('config-') || !selectedConfig.value?.environment) {
      error.value = '請先保存技術配置，再執行連線測試'
      testResult.value = 'error'
      return
    }
    try {
      error.value = ''
      const result = await api('/settings/alipayhk/test', { method: 'POST', body: JSON.stringify({ environment: selectedConfig.value.environment }) })
      testResult.value = result.status === 'success' ? 'success' : 'error'
    } catch (err) { testResult.value = 'error'; error.value = displayError(err) }
  }
  return { savePaymentSettings, loadPaymentConfigs, closePaymentEditor, savePaymentConfigDraft, duplicatePaymentConfig, testPaymentConfig }
}
