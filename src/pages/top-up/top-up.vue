<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/wallet/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="title">增值</text>
    </view>

    <view class="balance-card">
      <text class="balance-label">車費餘額</text>
      <text class="balance">{{ formatWalletAmount(wallet.fare, 'RMB') }}</text>
    </view>

    <view class="custom-amount-card">
      <text class="custom-amount-title">增值金額</text>
      <view class="custom-amount-divider" />
      <view class="custom-amount-input-row">
        <text class="custom-currency">RMB</text><text class="custom-yen">¥</text>
        <input class="custom-input" type="digit" v-model="customAmount" placeholder="0.00" @input="selectedAmount = null" />
      </view>
    </view>

    <view class="amount-panel">
      <view
        v-for="option in amountOptions"
        :key="option.amount"
        class="amount-option"
        :class="{ selected: selectedAmount === option.amount }"
        @tap="selectAmount(option.amount)"
      >
        <text class="amount"><text class="currency">RMB：</text>¥ {{ option.amount }} 元</text>
        <text class="price">售價：{{ option.price }}元</text>
        <text v-if="option.recommended" class="recommended">推荐</text>
      </view>
    </view>
    <text class="notice">*車費增值僅限出行使用，不可兌現或退款。</text>

    <view class="actions">
      <view class="action query" @tap="showRecords"><text>領取/查詢</text></view>
      <view class="action top-up" @tap="topUp"><text>增值</text></view>
    </view>

    <view class="agreement" @tap="agreed = !agreed">
      <view class="checkbox" :class="{ checked: agreed }"><text v-if="agreed">✓</text></view>
      <text>已閱讀並同意 </text><text class="link" @tap.stop="showAgreement('增值協議')">增值協議</text><text> 與 </text><text class="link" @tap.stop="showAgreement('使用條款')">使用條款</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { useCurrency } from '../../composables/useCurrency'
import { closeCachedPage, openCachedPage } from '../../utils/navigation'
import { topUpWallet, getWalletMe } from '../../services/api'

type WalletRecord = { id: number; type: string; amount: number; time: string }
type WalletState = { withdrawable: number; fare: number; records: WalletRecord[] }

const { responsiveStyle } = useResponsiveCanvas()
const { formatOriginal, currency, convertAmount } = useCurrency()
const formatWalletAmount = (amount: number, sourceCurrency: 'HKD' | 'RMB') => {
  const converted = convertAmount(amount, sourceCurrency)
  return `${currency.value === 'HKD' ? 'HK$' : '¥'}${converted.toFixed(2)}`
}
const amountOptions = [
  { amount: 500, price: 500 },
  { amount: 800, price: 800, recommended: true },
  { amount: 1000, price: 1000 },
  { amount: 2000, price: 2000 },
  { amount: 3000, price: 3000 },
  { amount: 5000, price: 5000, recommended: true }
]
const selectedAmount = ref<number | null>(800)
const agreed = ref(false)
const customAmount = ref('')
const stored = uni.getStorageSync('wallet-state') as Partial<WalletState> | ''
const wallet = reactive<WalletState>({
  withdrawable: Number(stored?.withdrawable) || 0,
  fare: Number(stored?.fare) || 0,
  records: Array.isArray(stored?.records) ? stored.records : []
})

