export function dateTimeInput(value) {
  return value ? new Date(value).toISOString().slice(0, 16) : ''
}

export function formatTripAmount(amount, currency = 'RMB¥') {
  const value = Number(amount)
  return Number.isFinite(value) ? `${currency}${value.toFixed(2)}` : '—'
}

export function paymentMethodLabel(method) {
  return ({ sandbox: '沙盒支付', wechat: '微信支付', alipay: '支付寶', bank_card: '銀行卡' })[method] || method || '—'
}

export function formatBenefits(item) {
  return (item?.benefits || []).join(' · ')
}
