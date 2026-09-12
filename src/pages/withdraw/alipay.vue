<template>
  <!-- #ifndef MP-WEIXIN || MP-TOUTIAO -->
  <view class="page" :style="responsiveStyle">
    <view class="header"><image class="back" src="/static/wallet/back.svg" mode="aspectFit" @tap="goBack" /><text class="title">提現</text></view>
    <text class="method-title">到帳方式</text>
    <view class="payment-card"><image class="method-icon" src="/static/withdraw/alipay.svg" mode="aspectFit" /><text>支付寶支付</text><image class="check" src="/static/withdraw/check-selected.svg" mode="aspectFit" /></view>
    <view class="account-card"><view class="account-row name-row"><text>支付寶帳戶姓名</text><input v-model="accountName" class="field" placeholder="請輸入支付寶帳戶姓名" placeholder-class="placeholder" /></view><view class="account-row number-row"><text>支付寶帳號</text><input v-model="accountNumber" class="field" placeholder="請輸入支付寶帳號" placeholder-class="placeholder" /></view></view>
    <view class="amount-card"><text class="amount-title">提取金額</text><view class="divider" /><view class="amount-input"><text class="currency currency-rmb">RMB</text><text class="currency currency-yen">¥</text><input v-model="amount" type="digit" placeholder="請輸入兌現金額" placeholder-class="amount-placeholder" /></view><view class="amount-meta"><text>可用金額 ¥ 0.00</text><text>手續費 ¥ 1.00</text></view></view>
    <view class="submit" @tap="submit"><text>提交申請</text></view>

    <view v-if="showConfirm" class="confirm-overlay" @tap="closeConfirm">
      <view class="confirm-modal" @tap.stop>
        <text class="confirm-title">請確認兌現金額</text>
        <image class="confirm-close" src="/static/withdraw/close.svg" mode="aspectFit" @tap="closeConfirm" />
        <view class="confirm-amount">
          <text class="confirm-rmb">RMB </text>
          <text class="confirm-yen">¥</text>
          <text class="confirm-value">{{ formattedAmount }}</text>
        </view>
        <text class="confirm-fee">手續費 ¥ 1.00</text>
        <text class="confirm-method-label">到帳方式</text>
        <view class="confirm-method-card">
          <view class="confirm-method-main">
            <image class="confirm-method-icon" src="/static/withdraw/alipay.svg" mode="aspectFit" />
            <view class="confirm-method-text">
              <text>支付寶支付 </text>
              <text>139112384374</text>
            </view>
          </view>
          <image class="confirm-method-check" src="/static/withdraw/check-selected.svg" mode="aspectFit" />
        </view>
        <view class="confirm-button" @tap="confirmWithdraw"><text>確認</text></view>
      </view>
    </view>
  </view>
  <!-- #endif -->
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { closeCachedPage, openCachedPage } from '../../utils/navigation'
const { responsiveStyle } = useResponsiveCanvas()
const accountName = ref('')
const accountNumber = ref('')
const amount = ref('')
const showConfirm = ref(false)

const formattedAmount = computed(() => {
  const numeric = Number(amount.value)
  if (!Number.isFinite(numeric)) return '0.00'
  return numeric.toFixed(2)
})

const goBack = () => closeCachedPage('/pages/withdraw/withdraw')

const closeConfirm = () => {
  showConfirm.value = false
}

const submit = () => {
  if (!accountName.value.trim() || !accountNumber.value.trim() || !amount.value.trim()) {
    uni.showToast({ title: '請填寫完整提現資料', icon: 'none' })
    return
  }
  showConfirm.value = true
}

