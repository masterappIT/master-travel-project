<template>
  <view class="trip-route-map" :style="{ height: `${mapHeight}px` }" aria-label="行程路線地圖">
    <!-- #ifdef APP-PLUS || MP-WEIXIN || MP-TOUTIAO -->
    <map :id="mapId" class="native-map" :latitude="mapCenter.latitude" :longitude="mapCenter.longitude" :scale="mapScale" :markers="nativeMarkers" :polyline="nativePolyline" show-location />
    <cover-view v-if="routePoints.length > 1" class="native-callout pickup-callout">
      <cover-view class="callout-title">上車位置</cover-view>
      <cover-view class="callout-value">{{ pickupLabel || '目前定位' }}</cover-view>
    </cover-view>
    <cover-view v-if="routePoints.length > 1 && routeSummary" class="native-callout destination-callout">
      <cover-view class="callout-title">目的地 · 行程資訊</cover-view>
      <cover-view class="callout-value">{{ destinationLabel || '目的地' }}</cover-view>
      <cover-view class="callout-summary">{{ routeSummary }}</cover-view>
    </cover-view>
    <!-- #endif -->
    <!-- #ifdef H5 -->
    <view class="map-fallback">
      <svg v-if="projectedRoute" class="route-preview" :viewBox="`0 0 430 ${mapHeight}`" preserveAspectRatio="none"><polyline :points="projectedRoute" fill="none" stroke="#285CFC" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      <view v-if="projectedPoints" class="map-pin pickup-pin" :style="pinStyle(projectedPoints.origin)" />
      <view v-if="projectedPoints" class="map-pin destination-pin" :style="pinStyle(projectedPoints.destination)" />
      <view v-if="projectedPoints" class="map-callout pickup-callout"><text class="callout-title">上車位置</text><text class="callout-value">{{ pickupLabel || '目前定位' }}</text></view>
      <view v-if="projectedPoints && routeSummary" class="map-callout destination-callout"><text class="callout-title">目的地 · 行程資訊</text><text class="callout-value">{{ destinationLabel || '目的地' }}</text><text class="callout-summary">{{ routeSummary }}</text></view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Point = { latitude: number; longitude: number }
type Marker = { id: number; latitude: number; longitude: number; title?: string; iconPath?: string; width?: number; height?: number }
type Line = { points: Point[]; color: string; width: number; arrowLine?: boolean }
const props = withDefaults(defineProps<{ latitude: number; longitude: number; markers?: Marker[]; polyline?: Line[]; pickupLabel?: string; destinationLabel?: string; routeSummary?: string; mapId?: string; mapHeight?: number; safeTop?: number; safeBottom?: number }>(), { mapId: 'trip-route-map', mapHeight: 642, safeTop: 42, safeBottom: 230 })
const routePoints = computed(() => (props.polyline?.[0]?.points || []).filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)))
const MAP_WIDTH = 430
const TILE_SIZE = 256
const ROUTE_SIDE_INSET = 50
const ROUTE_VERTICAL_INSET = 20
const MIN_SCALE = 5
const MAX_SCALE = 18

