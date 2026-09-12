<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/wallet/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="title">領取/查詢</text>
    </view>

    <template v-if="pendingVoucher">
      <view class="confirm-voucher-card">
        <view class="voucher-gradient" />
        <image class="wave wave-back" src="/static/voucher/wave-back.svg" mode="scaleToFill" />
        <image class="wave wave-front" src="/static/voucher/wave-front.svg" mode="scaleToFill" />
        <view class="voucher-overlay" />
        <view class="voucher-amount"><text class="currency">¥ </text><text class="amount">{{ pendingVoucher.amount }}</text></view>
        <image class="voucher-mark" src="/static/voucher/voucher-mark.svg" mode="aspectFit" />
        <image class="voucher-arrow" src="/static/voucher/voucher-arrow.svg" mode="aspectFit" />
        <text class="voucher-expiry">有效期：{{ pendingVoucher.expiry }}</text>
      </view>

      <view class="claim-details">
        <text class="detail-serial">序號： {{ formatCode(pendingVoucher.serial) }}</text>
        <image class="claim-decoration" src="/static/voucher/claim-decoration.svg" mode="aspectFit" />
        <view class="mask-line mask-long" />
        <view class="mask-line mask-medium" />
        <view class="mask-line mask-short" />
        <image class="claim-lock" src="/static/voucher/claim-lock.svg" mode="aspectFit" />
        <text class="detail-code">代碼： {{ formatCode(pendingVoucher.code) }}</text>
        <text class="detail-password">密碼： {{ pendingVoucher.password }}</text>
      </view>

      <view class="confirm-actions">
        <view class="action cancel" @tap="cancelClaim"><text>取消</text></view>
        <view class="action claim" @tap="confirmClaim"><text>領取</text></view>
      </view>
    </template>

    <template v-else>
      <view class="form-card">
        <input v-model="form.serial" class="field" type="number" disabled />
        <input v-model="form.code" class="field" type="number" disabled />
        <input v-model="form.password" class="field" type="number" password disabled />
      </view>

      <view class="actions">
        <view class="action query" @tap="queryVoucher"><text>查詢</text></view>
        <view class="action claim" @tap="claimVoucher"><text>領取</text></view>
      </view>
      <view v-if="queriedVoucher" class="result-section">
        <text class="result-title">查詢結果：</text>
        <view class="voucher-card">
          <view class="voucher-gradient" />
          <image class="wave wave-back" src="/static/voucher/wave-back.svg" mode="scaleToFill" />
          <image class="wave wave-front" src="/static/voucher/wave-front.svg" mode="scaleToFill" />
          <view class="voucher-overlay" />
          <view class="voucher-amount"><text class="currency">¥ </text><text class="amount">{{ queriedVoucher.amount }}</text></view>
          <image class="voucher-mark" src="/static/voucher/voucher-mark.svg" mode="aspectFit" />
          <image class="voucher-arrow" src="/static/voucher/voucher-arrow.svg" mode="aspectFit" />
          <text class="voucher-code">代碼：{{ formatCode(queriedVoucher.code) }}</text>
          <text class="voucher-expiry">有效期：{{ queriedVoucher.expiry }}</text>
        </view>
      </view>
    </template>

    <view v-if="claimedVoucher" class="success-layer">
      <view class="success-mask" />
      <view class="success-dialog">
        <text class="success-message">成功領取 ¥{{ claimedVoucher.amount.toFixed(2) }}</text>
        <image class="success-icon" src="/static/voucher/success-icon.svg" mode="aspectFit" />
        <view class="success-button" @tap="finishClaim"><text>完成</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { closeCachedPage, openCachedPage } from '../../utils/navigation'

type WalletRecord = { id: number; type: string; amount: number; time: string }
type WalletState = { withdrawable: number; fare: number; records: WalletRecord[] }
type Voucher = { serial: string; code: string; password: string; amount: number; claimed: boolean; expiry: string }

const { responsiveStyle } = useResponsiveCanvas()
const form = reactive({ serial: '202609030001', code: '800800800800', password: '123456' })
const queriedVoucher = ref<Voucher | null>(null)
const pendingVoucher = ref<Voucher | null>(null)
const claimedVoucher = ref<Voucher | null>(null)
const demoVouchers: Voucher[] = [
  { serial: '202609030001', code: '800800800800', password: '123456', amount: 800, claimed: false, expiry: '2027年09月03日' },
  { serial: '202609030002', code: '500500500500', password: '654321', amount: 500, claimed: false, expiry: '2027年09月03日' }
]

