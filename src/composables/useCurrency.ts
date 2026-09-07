import { computed, ref } from 'vue'
import { getSettings, updateSettings } from '../services/api'

export type Currency = 'HKD' | 'RMB'

const normalizeCurrency = (value: unknown): Currency | null => value === 'HKD' ? 'HKD' : value === 'RMB' || value === 'CNY' ? 'RMB' : null
const storedCurrency = normalizeCurrency(uni.getStorageSync('display-currency'))
const currency = ref<Currency>(storedCurrency || 'HKD')
const exchangeRate = ref(Number(uni.getStorageSync('exchange-rate')) || 0.92)
let loaded = false

export function useCurrency() {
  const symbol = computed(() => currency.value === 'HKD' ? 'HK$' : '¥')
  const label = computed(() => currency.value === 'HKD' ? '港幣' : '人民幣')
  const convert = (rmbAmount: number) => currency.value === 'RMB' ? rmbAmount : rmbAmount / exchangeRate.value
  const format = (rmbAmount: number, decimals = 0) => `${symbol.value}${convert(rmbAmount).toFixed(decimals)}`
  const setCurrency = (value: Currency) => { const normalized = normalizeCurrency(value); if (!normalized) return; currency.value = normalized; uni.setStorageSync('display-currency', normalized) }
  const setExchangeRate = (value: number) => { if (Number.isFinite(value) && value > 0) { exchangeRate.value = value; uni.setStorageSync('exchange-rate', value) } }
  const loadSettings = async () => {
    if (loaded) return
    loaded = true
    // 微信開發者工具與真機無法直接存取本機 localhost，預覽時使用快取／預設值。
    // #ifdef MP-WEIXIN || MP-TOUTIAO
    return
    // #endif
    try {
      const settings = await getSettings()
      const savedCurrency = normalizeCurrency(settings.currency)
      if (savedCurrency) setCurrency(savedCurrency)
      if (Number.isFinite(settings.exchangeRate)) setExchangeRate(settings.exchangeRate)
    } catch { /* use cached defaults */ }
  }
  return { currency, exchangeRate, symbol, label, convert, format, setCurrency, setExchangeRate, loadSettings }
}
