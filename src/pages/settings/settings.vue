<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <PageNavBar :title="tx('設定')" @back="goBack" />
    </view>
    <view class="setting-row"><text>{{ tx('語言') }}</text><view class="setting-picker" @tap="openLanguagePicker"><view class="setting-value"><text>{{ tx(languageName) }}</text><text class="chevron">›</text></view></view></view>
    <view class="setting-row"><text>{{ tx('地區') }}</text><view class="setting-picker" @tap="openRegionPicker"><view class="setting-value"><text>{{ tx(region) }}</text><text class="chevron">›</text></view></view></view>
    <view class="setting-row"><text>{{ tx('貨幣') }}</text><view class="setting-picker" @tap="openCurrencyPicker"><view class="setting-value"><text>{{ tx(currency) }}</text><text class="chevron">›</text></view></view></view>
    <view v-if="authenticated" class="setting-row"><text>{{ tx('消息通知') }}</text><view class="setting-picker" @tap="openNotificationSettings"><view class="setting-value"><text>{{ tx(notificationSummary) }}</text><text class="chevron">›</text></view></view></view>
    <view class="setting-row" @tap="comingSoon('條款')"><text>{{ tx('條款') }}</text></view>
    <view class="logout" :class="{ 'logout-pending': logoutPending, 'logout-guest': !authenticated }" @tap="handleAuthAction"><text>{{ tx(logoutPending ? '登出中…' : authenticated ? '登出' : '登入') }}</text></view>
  </view>
</template>
<script setup lang="ts">
import PageNavBar from '../../components/common/PageNavBar.vue'
import { language, setLanguage, tx, type Language } from '../../i18n'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getNotificationPreferences, logoutClient } from '../../services/api'
import { closeCachedPage, openCachedPage } from '../../utils/navigation'
import { useCurrency, type Currency } from '../../composables/useCurrency'
import { clearAuthentication, getAuthUser, isAuthenticated } from '../../utils/auth'

const { responsiveStyle } = useResponsiveCanvas()
const { currency: selectedCurrency, setCurrency } = useCurrency()
// Each language is named in its own script, so the names are not passed through tx().
const languages = ['繁體中文', '简体中文']
const languageCodes: Language[] = ['zh-Hant', 'zh-Hans']
const regions = ['香港', '澳門', '中國內地']
const currencies = ['港幣 HK$', '人民幣 ¥']
const currencyCodes: Currency[] = ['HKD', 'RMB']
// Region follows the account's phone area code until that account picks one here.
// The pick is stored with its account, so another account on this device starts from its own area code.
const REGION_KEY = 'display-region'
const regionCodes = ['HK', 'MO', 'CN']
const regionForCountryCode: Record<string, string> = { '+852': 'HK', '+853': 'MO', '+86': 'CN' }
const currentRegionIndex = () => {
  const user = getAuthUser()
  const [owner, code] = String(uni.getStorageSync(REGION_KEY) || '').split(':')
  const picked = !user || owner === user.id ? regionCodes.indexOf(code) : -1
  if (picked >= 0) return picked
  return Math.max(0, regionCodes.indexOf(regionForCountryCode[user?.countryCode || '']))
}
const region = ref(regions[currentRegionIndex()])
const currency = ref(currencies[0])
const languageName = computed(() => languages[languageCodes.indexOf(language.value)])
const currencyIndex = ref(0)
const authenticated = ref(false)
const logoutPending = ref(false)
const notificationSummary = ref('')
let summaryRequest = 0
const loadNotificationSummary = async () => {
  if (!isAuthenticated()) { notificationSummary.value = ''; return }
  const request = ++summaryRequest
  try {
    const preferences = await getNotificationPreferences()
    if (request === summaryRequest) notificationSummary.value = preferences.notificationsOn ? '已開啟' : '已關閉'
  } catch { /* the row still opens the page; only the summary is missing */ }
}
const openNotificationSettings = () => openCachedPage('/pages/settings/notifications')
const persistSettings = () => { uni.setStorageSync('display-currency', selectedCurrency.value) }

const changeLanguage = (index: number) => setLanguage(languageCodes[index])
const changeRegion = (index: number) => { region.value = regions[index]; uni.setStorageSync(REGION_KEY, `${getAuthUser()?.id || ''}:${regionCodes[index]}`) }
const changeCurrency = (index: number) => { currencyIndex.value = index; currency.value = currencies[index]; setCurrency(currencyCodes[index]); persistSettings() }
const openSelector = (_title: string, options: string[], onSelect: (index: number) => void) => {
  uni.showActionSheet({ itemList: options, success: ({ tapIndex }) => onSelect(tapIndex) })
}
const openLanguagePicker = () => openSelector('語言', languages, changeLanguage)
const openRegionPicker = () => openSelector('地區', regions, changeRegion)
const openCurrencyPicker = () => openSelector('貨幣', currencies, changeCurrency)
onMounted(() => {
  authenticated.value = isAuthenticated()
  const savedCurrencyIndex = currencyCodes.indexOf(selectedCurrency.value)
  if (savedCurrencyIndex >= 0) { currencyIndex.value = savedCurrencyIndex; currency.value = currencies[savedCurrencyIndex] }
  void loadNotificationSummary()
})
onShow(() => {
  authenticated.value = isAuthenticated()
  region.value = regions[currentRegionIndex()]
  void loadNotificationSummary()
})
const handleAuthAction = async () => {
  if (logoutPending.value) return
  if (!authenticated.value) {
    uni.reLaunch({ url: '/pages/login/login', animationType: 'none', animationDuration: 0 })
    return
  }
  // #ifdef MP-WEIXIN
  logoutPending.value = true
  // #endif
  try {
    await logoutClient()
  } catch {
    // Clear local credentials even when the server is unavailable.
  }
  clearAuthentication()
  authenticated.value = false
  uni.showToast({ title: '已登出', icon: 'none' })
  uni.reLaunch({
    url: '/pages/login/login', animationType: 'none', animationDuration: 0,
    fail: () => { logoutPending.value = false }
  })
}
const comingSoon = (name: string) => uni.showToast({ title: `${name}功能開發中`, icon: 'none' })
const goBack = () => closeCachedPage('/pages/trips/trips')
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}
.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}
.header{position:absolute;top:0;left:0;width:430px;height:110px;overflow:hidden;border-radius:25px;background:#fff}
.setting-row{position:absolute;left:0;width:430px;height:50px;display:flex;align-items:center;box-sizing:border-box;background:#fff;font-size:16px;font-weight:350}.setting-row>text:first-child{margin-left:30px}.setting-row:nth-of-type(2){top:120px}.setting-row:nth-of-type(3){top:171px}.setting-row:nth-of-type(4){top:222px}.setting-row:nth-of-type(5){top:282px}.setting-row:nth-of-type(6){top:333px}.setting-picker{position:absolute;inset:0}.setting-value{position:absolute;top:0;right:12px;width:110px;height:50px;display:flex;align-items:center;justify-content:flex-end;box-sizing:border-box;white-space:nowrap;overflow:visible;pointer-events:none}.setting-value>text:first-child{width:84px;text-align:right;font-size:16px;line-height:1.5;flex:none}.setting-value .chevron{flex:none;margin-left:8px;font-size:22px;line-height:20px}.logout{position:absolute;top:403px;left:36px;width:357px;height:50px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#285CFC;color:#fff;font-size:16px;font-weight:500}
.logout-pending{opacity:.7;pointer-events:none}
.logout.logout-guest{top:352px}
@media (max-width:599px){.page{top:0;left:var(--mobile-offset,0px);height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}}
</style>