const confirmWithdraw = () => {
  showConfirm.value = false
  openCachedPage('/pages/withdraw/alipay-detail')
}
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:110px;border-radius:25px;background:#fff}.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.title{position:absolute;top:58px;left:calc(50% - 18px);font-size:18px;font-weight:500}.method-title{position:absolute;top:130px;left:20px;font-size:16px;font-weight:350}.payment-card{position:absolute;top:168px;left:25px;width:380px;height:50px;padding:10px;box-sizing:border-box;border:1px solid #285CFC;border-radius:10px;background:#fff;box-shadow:0 4px 4px rgba(0,0,0,.25);display:flex;align-items:center;gap:16px;font-family:Inter,'Noto Sans TC',sans-serif;font-size:14px;color:#1D2939}.method-icon{width:25px;height:25px;flex:none}.check{width:24px;height:24px;margin-left:auto}.account-card,.amount-card{position:absolute;left:15px;width:400px;border-radius:10px;background:#fff;overflow:hidden}.account-card{top:238px;height:100px;font-size:14px}.account-row{position:absolute;left:20px;width:360px;height:50px;box-sizing:border-box}.account-row text{position:absolute;left:0;top:15px;line-height:20px}.account-row .field{position:absolute;left:150px;top:10px;width:210px;height:30px;padding:0;border:0;font-size:14px;line-height:30px;color:#38434A}.name-row{top:0}.number-row{top:50px;border-top:1px solid #D9D9D9}.placeholder{color:#999}.amount-card{top:358px;height:127px;padding:10px 20px;box-sizing:border-box}.amount-title{font-size:16px;font-weight:350}.divider{position:absolute;top:87px;left:20px;width:360px;border-top:1px solid #D9D9D9}.amount-input{position:absolute;top:50px;left:20px;width:360px;height:38px;display:flex;align-items:baseline;gap:0}.currency{position:relative;display:inline-block;line-height:1;white-space:nowrap}.currency-rmb{margin-right:4px;font-size:14px;font-weight:500;transform:none}.currency-yen{margin-right:2px;font-size:26px;transform:none}.amount-input input{position:static;flex:0 0 auto;width:150px;height:38px;padding:0;border:0;font-size:14px;line-height:38px;transform:none}.amount-placeholder{color:#999}.amount-meta{position:absolute;left:20px;right:20px;bottom:10px;display:flex;justify-content:space-between;font-size:12px;color:#38434A}.submit{position:absolute;top:679px;left:36px;width:357px;height:50px;border-radius:10px;background:#285CFC;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:500}.confirm-overlay{position:absolute;inset:0;background:rgba(56,67,74,.5)}.confirm-modal{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:430px;height:527px;border-radius:25px 25px 0 0;background:#fff}.confirm-title{position:absolute;left:50%;top:70px;transform:translateX(-50%);font-size:18px;font-weight:500;color:#38434A;white-space:nowrap}.confirm-close{position:absolute;left:389px;top:20px;width:26px;height:26px}.confirm-amount{position:absolute;left:136px;top:136px;width:174px;height:43px;white-space:nowrap;display:flex;align-items:baseline;gap:2px}.confirm-rmb{display:inline-block;font-size:14px;font-weight:500;color:#38434A;line-height:1;transform:none}.confirm-yen{display:inline-block;font-size:26px;line-height:1;color:#38434A;font-weight:500;transform:none}.confirm-value{display:inline-block;font-size:30px;font-weight:700;color:#38434A;line-height:1;transform:none}.confirm-fee{position:absolute;left:50%;top:189px;transform:translateX(-50%);font-size:12px;color:#38434A;white-space:nowrap}.confirm-method-label{position:absolute;left:20px;top:239px;font-size:16px;color:#38434A;white-space:nowrap}.confirm-method-card{position:absolute;left:50%;top:272px;transform:translateX(-50%);display:flex;align-items:center;justify-content:space-between;width:380px;height:50px;padding:10px;box-sizing:border-box;border:1px solid #285CFC;border-radius:10px;background:#fff;box-shadow:0 4px 4px rgba(0,0,0,.25)}.confirm-method-main{display:flex;align-items:center;gap:16px}.confirm-method-icon{width:25px;height:25px;flex:none}.confirm-method-text{display:flex;flex-direction:column;gap:0;justify-content:center;font-size:14px;color:#1D2939;line-height:20px}.confirm-method-check{width:24px;height:24px;flex:none}.confirm-button{position:absolute;left:50%;top:447px;transform:translateX(-50%);width:357px;height:50px;border-radius:10px;background:#285CFC;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:500}@media(max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
