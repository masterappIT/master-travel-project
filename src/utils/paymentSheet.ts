import type { PaymentSheetRow } from '../services/api'

// The sheet can only name icons the app ships with.
const SHEET_ICONS: Record<string, string> = {
  'wallet-fare': '/static/vehicles/payment/payment-wallet-fare.svg',
  'wallet-cash': '/static/vehicles/payment/payment-wallet-cash.svg',
  wechat: '/static/vehicles/payment/payment-wechat.svg',
  alipay: '/static/vehicles/payment/payment-alipay.svg',
  bank: '/static/vehicles/payment/payment-bank.svg'
}

export type PaymentSheetDisplayRow = PaymentSheetRow & { iconPath: string }

/** Stripe's hosted payment page cannot be opened inside a mini-program, so rows it handles are never listed there. */
const isUsableOnThisPlatform = (row: PaymentSheetRow) => {
  // #ifdef MP-WEIXIN || MP-TOUTIAO
  if (row.provider === 'STRIPE') return false
  // #endif
  return true
}

export const paymentSheetDisplayRows = (rows: PaymentSheetRow[]): PaymentSheetDisplayRow[] =>
  rows.filter(isUsableOnThisPlatform).map(row => ({ ...row, iconPath: SHEET_ICONS[row.icon] || SHEET_ICONS.bank }))

/** Shown until the arranged sheet has loaded, or if it cannot be loaded: wallets only, never an external row the server has not offered. */
export const fallbackPaymentSheetRows = (settings: { fareBalancePayEnabled?: boolean; cashBalancePayEnabled?: boolean }): PaymentSheetDisplayRow[] =>
  paymentSheetDisplayRows([
    ...(settings.fareBalancePayEnabled !== false ? [{ id: 'fallback-fare', kind: 'FARE_BALANCE' as const, label: '車費餘額', icon: 'wallet-fare', provider: null }] : []),
    ...(settings.cashBalancePayEnabled !== false ? [{ id: 'fallback-cash', kind: 'CASH_BALANCE' as const, label: '現金餘額', icon: 'wallet-cash', provider: null }] : [])
  ])
