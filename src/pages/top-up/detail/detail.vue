<template>
  <view class="page" :style="responsiveStyle">
    <view v-if="success" class="success-screen">
      <view class="success-header">
        <image class="success-back" src="/static/wallet/back.svg" mode="aspectFit" @tap="goBack" />
      </view>
      <image class="success-icon" src="/static/top-up/success.svg" mode="aspectFit" />
      <text class="success-title">餘額增值</text>
      <view class="success-amount"><text class="success-rmb">RMB</text><text class="success-yen">¥</text><text class="success-number">{{ selectedAmount.toFixed(2) }}</text></view>
      <text class="fee-free">免手續費</text>
      <text class="payment-title">付款方式</text>
      <view class="payment-card">
        <image class="payment-icon" :src="paymentIcon" mode="aspectFit" />
        <view class="payment-copy"><text>{{ paymentName }}</text><text class="payment-subtitle">{{ paymentSubtitle }}</text></view>
        <image class="payment-check" src="/static/top-up/check.svg" mode="aspectFit" />
      </view>
      <text class="arrival">到帳時間：{{ successTime }}</text>
    </view>
    <view v-else-if="failed" class="failure-screen">
      <view class="failure-header">
        <image class="failure-back" src="/static/wallet/back.svg" mode="aspectFit" @tap="goBack" />
      </view>
      <image class="failure-icon" src="/static/top-up/no.svg" mode="aspectFit" />
      <text class="failure-title">餘額增值</text>
      <view class="failure-amount"><text class="failure-rmb">RMB</text><text class="failure-yen">¥</text><text class="failure-number">{{ failureAmount.toFixed(2) }}</text></view>
      <text class="failure-status">失敗</text>
      <text class="failure-payment-title">付款方式</text>
      <view class="failure-payment-card">
        <image class="failure-payment-icon" :src="paymentIcon" mode="aspectFit" />
        <view class="failure-payment-copy"><text>{{ paymentName }}</text><text class="failure-payment-subtitle">{{ paymentSubtitle }}</text></view>
        <image class="failure-payment-check" src="/static/top-up/check.svg" mode="aspectFit" />
      </view>
      <text class="failure-created">創建時間：01/01/24 12:00:00</text>
    </view>
    <view v-else>
      <view class="header">
        <image class="back" src="/static/wallet/back.svg" mode="aspectFit" @tap="goBack" />
        <text class="title">增值</text>
      </view>

      <view class="balance-card">
        <text class="balance-label">車費餘額</text>
        <text class="balance">RMB ¥ {{ wallet.fare.toFixed(2) }}</text>
      </view>

      <view class="amount-panel">
        <view v-for="option in amountOptions" :key="option.amount" class="amount-option" :class="{ selected: selectedAmount === option.amount }" @tap="selectedAmount = option.amount">
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
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../../composables/useResponsiveCanvas'
import { closeCachedPage, openCachedPage } from '../../../utils/navigation'

type WalletRecord = { id: number; type: string; amount: number; time: string }
type WalletState = { withdrawable: number; fare: number; records: WalletRecord[] }

const { responsiveStyle } = useResponsiveCanvas()
const amountOptions = [
  { amount: 500, price: 500 },
  { amount: 800, price: 800, recommended: true },
  { amount: 1000, price: 1000 },
  { amount: 2000, price: 2000 },
  { amount: 3000, price: 3000 },
  { amount: 5000, price: 5000, recommended: true }
]
const selectedAmount = ref(800)
const agreed = ref(false)
const success = ref(true)
const failed = ref(false)
const failureAmount = ref(101)
const paymentMethod = ref<'card' | 'alipay' | 'wechat'>('card')
const successTime = ref('01/01/24 12:00:00')
const paymentName = computed(() => {
  if (paymentMethod.value === 'alipay') return '支付寶'
  if (paymentMethod.value === 'wechat') return '微信支付'
  return 'MasterCard •••• 2321'
})
const paymentSubtitle = computed(() => paymentMethod.value === 'card' ? '銀行帳戶' : `${paymentName.value}帳戶`)
const paymentIcon = computed(() => {
  if (paymentMethod.value === 'alipay') return '/static/withdraw/alipay.svg'
  if (paymentMethod.value === 'wechat') return '/static/withdraw/wechat.svg'
  return '/static/top-up/payment.svg'
})
const stored = uni.getStorageSync('wallet-state') as Partial<WalletState> | ''
const wallet = reactive<WalletState>({
  withdrawable: Number(stored?.withdrawable) || 0,
  fare: Number(stored?.fare) || 0,
  records: Array.isArray(stored?.records) ? stored.records : []
})
onLoad((options) => {
  failed.value = options?.status === 'failed'
  success.value = !failed.value
  if (options?.amount) {
    const amount = Number(options.amount)
    if (Number.isFinite(amount) && amount > 0) failureAmount.value = amount
  }
  if (options?.payment === 'alipay') paymentMethod.value = 'alipay'
  if (options?.payment === 'wechat') paymentMethod.value = 'wechat'
})

