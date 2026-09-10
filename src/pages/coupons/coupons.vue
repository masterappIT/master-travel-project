<template>
  <view class="page" :style="responsiveStyle">
    <view class="header"><image class="back" src="/static/coupons/back.svg" mode="aspectFit" @tap="goBack" /><text class="header-title">我的優惠</text></view>
    <view class="coupon-content">
      <view class="code-input"><input v-model="couponCode" placeholder="輸入優惠代碼" confirm-type="done" /><text class="apply" @tap="applyCode">兌換</text></view>
      <view v-if="message" class="message">{{ message }}</view>
      <view class="coupon-card featured"><view class="badge">限時優惠<text>- ¥100</text></view><image class="vehicle" src="/static/coupons/vehicle.svg" mode="aspectFit" /><text class="coupon-name">高級商務車</text><text class="coupon-period">有效期：2026/03/01 - 2026/03/31</text><image class="status" src="/static/coupons/status-active.svg" mode="aspectFit" /><text class="coupon-action">立即使用</text></view>
      <view class="coupon-card"><view class="badge">現金券 <text>¥200</text></view><image class="vehicle" src="/static/coupons/vehicle.svg" mode="aspectFit" /><text class="coupon-name">跨境行程現金券</text><text class="coupon-period">適用於香港、澳門至大灣區行程</text><image class="status" src="/static/coupons/status-unused.svg" mode="aspectFit" /><text class="coupon-action">查看詳情</text></view>
      <view v-for="(promotion, index) in promotions" :key="promotion.id" class="coupon-card" :class="{ featured: index === 0 }" @tap="usePromotion(promotion)"><view class="badge">{{ promotionBadge(promotion) }}<text>{{ promotionDiscount(promotion) }}</text></view><image class="vehicle" src="/static/coupons/vehicle.svg" mode="aspectFit" /><text class="coupon-name">{{ promotion.name }}</text><text class="coupon-period">{{ promotionPeriod(promotion) }}</text><image class="status" src="/static/coupons/status-unused.svg" mode="aspectFit" /><text class="coupon-action">立即使用</text></view>
      <view class="empty-note">優惠券可於預約行程時使用</view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { closeCachedPage, openCachedPage } from '../../utils/navigation'
import { useTripStore } from '../../stores/trip'
import { listPublicPromotions, redeemPromotionCode, type PublicPromotion } from '../../services/api'
const { responsiveStyle } = useResponsiveCanvas()
const tripStore = useTripStore()
const couponCode = ref('')
const message = ref('')
const promotions = ref<PublicPromotion[]>([])
const loadPromotions = async () => {
  try { promotions.value = await listPublicPromotions() } catch (error) { message.value = error instanceof Error ? error.message : '優惠資料暫時無法載入' }
}
const applyCode = async () => {
  if (!couponCode.value.trim()) { message.value = '請先輸入優惠代碼'; return }
  try {
    const result = await redeemPromotionCode(couponCode.value)
    if (!promotions.value.some(item => item.id === result.promotion.id)) promotions.value = [result.promotion, ...promotions.value]
    tripStore.setCouponCode(result.promotion.couponCode || undefined)
    message.value = result.message
    couponCode.value = ''
  } catch (error) { message.value = error instanceof Error ? error.message : '優惠代碼兌換失敗' }
}
const promotionBadge = (promotion: PublicPromotion) => promotion.kind === 'COUPON' ? '現金券' : promotion.kind === 'MEMBER' ? '會員優惠' : '限時優惠'
const promotionDiscount = (promotion: PublicPromotion) => promotion.discountType === 'PERCENTAGE' ? `-${promotion.discountValue}%` : promotion.discountType === 'TOTAL_PRICE' ? `總價 ${promotion.currency}${promotion.discountValue}` : `-${promotion.currency}${promotion.discountValue}`
const promotionPeriod = (promotion: PublicPromotion) => promotion.endsAt ? `有效期：${promotion.endsAt.slice(0, 10).replaceAll('-', '/')}` : promotion.originRegion || promotion.destinationRegion ? `適用於${promotion.originRegion || '指定地區'}至${promotion.destinationRegion || '指定地區'}行程` : '長期有效'
const usePromotion = (promotion: PublicPromotion) => {
  if (!promotion.couponCode) {
    message.value = '此優惠會在符合地區、時段或會員條件時自動套用'
    return
  }
  tripStore.setCouponCode(promotion.couponCode)
  uni.showToast({ title: '優惠已選用', icon: 'success' })
  openCachedPage('/pages/vehicles/select')
}
onShow(loadPromotions)
const goBack = () => closeCachedPage('/pages/trips/trips')
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:50%;left:50%;width:430px;height:932px;overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:translate(-50%,-50%) scale(min(1,calc(100vw / 430px),calc(100dvh / 932px)));transform-origin:center center}.header{position:absolute;top:0;left:0;width:430px;height:110px;border-radius:25px;background:#fff}.back{position:absolute;left:33px;top:60px;width:38px;height:38px}.header-title{position:absolute;top:66px;left:calc(50% - 36px);font-size:18px;font-weight:500;line-height:normal}.coupon-content{position:absolute;top:120px;left:22px;width:385px}.code-input{height:50px;border-radius:10px;background:#fff;display:flex;align-items:center;padding:0 15px;box-sizing:border-box}.code-input input{flex:1;border:0;background:transparent;color:#38434A;font-size:16px}.apply{color:#285CFC;font-size:14px}.message{padding:8px 15px;color:#285CFC;font-size:12px}.coupon-card{position:relative;height:142px;margin-top:10px;border-radius:10px;background:#fff;overflow:hidden;box-shadow:0 4px 4px rgba(0,0,0,.25)}.badge{position:absolute;left:0;top:0;width:120px;height:142px;background:#E1C6AA;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#CF6B3B;font-size:16px;font-weight:700;line-height:24px}.badge text{display:block}.vehicle{position:absolute;left:273px;top:21px;width:100px;height:100px}.coupon-name{position:absolute;left:141px;top:51px;font-size:16px;font-weight:500}.coupon-period{position:absolute;left:141px;top:74px;font-size:12px;max-width:175px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.status{position:absolute;left:353px;top:111px;width:20px;height:20px}.coupon-action{position:absolute;left:141px;top:105px;color:#285CFC;font-size:12px}.empty-note{text-align:center;margin-top:25px;color:#8B949E;font-size:12px}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