const clampLatitude = (latitude: number) => Math.max(-85.05112878, Math.min(85.05112878, latitude))
const longitudeToWorldX = (longitude: number) => (longitude + 180) / 360
const latitudeToWorldY = (latitude: number) => {
  const radians = clampLatitude(latitude) * Math.PI / 180
  return (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2
}
const worldYToLatitude = (worldY: number) => {
  const mercator = Math.PI * (1 - 2 * worldY)
  return Math.atan(Math.sinh(mercator)) * 180 / Math.PI
}
const worldXToLongitude = (worldX: number) => worldX * 360 - 180

const routeBounds = computed(() => {
  if (routePoints.value.length < 2) return null
  const worldXs = routePoints.value.map(point => longitudeToWorldX(point.longitude))
  const worldYs = routePoints.value.map(point => latitudeToWorldY(point.latitude))
  return {
    minX: Math.min(...worldXs),
    maxX: Math.max(...worldXs),
    minY: Math.min(...worldYs),
    maxY: Math.max(...worldYs),
  }
})

const mapViewport = computed(() => {
  const bounds = routeBounds.value
  if (!bounds) return { center: { latitude: props.latitude, longitude: props.longitude }, scale: 13 }

  const safeBottomEdge = Math.max(props.safeTop + ROUTE_VERTICAL_INSET * 2 + 1, props.mapHeight - props.safeBottom)
  const usableWidth = MAP_WIDTH - ROUTE_SIDE_INSET * 2
  const usableHeight = safeBottomEdge - props.safeTop - ROUTE_VERTICAL_INSET * 2
  const spanX = Math.max(bounds.maxX - bounds.minX, 1 / (TILE_SIZE * 2 ** MAX_SCALE))
  const spanY = Math.max(bounds.maxY - bounds.minY, 1 / (TILE_SIZE * 2 ** MAX_SCALE))
  const widthScale = Math.log2(usableWidth / (TILE_SIZE * spanX))
  const heightScale = Math.log2(usableHeight / (TILE_SIZE * spanY))
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.floor(Math.min(widthScale, heightScale))))
  const worldSize = TILE_SIZE * 2 ** scale
  const routeCenterX = (bounds.minX + bounds.maxX) / 2
  const routeCenterY = (bounds.minY + bounds.maxY) / 2
  const safeCenterY = (props.safeTop + safeBottomEdge) / 2
  const mapCenterY = routeCenterY + (props.mapHeight / 2 - safeCenterY) / worldSize

  return {
    center: {
      latitude: worldYToLatitude(mapCenterY),
      longitude: worldXToLongitude(routeCenterX),
    },
    scale,
  }
})
const mapCenter = computed(() => mapViewport.value.center)
const mapScale = computed(() => mapViewport.value.scale)
const nativeMarkers = computed(() => (props.markers || []).filter(marker => Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude)).map(marker => ({ ...marker, width: marker.width || 10, height: marker.height || (marker.id === 2 ? 15 : 18) })))
const nativePolyline = computed(() => (props.polyline || []).map(line => ({ ...line, points: line.points.filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) })).filter(line => line.points.length > 1))
const bounds = computed(() => {
  if (routePoints.value.length < 2) return null
  const latitudes = routePoints.value.map(point => point.latitude); const longitudes = routePoints.value.map(point => point.longitude)
  return { minLat: Math.min(...latitudes), maxLat: Math.max(...latitudes), minLng: Math.min(...longitudes), maxLng: Math.max(...longitudes) }
})
const project = (point: Point) => {
  const b = bounds.value!
  const width = MAP_WIDTH - ROUTE_SIDE_INSET * 2
  const top = props.safeTop + ROUTE_VERTICAL_INSET
  const bottom = Math.max(top + 1, props.mapHeight - props.safeBottom - ROUTE_VERTICAL_INSET)
  const height = bottom - top
  return {
    x: ROUTE_SIDE_INSET + ((point.longitude - b.minLng) / Math.max(0.001, b.maxLng - b.minLng)) * width,
    y: top + ((b.maxLat - point.latitude) / Math.max(0.001, b.maxLat - b.minLat)) * height,
  }
}
const projectedPoints = computed(() => bounds.value ? { origin: project(routePoints.value[0]), destination: project(routePoints.value[routePoints.value.length - 1]) } : null)
const projectedRoute = computed(() => bounds.value ? routePoints.value.map(point => { const p = project(point); return `${p.x},${p.y}` }).join(' ') : '')
const pinStyle = (point: { x: number; y: number }) => ({ left: `${point.x}px`, top: `${point.y}px` })
</script>

<style scoped>
.trip-route-map{position:absolute;left:0;top:0;width:430px;z-index:0;overflow:hidden;background:#edf0f2}.native-map{width:430px;height:100%}.native-callout{position:absolute;z-index:2;width:150px;padding:8px 10px;box-sizing:border-box;border-radius:9px;background:#fff;color:#38434a;text-align:center}.native-callout.pickup-callout{left:245px;top:125px}.native-callout.destination-callout{left:35px;top:110px;width:200px}.callout-title{font-size:11px;line-height:16px}.callout-value{font-size:13px;font-weight:700;line-height:18px}.callout-summary{font-size:12px;line-height:17px}.map-fallback{position:absolute;inset:0;background:linear-gradient(145deg,#e6edf0,#cbd8dc)}.route-preview{position:absolute;inset:0;width:430px;height:100%}.map-pin{position:absolute;z-index:1;width:18px;height:18px;box-sizing:border-box;border:4px solid #fff;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 2px 6px rgba(40,67,88,.35)}.pickup-pin{background:#10a64a}.destination-pin{background:#ffc44f}.map-callout{position:absolute;z-index:2;display:flex;width:150px;padding:8px 10px;box-sizing:border-box;flex-direction:column;border-radius:9px;background:#fff;box-shadow:0 3px 12px rgba(40,67,88,.24);color:#38434a}.map-callout.pickup-callout{right:35px;top:125px}.map-callout.destination-callout{left:35px;top:110px}.map-callout .callout-title,.map-callout .callout-value,.map-callout .callout-summary{display:block;text-align:center}
</style>
