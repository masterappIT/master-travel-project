<template>
  <view class="home-header" aria-label="首頁頂部資訊">
    <image class="header-wave" src="/static/home/header-wave.svg" mode="scaleToFill" />
    <image class="header-orb" src="/static/home/header-orb.svg" mode="scaleToFill" />
    <view class="brand-mark">
      <slot name="logo">
        <image class="logo-image" :src="logoSrc || '/static/home/header-logo.svg'" mode="scaleToFill" />
      </slot>
      <text class="brand-name">Master Travel Project</text>
    </view>
    <view class="location-copy">
      <view class="location-row">
        <image class="location-pin" src="/static/home/location-pin.svg" mode="scaleToFill" />
        <text class="location-title">{{ locationLabel }}</text>
      </view>
      <text class="location-subtitle">您的最近上車位置</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ logoSrc?: string; locationLabel?: string }>()
</script>

<style scoped>
.home-header{position:absolute;top:0;left:0;width:430px;height:160px;z-index:3;overflow:hidden;border-radius:35px;pointer-events:none}.header-wave{position:absolute;left:-14.7px;top:0;width:448.25px;height:156.05px}.header-orb{position:absolute;left:-105px;top:-109px;width:219px;height:219px}.brand-mark{position:absolute;left:145px;top:53px;width:140px;height:41px;display:flex;align-items:center;gap:7px;pointer-events:auto}.logo-image{display:block;width:32px;height:25px;flex:none}.brand-name{color:#fff;font-family:'Noto Sans TC',sans-serif;font-size:10px;font-weight:700;line-height:12px;white-space:nowrap}.location-copy{position:absolute;left:35px;top:99px;width:180px;height:29px;color:#fff}.location-row{display:flex;align-items:center;gap:10px;height:15px}.location-pin{display:block;width:8px;height:14.517px}.location-title{font-family:'Noto Sans TC',sans-serif;font-size:12px;font-weight:400;line-height:normal;white-space:nowrap}.location-subtitle{position:absolute;left:18px;top:17px;font-family:'Noto Sans TC',sans-serif;font-size:8px;font-weight:300;line-height:normal;white-space:nowrap}
</style>
