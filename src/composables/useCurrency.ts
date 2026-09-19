import { computed, ref } from 'vue'
import { getSettings, updateSettings } from '../services/api'

export type Currency = 'HKD' | 'RMB'

export const normalizeCurrency = (value: unknown): Currency | null => value === 'HKD' ? 'HKD' : value === 'RMB' || value === 'CNY' || value === 'RMB¥' ? 'RMB' : null
export const currencySymbol = (value: unknown): string => normalizeCurrency(value) === 'HKD' ? 'HK$' : '¥'
export const currencyLabel = (value: unknown): string => normalizeCurrency(value) === 'HKD' ? '港幣' : '人民幣'
export const formatCurrencyAmount = (amount: number, value: unknown, decimals = 2) => `${currencySymbol(value)}${Number(amount || 0).toFixed(decimals)}`
export const normalizeExchangeRate = (value: unknown): number | null => {
  const rate = Number(value)
  if (!Number.isFinite(rate) || rate <= 0) return null
  return rate >= 10 ? rate / 100 : rate
}

const legacyStoredCurrency = uni.getStorageSync('display-currency')
const storedCurrency = legacyStoredCurrency === 'HKD' || legacyStoredCurrency === 'RMB' ? legacyStoredCurrency : null
let hasUserCurrency = storedCurrency !== null
if (legacyStoredCurrency !== undefined && storedCurrency === null) uni.removeStorageSync('display-currency')
const storedRate = uni.getStorageSync('exchange-rate')
const normalizedStoredRate = normalizeExchangeRate(storedRate)
const exchangeRate = ref(normalizedStoredRate || 0.92)
if (storedRate !== undefined && normalizedStoredRate === null) uni.removeStorageSync('exchange-rate')
if (normalizedStoredRate !== null && normalizedStoredRate !== Number(storedRate)) uni.setStorageSync('exchange-rate', normalizedStoredRate)
const currency = ref<Currency>(storedCurrency || 'HKD')
let loaded = false

export function useCurrency() {
  const symbol = computed(() => currencySymbol(currency.value))
  const label = computed(() => currencyLabel(currency.value))
  const convert = (rmbAmount: number) => currency.value === 'RMB' ? rmbAmount : rmbAmount / exchangeRate.value
  const convertAmountTo = (amount: number, source: Currency | string, target: Currency | string) => {
    const sourceCurrency = normalizeCurrency(source) || 'RMB'
    const targetCurrency = normalizeCurrency(target) || currency.value
    if (sourceCurrency === targetCurrency) return amount
    return sourceCurrency === 'RMB' ? amount / exchangeRate.value : amount * exchangeRate.value
  }
  const convertAmount = (amount: number, source: Currency | string) => convertAmountTo(amount, source, currency.value)
  const formatConvertedAmount = (amount: number, source: Currency | string, decimals = 2) =>
    formatCurrencyAmount(convertAmount(amount, source), currency.value, decimals)
  const format = (rmbAmount: number, decimals = 0) => formatCurrencyAmount(convert(rmbAmount), currency.value, decimals)
  const formatOriginal = (amount: number, source: Currency | string, decimals = 2) => formatCurrencyAmount(amount, source, decimals)
  const setCurrency = (value: Currency | null) => {
    const normalized = normalizeCurrency(value)
    if (!normalized) return
    hasUserCurrency = true
    currency.value = normalized
    uni.setStorageSync('display-currency', normalized)
  }
  const setExchangeRate = (value: number | undefined) => {
    const normalized = normalizeExchangeRate(value)
    if (normalized === null) return
    exchangeRate.value = normalized
    uni.setStorageSync('exchange-rate', normalized)
  }
  const loadSettings = async () => {
    if (loaded) return
    loaded = true
    try {
      const settings = await getSettings()
      const savedCurrency = normalizeCurrency(settings.currency)
      if (savedCurrency && !hasUserCurrency) currency.value = savedCurrency
      if (settings.exchangeRate) setExchangeRate(settings.exchangeRate)
    } catch { /* use cached defaults */ }
  }
  return { currency, exchangeRate, symbol, label, convert, convertAmount, convertAmountTo, format, formatConvertedAmount, formatOriginal, setCurrency, setExchangeRate, loadSettings }
}
