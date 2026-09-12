<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/payment-settings/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="title">支付設定</text>
    </view>
    <view class="setting-row first-row" @tap="showComingSoon('修改支付密碼')"><text>修改支付密碼</text><image src="/static/payment-settings/action-enabled.svg" mode="scaleToFill" /></view>
    <view class="setting-row" @tap="showComingSoon('忘記支付密碼')"><text>忘記支付密碼</text><image src="/static/payment-settings/action-disabled.svg" mode="scaleToFill" /></view>
    <view class="setting-row" @tap="showComingSoon('Face ID')"><text>Face ID</text><image src="/static/payment-settings/action-disabled.svg" mode="scaleToFill" /></view>
    <view class="setting-row" @tap="showComingSoon('免密支付')"><text>免密支付</text><image src="/static/payment-settings/action-disabled.svg" mode="scaleToFill" /></view>
    <view class="setting-row" @tap="showComingSoon('自動續費')"><text>自動續費</text><image src="/static/payment-settings/action-disabled.svg" mode="scaleToFill" /></view>
  </view>
</template>

<script setup lang="ts">
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { closeCachedPage } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
const goBack = () => closeCachedPage('/pages/wallet/wallet')
const showComingSoon = (name: string) => uni.showToast({ title: `${name}功能即將推出`, icon: 'none' })
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}
.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}
.header{position:absolute;top:0;left:0;width:430px;height:110px;overflow:hidden;border-radius:25px;background:#fff}.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.title{position:absolute;top:58px;left:calc(50% - 36px);font-size:18px;font-weight:500;line-height:normal;white-space:nowrap}
.setting-row{position:absolute;left:0;width:430px;height:50px;background:#fff;font-size:16px;font-weight:500;line-height:normal;white-space:nowrap}.setting-row>text{position:absolute;left:30px;top:calc(50% - 11px)}.setting-row>image{position:absolute;top:12px;width:84px;height:26px}.first-row{top:119.77px}.first-row>image{left:331.01px}.setting-row:nth-of-type(3){top:171px}.setting-row:nth-of-type(4){top:222px}.setting-row:nth-of-type(5){top:282px}.setting-row:nth-of-type(6){top:333px}.setting-row:nth-of-type(3)>image{left:330px}.setting-row:nth-of-type(4)>image,.setting-row:nth-of-type(5)>image,.setting-row:nth-of-type(6)>image{left:329px}
@media(max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
