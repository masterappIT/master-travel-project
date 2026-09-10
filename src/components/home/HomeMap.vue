<template>
  <view class="map-layer" :class="{ 'full-screen': fullScreen, 'booking-picker-open': bookingPickerOpen }" aria-label="地圖區域">
    <!-- #ifdef APP-PLUS || MP-WEIXIN || MP-TOUTIAO -->
    <map
      :key="mapRenderKey"
      id="home-route-map"
      class="native-map"
      :latitude="latitude"
      :longitude="longitude"
      :scale="nativeScale"
      :markers="markers"
      :polyline="polyline"
      :include-points="includePoints"
      show-location
      :enable-zoom="!bookingPickerOpen"
      :enable-scroll="!bookingPickerOpen"
    />
    <!-- #endif -->
    <!-- #ifdef H5 -->
    <view class="map-fallback" aria-label="地圖區域">
      <svg v-if="projectedRoute" class="route-preview" viewBox="0 0 430 519" preserveAspectRatio="none" aria-hidden="true">
        <polyline :points="projectedRoute" fill="none" stroke="#285CFC" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <view v-if="routeBounds" class="map-marker origin-marker" :style="markerStyle(routeBounds.origin)">起</view>
      <view v-if="routeBounds" class="map-marker destination-marker" :style="markerStyle(routeBounds.destination)">終</view>
      <text v-if="!projectedRoute">香港 · 九龍站</text>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type MapMarker = { id: number; latitude: number; longitude: number; title?: string; iconPath?: string; width?: number; height?: number }
type MapPoint = { latitude: number; longitude: number }
type MapPolyline = { points: MapPoint[]; color: string; width: number; arrowLine?: boolean }

const props = withDefaults(defineProps<{
  latitude: number
  longitude: number
  scale?: number
  markers?: MapMarker[]
  polyline?: MapPolyline[]
  includePoints?: MapPoint[]
  fitTrigger?: number
  centerTrigger?: number
  fullScreen?: boolean
  bookingPickerOpen?: boolean
}>(), {
  scale: 13
})

const routeBounds = computed(() => {
  const points = props.polyline?.[0]?.points
  if (!points || points.length < 2) return null
  const longitudes = points.map(point => point.longitude)
  const latitudes = points.map(point => point.latitude)
  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)
  const longitudeRange = Math.max(maxLongitude - minLongitude, 0.001)
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.001)
  const project = (point: MapPoint) => ({
    x: 28 + ((point.longitude - minLongitude) / longitudeRange) * 374,
    y: 96 + ((maxLatitude - point.latitude) / latitudeRange) * 250
  })
  return { project, origin: project(points[0]), destination: project(points[points.length - 1]) }
})

const projectedRoute = computed(() => {
  const points = props.polyline?.[0]?.points
  if (!points || !routeBounds.value) return ''
  return points.map(point => {
    const projected = routeBounds.value!.project(point)
    return `${projected.x},${projected.y}`
  }).join(' ')
})

const markerStyle = (point: { x: number; y: number }) => ({ left: `${point.x}px`, top: `${point.y}px` })

const instance = getCurrentInstance()
const nativeScale = ref(props.scale)
const mapRenderKey = ref(0)
let fitTimer: ReturnType<typeof setTimeout> | undefined
let centerTimer: ReturnType<typeof setTimeout> | undefined
let mapReady = false

const routeBoundaryPoints = (points: MapPoint[]) => {
  const minLatitude = Math.min(...points.map(point => point.latitude))
  const maxLatitude = Math.max(...points.map(point => point.latitude))
  const minLongitude = Math.min(...points.map(point => point.longitude))
  const maxLongitude = Math.max(...points.map(point => point.longitude))
  return [
    { latitude: minLatitude, longitude: minLongitude },
    { latitude: maxLatitude, longitude: maxLongitude }
  ]
}

const centerMap = async () => {
  // #ifdef APP-PLUS || MP-WEIXIN || MP-TOUTIAO
  if (!mapReady) return
  nativeScale.value = props.scale
  mapRenderKey.value += 1
  await nextTick()
  const moveToCenter = () => {
    uni.createMapContext('home-route-map', instance?.proxy).moveToLocation({
      latitude: props.latitude,
      longitude: props.longitude
    })
  }
  moveToCenter()
  if (centerTimer) clearTimeout(centerTimer)
  centerTimer = setTimeout(moveToCenter, 350)
  // #endif
}

const fitRoute = (points: MapPoint[]) => {
  // #ifdef APP-PLUS || MP-WEIXIN || MP-TOUTIAO
  if (!mapReady) return
  let padding = [96, 32, 190, 32]
  // #ifdef APP-PLUS
  padding = [24, 24, 54, 24]
  // #endif
  uni.createMapContext('home-route-map', instance?.proxy).includePoints({
    points: routeBoundaryPoints(points),
    padding
  })
  // #endif
}

onMounted(() => {
  mapReady = true
  if (props.includePoints && props.includePoints.length > 1) fitRoute(props.includePoints)
})

onBeforeUnmount(() => {
  mapReady = false
  if (fitTimer) clearTimeout(fitTimer)
  if (centerTimer) clearTimeout(centerTimer)
})

watch(
  () => props.scale,
  scale => { nativeScale.value = scale }
)

watch(
  () => props.centerTrigger,
  async () => {
    await nextTick()
    await centerMap()
  }
)

watch(
  () => props.fitTrigger,
  () => {
    const points = props.includePoints
    if (!points || points.length < 2) return
    if (fitTimer) clearTimeout(fitTimer)
    fitRoute(points)
    fitTimer = setTimeout(() => fitRoute(points), 350)
  }
)

watch(
  () => props.includePoints,
  async (points) => {
    if (!points || points.length < 2) return
    await nextTick()
    if (fitTimer) clearTimeout(fitTimer)
    fitRoute(points)
    fitTimer = setTimeout(() => fitRoute(points), 350)
  },
  { deep: true, flush: 'post' }
)
</script>

<style scoped>
.map-layer{position:absolute;left:0;top:106px;width:430px;height:519px;z-index:0;overflow:hidden;background:#edf0f2}.map-layer.full-screen{top:0;height:642px}.native-map{width:430px;height:519px}.map-layer.full-screen .native-map{height:642px}.map-layer.booking-picker-open{bottom:auto!important;height:466px!important}.map-layer.booking-picker-open .native-map{height:466px!important}
/* #ifdef APP-PLUS */
.map-layer:not(.full-screen){top:189px;height:397px}.map-layer:not(.full-screen) .native-map{height:397px}.map-layer.booking-picker-open:not(.full-screen){height:383px!important}.map-layer.booking-picker-open:not(.full-screen) .native-map{height:383px!important}
/* #endif */
.map-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#e6edf0,#cbd8dc);color:#53636b;font-size:18px;font-weight:600;pointer-events:none}.route-preview{position:absolute;inset:0;width:430px;height:519px}.map-marker{position:absolute;display:flex;width:28px;height:28px;align-items:center;justify-content:center;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 7px rgba(0,0,0,.25);font-size:12px;font-weight:700;transform:translate(-50%,-50%)}.origin-marker{background:#04a13a;color:#fff}.destination-marker{background:#fecf62;color:#5b4300}.map-layer.full-screen .map-fallback,.map-layer.full-screen .route-preview{height:642px}
</style>
