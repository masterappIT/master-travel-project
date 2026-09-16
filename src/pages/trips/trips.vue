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
import { onUnmounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { isAuthenticated, getAuthUser, subscribeAuthUser } from '../../utils/auth'
import ProfileHeader from '../../components/profile/ProfileHeader.vue'
import UpgradeCard from '../../components/profile/UpgradeCard.vue'
import WalletCard from '../../components/profile/WalletCard.vue'
import OrdersCard from '../../components/profile/OrdersCard.vue'
import CommonActions from '../../components/profile/CommonActions.vue'
import ProfileBottomNav from '../../components/profile/ProfileBottomNav.vue'
import { getClientProfile, listClientTrips } from '../../services/api'

const totalMessages = 4
const unreadCount = ref(totalMessages)
const avatarUrl = ref('')
const displayName = ref('John')
const walletBalance = ref(0)
const authenticated = ref(false)
let profilePollTimer: ReturnType<typeof setInterval> | undefined
const avatarWithCacheBust = (url: string | null | undefined) => {
  if (!url) return ''
  return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(url)}`
}

const refreshProfile = async () => {
  authenticated.value = isAuthenticated()
  const profile = uni.getStorageSync('account-profile')
  const authUser = getAuthUser()
  avatarUrl.value = profile?.avatarUrl || authUser?.avatarUrl || ''
  displayName.value = profile?.displayName || profile?.name || authUser?.displayName || authUser?.name || 'John'
  if (authenticated.value) {
    try {
      const remote = await getClientProfile()
      displayName.value = remote.displayName || remote.name || displayName.value
      avatarUrl.value = avatarWithCacheBust(remote.avatarUrl)
      uni.setStorageSync('account-profile', { ...profile, displayName: displayName.value, avatarUrl: remote.avatarUrl || '' })
      uni.setStorageSync('client-auth-user', remote)
    } catch { /* keep cached profile when offline */ }
  }
  const saved = uni.getStorageSync('read-message-types')
  const readCount = Array.isArray(saved) ? new Set(saved).size : 0
  unreadCount.value = Math.max(0, totalMessages - readCount)
  const wallet = uni.getStorageSync('wallet-state')
  walletBalance.value = Number(wallet?.withdrawable) || 0
}

void refreshProfile()
const unsubscribeAuthUser = subscribeAuthUser((user) => {
  displayName.value = user.displayName || user.name || displayName.value
  avatarUrl.value = user.avatarUrl || ''
  uni.setStorageSync('client-auth-user', user)
})
onUnmounted(unsubscribeAuthUser)

onShow(() => {
  void refreshProfile()
  if (profilePollTimer) clearInterval(profilePollTimer)
  if (isAuthenticated()) profilePollTimer = setInterval(() => { void refreshProfile() }, 15000)
})

onUnmounted(() => {
  if (profilePollTimer) clearInterval(profilePollTimer)
})

const goHome = () => openCachedPage('/pages/index/index')
const openCustomerService = () => openCachedPage('/pages/support/chat')
const openMessages = () => openCachedPage('/pages/messages/messages')
const openSettings = () => openCachedPage('/pages/settings/settings')
const openAccount = () => openCachedPage('/pages/account/account')
const openLogin = () => uni.reLaunch({ url: '/pages/login/login', animationType: 'none', animationDuration: 0 })
const openMembership = () => openCachedPage('/pages/membership/membership')
const handleOrderAction = async (name: string) => {
  if (name === '全部訂單') {
    setOrderReturnTarget('orders')
    return openCachedPage('/pages/orders/orders')
  }
  if (name === '待出行') {
    setOrderReturnTarget('profile')
    try {
      const trips = await listClientTrips()
      const traveling = trips.find((trip) => trip.status === 'CONFIRMED' && trip.executionPhase !== 'IN_PROGRESS')
      if (!traveling) return uni.showToast({ title: '目前沒有待出行訂單', icon: 'none' })
      return openCachedPage(`/pages/orders/pending-detail?from=profile&id=${encodeURIComponent(traveling.id)}`)
    } catch (error) {
      return uni.showToast({ title: error instanceof Error ? error.message : '訂單載入失敗', icon: 'none' })
    }
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

.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);min-height:0;margin:0;overflow:hidden;background:#F0F2F5;border-radius:35px;box-sizing:border-box;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left center}.profile-content{position:absolute;inset:0;width:430px;height:932px}.profile-canvas{position:relative;width:430px;height:932px}.upgrade-position,.wallet-position,.orders-position,.common-position{position:absolute;left:15px;width:400px}.upgrade-position{top:217px}.wallet-position{top:292px}.orders-position{top:calc(50% - 38.5px)}.common-position{top:546px}

@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.profile-content{bottom:102px;height:auto}.profile-canvas{height:max(830px,calc(var(--mobile-height,932px) - 102px))}.orders-position{top:427.5px}.common-position{top:auto;bottom:19px}}
</style>
