import type { ClientTrip } from '../services/api'

const pendingExecutionPhases = new Set<ClientTrip['executionPhase']>([
  'WAITING_DRIVER',
  'DRIVER_ASSIGNED',
  'IN_PROGRESS',
])

export function isPendingTrip(trip: ClientTrip): boolean {
  return trip.status === 'CONFIRMED' && pendingExecutionPhases.has(trip.executionPhase)
}

export function selectNextPendingTrip(trips: ClientTrip[], excludedTripId?: string): ClientTrip | undefined {
  return trips
    .filter(trip => trip.id !== excludedTripId && isPendingTrip(trip))
    .sort((left, right) => {
      const scheduledDifference = Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt)
      if (Number.isFinite(scheduledDifference) && scheduledDifference !== 0) return scheduledDifference
      return left.id.localeCompare(right.id)
    })[0]
}
