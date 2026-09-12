<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/wallet/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="title">提現</text>
    </view>
    <image class="withdraw-icon" src="/static/withdraw-detail/status.svg" mode="aspectFit" />
    <text class="withdraw-title">餘額兌現</text>
    <view class="amount"><text class="rmb">RMB</text><text class="yen">¥</text><text class="number">{{ formattedAmount }}</text></view>
    <view class="status"><image src="/static/withdraw-detail/status-check.svg" mode="aspectFit" /><text>成功</text></view>
    <view class="details">
      <text class="section-title">到帳方式</text>
      <view class="payment-card">
        <image class="method-icon" src="/static/withdraw/alipay.svg" mode="aspectFit" />
        <view class="method-copy"><text>支付寶支付</text><text class="sub">{{ accountNumber }}</text></view>
        <image class="check" src="/static/withdraw/check-selected.svg" mode="aspectFit" />
      </view>
      <view class="steps">
        <view class="step step-one"><view class="step-circle"><text class="step-number">1</text></view><view><text>兌現申請已被接納</text><text class="step-time">01/01/2024 12:00:00</text></view></view>
        <view class="step-line" />
        <view class="step step-two"><view class="step-circle"><text class="step-number">2</text></view><view><text>已到帳</text><text class="step-time">01/01/2024 12:00:00</text></view></view>
      </view>
      <text class="label amount-label">到帳金額</text><text class="value amount-value">RMB ¥ 100.00</text>
      <text class="label fee-label">手續費</text><text class="value fee-value">RMB ¥ 0.00</text>
      <text class="label arrival-label">到帳時間</text><text class="value arrival-value">01/01/2024 12:00:00</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { closeCachedPage } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
const accountNumber = '139112384374'
const formattedAmount = computed(() => '101.00')
const goBack = () => closeCachedPage('/pages/transactions/transactions')
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:110px;border-radius:25px;background:#fff}.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.title{position:absolute;top:58px;left:calc(50% - 18px);font-size:18px;font-weight:500}.withdraw-icon{position:absolute;top:168px;left:165px;width:100px;height:100px}.withdraw-title{position:absolute;top:276px;left:179px;font-size:18px;font-weight:500}.amount{position:absolute;top:318px;left:136px;height:43px;display:flex;align-items:flex-end}.rmb{margin-bottom:8px;font-size:14px;font-weight:500}.yen{margin-left:2px;font-size:26px}.number{margin-left:8px;font-size:30px;font-weight:700}.status{position:absolute;top:363px;left:194px;display:flex;align-items:center;gap:5px;font-size:12px;color:#285cfc}.status image{width:15px;height:15px}.details{position:absolute;top:406px;left:15px;width:400px;height:346px;border-radius:10px;background:#fff;overflow:hidden}.section-title{position:absolute;top:20px;left:20px;font-size:16px}.payment-card{position:absolute;top:53px;left:10px;width:380px;height:50px;padding:10px;box-sizing:border-box;border:1px solid #285cfc;border-radius:10px;box-shadow:0 4px 4px rgba(0,0,0,.25);display:flex;align-items:center;gap:16px}.method-icon{width:25px;height:25px}.method-copy{display:flex;flex-direction:column;font-family:Inter,'Noto Sans TC',sans-serif;font-size:14px;line-height:20px}.sub{font-size:14px}.check{width:24px;height:24px;margin-left:auto}.steps{position:absolute;top:123px;left:42px}.step{position:absolute;left:0;display:flex;align-items:flex-start;width:340px;gap:10px}.step-one{top:0}.step-two{top:50px}.step-circle{width:20px;height:20px;flex:none;border-radius:50%;background:#285cfc;display:flex;align-items:center;justify-content:center}.step-circle>.step-number{display:block!important;width:20px;height:20px;color:#fff!important;font-size:12px!important;line-height:20px!important;text-align:center;white-space:nowrap}.step text{color:#285cfc;font-size:12px;white-space:nowrap}.step-time{display:block!important;color:#38434a!important;font-size:10px!important}.step-line{position:absolute;top:20px;left:9px;width:2px;height:30px;background:#285cfc}.label,.value{position:absolute;top:231px;font-size:14px}.label{left:20px}.value{right:20px}.fee-label,.fee-value{top:271px}.arrival-label,.arrival-value{top:311px}@media(max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