const now = () => {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const selectAmount = (amount: number) => {
  selectedAmount.value = amount
  customAmount.value = ''
}
const persist = () => uni.setStorageSync('wallet-state', { ...wallet, records: [...wallet.records] })
const syncRemoteWallet = async () => {
  try {
    const res = await getWalletMe()
    if (res) {
      wallet.fare = res.fareBalance
      wallet.withdrawable = res.cashBalance
      persist()
    }
  } catch (e) {
    console.warn("Sync wallet failed", e)
  }
}

onMounted(() => {
  void syncRemoteWallet()
})

const topUp = async () => {
  if (!agreed.value) {
    uni.showToast({ title: '請先同意增值協議與使用條款', icon: 'none' })
    return
  }
  const amount = customAmount.value.trim() ? Number(customAmount.value) : selectedAmount.value
  if (!amount || amount <= 0) {
    uni.showToast({ title: '請輸入有效增值金額', icon: 'none' })
    return
  }
  uni.showLoading({ title: '處理中...' })
  try {
    const res = await topUpWallet({ amount, balanceType: 'fare', channel: 'manual' })
    if (res && res.user) {
      wallet.fare = res.user.fareBalance
      wallet.withdrawable = res.user.cashBalance
      wallet.records.unshift({ id: Date.now(), type: '車費增值', amount, time: now() })
      persist()
      uni.hideLoading()
      uni.showToast({ title: '增值成功', icon: 'success' })
      return
    }
    throw new Error('增值回應無效')
  } catch (err) {
    uni.hideLoading()
    uni.showToast({ title: '增值失敗，請稍後再試', icon: 'none' })
  }
}
const showRecords = () => openCachedPage('/pages/voucher/claim')
const showAgreement = (title: string) => uni.showModal({ title, content: '增值款項僅可用於支付出行車費，不可兌現或退款。', showCancel: false })
const goBack = () => closeCachedPage('/pages/wallet/wallet')
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:155px;overflow:hidden;border-radius:25px;background:#fff}.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.title{position:absolute;top:56px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500}.balance-card{position:absolute;top:115px;left:15px;width:400px;height:120px;overflow:hidden;border-radius:25px;background:linear-gradient(180deg,#285CFC 113.33%,#758295 213.33%);box-shadow:0 4px 4px rgba(0,0,0,.25);color:#fff}.balance-label{position:absolute;top:14px;left:30px;color:#D9D9D9;font-size:14px;font-weight:350}.balance{position:absolute;top:37px;left:30px;font-size:40px;font-weight:700;line-height:1.2}.custom-amount-card{position:absolute;top:255px;left:15px;width:400px;height:127px;box-sizing:border-box;overflow:hidden;border-radius:10px;background:#fff;box-shadow:0 4px 4px rgba(0,0,0,.25)}.custom-amount-title{position:absolute;top:10px;left:10px;font-size:16px;font-weight:350}.custom-amount-divider{position:absolute;top:91px;left:20px;width:360px;border-top:1px solid #D9D9D9}.custom-amount-input-row{position:absolute;top:47px;left:20px;height:34px;display:flex;align-items:center}.custom-currency{font-size:14px;font-weight:500}.custom-yen{margin-left:2px;font-size:26px;font-weight:500}.custom-input{width:270px;height:36px;margin-left:10px;padding:0;border:0;color:#38434A;font-size:30px;font-weight:700}.custom-input::placeholder{color:#D9D9D9}.amount-panel{position:absolute;top:402px;left:15px;width:400px;height:200px;padding:13px 12px 7px;display:grid;grid-template-columns:repeat(3,122px);grid-template-rows:repeat(2,80px);gap:20px 5px;box-sizing:border-box;border-radius:10px;background:#fff}.amount-option{position:relative;width:122px;height:80px;border:1px solid #D9D9D9;border-radius:10px;box-sizing:border-box;text-align:center}.amount-option.selected{border-color:#285CFC}.amount{display:block;margin-top:12px;font-size:18px;font-weight:700;white-space:nowrap}.currency{font-size:8px}.price{display:block;margin-top:8px;font-size:12px}.recommended{position:absolute;top:-7px;right:-1px;width:34px;height:16px;border-radius:10px 5px 0 10px;background:#F95C5C;color:#fff;font-size:8px;line-height:16px}.notice{position:absolute;top:612px;left:117px;color:#F95C5C;font-size:10px;font-weight:500}.actions{position:absolute;top:679px;left:28px;display:flex;gap:20px}.action{width:177px;height:45px;display:flex;align-items:center;justify-content:center;border-radius:10px;font-size:16px;font-weight:500}.query{background:#FECF62}.top-up{background:#285CFC;color:#fff}.agreement{position:absolute;top:744px;left:89px;height:20px;display:flex;align-items:center;font-family:Inter,sans-serif;font-size:14px;font-weight:500;white-space:nowrap}.checkbox{width:16px;height:16px;margin-right:10px;display:flex;align-items:center;justify-content:center;border:1px solid #D9D9D9;border-radius:2px;box-sizing:border-box;color:#fff;font-size:12px}.checkbox.checked{border-color:#285CFC;background:#285CFC}.link{color:#F95C5C;font-weight:700}
@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
