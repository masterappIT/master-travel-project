<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/wallet/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="title">我的錢包</text>
    </view>

    <view class="balance-card">
      <text class="balance-label">現金餘額</text>
      <text class="balance">HKD${{ wallet.withdrawable.toFixed(2) }}</text>
      <text class="fare-balance">車費餘額：¥{{ wallet.fare.toFixed(2) }}</text>
    </view>

    <view class="actions">
      <view class="action withdraw" @tap="openAmountDialog('withdraw')"><text>提現</text></view>
      <view class="action top-up" @tap="openTopUp"><text>增值</text></view>
    </view>

    <view class="records-link" @tap="showRecords">
      <text>交易紀錄</text>
      <image src="/static/wallet/records.svg" mode="aspectFit" />
    </view>

    <view class="settings" @tap="openSettings">
      <image src="/static/wallet/settings.svg" mode="aspectFit" /><text>設定</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { closeCachedPage, openCachedPage } from '../../utils/navigation'
import { reactive, onMounted } from 'vue'
import { getWalletMe } from '../../services/api'

const { responsiveStyle } = useResponsiveCanvas()

type ActionType = 'withdraw' | 'topUp'
type WalletRecord = { id: number; type: string; amount: number; time: string }
type WalletState = { withdrawable: number; fare: number; records: WalletRecord[] }

const stored = uni.getStorageSync('wallet-state') as Partial<WalletState> | ''
const wallet = reactive<WalletState>({
  withdrawable: Number(stored?.withdrawable) || 0,
  fare: Number(stored?.fare) || 0,
  records: Array.isArray(stored?.records) ? stored.records : []
})

const persist = () => uni.setStorageSync('wallet-state', { ...wallet, records: [...wallet.records] })

const fetchWallet = async () => {
  try {
    const res = await getWalletMe()
    if (res) {
      wallet.fare = res.fareBalance
      wallet.withdrawable = res.cashBalance
      persist()
    }
  } catch (e) {
    console.warn("Could not sync wallet from backend", e)
  }
}

onMounted(() => {
  void fetchWallet()
})
const now = () => {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const openAmountDialog = (type: ActionType) => {
  if (type === 'withdraw') {
    return openCachedPage('/pages/withdraw/withdraw')
  }
  const isTopUp = type === 'topUp'
  uni.showModal({
    title: isTopUp ? '錢包增值' : '餘額提現',
    editable: true,
    placeholderText: '請輸入金額',
    success: ({ confirm, content }) => {
      if (!confirm) return
      const amount = Number(content)
      if (!Number.isFinite(amount) || amount <= 0) {
        uni.showToast({ title: '請輸入有效金額', icon: 'none' })
        return
      }
      if (!isTopUp && amount > wallet.withdrawable) {
        uni.showToast({ title: '可提餘額不足', icon: 'none' })
        return
      }
      wallet.withdrawable += isTopUp ? amount : -amount
      wallet.records.unshift({ id: Date.now(), type: isTopUp ? '增值' : '提現', amount: isTopUp ? amount : -amount, time: now() })
      persist()
      uni.showToast({ title: isTopUp ? '增值成功' : '提現成功', icon: 'success' })
    }
  })
}
const openTopUp = () => openCachedPage('/pages/top-up/top-up')
const showRecords = () => openCachedPage('/pages/transactions/transactions')
const openSettings = () => openCachedPage('/pages/payment-settings/payment-settings')
const goBack = () => closeCachedPage('/pages/trips/trips')
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:50%;left:50%;width:430px;height:932px;overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:translate(-50%,-50%) scale(min(1,calc(100vw / 430px),calc(100vh / 932px)));transform:translate(-50%,-50%) scale(min(1,calc(100vw / 430px),calc(100dvh / 932px)));transform-origin:center}.header{position:absolute;top:0;left:0;width:430px;height:154px;overflow:hidden;border-radius:25px;background:#fff}.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.title{position:absolute;top:56px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500}.balance-card{position:absolute;top:115px;left:15px;width:400px;height:120px;overflow:hidden;border-radius:25px;background:linear-gradient(180deg,#285CFC 113.33%,#758295 213.33%);box-shadow:0 4px 4px rgba(0,0,0,.25);color:#fff}.balance-label{position:absolute;top:14px;left:30px;color:#D9D9D9;font-size:14px;font-weight:350}.balance{position:absolute;top:31px;left:30px;font-size:40px;font-weight:700;line-height:normal}.fare-balance{position:absolute;top:93px;left:30px;font-size:14px;font-weight:500}.actions{position:absolute;top:255px;left:33px;width:364px;height:45px;display:flex;gap:10px}.action{width:177px;height:45px;display:flex;align-items:center;justify-content:center;border-radius:10px;font-size:16px;font-weight:500}.withdraw{background:#fff}.top-up{background:#285CFC;color:#fff}.records-link{position:absolute;top:325px;left:0;width:430px;height:50px;display:flex;align-items:center;background:#fff;box-sizing:border-box;padding-left:30px;font-size:16px;font-weight:350}.records-link image{position:absolute;right:17px;width:84px;height:26px}.settings{position:absolute;bottom:120px;left:187px;width:57px;height:23px;display:flex;align-items:center;gap:5px;font-size:16px;font-weight:700}.settings image{width:20px;height:20px;flex:none}

@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}}
</style>
