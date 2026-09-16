<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/messages/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="header-title">設定</text>
    </view>
    <view class="setting-row"><text>語言</text><view class="setting-picker" @tap="openLanguagePicker"><view class="setting-value"><text>{{ language }}</text><text class="chevron">›</text></view></view></view>
    <view class="setting-row"><text>地區</text><view class="setting-picker" @tap="openRegionPicker"><view class="setting-value"><text>{{ region }}</text><text class="chevron">›</text></view></view></view>
    <view class="setting-row"><text>貨幣</text><view class="setting-picker" @tap="openCurrencyPicker"><view class="setting-value"><text>{{ currency }}</text><text class="chevron">›</text></view></view></view>
    <view class="setting-row font-row"><text>字體大小</text><view class="font-options"><text class="large">A</text><text class="medium">A</text><text class="small">A</text></view></view>
    <view class="setting-row" @tap="comingSoon('條款')"><text>條款</text></view>
    <view class="logout" @tap="handleAuthAction"><text>{{ authenticated ? '登出' : '登入' }}</text></view>
  </view>
</template>
<script setup lang="ts">
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { logoutClient } from '../../services/api'
import { closeCachedPage } from '../../utils/navigation'
import { useCurrency, type Currency } from '../../composables/useCurrency'
import { clearAuthentication, isAuthenticated } from '../../utils/auth'

const { responsiveStyle } = useResponsiveCanvas()
const { currency: selectedCurrency, setCurrency } = useCurrency()
const languages = ['繁體中文', '簡體中文', '英文']
const regions = ['香港', '澳門', '中國內地']
const currencies = ['港幣 HK$', '人民幣 ¥']
const currencyCodes: Currency[] = ['HKD', 'RMB']
const language = ref(languages[0])
const region = ref(regions[0])
const currency = ref(currencies[0])
const languageIndex = ref(0)
const regionIndex = ref(0)
const currencyIndex = ref(0)
const authenticated = ref(false)
const persistSettings = () => { uni.setStorageSync('display-currency', selectedCurrency.value) }

const changeLanguage = (index: number) => { languageIndex.value = index; language.value = languages[index] }
const changeRegion = (index: number) => { regionIndex.value = index; region.value = regions[index] }
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
})
onShow(() => {
  authenticated.value = isAuthenticated()
})
const handleAuthAction = async () => {
  if (!authenticated.value) {
    uni.reLaunch({ url: '/pages/login/login', animationType: 'none', animationDuration: 0 })
    return
  }
  try {
    await logoutClient()
  } catch {
    // Clear local credentials even when the server is unavailable.
  }
  clearAuthentication()
  authenticated.value = false
  uni.showToast({ title: '已登出', icon: 'none' })
  uni.reLaunch({ url: '/pages/login/login', animationType: 'none', animationDuration: 0 })
}
const goBack = () => closeCachedPage('/pages/trips/trips')
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}
.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}
.header{position:absolute;top:0;left:0;width:430px;height:110px;overflow:hidden;border-radius:25px;background:#fff}.back{position:absolute;top:60px;left:33px;width:12px;height:25px}.header-title{position:absolute;top:58px;left:calc(50% - 18px);font-size:18px;font-weight:500}
.setting-row{position:absolute;left:0;width:430px;height:50px;display:flex;align-items:center;box-sizing:border-box;background:#fff;font-size:16px;font-weight:350}.setting-row>text:first-child{margin-left:30px}.setting-row:nth-of-type(2){top:120px}.setting-row:nth-of-type(3){top:171px}.setting-row:nth-of-type(4){top:222px}.setting-row:nth-of-type(5){top:282px}.setting-row:nth-of-type(6){top:333px}.setting-picker{position:absolute;inset:0}.setting-value{position:absolute;top:0;right:12px;width:110px;height:50px;display:flex;align-items:center;justify-content:flex-end;box-sizing:border-box;white-space:nowrap;overflow:visible;pointer-events:none}.setting-value>text:first-child{width:84px;text-align:right;font-size:16px;line-height:1.5;flex:none}.setting-value .chevron{flex:none;margin-left:8px;font-size:22px;line-height:20px}.font-options{position:absolute;left:329px;top:7px;width:82px;height:35px;font-weight:700}.font-options text{position:absolute}.font-options .large{left:0;top:0;font-size:24px}.font-options .medium{left:36px;top:7px;font-size:16px}.font-options .small{left:67px;top:10px;font-size:12px}.logout{position:absolute;top:403px;left:36px;width:357px;height:50px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#285CFC;color:#fff;font-size:16px;font-weight:500}
@media (max-width:599px){.page{top:0;left:var(--mobile-offset,0px);height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}}
</style>
