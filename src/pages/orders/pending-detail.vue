<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <OrdersBackButton icon-src="/static/orders/traveling-back.svg" @tap="goBack" />
      <text v-if="isTraveling" class="traveling-title">待出行</text>
      <text v-else class="number">訂單編號：{{ orderNumber }}</text>
    </view>
    <template v-if="isTraveling">
      <text class="traveling-order-number">訂單編號：282678634</text>
      <view class="traveling-card">
        <view class="traveling-status-row">
          <view class="traveling-waiting"><view class="waiting-mark"><image src="/static/orders/traveling-wait-ring.svg" mode="aspectFit" /><image class="waiting-dot" src="/static/orders/traveling-wait-dot.svg" mode="aspectFit" /></view><text>等待中</text></view>
        </view>
        <view class="traveling-summary">
          <image src="/static/orders/traveling-status.svg" mode="aspectFit" />
          <text>正在為您安排司機</text>
          <view class="traveling-confirm"><image src="/static/orders/traveling-clock.svg" mode="aspectFit" /><text>三小時內確認</text></view>
          <image class="traveling-car" src="/static/orders/traveling-car.svg" mode="aspectFit" />
        </view>
        <view class="traveling-info">
          <image class="traveling-tesla" src="/static/orders/traveling-tesla.svg" mode="aspectFit" />
          <text class="traveling-pickup">上車時間 ：{{ bookingTime }}</text>
          <view class="traveling-locations"><view><image src="/static/orders/traveling-origin.svg" mode="aspectFit" /><text>香港國際機場</text></view><view><image src="/static/orders/traveling-destination.svg" mode="aspectFit" /><text>深圳灣口岸</text></view></view>
          <text class="traveling-vehicle">高級跨境商務車（7座）</text>
          <view class="traveling-passenger"><text>乘客及聯絡資料：</text><view><image src="/static/orders/traveling-passenger.svg" mode="aspectFit" /><text>李XX（先生）</text></view><view><image src="/static/orders/traveling-phone.svg" mode="aspectFit" /><text>852 - 53**8469</text></view></view>
          <view class="traveling-divider"><image src="/static/orders/traveling-divider.svg" mode="aspectFit" /></view>
          <view class="traveling-divider second"><image src="/static/orders/traveling-divider.svg" mode="aspectFit" /></view>
          <view class="traveling-record" @tap="showPaymentRecords">相關支付紀錄 <image src="/static/orders/traveling-arrow.svg" mode="aspectFit" /></view>
        </view>
      </view>
    </template>
    <template v-else>
      <view class="assist"><image src="/static/orders/help.svg" mode="aspectFit" /><text>訂單協助</text></view>
      <view class="status"><image src="/static/orders/status-pending.svg" mode="aspectFit" /><text>待確認</text></view>
      <view class="card pending-card">
      <view class="locations"><view><image src="/static/orders/origin.svg" mode="aspectFit" /><text>{{ originLabel }}</text></view><view><image src="/static/orders/destination.svg" mode="aspectFit" /><text>{{ destinationLabel }}</text></view></view>
      <view class="times"><text>上車時間 ：{{ bookingTime }}</text><text>到達時間 ：{{ bookingTime }}</text></view>
      <view class="passenger-title">乘客及聯絡資料：</view><view class="passenger"><view><image src="/static/orders/passenger.svg" mode="aspectFit" /><text>李XX（先生）</text></view><view><image src="/static/orders/phone.svg" mode="aspectFit" /><text>852 - 53**8469</text></view></view>
      <view :class="['payment', { completed: isCompleted, pending: !isCompleted }]">
        <text v-if="!isCompleted">交易時間剩餘：10:00</text>
        <text class="amount">{{ amountLabel }}</text>
        <view v-if="!isCompleted" class="pay-tag">待付款</view>
        <view v-else class="paid-tag">已付款</view>
      </view>
      <view class="detail"><text class="detail-title">訂單詳細</text><text class="detail-date">2024/03/15</text><view class="line"/><view class="row"><text>{{ selectedVehicle.title }}（{{ selectedVehicle.seats }}座）</text><text>¥ {{ selectedVehicle.price }}</text></view><view class="row"><text>加急附加費</text><text>¥ 100</text></view><view class="row"><text>優惠券抵扣</text><text>-¥ 100</text></view><view v-if="isCompleted" class="completed-payment"><view class="payment-record wallet-record"><image src="/static/vehicles/payment/payment-wallet-fare.svg" mode="aspectFit" /><text>車費餘額</text><text class="record-amount">-¥ 0.00</text></view><view class="payment-record wechat-record"><image src="/static/vehicles/payment/payment-wechat.svg" mode="aspectFit" /><text>微信支付</text><text class="record-amount">-¥ 800.00</text></view><view class="record-link" @tap="showPaymentRecords">相關支付紀錄 <text>›</text></view></view><view class="total">Total： ¥ {{ selectedVehicle.price }}</view><button v-if="!isCompleted" class="cancel" @tap="cancelOrder">取消</button></view>
      </view>
    </template>
  </view>
