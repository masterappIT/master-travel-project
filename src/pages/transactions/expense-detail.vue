<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/transactions/expense/back.svg" mode="aspectFit" @tap="goBack" />
    </view>
    <image class="success-icon" src="/static/transactions/expense/success.svg" mode="aspectFit" />
    <text class="title">支出 - 跨境出行 {{ paymentMethodLabel }}</text>
    <view class="amount"><text class="currency">{{ currencyLabel }}</text><text class="yen">{{ currencySymbol }}</text><text class="number">{{ expenseAmount.toFixed(2) }}</text></view>
    <view class="status"><image src="/static/transactions/expense/status-check.svg" mode="aspectFit" /><text>成功</text></view>
    <view class="details">
      <text class="section-title">付款方式</text>
      <view class="payment-card">
        <view class="payment-copy"><image class="wallet-icon" src="/static/transactions/expense/wallet.svg" mode="aspectFit" /><view><text>{{ paymentMethodLabel }}</text><text class="muted">{{ paymentMethodDescription }}</text></view></view>
        <image class="selected" src="/static/transactions/expense/selected.svg" mode="aspectFit" />
      </view>
      <view class="order-total"><text>訂單總金額</text><text>{{ currencyLabel }} {{ currencySymbol }}{{ expenseAmount.toFixed(2) }}</text></view>
      <view v-if="payment?.externalAmount" class="allocation cash"><image src="/static/transactions/expense/wallet-small.svg" mode="aspectFit" /><text>{{ paymentMethodLabel }}</text><text>-{{ currencyLabel }} {{ currencySymbol }}{{ payment.externalAmount.toFixed(2) }}</text></view>
      <view v-if="payment?.fareAmount" class="allocation fare"><image src="/static/transactions/expense/wallet-small.svg" mode="aspectFit" /><text>車費餘額</text><text>-{{ currencyLabel }} {{ currencySymbol }}{{ payment.fareAmount.toFixed(2) }}</text></view>
      <view v-if="payment?.cashAmount" class="allocation fare" :class="{ 'fare-with-external': payment?.fareAmount }"><image src="/static/transactions/expense/wallet-small.svg" mode="aspectFit" /><text>現金餘額</text><text>-{{ currencyLabel }} {{ currencySymbol }}{{ payment.cashAmount.toFixed(2) }}</text></view>
      <view class="order-link" @tap="openOrder"><text>相關訂單紀錄</text><image src="/static/transactions/expense/arrow.svg" mode="aspectFit" /></view>
      <view class="success-time"><text>支付成功時間</text><text>{{ paymentTime }}</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { currencySymbol as getCurrencySymbol, normalizeCurrency } from '../../composables/useCurrency'
import { closeCachedPage, openCachedPage } from '../../utils/navigation'
import { listClientTransactions, type ClientPayment } from '../../services/api'

const { responsiveStyle } = useResponsiveCanvas()
const payment = ref<ClientPayment | null>(null)
const tripId = ref('')
const expenseAmount = computed(() => payment.value?.total || 0)
const normalizedPaymentCurrency = computed(() => normalizeCurrency(payment.value?.currency) || 'RMB')
const currencyLabel = computed(() => normalizedPaymentCurrency.value === 'HKD' ? 'HKD' : 'RMB')
const currencySymbol = computed(() => getCurrencySymbol(normalizedPaymentCurrency.value))
const paymentMethodLabel = computed(() => payment.value?.externalPaymentMethod === 'internal' ? '內部測試付款' : '錢包支付')
const paymentMethodDescription = computed(() => payment.value?.externalPaymentMethod === 'internal' ? '內部測試交易' : '我的錢包餘額')
const paymentTime = computed(() => payment.value ? new Date(payment.value.createdAt).toLocaleString('zh-HK') : '—')
onLoad(async (options) => {
  tripId.value = options?.tripId || ''
  try {
    const payments = await listClientTransactions()
    payment.value = payments.find((item) => item.tripId === tripId.value) || null
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '交易紀錄載入失敗', icon: 'none' })
  }
})
const goBack = () => closeCachedPage('/pages/transactions/transactions')
const openOrder = () => payment.value && openCachedPage(`/pages/orders/detail?status=traveling&id=${encodeURIComponent(payment.value.tripId)}`)
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;height:100%;margin:0;overflow:hidden}.page{position:fixed;top:0;left:0;width:430px;height:932px;overflow:hidden;border-radius:35px;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif}.header{position:absolute;top:0;left:0;width:430px;height:110px;border-radius:25px;background:#fff}.back{position:absolute;top:60px;left:33px;width:12px;height:25px}.action{position:absolute;top:60px;left:336px;width:87px;height:32px}.success-icon{position:absolute;top:160px;left:165px;width:100px;height:100px}.title{position:absolute;top:270px;left:calc(50% - 100px);font-size:18px;font-weight:500;white-space:nowrap}.amount{position:absolute;top:306px;left:136px;height:43px;display:flex;align-items:flex-end}.currency{align-self:flex-end;margin-bottom:8px;line-height:18px;font-size:14px;font-weight:500}.yen{margin-left:1px;font-size:26px;font-weight:500;line-height:normal}.number{margin-left:8px;font-size:30px;font-weight:700;line-height:normal}.status{position:absolute;top:359px;left:193px;display:flex;align-items:flex-end;gap:5px;color:#285cfc;font-size:12px;font-weight:400}.status image{width:15px;height:15px}.details{position:absolute;top:409px;left:15px;width:400px;height:354px;overflow:hidden;border-radius:10px;background:#fff}.section-title{position:absolute;top:20px;left:20px;font-size:16px;font-weight:400}.payment-card{position:absolute;top:53px;left:10px;width:380px;height:50px;display:flex;align-items:center;justify-content:space-between;padding:10px;box-sizing:border-box;border:1px solid #285cfc;border-radius:10px;box-shadow:0 4px 4px rgba(0,0,0,.25)}.payment-copy{display:flex;align-items:center;gap:16px;color:#1d2939;font-family:Inter,sans-serif;font-size:14px;font-weight:400;white-space:nowrap}.payment-copy>view{display:flex;flex-direction:column;gap:4px}.card-icon{width:36px;height:24px}.wallet-icon{width:25px;height:25px}.muted,.allocation{color:#667085;font-size:12px;font-weight:400}.selected{width:24px;height:24px}.order-total{position:absolute;top:188px;left:20px;width:361px;display:flex;justify-content:space-between;font-size:14px;font-weight:400}.order-total text:last-child{color:#285cfc}.allocation{position:absolute;left:202px;display:flex;align-items:center;gap:5px;height:18px;font-family:Inter,sans-serif}.allocation image{width:15px;height:15px}.cash image{width:20px;height:13.333px}.allocation text:last-child{position:absolute;left:99px;width:80px;text-align:right;font-size:10px;font-weight:400}.cash{top:213px}.fare{top:236px}.fare-with-external{top:259px}.fare image{position:absolute;left:-1px;top:1px}.fare text:first-of-type{margin-left:20px}.order-link{position:absolute;top:274px;left:20px;width:358px;height:20px;display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:400}.order-link image{width:9px;height:15px}.success-time{position:absolute;top:314px;left:19px;width:361px;display:flex;justify-content:space-between;font-size:14px;font-weight:400}.success-time text:last-child{font-size:14px;font-weight:400}@media(max-width:599px){.page{height:var(--mobile-height,100dvh);transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
