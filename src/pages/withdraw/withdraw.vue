<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/withdraw/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="title">提現</text>
    </view>
    <text class="method-title">到帳方式</text>
    <view class="methods">
      <view class="method-card method-wechat" :class="{ selected: selectedMethod === 'wechat' }" @tap="selectMethod('wechat')"><image class="method-icon" src="/static/withdraw/wechat.svg" mode="aspectFit" /><text>微信支付</text><view class="check-wrap"><image class="check" :src="selectedMethod === 'wechat' ? '/static/withdraw/check-selected.svg' : '/static/withdraw/check.svg'" mode="aspectFit" /></view></view>
      <!-- #ifndef MP-WEIXIN || MP-TOUTIAO -->
<view class="method-card method-alipay" :class="{ selected: selectedMethod === 'alipay' }" @tap="selectMethod('alipay')"><image class="method-icon" src="/static/withdraw/alipay.svg" mode="aspectFit" /><text>支付寶提現（只限內地支付寶）</text><view class="check-wrap"><image class="check" :src="selectedMethod === 'alipay' ? '/static/withdraw/check-selected.svg' : '/static/withdraw/check.svg'" mode="aspectFit" /></view></view>
      <text class="bank-title">銀行帳戶</text>
      <view class="method-card method-visa" @tap="selectMethod('visa')"><image class="card-icon" src="/static/withdraw/visa.svg" mode="aspectFit" /><view class="method-copy"><text>VISA Card •••• 2321</text><text class="sub">銀行帳戶</text></view><view class="check-wrap"><image class="check" src="/static/withdraw/check.svg" mode="aspectFit" /></view></view>
      <view class="method-card method-mastercard" @tap="selectMethod('mastercard')"><image class="card-icon" src="/static/withdraw/mastercard.svg" mode="aspectFit" /><view class="method-copy"><text>MasterCard •••• 2321</text><text class="sub">銀行帳戶</text></view><view class="check-wrap"><image class="check" src="/static/withdraw/check.svg" mode="aspectFit" /></view></view>
      <view class="method-card method-unionpay" @tap="selectMethod('unionpay')"><image class="card-icon" src="/static/withdraw/unionpay.svg" mode="aspectFit" /><view class="method-copy"><text>銀聯卡 •••• 2321</text><text class="sub">銀行帳戶</text></view><view class="check-wrap"><image class="check" src="/static/withdraw/check.svg" mode="aspectFit" /></view></view>
      <view class="method-card method-jcb" @tap="selectMethod('jcb')"><image class="card-icon" src="/static/withdraw/jcb.svg" mode="aspectFit" /><view class="method-copy"><text>JCB Card •••• 2321</text><text class="sub">銀行帳戶</text></view><view class="check-wrap"><image class="check" src="/static/withdraw/check.svg" mode="aspectFit" /></view></view>
      <view class="add-method" @tap="addMethod"><image class="add-card" src="/static/withdraw/add-card.svg" mode="aspectFit" /><text>新增銀行帳戶/信用卡增值</text><image class="add-chevron" src="/static/withdraw/add-arrow.svg" mode="aspectFit" /></view>
      <!-- #endif -->
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { closeCachedPage, openCachedPage } from '../../utils/navigation'
const { responsiveStyle } = useResponsiveCanvas()
const selectedMethod = ref('wechat')
const selectMethod = (method: string) => {
  selectedMethod.value = method
  if (method === 'alipay') openCachedPage('/pages/withdraw/alipay')
}
const addMethod = () => uni.showToast({ title: '新增支付方式功能即將推出', icon: 'none' })
const goBack = () => closeCachedPage('/pages/wallet/wallet')
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:110px;overflow:hidden;border-radius:25px;background:#fff}.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.title{position:absolute;top:58px;left:calc(50% - 18px);font-size:18px;font-weight:500;line-height:normal;white-space:nowrap}.method-title{position:absolute;top:130px;left:20px;font-size:16px;font-weight:350;white-space:nowrap}.methods{position:absolute;top:173px;left:25px;width:380px;height:480px}.bank-title{position:absolute;top:135px;left:10px;font-size:14px;font-weight:700;line-height:normal;white-space:nowrap}.method-card{position:absolute;left:0;width:380px;height:50px;box-sizing:border-box;padding:10px;border:1px solid #D9D9D9;border-radius:10px;background:#fff;box-shadow:0 4px 4px rgba(0,0,0,.25);display:flex;align-items:center;gap:16px;white-space:nowrap}.method-card.selected{border-color:#285CFC}.method-wechat{top:0}.method-alipay{top:65px}.method-visa{top:165px}.method-mastercard{top:230px}.method-unionpay{top:295px}.method-jcb{top:360px}.method-icon{width:25px;height:25px;flex:none}.card-icon{width:36px;height:24px;flex:none}.method-card>text{font-family:Inter,'Noto Sans TC',sans-serif;font-size:14px;line-height:20px;color:#1D2939}.method-copy{display:flex;flex-direction:column;gap:4px;font-family:Inter,'Noto Sans TC',sans-serif;font-size:14px;line-height:20px}.method-copy .sub{font-size:12px;line-height:18px;color:#667085}.check-wrap{width:24px;height:24px;margin-left:auto;flex:none;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center}.check{width:24px;height:24px;flex:none}.add-method{position:absolute;top:430px;left:0;width:380px;height:50px;padding:10px;box-sizing:border-box;display:flex;align-items:center;gap:16px;white-space:nowrap}.add-method>image{width:30px;height:30px;flex:none}.add-method>text{font-family:Inter,'Noto Sans TC',sans-serif;font-size:14px;line-height:18px}.add-chevron{width:10px!important;height:17.382px!important;margin-left:auto}@media(max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
