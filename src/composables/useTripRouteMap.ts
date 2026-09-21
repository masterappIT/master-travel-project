import { computed, ref, watch, type Ref } from 'vue'
import { planDrivingRoute, type ClientTrip, type Coordinate } from '../services/api'

const FALLBACK_CENTER = { latitude: 22.308, longitude: 114.1719 }

export function useTripRouteMap(trip: Ref<ClientTrip | null>) {
  const routePoints = ref<Coordinate[]>([])
  const routeSummary = ref('')
  const centerTrigger = ref(0)
  let requestSequence = 0

  const origin = computed(() => trip.value?.originLatitude != null && trip.value.originLongitude != null
    ? { latitude: trip.value.originLatitude, longitude: trip.value.originLongitude } : null)
  const destination = computed(() => trip.value?.destinationLatitude != null && trip.value.destinationLongitude != null
    ? { latitude: trip.value.destinationLatitude, longitude: trip.value.destinationLongitude } : null)
  const latitude = computed(() => destination.value?.latitude ?? origin.value?.latitude ?? FALLBACK_CENTER.latitude)
  const longitude = computed(() => destination.value?.longitude ?? origin.value?.longitude ?? FALLBACK_CENTER.longitude)
  const markers = computed(() => {
    if (!origin.value || !destination.value) return []
    return [
      { id: 1, ...origin.value, title: '出發地', iconPath: '/static/home/route/origin.svg', width: 10, height: 18 },
      { id: 2, ...destination.value, title: '目的地', iconPath: '/static/home/route/destination.svg', width: 10, height: 15 }
    ]
  })
  const polyline = computed(() => routePoints.value.length > 1 ? [{ points: routePoints.value, color: '#285CFC', width: 6, arrowLine: true }] : [])

  const formatSummary = (distance: number, duration: number) => {
    const km = distance / 1000
    const minutes = Math.max(1, Math.round(duration / 60))
    return `共 ${km < 10 ? km.toFixed(1) : Math.round(km)} 公里 · 約 ${minutes >= 60 ? `${Math.floor(minutes / 60)} 小時${minutes % 60 ? ` ${minutes % 60} 分鐘` : ''}` : `${minutes} 分鐘`}`
  }
  const refresh = async () => {
    const current = trip.value
    const sequence = ++requestSequence
    routePoints.value = current?.routePoints?.filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) || []
    routeSummary.value = ''
    const hasStoredRoute = routePoints.value.length > 1
    if (hasStoredRoute && origin.value && destination.value) centerTrigger.value++
    if (!origin.value || !destination.value) { centerTrigger.value++; return }
    try {
      const result = await planDrivingRoute(origin.value, destination.value)
      if (sequence !== requestSequence || trip.value?.id !== current?.id) return
      if (!hasStoredRoute) routePoints.value = result.points
      routeSummary.value = formatSummary(result.distance, result.duration)
      centerTrigger.value++
    } catch { centerTrigger.value++ }
  }
  watch(() => [
    trip.value?.id,
    trip.value?.originLatitude,
    trip.value?.originLongitude,
    trip.value?.destinationLatitude,
    trip.value?.destinationLongitude,
    trip.value?.routePoints
  ], () => { void refresh() }, { immediate: true })
  return { latitude, longitude, markers, polyline, routeSummary, centerTrigger }
}
