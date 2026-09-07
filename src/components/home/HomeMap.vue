<template>
  <view class="map-layer" :class="{ 'full-screen': fullScreen }" aria-label="地圖區域">
    <!-- #ifdef MP-WEIXIN || MP-TOUTIAO -->
    <map
      class="native-map"
      :latitude="latitude"
      :longitude="longitude"
      :scale="13"
      show-location
      enable-zoom
      enable-scroll
    />
    <!-- #endif -->
    <!-- #ifdef H5 || APP-PLUS -->
    <view class="map-fallback" aria-label="地圖區域">
      <text>香港 · 九龍站</text>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
defineProps<{
  latitude: number
  longitude: number
  fullScreen?: boolean
}>()
</script>

<style scoped>
.map-layer{position:absolute;left:0;top:106px;width:430px;height:519px;z-index:0;overflow:hidden;background:#edf0f2}.map-layer.full-screen{top:0;height:642px}.native-map{width:430px;height:519px}.map-layer.full-screen .native-map{height:642px}.map-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#e6edf0,#cbd8dc);color:#53636b;font-size:18px;font-weight:600;pointer-events:none}.map-layer.full-screen .map-fallback{height:642px}
</style>
