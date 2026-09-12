import { computed, ref } from 'vue'
import { getSettings, updateSettings } from '../services/api'

export type Currency = 'HKD' | 'RMB'

export const normalizeCurrency = (value: unknown): Currency | null => value === 'HKD' ? 'HKD' : value === 'RMB' || value === 'CNY' || value === 'RMB¥' ? 'RMB' : null
export const currencySymbol = (value: unknown): string => normalizeCurrency(value) === 'HKD' ? 'HK$' : '¥'
export const currencyLabel = (value: unknown): string => normalizeCurrency(value) === 'HKD' ? '港幣' : '人民幣'
export const formatCurrencyAmount = (amount: number, value: unknown, decimals = 2) => `${currencySymbol(value)}${Number(amount || 0).toFixed(decimals)}`

const legacyStoredCurrency = uni.getStorageSync('display-currency')
const storedCurrency = legacyStoredCurrency === 'HKD' || legacyStoredCurrency === 'RMB' ? legacyStoredCurrency : null
const hasStoredCurrency = storedCurrency !== null
if (legacyStoredCurrency !== undefined && storedCurrency === null) uni.removeStorageSync('display-currency')
const storedRate = uni.getStorageSync('exchange-rate')
const exchangeRate = ref(Number(storedRate) > 0 ? Number(storedRate) : 0.92)
if (storedRate !== undefined && !(Number(storedRate) > 0)) uni.removeStorageSync('exchange-rate')
const currency = ref<Currency>(storedCurrency || 'HKD')
let loaded = false

export function useCurrency() {
  const symbol = computed(() => currencySymbol(currency.value))
  const label = computed(() => currencyLabel(currency.value))
  const convert = (rmbAmount: number) => currency.value === 'RMB' ? rmbAmount : rmbAmount / exchangeRate.value
  const convertAmount = (amount: number, source: Currency | string) => {
    const sourceCurrency = normalizeCurrency(source) || 'RMB'
    if (sourceCurrency === currency.value) return amount
    return sourceCurrency === 'RMB' ? amount / exchangeRate.value : amount * exchangeRate.value
  }
  const format = (rmbAmount: number, decimals = 0) => formatCurrencyAmount(convert(rmbAmount), currency.value, decimals)
  const formatOriginal = (amount: number, source: Currency | string, decimals = 2) => formatCurrencyAmount(amount, source, decimals)
  const setCurrency = (value: Currency | null) => { const normalized = normalizeCurrency(value); if (!normalized) return; currency.value = normalized; uni.setStorageSync('display-currency', normalized) }
  const setExchangeRate = (value: number | undefined) => { if (typeof value === 'number' && Number.isFinite(value) && value > 0) { exchangeRate.value = value; uni.setStorageSync('exchange-rate', value) } }
  const loadSettings = async () => {
    if (loaded) return
    loaded = true
    try {
      const settings = await getSettings()
      const savedCurrency = normalizeCurrency(settings.currency)
      if (savedCurrency && !hasStoredCurrency) setCurrency(savedCurrency)
      if (settings.exchangeRate) setExchangeRate(settings.exchangeRate)
    } catch { /* use cached defaults */ }
  }
  return { currency, exchangeRate, symbol, label, convert, convertAmount, format, formatOriginal, setCurrency, setExchangeRate, loadSettings }
}