</template>
<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { useTripStore } from '../../stores/trip'
import { closeCachedPage, cachedPageUrl, cachedPageStack, openCachedPage } from '../../utils/navigation'
const isCompleted = ref(false)
import { cancelClientTrip, getClientTrip, type ClientTrip } from '../../services/api'
const tripStore = useTripStore()
const { responsiveStyle } = useResponsiveCanvas()
const storedOrder = ref<ClientTrip | undefined>()
const orderNumber = computed(() => storedOrder.value?.id || '—')
const parseQueryParams = (url = '') => Object.fromEntries((url.split('?')[1] || '').split('&').filter(Boolean).map(pair => { const [key, ...value] = pair.split('='); return [decodeURIComponent(key), decodeURIComponent(value.join('=') || '')] }))
const loadOrder = async (url = '') => {
  const id = parseQueryParams(url).id
  if (!id) return
  try {
    storedOrder.value = await getClientTrip(id)
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '訂單載入失敗', icon: 'none' })
  }
}
const isTraveling = ref(false)
onLoad((options) => {
  const query = options ? `?id=${options.id || ''}` : ''
  void loadOrder(query)
  isCompleted.value = false
  isTraveling.value = false
})
onMounted(() => {
  isCompleted.value = false
  isTraveling.value = false
})
onShow(() => {
  isCompleted.value = false
  isTraveling.value = false
})
const cityLabel = (value: string | undefined, fallback: string) => value?.split('·')[0]?.trim() || fallback
const originLabel = computed(() => cityLabel(storedOrder.value?.origin || tripStore.activeTrip?.origin, '香港國際機場'))
const destinationLabel = computed(() => cityLabel(storedOrder.value?.destination || tripStore.activeTrip?.destination, '深圳灣口岸'))
const bookingTime = computed(() => storedOrder.value?.scheduledAt || tripStore.departureTime || '2024年3月15日 14:00')
const selectedVehicle = computed(() => tripStore.chosenVehicle || { title: '高級跨境商務車', seats: 7, price: storedOrder.value?.payment?.total || 0 })
const amountLabel = computed(() => `${storedOrder.value?.payment?.currency === 'HKD' ? 'HK$' : 'RMB¥'}${(storedOrder.value?.payment?.total || selectedVehicle.value.price).toFixed(2)}`)
const getCurrentPageSource = () => {
  const candidates: string[] = []
  if (cachedPageUrl.value) candidates.push(cachedPageUrl.value)
  if (typeof window !== 'undefined' && window.location.hash) candidates.push(window.location.hash)

  for (const candidate of candidates) {
    const params = parseQueryParams(candidate)
    const source = params.from || params.returnTo || ''
    if (source) return source
  }

  return ''
}

const getSourceFromStack = () => {
  const currentIndex = cachedPageStack.value.findIndex((entry) => (entry || '').split('?')[0] === '/pages/orders/pending-detail')
  if (currentIndex < 0) return ''

  const stackEntries = cachedPageStack.value.slice(0, currentIndex + 1)
  for (let index = stackEntries.length - 1; index >= 0; index -= 1) {
    const params = parseQueryParams(stackEntries[index])
    if (params.from === 'profile' || params.returnTo === 'profile') return 'profile'
    if (params.from === 'orders' || params.returnTo === 'orders') return 'orders'
  }
  return ''
}

const getPreviousStackPath = () => {
  const currentIndex = cachedPageStack.value.findIndex((entry) => (entry || '').split('?')[0] === '/pages/orders/pending-detail')
  if (currentIndex <= 0) return ''
  return (cachedPageStack.value[currentIndex - 1] || '').split('?')[0]
}

