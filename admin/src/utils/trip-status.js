export const PASSENGER_TRIP_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

export function getPassengerTripStatus(trip) {
  if (trip?.status === 'CANCELLED') return 'CANCELLED'
  if (trip?.status === 'COMPLETED') return 'COMPLETED'
  if (trip?.executionPhase === 'IN_PROGRESS') return 'IN_PROGRESS'
  if (trip?.status === 'CONFIRMED') return 'CONFIRMED'
  return 'PENDING'
}

export function getPassengerTripStatusLabel(trip, translateStatus) {
  return translateStatus(getPassengerTripStatus(trip))
}
