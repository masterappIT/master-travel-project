<template>
  <view class="map-actions" :aria-label="tx('地圖操作')">
    <view class="map-tool locate" @tap="$emit('location')"><view class="locate-ring" /></view>
  </view>
</template>
<script setup lang="ts">
import { tx } from '../../i18n'
defineEmits<{ location: [] }>()
</script>
<style scoped>
.map-actions{position:absolute;inset:0;z-index:4;pointer-events:none}.map-tool{position:absolute;top:538px;width:42px;height:42px;border-radius:10px;background:#fff;box-shadow:0 2px 7px rgba(0,0,0,.18);pointer-events:auto;display:flex;align-items:center;justify-content:center}.locate{right:12px}.locate-ring{width:17px;height:17px;border:3px solid #38434a;border-radius:50%;box-shadow:inset 0 0 0 4px #fff;background:#38434a}
</style>
