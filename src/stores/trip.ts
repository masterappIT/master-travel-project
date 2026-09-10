import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { FareQuote } from '../services/api'
import type { TripDraft, ServiceMode } from '../types/trip'
import type { Vehicle } from '../types/vehicle'

const createTripDraft = (serviceMode: ServiceMode): TripDraft => ({
  serviceMode,
  pricingType: serviceMode === 'cross-border' ? 'distance' : 'fixed-charter',
  tripType: serviceMode === 'cross-border' ? 'one-way' : undefined,
  route: { origin: '', destination: '', stops: [] },
  departureTime: '',
  extras: []
})

export const useTripStore = defineStore('trip', () => {
  const serviceMode = ref<ServiceMode>('cross-border')
  const drafts = ref<Record<ServiceMode, TripDraft>>({
    'cross-border': createTripDraft('cross-border'),
    'business-charter': createTripDraft('business-charter')
  })
  const chosenVehicle = ref<Vehicle | null>(null)
  const fareQuotes = ref<Record<string, FareQuote>>({})

  const activeDraft = computed(() => drafts.value[serviceMode.value])
  const activeTrip = computed(() => {
    const { origin, destination } = activeDraft.value.route
    return origin || destination ? { origin, destination } : null
  })
  const departureTime = computed(() => activeDraft.value.departureTime)
  const selectedFareQuote = computed(() => chosenVehicle.value ? fareQuotes.value[chosenVehicle.value.id] || null : null)

  function setChosenVehicle(vehicle: Vehicle) {
    chosenVehicle.value = vehicle
    activeDraft.value.chosenVehicleId = vehicle.id
    activeDraft.value.estimatedFare = fareQuotes.value[vehicle.id]?.total
  }

  function setRoute(origin: string, destination: string) {
    const routeChanged = activeDraft.value.route.origin !== origin || activeDraft.value.route.destination !== destination
    activeDraft.value.route.origin = origin
    activeDraft.value.route.destination = destination
    if (routeChanged) clearRouteDistance()
  }

  function setRouteDistance(distanceMeters: number, durationSeconds?: number) {
    if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
      clearRouteDistance()
      return
    }
    if (activeDraft.value.distanceMeters !== distanceMeters) {
      fareQuotes.value = {}
      activeDraft.value.estimatedFare = undefined
    }
    activeDraft.value.distanceMeters = distanceMeters
    activeDraft.value.distanceKm = distanceMeters / 1000
    activeDraft.value.durationHours = durationSeconds !== undefined && Number.isFinite(durationSeconds) && durationSeconds >= 0
      ? durationSeconds / 3600
      : undefined
  }

  function setFareQuotes(quotes: FareQuote[]) {
    fareQuotes.value = Object.fromEntries(quotes
      .filter((quote): quote is FareQuote & { vehicle: NonNullable<FareQuote['vehicle']> } => quote.vehicle !== null)
      .map(quote => [quote.vehicle.id, quote]))
    activeDraft.value.estimatedFare = chosenVehicle.value ? fareQuotes.value[chosenVehicle.value.id]?.total : undefined
  }

  function clearRouteDistance() {
    activeDraft.value.distanceMeters = undefined
    activeDraft.value.distanceKm = undefined
    activeDraft.value.durationHours = undefined
    fareQuotes.value = {}
    activeDraft.value.estimatedFare = undefined
  }

  function setDepartureTime(value: string) {
    activeDraft.value.departureTime = value
  }

  function updateActiveDraft(values: Partial<TripDraft>) {
    const draft = activeDraft.value
    drafts.value[serviceMode.value] = {
      ...draft,
      ...values,
      serviceMode: draft.serviceMode,
      pricingType: draft.pricingType
    }
  }

  function resetDraft(mode: ServiceMode = serviceMode.value) {
    drafts.value[mode] = createTripDraft(mode)
    if (mode === serviceMode.value) {
      chosenVehicle.value = null
      fareQuotes.value = {}
    }
  }

  function switchServiceMode(mode: ServiceMode) {
    if (mode === serviceMode.value) return
    resetDraft(serviceMode.value)
    chosenVehicle.value = null
    serviceMode.value = mode
  }

  return {
    serviceMode,
    drafts,
    activeDraft,
    activeTrip,
    departureTime,
    chosenVehicle,
    fareQuotes,
    selectedFareQuote,
    setRoute,
    setRouteDistance,
    setDepartureTime,
    setChosenVehicle,
    setFareQuotes,
    clearRouteDistance,
    updateActiveDraft,
    resetDraft,
    switchServiceMode
  }
})
