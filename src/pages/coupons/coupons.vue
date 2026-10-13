<template>
  <view class="page" :style="responsiveStyle">
    <view class="header"><PageNavBar :title="tx('優惠活動')" @back="goBack" /></view>
    <view class="coupon-content">
      <view class="code-input"><input v-model="couponCode" :disabled="redeeming" :placeholder="tx('輸入優惠代碼')" confirm-type="done" @confirm="applyCode" /><text class="apply" :class="{ disabled: redeeming }" @tap="applyCode">{{ tx(redeeming ? '處理中' : '套用') }}</text></view>
      <view v-if="errorMessage" class="message">{{ tx(errorMessage) }}</view>
      <scroll-view class="coupon-list" scroll-y :show-scrollbar="false">
        <view v-if="loading" class="empty-note">{{ tx('優惠載入中...') }}</view>
        <template v-else>
          <view v-for="promotion in promotions" :key="promotion.id" class="coupon-card" :class="{ 'selected-card': isSelected(promotion) }" @tap="openPromotion(promotion)">
            <text v-if="isSelected(promotion)" class="using-tag">{{ tx('使用中') }}</text>
            <view class="badge">{{ tx(promotionBadge(promotion)) }}<text>{{ tx(promotionDiscount(promotion)) }}</text></view>
            <image class="vehicle" src="/static/coupons/vehicle.svg" mode="aspectFit" />
            <text class="coupon-name">{{ tx(promotion.name) }}</text>
            <text class="coupon-period">{{ tx(promotionPeriod(promotion)) }}</text>
            <view v-if="promotion.couponCode" class="coupon-action use-action" :class="{ selected: isSelected(promotion), disabled: isClaiming(promotion) }" @tap.stop="togglePromotion(promotion)">{{ tx(isSelected(promotion) ? '取消選用' : isClaiming(promotion) ? '處理中' : '選用') }}</view>
            <view v-else class="coupon-action" @tap.stop="openPromotion(promotion)">{{ tx('查看詳情') }}</view>
          </view>
          <view v-if="!promotions.length" class="empty-note" @tap="loadPromotions">{{ tx(loadFailed ? '優惠載入失敗，點擊重試' : '目前沒有可用優惠') }}</view>
          <view v-else class="empty-note">{{ tx('每次行程可選用一張優惠券，於預約時套用') }}</view>
        </template>
      </scroll-view>
    </view>
  </view>
