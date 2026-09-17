import type { ClientTrip } from '../services/api'

export const ASSIGNMENT_COUNTDOWN_SECONDS = 3 * 60 * 60

export const getAssignmentCountdownSeconds = (trip: ClientTrip | null | undefined) => {
  if (!trip) return ASSIGNMENT_COUNTDOWN_SECONDS
  if (trip.assignmentExpired) return 0
  const expiresAt = new Date(trip.assignmentExpiresAt).getTime()
  if (!Number.isFinite(expiresAt)) return ASSIGNMENT_COUNTDOWN_SECONDS
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
}

export const formatAssignmentCountdown = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
