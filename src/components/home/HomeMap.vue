<template>
  <view class="map-layer" :class="{ 'full-screen': fullScreen }" :style="mapLayerStyle" aria-label="地圖區域">
    <!-- #ifdef APP-PLUS || MP-WEIXIN || MP-TOUTIAO -->
    <map
      :id="mapId"
      class="native-map"
      :latitude="latitude"
      :longitude="longitude"
      :scale="scale"
      :markers="nativeMarkers"
      :polyline="nativePolyline"
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
      <view v-if="routeBounds" class="map-callout pickup-callout" :style="markerStyle(routeBounds.origin)"><text class="callout-title">上車位置</text><text class="callout-value">{{ pickupCalloutLabel }}</text></view>
      <view v-else-if="nativeMarkers.length" class="map-callout pickup-callout pickup-callout--center"><text class="callout-title">上車位置</text><text class="callout-value">{{ pickupCalloutLabel }}</text></view>
      <view v-if="routeBounds && props.routeSummary" class="map-callout destination-callout" :style="markerStyle(routeBounds.destination)"><text class="callout-title">目的地 · 行程資訊</text><text class="callout-value">{{ destinationCalloutLabel }}</text><text class="callout-summary">{{ routeSummaryLabel }}</text></view>
      <text v-if="!projectedRoute">{{ props.pickupLabel || '目前定位' }}</text>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, watch } from 'vue'

type MapMarker = { id: number; latitude: number; longitude: number; title?: string; iconPath?: string; width?: number; height?: number; callout?: { content: string; display?: 'ALWAYS' | 'BYCLICK'; color?: string; fontSize?: number; borderRadius?: number; bgColor?: string; padding?: number; textAlign?: 'left' | 'center'; anchorY?: number } }
type MapPoint = { latitude: number; longitude: number }
type MapPolyline = { points: MapPoint[]; color: string; width: number; arrowLine?: boolean }

const props = withDefaults(defineProps<{
  latitude: number
  longitude: number
  scale?: number
  markers?: MapMarker[]
  polyline?: MapPolyline[]
  centerTrigger?: number
  routeFitTrigger?: number
  fullScreen?: boolean
  bookingPickerOpen?: boolean
  pickupLabel?: string
  destinationLabel?: string
  routeSummary?: string
  nativeHeight?: number
  mapTop?: number
  mapId?: string
}>(), {
  scale: 13,
  mapId: 'home-route-map'
})

const wrapCalloutText = (value: string) => {
  const characters = Array.from(value || '')
  const lines: string[] = []
  let line = ''
  let countedCharacters = 0
  for (const character of characters) {
    if (!/\s/.test(character) && countedCharacters >= 13) {
      lines.push(line)
      line = ''
      countedCharacters = 0
    }
    line += character
    if (!/\s/.test(character)) countedCharacters += 1
  }
  if (line || !lines.length) lines.push(line)
  return lines.join('\n')
}
const pickupCalloutLabel = computed(() => wrapCalloutText(props.pickupLabel || '目前定位'))
const destinationCalloutLabel = computed(() => wrapCalloutText(props.destinationLabel || '目的地'))
const routeSummaryLabel = computed(() => wrapCalloutText(props.routeSummary || ''))
const destinationCalloutHeight = computed(() => 42 + 20 * (destinationCalloutLabel.value.split('\n').length + routeSummaryLabel.value.split('\n').length))

const nativeMarkers = computed<MapMarker[]>(() => (props.markers || [])
  .filter(marker => Number.isFinite(marker?.latitude) && Number.isFinite(marker?.longitude))
  .map(marker => {
  const content = marker.id === 1
    ? `【上車位置】\n${pickupCalloutLabel.value}`
    : marker.id === 2 && props.routeSummary
      ? `【目的地 · 行程資訊】\n${destinationCalloutLabel.value}\n${routeSummaryLabel.value}`
      : ''
  const sizedMarker = {
    ...marker,
    width: marker.width || (marker.id === 2 ? 10 : 10),
    height: marker.height || (marker.id === 2 ? 15 : 18)
  }
  return content
    ? { ...sizedMarker, callout: { content, display: 'ALWAYS', color: '#263238', fontSize: 14, borderRadius: 8, bgColor: '#FFFFFF', padding: 10, textAlign: 'center', ...(marker.id === 2 && calloutSeparationRequired.value ? { anchorY: destinationCalloutHeight.value + (sizedMarker.height || 15) + 12 } : {}) } }
    : sizedMarker
}))
const nativePolyline = computed<MapPolyline[]>(() => (props.polyline || [])
  .map(line => ({
    ...line,
    points: (line.points || []).filter(point => Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude))
  }))
  .filter(line => line.points.length > 1))