</template>
<script setup lang="ts">
import PageNavBar from '../../components/common/PageNavBar.vue'
import { tx } from '../../i18n'
import { onMounted, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
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
const { formatOriginal } = useCurrency()
const promotionDiscount = (promotion: PublicPromotion) => promotion.discountType === 'PERCENTAGE' ? `-${promotion.discountValue}%` : promotion.discountType === 'TOTAL_PRICE' ? `總價 ${formatOriginal(promotion.discountValue, normalizeCurrency(promotion.currency) || 'RMB', 2)}` : `-${formatOriginal(promotion.discountValue, normalizeCurrency(promotion.currency) || 'RMB', 2)}`
const couponCode = ref('')
// Only problems stay on the page; confirmations are toasts so they do not take room or linger.
const errorMessage = ref('')
const notice = (title: string, icon: 'success' | 'none' = 'none') => uni.showToast({ title, icon })
const promotions = ref<PublicPromotion[]>([])
const loading = ref(false)
const loadFailed = ref(false)
const redeeming = ref(false)
const claimingId = ref('')
const previousPath = getCachedPagePreviousPath('/pages/coupons/coupons')
let promotionRequestId = 0
const loadPromotions = async () => {
  const requestId = ++promotionRequestId
  loading.value = true
  loadFailed.value = false
  errorMessage.value = ''
  try {
    const available = await listPublicPromotions()
    if (requestId !== promotionRequestId) return
    promotions.value = available
    const selectedCode = tripStore.activeDraft.couponCode?.trim().toUpperCase()
    if (selectedCode && !promotions.value.some(item => item.couponCode?.toUpperCase() === selectedCode)) {
      tripStore.setCouponCode()
      notice('優惠已失效，已自動移除')
    } else if (selectedCode) {
      try {
        await redeemPromotionCode(selectedCode)
      } catch (error) {
        tripStore.setCouponCode()
        notice(error instanceof Error ? `${error.message}，已自動移除` : '優惠已失效，已自動移除')
      }
    }
  } catch (error) {
    promotions.value = []
    loadFailed.value = true
    errorMessage.value = error instanceof Error ? error.message : '優惠資料暫時無法載入'
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
    // Choosing a coupon only marks it on this device's trip draft; nothing is issued to the account.
    const replaced = Boolean(tripStore.activeDraft.couponCode && tripStore.activeDraft.couponCode.toUpperCase() !== (result.promotion.couponCode || '').toUpperCase())
    tripStore.setCouponCode(result.promotion.couponCode || undefined)
    couponCode.value = ''
    errorMessage.value = ''
    if (replaced) notice('已改為選用此優惠，每次行程限用一張')
    else notice('已選用此優惠', 'success')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '優惠代碼無法使用'
  } finally {
    redeeming.value = false
    claimingId.value = ''
  }
}
// A code-related problem is out of date as soon as the code is edited.
watch(couponCode, () => { if (!loadFailed.value) errorMessage.value = '' })
const applyCode = () => {
  if (!couponCode.value.trim()) { errorMessage.value = '請先輸入優惠代碼'; return }
  void redeemAndSelect(couponCode.value)
}
const promotionBadge = (promotion: PublicPromotion) => promotion.kind === 'COUPON' ? '現金券' : promotion.kind === 'MEMBER' ? '會員優惠' : '限時優惠'
const promotionPeriod = (promotion: PublicPromotion) => promotion.endsAt ? `有效期：${promotion.endsAt.slice(0, 10).replaceAll('-', '/')}` : promotion.originRegion || promotion.destinationRegion ? `適用於${promotion.originRegion || '指定地區'}至${promotion.destinationRegion || '指定地區'}行程` : '長期有效'
const isSelected = (promotion: PublicPromotion) => Boolean(promotion.couponCode && tripStore.activeDraft.couponCode?.toUpperCase() === promotion.couponCode.toUpperCase())
const isClaiming = (promotion: PublicPromotion) => claimingId.value === promotion.id
const togglePromotion = (promotion: PublicPromotion) => {
  if (!promotion.couponCode || redeeming.value || claimingId.value) return
  if (isSelected(promotion)) {
    tripStore.setCouponCode()
    notice('已取消選用')
    return
  }
  void redeemAndSelect(promotion.couponCode, promotion.id)
}
const openPromotion = (promotion: PublicPromotion) => openCachedPage(`/pages/coupons/detail?id=${encodeURIComponent(promotion.id)}`)
onMounted(() => {
  void loadPromotions()
})
onShow(() => {
  if (!loading.value) void loadPromotions()
})
const goBack = () => closeCachedPage(previousPath || '/pages/trips/trips')
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height,932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale,1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:110px;border-radius:25px;background:#fff}.coupon-content{position:absolute;top:120px;bottom:20px;left:22px;width:385px;overflow:hidden}.code-input{height:50px;border-radius:10px;background:#fff;display:flex;align-items:center;padding:0 15px;box-sizing:border-box}.code-input input{flex:1;border:0;background:transparent;color:#38434A;font-size:16px}.apply{height:50px;margin-right:-15px;padding:0 15px;color:#285CFC;font-size:14px;line-height:50px}.apply.disabled{color:#8B949E}.message{position:absolute;top:52px;left:0;width:100%;padding:6px 15px;box-sizing:border-box;color:#F95C5C;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.coupon-list{position:absolute;top:78px;bottom:0;left:0;width:385px;height:auto}.coupon-card{position:relative;height:142px;margin-bottom:10px;border-radius:10px;background:#fff;overflow:hidden;box-shadow:0 4px 4px rgba(0,0,0,.25)}.coupon-card.selected-card{background:#F7F9FF;box-shadow:0 4px 4px rgba(0,0,0,.25),inset 0 0 0 2px rgba(40,92,252,.28)}.badge{position:absolute;left:0;top:0;width:120px;height:142px;background:#E1C6AA;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#CF6B3B;font-size:16px;font-weight:700;line-height:24px}.badge text{display:block}.vehicle{position:absolute;left:273px;top:21px;width:100px;height:100px}.coupon-name{position:absolute;left:141px;top:51px;font-size:16px;font-weight:500}.coupon-period{position:absolute;left:141px;top:74px;font-size:12px;max-width:175px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.coupon-action{position:absolute;left:141px;top:105px;color:#285CFC;font-size:12px;min-width:52px;height:30px;line-height:30px;text-align:center}.coupon-action.use-action{left:292px;top:98px;width:78px;height:30px;box-sizing:border-box;border:1px solid #285CFC;border-radius:10px;background:#285CFC;color:#fff;font-size:12px;font-weight:500}.coupon-action.use-action::after{position:absolute;top:-8px;right:-8px;bottom:-8px;left:-8px;content:''}.coupon-action.use-action.selected{background:#fff;color:#285CFC}.using-tag{position:absolute;z-index:1;top:0;right:0;padding:0 10px;border-radius:0 10px 0 10px;background:#285CFC;color:#fff;font-size:11px;line-height:20px}.coupon-action.disabled{border-color:#D9DEE5;background:#E9EDF2;color:#8B949E;pointer-events:none}.empty-note{text-align:center;padding:25px 0 35px;color:#8B949E;font-size:12px}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100%);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
