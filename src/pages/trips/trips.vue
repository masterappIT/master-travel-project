<template>
  <view class="page" :style="responsiveStyle">
    <view class="profile-content">
      <view class="profile-canvas">
        <ProfileHeader
          :avatar-url="avatarUrl"
          :display-name="displayName"
          :authenticated="authenticated"
          :unread-count="unreadCount"
          @notifications="openMessages"
          @settings="openSettings"
          @avatar="openAccount"
          @login="openLogin"
        />
        <template v-if="authenticated">
          <view class="upgrade-position"><UpgradeCard @tap="openMembership" /></view>
          <view class="wallet-position"><WalletCard :balance="walletBalance" @select="handleWalletAction" /></view>
          <view class="orders-position"><OrdersCard @select="handleOrderAction" /></view>
          <view class="common-position"><CommonActions @select="handleCommonAction" /></view>
        </template>
      </view>
    </view>
    <ProfileBottomNav @home="goHome" @service="openCustomerService" />
  </view>
</template>

<script setup lang="ts">
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { openCachedPage, setOrderReturnTarget } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { isAuthenticated } from '../../utils/auth'
import ProfileHeader from '../../components/profile/ProfileHeader.vue'
import UpgradeCard from '../../components/profile/UpgradeCard.vue'
import WalletCard from '../../components/profile/WalletCard.vue'
import OrdersCard from '../../components/profile/OrdersCard.vue'
import CommonActions from '../../components/profile/CommonActions.vue'
import ProfileBottomNav from '../../components/profile/ProfileBottomNav.vue'

const totalMessages = 4
const unreadCount = ref(totalMessages)
const avatarUrl = ref('')
const displayName = ref('John')
const walletBalance = ref(0)
const authenticated = ref(false)

onShow(() => {
  authenticated.value = isAuthenticated()
  const profile = uni.getStorageSync('account-profile')
  avatarUrl.value = profile?.avatarUrl || ''
  displayName.value = profile?.displayName || 'John'
  const saved = uni.getStorageSync('read-message-types')
  const readCount = Array.isArray(saved) ? new Set(saved).size : 0
  unreadCount.value = Math.max(0, totalMessages - readCount)
  const wallet = uni.getStorageSync('wallet-state')
  walletBalance.value = Number(wallet?.withdrawable) || 0
})

const goHome = () => openCachedPage('/pages/index/index')
const openCustomerService = () => openCachedPage('/pages/support/chat')
const openMessages = () => openCachedPage('/pages/messages/messages')
const openSettings = () => openCachedPage('/pages/settings/settings')
const openAccount = () => openCachedPage('/pages/account/account')
const openLogin = () => uni.reLaunch({ url: '/pages/login/login', animationType: 'none', animationDuration: 0 })
const openMembership = () => openCachedPage('/pages/membership/membership')
const handleOrderAction = (name: string) => {
  if (name === '全部訂單') {
    setOrderReturnTarget('orders')
    return openCachedPage('/pages/orders/orders')
  }
  if (name === '待出行') {
    setOrderReturnTarget('profile')
    return openCachedPage('/pages/orders/detail?status=traveling&from=profile')
  }
  comingSoon(name)
}
const handleWalletAction = (name: string) => {
  if (name === '里程') return openCachedPage('/pages/mileage/mileage')
   if (name === '優惠券') return openCachedPage('/pages/coupons/coupons')
  if (name === '錢包' || name === '錢包詳細' || name === '餘額') return openCachedPage('/pages/wallet/wallet')
  comingSoon(name)
}
const handleCommonAction = (name: string) => {
  if (name === '常用資料') return openCachedPage('/pages/common-data/common-data')
  if (name === '我的銀行卡') return openCachedPage('/pages/bank-card/list')
  if (name === '邀請好友') return openCachedPage('/pages/invite/invite')
  if (name === '我的投訴') return openCachedPage('/pages/complaints/complaints')
  if (name === '聯繫客服') return openCustomerService()
  comingSoon(name)
}
const comingSoon = (name: string) => uni.showToast({ title: `${name}功能開發中`, icon: 'none' })
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none;touch-action:pan-y}

.page{position:fixed;top:50%;left:50%;width:430px;height:932px;min-height:0;margin:0;overflow:hidden;background:#F0F2F5;border-radius:35px;box-sizing:border-box;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:translate(-50%,-50%) scale(min(1,calc(100vw / 430px),calc(100dvh / 932px)));transform-origin:center center}.profile-content{position:absolute;inset:0;width:430px;height:932px}.profile-canvas{position:relative;width:430px;height:932px}.upgrade-position,.wallet-position,.orders-position,.common-position{position:absolute;left:15px;width:400px}.upgrade-position{top:217px}.wallet-position{top:292px}.orders-position{top:calc(50% - 38.5px)}.common-position{top:546px}

@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.profile-content{bottom:102px;height:auto}.profile-canvas{height:max(830px,calc(var(--mobile-height,932px) - 102px))}.orders-position{top:427.5px}.common-position{top:auto;bottom:19px}}
</style>
