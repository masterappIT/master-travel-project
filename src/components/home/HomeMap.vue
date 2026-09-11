<template>
  <view class="map-layer" :class="{ 'full-screen': fullScreen, 'booking-picker-open': bookingPickerOpen }" :style="mapLayerStyle" aria-label="地圖區域">
    <!-- #ifdef APP-PLUS || MP-WEIXIN || MP-TOUTIAO -->
    <map
      :key="mapRenderKey"
      :id="mapId"
      class="native-map"
      :latitude="latitude"
      :longitude="longitude"
      :scale="nativeScale"
      :markers="nativeMarkers"
      :polyline="polyline"
      :include-points="includePoints"
      :style="nativeMapStyle"
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
      <view v-if="routeBounds" class="map-pin pickup-pin" :style="pinStyle(routeBounds.origin)" aria-label="上車位置"></view>
      <view v-if="routeBounds" class="map-pin destination-pin" :style="pinStyle(routeBounds.destination)" aria-label="目的地"></view>
      <view v-if="routeBounds" class="map-callout pickup-callout" :style="markerStyle(routeBounds.origin)"><text class="callout-title">上車位置</text><text class="callout-value">{{ props.pickupLabel || '目前定位' }}</text></view>
      <view v-else-if="nativeMarkers.length" class="map-callout pickup-callout pickup-callout--center"><text class="callout-title">上車位置</text><text class="callout-value">{{ props.pickupLabel || '目前定位' }}</text></view>
      <view v-if="routeBounds && props.routeSummary" class="map-callout destination-callout" :style="markerStyle(routeBounds.destination)"><text class="callout-title">目的地 · 行程資訊</text><text class="callout-value">{{ props.destinationLabel || '目的地' }}</text><text class="callout-summary">{{ props.routeSummary }}</text></view>
      <text v-if="!projectedRoute">香港 · 九龍站</text>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type MapMarker = { id: number; latitude: number; longitude: number; title?: string; iconPath?: string; width?: number; height?: number; callout?: { content: string; display?: 'ALWAYS' | 'BYCLICK'; color?: string; fontSize?: number; borderRadius?: number; bgColor?: string; padding?: number; textAlign?: 'left' | 'center' } }
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
  pickupLabel?: string
  destinationLabel?: string
  routeSummary?: string
  nativeHeight?: number
  mapTop?: number
  mapId?: string
  fitPadding?: [number, number, number, number]
}>(), {
  scale: 13,
  mapId: 'home-route-map'
})

const nativeMarkers = computed<MapMarker[]>(() => (props.markers || []).map(marker => {
  const content = marker.id === 1
    ? `【上車位置】\n${props.pickupLabel || '目前定位'}`
    : marker.id === 2 && props.routeSummary
      ? `【目的地 · 行程資訊】\n${props.destinationLabel || marker.title || '目的地'}\n${props.routeSummary}`
      : ''
  return content
    ? { ...marker, callout: { content, display: 'ALWAYS', color: '#263238', fontSize: 14, borderRadius: 8, bgColor: '#FFFFFF', padding: 10, textAlign: 'center' } }
    : marker
}))
const nativeMapStyle = computed(() => props.nativeHeight ? { height: `${props.nativeHeight}px` } : undefined)
const mapLayerStyle = computed(() => ({
  ...(props.nativeHeight ? { height: `${props.nativeHeight}px` } : {}),
  ...(props.mapTop !== undefined ? { top: `${props.mapTop}px` } : {})
}))

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

const pinStyle = (point: { x: number; y: number }) => ({ left: `${point.x}px`, top: `${point.y}px` })
const markerStyle = (point: { x: number; y: number }) => ({ left: `${Math.min(320, Math.max(110, point.x))}px`, top: `${Math.min(390, Math.max(100, point.y + 14))}px` })

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
    uni.createMapContext(props.mapId, instance?.proxy).moveToLocation({
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
  let padding = props.fitPadding || [96, 32, 190, 32]
  // #ifdef APP-PLUS
  if (!props.fitPadding) padding = [24, 24, 54, 24]
  // #endif
  uni.createMapContext(props.mapId, instance?.proxy).includePoints({
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
.map-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#e6edf0,#cbd8dc);color:#53636b;font-size:18px;font-weight:600;pointer-events:none}.route-preview{position:absolute;inset:0;width:430px;height:519px}.map-pin{position:absolute;z-index:1;width:18px;height:18px;box-sizing:border-box;border:4px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(40,67,88,.35);transform:translate(-50%,-50%)}.pickup-pin{background:#10a64a}.destination-pin{background:#ffc44f}.map-callout{position:absolute;z-index:2;display:flex;width:max-content;min-width:118px;max-width:220px;padding:8px 10px;box-sizing:border-box;flex-direction:column;border-radius:9px;background:#fff;box-shadow:0 3px 12px rgba(40,67,88,.24);color:#38434a;transform:translate(-50%,12px)}.map-callout::after{position:absolute;top:-7px;left:50%;width:0;height:0;border-top:0;border-right:7px solid transparent;border-bottom:8px solid #fff;border-left:7px solid transparent;content:'';transform:translateX(-50%)}.callout-title{font-size:11px;font-weight:500;line-height:16px}.callout-value{font-size:13px;font-weight:700;line-height:18px;text-align:center;white-space:normal;overflow-wrap:anywhere}.callout-summary{margin-top:2px;font-size:12px;font-weight:500;line-height:17px;text-align:center;white-space:normal}.destination-callout{transform:translate(-50%,12px)}.pickup-callout--center{left:50%;top:42%;transform:translate(-50%,12px)}.destination-callout::after{top:-7px;bottom:auto;border-top:0;border-right:7px solid transparent;border-bottom:8px solid #fff;border-left:7px solid transparent}.map-layer.full-screen .map-fallback,.map-layer.full-screen .route-preview{height:642px}
</style>
