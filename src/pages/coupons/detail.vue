<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/coupons/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="header-title">優惠詳情</text>
    </view>
    <view v-if="loading" class="state">優惠載入中...</view>
    <view v-else-if="!promotion" class="state" @tap="loadPromotion">{{ message || '優惠不存在，點擊重試' }}</view>
    <view v-else class="detail-content">
      <view class="coupon-card">
        <view class="badge">{{ promotionBadge }}<text>{{ promotionDiscount }}</text></view>
        <image class="vehicle" src="/static/coupons/vehicle.svg" mode="aspectFit" />
        <text class="coupon-name">{{ promotion.name }}</text>
        <text class="coupon-period">{{ promotionPeriod }}</text>
        <image class="status" :src="selected ? '/static/coupons/status-active.svg' : '/static/coupons/status-unused.svg'" mode="aspectFit" />
      </view>
      <view class="detail-panel">
        <view class="detail-row"><text class="label">優惠類型</text><text>{{ promotionBadge }}</text></view>
        <view class="detail-row"><text class="label">優惠內容</text><text>{{ promotionDiscount }}</text></view>
        <view class="detail-row"><text class="label">使用期限</text><text>{{ promotionPeriod }}</text></view>
        <view class="detail-row"><text class="label">最低消費</text><text>{{ minimumSpend }}</text></view>
        <view class="detail-row"><text class="label">適用行程</text><text>{{ applicableRoute }}</text></view>
        <view class="detail-row"><text class="label">疊加規則</text><text>{{ stackingRule }}</text></view>
      </view>
      <text class="hint">實際優惠以行程報價結果為準</text>
      <view v-if="promotion.couponCode" class="primary-action" :class="{ disabled: selected || claiming }" @tap="claimPromotion">{{ selected ? '已選用' : claiming ? '領取中' : '領取並使用' }}</view>
      <view v-else class="auto-note">符合使用條件時將自動套用</view>
      <text v-if="message" class="message">{{ message }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
// #ifdef H5
import { useH5ResponsiveCanvas } from '../../composables/useH5ResponsiveCanvas'
// #endif
// #ifndef H5
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
// #endif
import { useCurrency, normalizeCurrency } from '../../composables/useCurrency'
import { closeCachedPage, getCachedPageOrderQuery } from '../../utils/navigation'
import { useTripStore } from '../../stores/trip'
import { listPublicPromotions, redeemPromotionCode, type PublicPromotion } from '../../services/api'

// #ifdef H5
const { responsiveStyle } = useH5ResponsiveCanvas()
// #endif
// #ifndef H5
const { responsiveStyle } = useResponsiveCanvas()
// #endif
const { formatOriginal } = useCurrency()
const tripStore = useTripStore()
const promotion = ref<PublicPromotion | null>(null)
const loading = ref(false)
const claiming = ref(false)
const message = ref('')
const promotionId = ref(getCachedPageOrderQuery().id || '')
const promotionBadge = computed(() => promotion.value?.kind === 'COUPON' ? '現金券' : promotion.value?.kind === 'MEMBER' ? '會員優惠' : '限時優惠')
const promotionDiscount = computed(() => {
  const item = promotion.value
  if (!item) return ''
  if (item.discountType === 'PERCENTAGE') return `-${item.discountValue}%`
  const amount = formatOriginal(item.discountValue, normalizeCurrency(item.currency) || 'RMB', 2)
  return item.discountType === 'TOTAL_PRICE' ? `總價 ${amount}` : `-${amount}`
})
const promotionPeriod = computed(() => {
  const item = promotion.value
  if (!item) return ''
  if (item.startsAt && item.endsAt) return `${item.startsAt.slice(0, 10).replaceAll('-', '/')} - ${item.endsAt.slice(0, 10).replaceAll('-', '/')}`
  if (item.endsAt) return `有效期至 ${item.endsAt.slice(0, 10).replaceAll('-', '/')}`
  if (item.startsAt) return `${item.startsAt.slice(0, 10).replaceAll('-', '/')} 起有效`
  return '長期有效'
})
const minimumSpend = computed(() => {
  const item = promotion.value
  if (!item?.minimumSpend) return '無最低消費'
  return formatOriginal(item.minimumSpend, normalizeCurrency(item.currency) || 'RMB', 2)
})
const applicableRoute = computed(() => {
  const item = promotion.value
  if (!item?.originRegion && !item?.destinationRegion) return '所有符合條件的行程'
  return `${item.originRegion || '指定地區'} 至 ${item.destinationRegion || '指定地區'}`
})
const stackingRule = computed(() => promotion.value?.stackingMode === 'ALL' ? '可與其他優惠同時使用' : promotion.value?.stackingMode === 'PERCENTAGE_AND_VOUCHER' ? '可與指定優惠同時使用' : '不可與其他優惠同時使用')
const selected = computed(() => Boolean(promotion.value?.couponCode && tripStore.activeDraft.couponCode?.toUpperCase() === promotion.value.couponCode.toUpperCase()))
const loadPromotion = async () => {
  loading.value = true
  message.value = ''
  try {
    promotion.value = (await listPublicPromotions()).find(item => item.id === promotionId.value) || null
    if (!promotion.value) message.value = '優惠不存在或已結束'
  } catch (error) {
    promotion.value = null
    message.value = error instanceof Error ? error.message : '優惠資料暫時無法載入'
  } finally {
    loading.value = false
  }
}
const claimPromotion = async () => {
  const code = promotion.value?.couponCode
  if (!code || selected.value || claiming.value) return
  claiming.value = true
  try {
    const result = await redeemPromotionCode(code)
    promotion.value = result.promotion
    tripStore.setCouponCode(result.promotion.couponCode || undefined)
    message.value = '優惠已領取並選用'
    uni.showToast({ title: '優惠已領取並選用', icon: 'success' })
  } catch (error) {
    message.value = error instanceof Error ? error.message : '優惠領取失敗'
  } finally {
    claiming.value = false
  }
}
onLoad((options) => {
  if (typeof options?.id === 'string') promotionId.value = options.id
})
onShow(loadPromotion)
const goBack = () => closeCachedPage('/pages/coupons/coupons')
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height,932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale,1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:110px;border-radius:25px;background:#fff}.back{position:absolute;left:33px;top:60px;width:38px;height:38px}.header-title{position:absolute;top:66px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500}.state{position:absolute;top:160px;left:22px;width:385px;text-align:center;color:#8B949E;font-size:13px}.detail-content{position:absolute;top:130px;left:22px;width:385px}.coupon-card{position:relative;height:142px;border-radius:10px;background:#fff;overflow:hidden;box-shadow:0 4px 4px rgba(0,0,0,.25)}.badge{position:absolute;left:0;top:0;width:120px;height:142px;background:#E1C6AA;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#CF6B3B;font-size:16px;font-weight:700;line-height:24px}.badge text{display:block}.vehicle{position:absolute;left:273px;top:21px;width:100px;height:100px}.coupon-name{position:absolute;left:141px;top:51px;font-size:16px;font-weight:500}.coupon-period{position:absolute;left:141px;top:74px;max-width:190px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.status{position:absolute;left:353px;top:111px;width:20px;height:20px}.detail-panel{margin-top:18px;padding:8px 18px;border-radius:10px;background:#fff;box-shadow:0 4px 4px rgba(0,0,0,.12)}.detail-row{min-height:48px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid #EEF0F3;font-size:13px;text-align:right}.detail-row:last-child{border-bottom:0}.label{flex:none;color:#8B949E}.hint{display:block;margin-top:14px;color:#8B949E;font-size:12px;text-align:center}.primary-action{height:48px;margin-top:20px;border-radius:24px;background:#285CFC;color:#fff;font-size:16px;line-height:48px;text-align:center}.primary-action.disabled{background:#AEB6C2}.auto-note{height:48px;margin-top:20px;border-radius:24px;background:#fff;color:#8B949E;font-size:14px;line-height:48px;text-align:center}.message{display:block;margin-top:12px;color:#285CFC;font-size:12px;text-align:center}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100%);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