const now = () => {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const persist = () => uni.setStorageSync('wallet-state', { ...wallet, records: [...wallet.records] })
const topUp = () => {
  if (!agreed.value) {
    uni.showToast({ title: '請先同意增值協議與使用條款', icon: 'none' })
    return
  }
  wallet.fare += selectedAmount.value
  wallet.records.unshift({ id: Date.now(), type: '車費增值', amount: selectedAmount.value, time: now() })
  persist()
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  successTime.value = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(-2)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  success.value = true
}
const showRecords = () => openCachedPage('/pages/voucher/claim')
const showAgreement = (title: string) => uni.showModal({ title, content: '增值款項僅可用於支付出行車費，不可兌現或退款。', showCancel: false })
const goBack = () => closeCachedPage('/pages/transactions/transactions')
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:155px;overflow:hidden;border-radius:25px;background:#fff}.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.title{position:absolute;top:56px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500}.balance-card{position:absolute;top:115px;left:15px;width:400px;height:120px;overflow:hidden;border-radius:25px;background:linear-gradient(180deg,#285CFC 113.33%,#758295 213.33%);box-shadow:0 4px 4px rgba(0,0,0,.25);color:#fff}.balance-label{position:absolute;top:14px;left:30px;color:#D9D9D9;font-size:14px;font-weight:350}.balance{position:absolute;top:37px;left:30px;font-size:40px;font-weight:700;line-height:1.2}.amount-panel{position:absolute;top:255px;left:15px;width:400px;height:200px;padding:13px 12px 7px;display:grid;grid-template-columns:repeat(3,122px);grid-template-rows:repeat(2,80px);gap:20px 5px;box-sizing:border-box;border-radius:10px;background:#fff}.amount-option{position:relative;width:122px;height:80px;border:1px solid #D9D9D9;border-radius:10px;box-sizing:border-box;text-align:center}.amount-option.selected{border-color:#285CFC}.amount{display:block;margin-top:12px;font-size:18px;font-weight:700;white-space:nowrap}.currency{font-size:8px}.price{display:block;margin-top:8px;font-size:12px}.recommended{position:absolute;top:-7px;right:-1px;width:34px;height:16px;border-radius:10px 5px 0 10px;background:#F95C5C;color:#fff;font-size:8px;line-height:16px}.notice{position:absolute;top:465px;left:117px;color:#F95C5C;font-size:10px;font-weight:500}.actions{position:absolute;top:679px;left:28px;display:flex;gap:20px}.action{width:177px;height:45px;display:flex;align-items:center;justify-content:center;border-radius:10px;font-size:16px;font-weight:500}.query{background:#FECF62}.top-up{background:#285CFC;color:#fff}.agreement{position:absolute;top:744px;left:89px;height:20px;display:flex;align-items:center;font-family:Inter,sans-serif;font-size:14px;font-weight:500;white-space:nowrap}.checkbox{width:16px;height:16px;margin-right:10px;display:flex;align-items:center;justify-content:center;border:1px solid #D9D9D9;border-radius:2px;box-sizing:border-box;color:#fff;font-size:12px}.checkbox.checked{border-color:#285CFC;background:#285CFC}.link{color:#F95C5C;font-weight:700}.success-screen{position:absolute;inset:0;background:#F0F2F5}.success-header{position:absolute;top:0;left:0;width:430px;height:110px;border-radius:25px;background:#fff}.success-back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.success-menu{position:absolute;top:60px;left:336px;width:87px;height:32px}.success-menu{display:none}.success-icon{position:absolute;top:160px;left:165px;width:100px;height:100px}.success-title{position:absolute;top:270px;left:0;width:430px;text-align:center;font-size:18px;font-weight:500}.success-amount{position:absolute;top:306px;left:136px;width:auto;height:43px;display:flex;align-items:flex-end}.success-rmb{align-self:flex-end;margin-bottom:8px;line-height:18px;font-size:14px;font-weight:500}.success-yen{margin-left:1px;font-size:26px;font-weight:500;line-height:normal}.success-number{margin-left:8px;font-size:30px;font-weight:700;line-height:normal}.fee-free{position:absolute;top:359px;left:0;width:430px;text-align:center;font-size:12px;font-weight:400}.payment-title{position:absolute;top:399px;left:20px;font-size:16px;font-weight:400}.payment-card{position:absolute;top:432px;left:25px;width:380px;height:50px;display:flex;align-items:center;border:1px solid #285CFC;border-radius:10px;box-sizing:border-box;background:#fff;box-shadow:0 4px 4px rgba(0,0,0,.25)}.payment-icon{width:36px;height:24px;margin-left:15px}.payment-copy{display:flex;flex-direction:column;margin-left:16px;font-family:Inter,sans-serif;font-size:14px;line-height:20px}.payment-subtitle{color:#667085;font-size:12px;line-height:18px}.payment-check{width:24px;height:24px;margin-left:auto;margin-right:15px}.arrival{position:absolute;top:502px;left:20px;font-size:14px}.failure-screen{position:absolute;inset:0;background:#F0F2F5}.failure-header{position:absolute;top:0;left:0;width:430px;height:110px;border-radius:25px;background:#fff}.failure-back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.failure-menu{position:absolute;top:60px;left:336px;width:87px;height:32px;display:flex;align-items:center;justify-content:center;gap:9px;border:1px solid #E4E7EC;border-radius:18px;background:#fff;color:#101828;font-size:14px;font-weight:700}.menu-divider{color:#D0D5DD;font-weight:400}.failure-icon{position:absolute;top:160px;left:165px;width:100px;height:100px}.failure-title{position:absolute;top:270px;left:0;width:430px;text-align:center;font-size:18px;font-weight:400}.failure-amount{position:absolute;top:306px;left:136px;width:158px;height:43px;display:flex;align-items:flex-end}.failure-rmb{align-self:flex-end;margin-bottom:8px;line-height:18px;font-size:14px;font-weight:500}.failure-yen{margin-left:1px;font-size:26px;font-weight:500;line-height:normal}.failure-number{margin-left:8px;font-size:30px;font-weight:700;line-height:normal}.failure-status{position:absolute;top:359px;left:0;width:430px;text-align:center;color:#000;font-size:12px;font-weight:100}.failure-payment-title{position:absolute;top:399px;left:20px;font-size:16px;font-weight:300}.failure-payment-card{position:absolute;top:432px;left:25px;width:380px;height:50px;display:flex;align-items:center;border:1px solid #285CFC;border-radius:10px;box-sizing:border-box;background:#fff;box-shadow:0 4px 4px rgba(0,0,0,.25);padding:10px}.failure-payment-icon{width:36px;height:24px;flex:none}.failure-payment-copy{display:flex;flex-direction:column;margin-left:16px;font-family:Inter,sans-serif;font-size:14px;line-height:20px}.failure-payment-subtitle{color:#667085;font-size:12px;line-height:18px}.failure-payment-check{width:24px;height:24px;margin-left:auto}.failure-created{position:absolute;top:502px;left:20px;font-family:Inter,sans-serif;font-size:14px;font-weight:500}
@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
