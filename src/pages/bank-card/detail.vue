<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/bank-card/detail/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="title">{{ tx('我的銀行卡') }}</text>
    </view>

    <view class="saved-card">
      <image class="saved-card-logo" src="/static/bank-card/detail/card.svg" mode="aspectFit" />
      <text class="masked-number">**** **** **** 0000</text>
      <text class="bank-name">{{ tx('中銀') }}</text>
      <text class="card-type">{{ tx('信用卡') }}</text>
    </view>

    <view class="card-types"><image v-for="asset in cardTypeAssets" :key="asset" :src="asset" mode="aspectFit" /></view>
    <view class="unlink-button" @tap="unlink"><text>{{ tx('取消連結') }}</text></view>
  </view>
</template>

<script setup lang="ts">
import { tx } from '../../i18n'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { closeCachedPage } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
const cardTypeAssets = [
  '/static/bank-card/detail/logo-3.svg',
  '/static/bank-card/detail/logo-2.svg',
  '/static/bank-card/detail/logo-1.svg',
  '/static/bank-card/detail/logo-4.svg',
  '/static/bank-card/detail/logo-5.svg'
]
const goBack = () => closeCachedPage('/pages/bank-card/list')
const unlink = () => closeCachedPage('/pages/bank-card/list')
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;height:100%;margin:0;overflow:hidden}
.page{position:fixed;top:0;left:0;width:430px;height:932px;overflow:hidden;border-radius:35px;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:scale(1);transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:110px;overflow:hidden;border-radius:25px;background:#fff}.back{position:absolute;top:60px;left:33px;width:16px;height:29px}.title{position:absolute;top:59px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;line-height:normal;white-space:nowrap}.saved-card{position:absolute;top:130px;left:15px;width:400px;height:93px;overflow:hidden;border-radius:25px;background:#fff;color:#38434a;box-shadow:0 4px 4px rgba(0,0,0,.25)}.saved-card-logo{position:absolute;top:22px;left:20px;width:50px;height:50px}.masked-number{position:absolute;top:34px;left:121px;color:#000;font-size:18px;font-weight:500;line-height:normal;white-space:nowrap}.bank-name{position:absolute;top:12px;left:350px;font-size:10px;font-weight:500;line-height:normal;white-space:nowrap}.card-type{position:absolute;top:37px;left:338px;font-size:14px;font-weight:500;line-height:normal;white-space:nowrap}.card-types{position:absolute;top:747px;left:70px;width:290px;height:50px;display:flex;gap:10px}.card-types image{width:50px;height:50px;flex:none}.unlink-button{position:absolute;top:679px;left:36.5px;width:357px;height:50px;border-radius:10px;background:#285cfc;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:500}.unlink-button text{position:relative;top:-1px}@media(max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100vh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
