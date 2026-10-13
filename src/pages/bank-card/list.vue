<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <PageNavBar :title="tx('我的銀行卡')" @back="goBack" />
    </view>

    <view v-for="(card, index) in cards" :key="card.bank + card.type" class="saved-card" :class="{ selected: index % 2 === 1 }" :style="{ top: `${130 + index * 73}px` }" @tap="openCard">
      <image class="saved-card-logo" :src="card.logo" mode="aspectFit" />
      <text class="masked-number">**** **** **** 0000</text>
      <text class="bank-name">{{ tx(card.bank) }}</text>
      <text class="card-type">{{ tx(card.type) }}</text>
    </view>

    <view class="card-types"><image v-for="asset in cardTypeAssets" :key="asset" :src="asset" mode="aspectFit" /></view>
    <view class="add-button" @tap="addCard"><text>{{ tx('新增銀行卡') }}</text></view>
  </view>
</template>

<script setup lang="ts">
import PageNavBar from '../../components/common/PageNavBar.vue'
import { tx } from '../../i18n'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { closeCachedPage, openCachedPage } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
const cards = [
  { bank: '中銀', type: '信用卡', logo: '/static/bank-card/list/card-1.svg' },
  { bank: '中銀', type: '信用卡', logo: '/static/bank-card/list/card-2.svg' },
  { bank: '永豐', type: '銀行帳戶', logo: '/static/bank-card/list/logo-5.svg' },
  { bank: '永豐', type: '銀行帳戶', logo: '/static/bank-card/list/card-4.svg' }
]
const cardTypeAssets = [
  '/static/bank-card/list/logo-3.svg',
  '/static/bank-card/list/logo-2.svg',
  '/static/bank-card/list/logo-1.svg',
  '/static/bank-card/list/logo-4.svg',
  '/static/bank-card/list/logo-5.svg'
]
const goBack = () => closeCachedPage('/pages/bank-card/account')
const openCard = () => openCachedPage('/pages/bank-card/detail')
const addCard = () => openCachedPage('/pages/bank-card/bank-card')
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;height:100%;margin:0;overflow:hidden}
.page{position:fixed;top:0;left:0;width:430px;height:932px;overflow:hidden;border-radius:35px;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:scale(1);transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:110px;overflow:hidden;border-radius:25px;background:#fff}.saved-card{position:absolute;left:15px;width:400px;height:93px;overflow:hidden;border-radius:25px;background:#fff;color:#38434a}.saved-card.selected{background:#285cfc;color:#fff}.saved-card-logo{position:absolute;top:22px;left:20px;width:50px;height:50px}.masked-number{position:absolute;top:34px;left:121px;color:#000;font-size:18px;font-weight:500;line-height:normal;white-space:nowrap}.selected .masked-number{color:#fff}.bank-name{position:absolute;top:12px;left:350px;font-size:10px;font-weight:500;line-height:normal;white-space:nowrap}.card-type{position:absolute;top:37px;right:20px;font-size:14px;font-weight:500;line-height:normal;white-space:nowrap}.selected .bank-name,.selected .card-type{color:#d9d9d9}.card-types{position:absolute;top:747px;left:70px;width:290px;height:50px;display:flex;gap:10px}.card-types image{width:50px;height:50px;flex:none}.add-button{position:absolute;top:679px;left:36.5px;width:357px;height:50px;border-radius:10px;background:#285cfc;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:500}.add-button text{position:relative;top:-1px}@media(max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100vh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
