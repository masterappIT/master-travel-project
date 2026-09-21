import type { ClientTrip } from '../services/api'

export function isPendingTrip(trip: ClientTrip): boolean {
  return trip.status === 'CONFIRMED'
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
