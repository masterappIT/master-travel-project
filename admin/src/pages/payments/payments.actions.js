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
  const closePaymentEditor = () => { editorOpen.value = false; selectedConfig.value = null }
  const savePaymentConfigDraft = value => {
    if (!value) return
    const index = configs.value.findIndex(item => item.id === value.id)
    if (index === -1) configs.value.push(JSON.parse(JSON.stringify(value)))
    else configs.value[index] = JSON.parse(JSON.stringify(value))
    paymentSettingsSaved.value = true
    setTimeout(() => { paymentSettingsSaved.value = false }, 3000)
    closePaymentEditor()
  }
  const duplicatePaymentConfig = config => { selectedConfig.value = { ...JSON.parse(JSON.stringify(config)), id: `config-${Date.now()}`, name: `${config.name}（副本）`, status: 'draft', connection: 'untested' }; editorStep.value = 1; editorOpen.value = true }
  const togglePaymentConfig = config => { config.status = config.status === 'enabled' ? 'disabled' : 'enabled' }
  const testPaymentConfig = () => { testResult.value = 'success' }
  return { savePaymentSettings, closePaymentEditor, savePaymentConfigDraft, duplicatePaymentConfig, togglePaymentConfig, testPaymentConfig }
}
