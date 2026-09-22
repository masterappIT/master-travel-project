<template>
  <view class="page" :style="responsiveStyle">
    <view class="header"><image class="back" src="/static/coupons/back.svg" mode="aspectFit" @tap="goBack" /><text class="header-title">我的優惠</text></view>
    <view class="coupon-content">
      <view class="code-input"><input v-model="couponCode" :disabled="redeeming" placeholder="輸入優惠代碼" confirm-type="done" @confirm="applyCode" /><text class="apply" :class="{ disabled: redeeming }" @tap="applyCode">{{ redeeming ? '領取中' : '兌換' }}</text></view>
      <view v-if="message" class="message">{{ message }}</view>
      <scroll-view class="coupon-list" scroll-y :show-scrollbar="false">
        <view v-if="loading" class="empty-note">優惠載入中...</view>
        <template v-else>
          <view v-for="(promotion, index) in promotions" :key="promotion.id" class="coupon-card" :class="{ featured: index === 0 }" @tap="openPromotion(promotion)">
            <view class="badge">{{ promotionBadge(promotion) }}<text>{{ promotionDiscount(promotion) }}</text></view>
            <image class="vehicle" src="/static/coupons/vehicle.svg" mode="aspectFit" />
            <text class="coupon-name">{{ promotion.name }}</text>
            <text class="coupon-period">{{ promotionPeriod(promotion) }}</text>
            <image class="status" :src="isSelected(promotion) ? '/static/coupons/status-active.svg' : '/static/coupons/status-unused.svg'" mode="aspectFit" />
            <view v-if="promotion.couponCode" class="coupon-action" :class="{ 'use-action': !isSelected(promotion), selected: isSelected(promotion) }" @tap.stop="claimPromotion(promotion)">{{ isSelected(promotion) ? '已選用' : '領取' }}</view>
            <view v-else class="coupon-action" @tap.stop="openPromotion(promotion)">查看詳情</view>
          </view>
          <view v-if="!promotions.length" class="empty-note" @tap="loadPromotions">{{ loadFailed ? '優惠載入失敗，點擊重試' : '目前沒有可用優惠' }}</view>
          <view v-else class="empty-note">優惠券可於預約行程時使用</view>
        </template>
      </scroll-view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