const nativeMapStyle = computed(() => props.nativeHeight ? { height: `${props.nativeHeight}px` } : undefined)
const mapLayerStyle = computed(() => ({
  ...(props.nativeHeight ? { height: `${props.nativeHeight}px` } : {}),
  ...(props.mapTop !== undefined ? { top: `${props.mapTop}px` } : {})
}))

const routeBounds = computed(() => {
  const points = (props.polyline?.[0]?.points || []).filter(point => Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude))
  if (points.length < 2) return null
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
  const points = (props.polyline?.[0]?.points || []).filter(point => Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude))
  if (points.length < 2 || !routeBounds.value) return ''
  return points.map(point => {
    const projected = routeBounds.value!.project(point)
    return `${projected.x},${projected.y}`
  }).join(' ')
})

const pinStyle = (point: { x: number; y: number }) => ({ left: `${point.x}px`, top: `${point.y}px` })
const markerStyle = (point: { x: number; y: number }) => ({ left: `${Math.min(320, Math.max(110, point.x))}px`, top: `${Math.min(390, Math.max(100, point.y + 14))}px` })

const MAP_WIDTH = 430
const TILE_SIZE = 256
const MAX_SCALE = 18
const worldX = (longitude: number) => (longitude + 180) / 360
const worldY = (latitude: number) => {
  const radians = Math.max(-85.05112878, Math.min(85.05112878, latitude)) * Math.PI / 180
  return (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2
}
const latitudeFromWorldY = (y: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI
const calloutSeparationRequired = computed(() => {
  const pickup = props.markers?.find(marker => marker.id === 1)
  const destination = props.markers?.find(marker => marker.id === 2)
  if (!pickup || !destination || !props.routeSummary ||
      !Number.isFinite(pickup.latitude) || !Number.isFinite(pickup.longitude) ||
      !Number.isFinite(destination.latitude) || !Number.isFinite(destination.longitude)) return false
  return Math.abs(worldX(destination.longitude) - worldX(pickup.longitude)) >
    Math.abs(worldY(destination.latitude) - worldY(pickup.latitude))
})
const calloutLines = (value: string) => Math.max(1, value.split('\n').length)
const routeFitPoints = computed<MapPoint[]>(() => {
  const routePoints = nativePolyline.value[0]?.points || []
  if (routePoints.length < 2) return []
  const endpointPoints = (props.markers || [])
    .filter(marker => (marker.id === 1 || marker.id === 2) && Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude))
    .map(marker => ({ latitude: marker.latitude, longitude: marker.longitude }))
  return [...routePoints, ...endpointPoints]
})
const routeFitRegion = computed<MapPoint[]>(() => {
  const points = routeFitPoints.value
  if (points.length < 2) return []
  let mapHeight = props.nativeHeight || (props.fullScreen ? 642 : 519)
  // #ifdef APP-PLUS
  if (!props.nativeHeight && !props.fullScreen) mapHeight = 397
  // #endif
  const visible = { left: 12, right: MAP_WIDTH - 12, top: props.nativeHeight || props.fullScreen ? 16 : Math.min(125, mapHeight / 3), bottom: mapHeight - 26 }
  const originHeight = 42 + 20 * calloutLines(pickupCalloutLabel.value)
  const destinationHeight = 42 + 20 * (calloutLines(destinationCalloutLabel.value) + calloutLines(routeSummaryLabel.value))
  const markers = nativeMarkers.value.filter(marker => marker.id === 1 || marker.id === 2)
  const boundsAt = (scale: number) => {
    const size = TILE_SIZE * 2 ** scale
    const xs = points.map(point => worldX(point.longitude) * size)
    const ys = points.map(point => worldY(point.latitude) * size)
    let left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys)
    for (const marker of markers) {
      const x = worldX(marker.longitude) * size
      const y = worldY(marker.latitude) * size
      const height = marker.id === 1 ? originHeight : destinationHeight
      left = Math.min(left, x - 120)
      right = Math.max(right, x + 120)
      if (marker.id === 2 && calloutSeparationRequired.value) {
        top = Math.min(top, y - 20)
        bottom = Math.max(bottom, y + height + (marker.height || 15) + 12)
      } else {
        top = Math.min(top, y - height - 12)
        bottom = Math.max(bottom, y + 20)
      }
    }
    return { left, right, top, bottom, size }
  }
  const fits = (bounds: ReturnType<typeof boundsAt>) =>
    bounds.right - bounds.left <= visible.right - visible.left &&
    bounds.bottom - bounds.top <= visible.bottom - visible.top
  let lowerScale = 1
  let upperScale = MAX_SCALE
  let bounds = boundsAt(lowerScale)
  if (fits(bounds)) {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const candidateScale = (lowerScale + upperScale) / 2
      const candidate = boundsAt(candidateScale)
      if (fits(candidate)) {
        lowerScale = candidateScale
        bounds = candidate
      } else {
        upperScale = candidateScale
      }
    }
  }
  const centerX = (bounds.left + bounds.right - visible.left - visible.right + MAP_WIDTH) / 2
  const centerY = (bounds.top + bounds.bottom - visible.top - visible.bottom + mapHeight) / 2
  const x0 = (centerX - MAP_WIDTH / 2) / bounds.size
  const x1 = (centerX + MAP_WIDTH / 2) / bounds.size
  const y0 = (centerY - mapHeight / 2) / bounds.size
  const y1 = (centerY + mapHeight / 2) / bounds.size
  return [
    { latitude: latitudeFromWorldY(y0), longitude: x0 * 360 - 180 },
    { latitude: latitudeFromWorldY(y1), longitude: x1 * 360 - 180 }
  ]
})
const instance = getCurrentInstance()
const fitRoute = async () => {
  // #ifdef APP-PLUS || MP-WEIXIN || MP-TOUTIAO
  await nextTick()
  const points = routeFitRegion.value
  if (points.length < 2) return
  uni.createMapContext(props.mapId, instance?.proxy).includePoints({ points })
  // #endif
}
watch([routeFitRegion, () => props.routeFitTrigger], () => { void fitRoute() }, { immediate: true, flush: 'post' })
watch(() => props.centerTrigger, () => { void centerMap() })

