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
let transportOpen = false
let pollTicks = 0
let lastActivityAt = 0
const STALE_AFTER_MS = 70000

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
  transportOpen = false
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
    const source = new EventSource(`${apiUrl}/notifications/events?ticket=${encodeURIComponent(ticket)}`)
    eventSource = source
    source.onopen = () => { if (eventSource === source) { transportOpen = true; lastActivityAt = Date.now() } }
    source.addEventListener('heartbeat', () => { if (eventSource === source) lastActivityAt = Date.now() })
    eventSource.onmessage = () => { lastActivityAt = Date.now(); emitChanged() }
    eventSource.onerror = scheduleReconnect
    // #endif
    // #ifndef H5
    const wsUrl = apiUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
    const task = uni.connectSocket({
      url: `${wsUrl}/notifications/socket?ticket=${encodeURIComponent(ticket)}&heartbeat=1`,
      complete: () => undefined,
    })
    socket = task
    task.onOpen(() => { if (socket === task) { transportOpen = true; lastActivityAt = Date.now() } })
    socket.onMessage((message) => {
      lastActivityAt = Date.now()
      if (typeof message.data === 'string' && message.data.includes('"type":"heartbeat"')) return
      emitChanged()
    })
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
  // Polling is the fallback for a dropped stream; with the stream open it only runs once a minute.
  if (!pollTimer) pollTimer = setInterval(() => {
    // The server sends a heartbeat every 25 seconds; a silent stream is dead even if it never reported closing.
    if (transportOpen && Date.now() - lastActivityAt > STALE_AFTER_MS) scheduleReconnect()
    if (!transportOpen || ++pollTicks % 6 === 0) emitChanged()
  }, 10000)
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
