<template>
  <view class="bottom-nav" aria-label="首頁導覽">
    <view class="nav-link active">
      <image src="/static/home/nav/services.svg" mode="aspectFit" />
    </view>
    <view class="nav-link" @tap="$emit('trips')">
      <image src="/static/home/nav/trips.svg" mode="aspectFit" />
    </view>
    <view class="nav-link" @tap="$emit('services')">
      <image src="/static/home/nav/customer-service.svg" mode="aspectFit" />
    </view>
  </view>
</template>

<script setup lang="ts">
defineEmits<{ services: []; trips: [] }>()
</script>

<style scoped>
.bottom-nav{position:absolute;left:0;bottom:0;width:430px;height:102px;z-index:4;padding:10px;box-sizing:border-box;background:#fff;border-radius:0 0 22px 22px;display:flex;align-items:center;justify-content:center;gap:60px}
/* #ifdef H5 */
.bottom-nav{border-radius:0}
/* #endif */
.nav-link{width:28px;height:28px}.nav-link image{display:block;width:28px;height:28px}
</style>