const centerMap = async () => {
  // #ifdef APP-PLUS || MP-WEIXIN || MP-TOUTIAO
  await nextTick()
  uni.createMapContext(props.mapId, instance?.proxy).moveToLocation({
    latitude: props.latitude,
    longitude: props.longitude
  })
  // #endif
}

</script>

<style scoped>
.map-layer{position:absolute;left:0;top:106px;width:430px;height:519px;z-index:0;overflow:hidden;background:#edf0f2}.map-layer.full-screen{top:0;height:642px}
/* #ifdef APP-PLUS || MP-WEIXIN || MP-TOUTIAO */
.native-map{width:430px;height:519px}.map-layer.full-screen .native-map{height:642px}
/* #endif */
/* #ifdef APP-PLUS */
.map-layer:not(.full-screen){top:189px;height:397px}.map-layer:not(.full-screen) .native-map{height:397px}
/* #endif */
/* #ifdef H5 */
.map-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#e6edf0,#cbd8dc);color:#53636b;font-size:18px;font-weight:600;pointer-events:none}.route-preview{position:absolute;inset:0;width:430px;height:519px}.map-pin{position:absolute;z-index:1;width:18px;height:18px;box-sizing:border-box;border:4px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(40,67,88,.35);transform:translate(-50%,-50%)}.pickup-pin{background:#10a64a}.destination-pin{background:#ffc44f}.map-callout{position:absolute;z-index:2;display:flex;width:max-content;min-width:118px;max-width:220px;padding:8px 10px;box-sizing:border-box;flex-direction:column;border-radius:9px;background:#fff;box-shadow:0 3px 12px rgba(40,67,88,.24);color:#38434a;transform:translate(-50%,12px)}.map-callout::after{position:absolute;top:-7px;left:50%;width:0;height:0;border-top:0;border-right:7px solid transparent;border-bottom:8px solid #fff;border-left:7px solid transparent;content:'';transform:translateX(-50%)}.callout-title{font-size:11px;font-weight:500;line-height:16px}.callout-value{font-size:13px;font-weight:700;line-height:18px;text-align:center;white-space:pre-wrap;overflow-wrap:anywhere}.callout-summary{margin-top:2px;font-size:12px;font-weight:500;line-height:17px;text-align:center;white-space:normal}.destination-callout{transform:translate(-50%,12px)}.pickup-callout:not(.pickup-callout--center){transform:translate(-50%,-100%)}.pickup-callout:not(.pickup-callout--center)::after{top:auto;bottom:-7px;border-top:8px solid #fff;border-bottom:0}.pickup-callout--center{left:50%;top:42%;transform:translate(-50%,12px)}.destination-callout::after{top:-7px;bottom:auto;border-top:0;border-right:7px solid transparent;border-bottom:8px solid #fff;border-left:7px solid transparent}.map-layer.full-screen .map-fallback,.map-layer.full-screen .route-preview{height:642px}.map-callout.pickup-callout .callout-title{color:#10a64a}.map-callout.destination-callout .callout-title{color:#e6a206}
/* #endif */
</style>