const goBack = () => {
  const explicitSource = getCurrentPageSource() || getSourceFromStack()
  if (explicitSource === 'profile') return closeCachedPage('/pages/trips/trips')

  const previousStackPath = getPreviousStackPath()
  if (previousStackPath === '/pages/trips/trips') return closeCachedPage('/pages/trips/trips')
  return closeCachedPage('/pages/orders/orders')
}
const cancelOrder = async () => {
  if (!storedOrder.value) return uni.showToast({ title: '找不到訂單', icon: 'none' })
  try {
    await cancelClientTrip(storedOrder.value.id)
    openCachedPage(`/pages/orders/cancelled-detail?id=${encodeURIComponent(storedOrder.value.id)}`)
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '訂單取消失敗', icon: 'none' })
  }
}
const showPaymentRecords = () => openCachedPage(`/pages/transactions/expense-detail?tripId=${encodeURIComponent(storedOrder.value?.id || '')}`)
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;height:100%;margin:0;overflow:hidden}.page{position:fixed;top:50%;left:50%;width:430px;height:932px;overflow:hidden;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:translate(-50%,-50%) scale(min(1,calc(100vw / 430px),calc(100dvh / 932px)));transform-origin:center}.header{position:absolute;top:0;left:0;width:430px;height:110px;border-radius:25px;background:#fff}.number{position:absolute;top:58px;left:122px;font-size:18px;font-weight:500}.assist{position:absolute;top:130px;right:33px;display:flex;align-items:center;gap:10px;color:#285cfc;font-size:16px}.assist image{width:25px;height:25px}.status{position:absolute;top:130px;left:33px;display:flex;align-items:center;gap:5px;color:#38434a;font-size:16px;font-weight:700}.status image{width:25px;height:25px}.card{position:absolute;top:175px;left:0;width:430px;height:585px;border-radius:25px;background:#fff}.pending-card{height:585px}.completed-card{height:700px}.locations{position:absolute;top:20px;left:33px;font-size:14px}.locations view,.passenger view{display:flex;align-items:center;height:30px;gap:20px}.locations image{width:18px;height:18px}.times{position:absolute;top:80px;left:33px;display:flex;flex-direction:column;gap:5px;font-size:14px;font-weight:300}.passenger-title{position:absolute;top:135px;left:33px;font-size:14px}.passenger{position:absolute;top:165px;left:33px;font-size:14px}.passenger view{gap:10px}.passenger image{width:20px;height:20px}.passenger view:last-child image{width:15px;height:15px;margin-left:2px}.payment{position:absolute;top:20px;left:206px;width:194px;height:105px;font-size:14px;font-weight:300}.payment>text:first-child{position:absolute;top:0;right:0;line-height:20px;white-space:nowrap}.amount{position:absolute;top:0;right:0;color:#285cfc;font-weight:700;white-space:nowrap}.payment.pending .amount{top:70px}.payment.pending .pay-tag{top:30px}.payment.completed .amount{top:0}.payment.cancelled .amount{top:0;color:#38434a}.payment.cancelled .cancelled-tag{top:30px}.pay-tag{position:absolute;top:30px;right:0;padding:5px 10px;border:1px solid #f95c5c;border-radius:10px;color:#f95c5c;font-size:14px;font-weight:700;line-height:20px;white-space:nowrap}.paid-tag,.cancelled-tag{position:absolute;top:30px;right:0;padding:5px 10px;border-radius:10px;white-space:nowrap}.paid-tag{border:1px solid #285cfc;color:#285cfc;font-weight:700}.cancelled-tag{border:1px solid #38434a;color:#38434a;font-weight:400}.completed-payment{position:absolute;top:311px;left:30px;width:370px;height:126px}.payment-record{position:relative;display:flex;align-items:flex-start;gap:10px;width:370px;min-height:40px;padding-right:95px;box-sizing:border-box;font-size:14px;line-height:20px}.payment-record image{flex:none;width:25px;height:25px}.wallet-record{margin-top:0;align-items:center}.wallet-record image{width:25px;height:25px}.wechat-record{margin-top:15px}.record-amount{position:absolute;top:0;right:0;color:#38434a;font-size:16px;line-height:25px;white-space:nowrap}.record-link{display:flex;align-items:center;justify-content:space-between;width:370px;margin-top:20px;font-size:14px;font-weight:300}.record-link text{font-size:26px;line-height:15px}.detail{position:absolute;top:225px;left:0;width:430px;height:325px;padding:0 25px;box-sizing:border-box}.detail-title{font-size:18px;font-weight:500}.detail-date{float:right;margin-top:3px;font-size:14px}.line{height:1px;margin-top:25px;background:#d9d9d9}.row{display:flex;justify-content:space-between;margin-top:20px;font-size:18px;font-weight:300}.total{margin-top:48px;text-align:right;font-size:16px;font-weight:500}.cancel{float:right;margin-top:35px;padding:5px 10px;border:1px solid #38434a;border-radius:10px;background:#fff;color:#38434a;font-size:18px;font-weight:700;line-height:25px}.traveling-title{position:absolute;top:58px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;line-height:27px}.traveling-order-number{position:absolute;top:110px;left:0;width:430px;height:56px;padding-left:38px;display:flex;align-items:center;background:#edf0f2;color:#38434a;font-size:18px;font-weight:500;line-height:27px}.traveling-map{display:none}.traveling-card{position:absolute;z-index:1;top:166px;left:25px;width:380px;height:479px;border-radius:25px;background:#fff}.traveling-status-row{position:absolute;top:0;left:0;width:100%;height:23px}.traveling-waiting{position:absolute;top:10px;left:15px;width:73px;height:23px;display:flex;align-items:center;color:#285cfc;font-size:12px;font-weight:700;line-height:normal}.waiting-mark{position:relative;width:20px;height:20px;margin-right:5px}.waiting-mark image:first-child{position:absolute;inset:0;width:20px;height:20px}.waiting-dot{position:absolute;top:7px;left:7px;width:6px;height:6px}.traveling-summary{position:absolute;top:20px;left:118px;width:144px;height:124px;text-align:center}.traveling-summary>image:first-child{position:absolute;top:0;left:57px;width:30px;height:30px}.traveling-summary>text:nth-child(2){position:absolute;top:40px;left:0;width:144px;color:#285cfc;font-size:18px;font-style:normal;font-weight:700;white-space:nowrap}.traveling-confirm{position:absolute;top:67px;left:23px;width:97px;height:20px;display:flex;align-items:center;gap:5px;color:#38434a;font-size:12px;font-weight:300;font-style:normal;white-space:nowrap}.traveling-confirm image{width:20px;height:20px}.traveling-car{position:absolute;top:92px;left:56px;width:32px;height:32px}.traveling-info{position:absolute;top:161px;left:0;width:380px;height:325px;overflow:hidden;border-radius:25px}.traveling-tesla{position:absolute;top:21px;left:30px;width:25px;height:25px}.traveling-pickup{position:absolute;top:24px;left:60px;font-size:14px;font-weight:500;white-space:nowrap}.traveling-locations{position:absolute;top:64px;left:36px;width:302px;height:50px;font-size:14px}.traveling-locations view{position:absolute;left:0;width:302px;height:20px}.traveling-locations view:first-child{top:0}.traveling-locations view:last-child{top:30px}.traveling-locations image{position:absolute;top:1px;left:0;width:18px;height:18px}.traveling-locations text{position:absolute;top:0;left:38px;line-height:normal;white-space:nowrap}.traveling-vehicle{position:absolute;top:140px;left:70px;color:#000;font-size:14px;font-weight:300;line-height:normal;white-space:nowrap}.traveling-passenger{position:absolute;top:173.02px;left:33px;width:127px;height:80px;font-size:14px}.traveling-passenger>text{position:absolute;top:0;left:0;line-height:normal;white-space:nowrap}.traveling-passenger>view{position:absolute;height:20px}.traveling-passenger>view:first-of-type{top:30px;left:0;width:117px}.traveling-passenger>view:last-child{top:55px;left:5px;width:122px}.traveling-passenger>view image,.traveling-passenger>view text{position:absolute}.traveling-passenger>view:first-of-type image{top:0;left:0;width:20px;height:20px}.traveling-passenger>view:first-of-type text{top:0;left:30px;line-height:normal;white-space:nowrap}.traveling-passenger>view:last-child image{top:3px;left:0;width:15px;height:15px}.traveling-passenger>view:last-child text{top:0;left:25px;line-height:normal;white-space:nowrap}.traveling-divider{position:absolute;top:162px;left:5px;width:370px;height:1px;overflow:hidden}.traveling-divider image{position:absolute;top:0;left:0;width:370px;height:1px;transform:none;transform-origin:center}.traveling-divider.second{top:263px}.traveling-record{position:absolute;top:284px;left:26.185px;width:327.63px;height:20px;display:flex;align-items:flex-start;justify-content:space-between;font-size:14px;font-weight:350;line-height:normal}.traveling-record image{position:absolute;top:2.04px;left:319px;width:8.63px;height:15px}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