const storedVouchers = uni.getStorageSync('fare-vouchers') as Voucher[] | ''
const vouchers = reactive<Voucher[]>(
  (Array.isArray(storedVouchers) ? storedVouchers : demoVouchers).map((voucher) => ({
    ...voucher,
    expiry: voucher.expiry || '2027年09月03日'
  }))
)
const persistVouchers = () => uni.setStorageSync('fare-vouchers', vouchers.map((voucher) => ({ ...voucher })))
const normalize = (value: string) => String(value || '').replace(/\D/g, '')
const formatCode = (code: string) => code.replace(/(\d{4})(?=\d)/g, '$1-')
const queryVoucher = () => {
  const serial = normalize(form.serial)
  if (!serial) {
    queriedVoucher.value = null
    uni.showToast({ title: '請輸入序號', icon: 'none' })
    return
  }
  const voucher = vouchers.find((item) => item.serial === serial)
  queriedVoucher.value = voucher || null
  if (!voucher) uni.showToast({ title: '找不到此序號', icon: 'none' })
}
const claimVoucher = () => {
  const code = normalize(form.code)
  const password = normalize(form.password)
  if (code.length !== 12 || password.length !== 6) {
    uni.showToast({ title: '請輸入12位代碼及6位密碼', icon: 'none' })
    return
  }
  const voucher = vouchers.find((item) => item.code === code && item.password === password)
  if (!voucher) {
    uni.showToast({ title: '代碼或密碼不正確', icon: 'none' })
    return
  }
  if (voucher.claimed) {
    uni.showToast({ title: '此代金券已領取', icon: 'none' })
    return
  }
  pendingVoucher.value = voucher
  queriedVoucher.value = null
}
const cancelClaim = () => {
  pendingVoucher.value = null
}
const confirmClaim = () => {
  const voucher = pendingVoucher.value
  if (!voucher || voucher.claimed) {
    pendingVoucher.value = null
    uni.showToast({ title: '此代金券已領取', icon: 'none' })
    return
  }
  const storedWallet = uni.getStorageSync('wallet-state') as Partial<WalletState> | ''
  const wallet: WalletState = {
    withdrawable: Number(storedWallet?.withdrawable) || 0,
    fare: Number(storedWallet?.fare) || 0,
    records: Array.isArray(storedWallet?.records) ? storedWallet.records : []
  }
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const time = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  wallet.fare += voucher.amount
  wallet.records.unshift({ id: Date.now(), type: '代金券領取', amount: voucher.amount, time })
  voucher.claimed = true
  uni.setStorageSync('wallet-state', wallet)
  persistVouchers()
  claimedVoucher.value = voucher
}
const finishClaim = () => {
  claimedVoucher.value = null
  pendingVoucher.value = null
  openCachedPage('/pages/wallet/wallet')
}
const goBack = () => {
  if (claimedVoucher.value) {
    finishClaim()
    return
  }
  if (pendingVoucher.value) {
    cancelClaim()
    return
  }
  closeCachedPage('/pages/top-up/top-up')
}
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:110px;overflow:hidden;border-radius:25px;background:#fff}.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.title{position:absolute;top:56px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500}.form-card{position:absolute;top:130px;left:15px;width:400px;height:150px;overflow:hidden;border-radius:10px;background:#fff}.field{width:400px;height:50px;padding:0 20px;border:0;border-bottom:1px solid #D9D9D9;box-sizing:border-box;color:#38434A;font-size:15px;font-weight:500;line-height:50px}.field:last-child{border-bottom:0}.placeholder{color:rgba(56,67,74,.5)}.actions{position:absolute;top:300px;left:28px;display:flex;gap:20px}.action{width:177px;height:45px;display:flex;align-items:center;justify-content:center;border-radius:10px;font-size:16px;font-weight:500}.query{background:#FECF62}.claim{background:#285CFC;color:#fff}.cancel{background:#D9D9D9}.result-section{position:absolute;top:421px;left:15px;width:400px}.result-title{display:block;margin:0 0 16px 13px;color:#F95C5C;font-size:16px;font-weight:700}.voucher-card,.confirm-voucher-card{position:relative;width:400px;height:240px;overflow:hidden;border-radius:30px;background:#285CFC;box-shadow:0 4px 10px rgba(0,0,0,.25)}.confirm-voucher-card{position:absolute;top:130px;left:15px}.voucher-gradient{position:absolute;inset:0;background:linear-gradient(270deg,#60A6C9 0%,#285CFC 100%)}.wave{position:absolute;bottom:0;left:0;width:400px}.wave-back{height:101px}.wave-front{height:71px}.voucher-overlay{position:absolute;inset:0;background:rgba(40,92,252,.25)}.voucher-amount{position:absolute;top:13px;right:20px;color:#fff;font-weight:500;line-height:1}.currency{font-size:18px}.amount{font-size:28px}.voucher-mark{position:absolute;top:77px;left:145px;width:110px;height:85px}.voucher-arrow{position:absolute;top:132px;left:181px;width:37px;height:37px;transform:scaleX(-1)}.voucher-code{position:absolute;left:20px;bottom:26px;color:#fff;font-size:12px;font-weight:500}.voucher-expiry{position:absolute;left:20px;bottom:9px;color:#38434A;font-size:12px;font-weight:500}.claim-details{position:absolute;top:250px;left:15px;width:400px;height:240px;overflow:hidden;border-radius:30px;background:#fff}.detail-serial,.detail-code,.detail-password{position:absolute;left:28px;color:#38434A;font-size:16px;font-weight:500}.detail-serial{top:30px}.detail-code{top:178px}.detail-password{top:206px}.claim-decoration{position:absolute;top:-60px;left:30px;width:267px;height:267px}.mask-line{position:absolute;left:28px;height:16px;background:#D9D9D9}.mask-long{top:98px;width:345px}.mask-medium{top:124px;width:280px}.mask-short{top:150px;width:217px}.claim-lock{position:absolute;top:150px;left:293px;width:80px;height:80px}.confirm-actions{position:absolute;top:530px;left:20px;display:flex;gap:20px}.success-layer{position:absolute;inset:0;z-index:100}.success-mask{position:absolute;inset:0;background:rgba(56,67,74,.9)}.success-dialog{position:absolute;top:397px;left:96px;width:238px;height:139px;border-radius:25px;background:#fff}.success-message{position:absolute;top:18px;left:0;width:238px;color:#25292F;font-size:18px;font-weight:500;line-height:27px;text-align:center}.success-icon{position:absolute;top:52px;left:102px;width:35px;height:35px}.success-button{position:absolute;top:96px;left:73px;width:92px;height:31px;display:flex;align-items:center;justify-content:center;border-radius:25px;background:#1EFFAA;color:#38434A;font-size:14px;font-weight:700}
@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