// #ifdef H5
import { useH5ResponsiveCanvas } from '../../composables/useH5ResponsiveCanvas'
// #endif
// #ifndef H5
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
// #endif
import { useCurrency, normalizeCurrency } from '../../composables/useCurrency'
import { closeCachedPage, getCachedPagePreviousPath, openCachedPage } from '../../utils/navigation'
import { useTripStore } from '../../stores/trip'
import { listPublicPromotions, redeemPromotionCode, type PublicPromotion } from '../../services/api'
// #ifdef H5
const { responsiveStyle } = useH5ResponsiveCanvas()
// #endif
// #ifndef H5
const { responsiveStyle } = useResponsiveCanvas()
// #endif
const tripStore = useTripStore()
const promotionDiscount = (promotion: PublicPromotion) => promotion.discountType === 'PERCENTAGE' ? `-${promotion.discountValue}%` : promotion.discountType === 'TOTAL_PRICE' ? `總價 ${formatOriginal(promotion.discountValue, normalizeCurrency(promotion.currency) || 'RMB', 2)}` : `-${formatOriginal(promotion.discountValue, normalizeCurrency(promotion.currency) || 'RMB', 2)}`
const couponCode = ref('')
const message = ref('')
const promotions = ref<PublicPromotion[]>([])
const loading = ref(false)
const loadFailed = ref(false)
const redeeming = ref(false)
const claimingId = ref('')
const previousPath = getCachedPagePreviousPath('/pages/coupons/coupons')
const loadPromotions = async () => {
  loading.value = true
  loadFailed.value = false
  try {
    promotions.value = await listPublicPromotions()
  } catch (error) {
    promotions.value = []
    loadFailed.value = true
    message.value = error instanceof Error ? error.message : '優惠資料暫時無法載入'
  } finally {
    loading.value = false
  }
}
const redeemAndSelect = async (code: string, promotionId = '') => {
  if (redeeming.value || claimingId.value) return
  redeeming.value = !promotionId
  claimingId.value = promotionId
  try {
    const result = await redeemPromotionCode(code.trim().toUpperCase())
    const index = promotions.value.findIndex(item => item.id === result.promotion.id)
    promotions.value = index < 0
      ? [result.promotion, ...promotions.value]
      : promotions.value.map(item => item.id === result.promotion.id ? result.promotion : item)
    tripStore.setCouponCode(result.promotion.couponCode || undefined)
    message.value = '優惠已領取並選用'
    couponCode.value = ''
    uni.showToast({ title: '優惠已領取並選用', icon: 'success' })
  } catch (error) {
    message.value = error instanceof Error ? error.message : '優惠代碼兌換失敗'
  } finally {
    redeeming.value = false
    claimingId.value = ''
  }
}
const applyCode = () => {
  if (!couponCode.value.trim()) { message.value = '請先輸入優惠代碼'; return }
  void redeemAndSelect(couponCode.value)
}
const promotionBadge = (promotion: PublicPromotion) => promotion.kind === 'COUPON' ? '現金券' : promotion.kind === 'MEMBER' ? '會員優惠' : '限時優惠'
const promotionPeriod = (promotion: PublicPromotion) => promotion.endsAt ? `有效期：${promotion.endsAt.slice(0, 10).replaceAll('-', '/')}` : promotion.originRegion || promotion.destinationRegion ? `適用於${promotion.originRegion || '指定地區'}至${promotion.destinationRegion || '指定地區'}行程` : '長期有效'
const isSelected = (promotion: PublicPromotion) => Boolean(promotion.couponCode && tripStore.activeDraft.couponCode?.toUpperCase() === promotion.couponCode.toUpperCase())
const claimPromotion = (promotion: PublicPromotion) => {
  if (!promotion.couponCode || isSelected(promotion)) return
  void redeemAndSelect(promotion.couponCode, promotion.id)
}
const openPromotion = (promotion: PublicPromotion) => openCachedPage(`/pages/coupons/detail?id=${encodeURIComponent(promotion.id)}`)
onShow(loadPromotions)
const goBack = () => closeCachedPage(previousPath || '/pages/trips/trips')
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height,932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale,1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:110px;border-radius:25px;background:#fff}.back{position:absolute;left:33px;top:60px;width:38px;height:38px}.header-title{position:absolute;top:66px;left:calc(50% - 36px);font-size:18px;font-weight:500;line-height:normal}.coupon-content{position:absolute;top:120px;bottom:20px;left:22px;width:385px;overflow:hidden}.code-input{height:50px;border-radius:10px;background:#fff;display:flex;align-items:center;padding:0 15px;box-sizing:border-box}.code-input input{flex:1;border:0;background:transparent;color:#38434A;font-size:16px}.apply{color:#285CFC;font-size:14px}.apply.disabled{color:#8B949E}.message{position:absolute;top:52px;left:0;width:100%;padding:6px 15px;box-sizing:border-box;color:#285CFC;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.coupon-list{position:absolute;top:78px;bottom:0;left:0;width:385px;height:auto}.coupon-card{position:relative;height:142px;margin-bottom:10px;border-radius:10px;background:#fff;overflow:hidden;box-shadow:0 4px 4px rgba(0,0,0,.25)}.badge{position:absolute;left:0;top:0;width:120px;height:142px;background:#E1C6AA;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#CF6B3B;font-size:16px;font-weight:700;line-height:24px}.badge text{display:block}.vehicle{position:absolute;left:273px;top:21px;width:100px;height:100px}.coupon-name{position:absolute;left:141px;top:51px;font-size:16px;font-weight:500}.coupon-period{position:absolute;left:141px;top:74px;font-size:12px;max-width:175px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.status{position:absolute;left:353px;top:111px;width:20px;height:20px}.coupon-action{position:absolute;left:141px;top:105px;color:#285CFC;font-size:12px}.coupon-action.use-action{left:292px;top:98px;width:78px;height:30px;box-sizing:border-box;border:1px solid #1effaa;border-radius:15px;color:#1aa778;font-size:12px;line-height:28px;text-align:center}.coupon-action.selected{color:#8B949E}.empty-note{text-align:center;padding:25px 0 35px;color:#8B949E;font-size:12px}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100%);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
