import { API_BASE_URL, notificationEventTicket } from '../services/api'
import { getAuthToken, isAuthenticated, subscribeAuthUser } from './auth'

type NotificationListener = () => void

const listeners = new Set<NotificationListener>()
let socket: UniApp.SocketTask | undefined
let eventSource: EventSource | undefined
let reconnectTimer: ReturnType<typeof setTimeout> | undefined
let pollTimer: ReturnType<typeof setInterval> | undefined
let active = false
let connecting = false

const emitChanged = () => listeners.forEach((listener) => listener())

const absoluteApiUrl = () => {
  // #ifdef H5
  return new URL(API_BASE_URL, window.location.origin).toString().replace(/\/$/, '')
  // #endif
  return API_BASE_URL.replace(/\/$/, '')
}

const scheduleReconnect = () => {
  disconnectTransport()
  if (!active || !isAuthenticated()) return
  reconnectTimer = setTimeout(() => { void connect() }, 5000)
}

const disconnectTransport = () => {
  eventSource?.close()
  eventSource = undefined
  socket?.close({ reason: 'notification stream stopped' })
  socket = undefined
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = undefined
  connecting = false
}

const connect = async () => {
  if (!active || connecting || !isAuthenticated() || !getAuthToken()) return
  connecting = true
  try {
    const { ticket } = await notificationEventTicket()
    if (!active || !isAuthenticated()) return
    const apiUrl = absoluteApiUrl()
    // #ifdef H5
    eventSource = new EventSource(`${apiUrl}/notifications/events?ticket=${encodeURIComponent(ticket)}`)
    eventSource.onmessage = emitChanged
    eventSource.onerror = scheduleReconnect
    // #endif
    // #ifndef H5
    const wsUrl = apiUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
    socket = uni.connectSocket({
      url: `${wsUrl}/notifications/socket?ticket=${encodeURIComponent(ticket)}`,
      complete: () => undefined,
    })
    socket.onMessage(emitChanged)
    socket.onError(scheduleReconnect)
    socket.onClose(scheduleReconnect)
    // #endif
  } catch {
    scheduleReconnect()
  } finally {
    connecting = false
  }
}

export const startNotificationRealtime = () => {
  active = true
  emitChanged()
  if (!pollTimer) pollTimer = setInterval(emitChanged, 30000)
  void connect()
}

export const stopNotificationRealtime = () => {
  active = false
  disconnectTransport()
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = undefined
}

export const subscribeNotificationChanges = (listener: NotificationListener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

subscribeAuthUser((user) => {
  if (!user) stopNotificationRealtime()
  else if (active) {
    disconnectTransport()
    emitChanged()
    void connect()
  }
})
