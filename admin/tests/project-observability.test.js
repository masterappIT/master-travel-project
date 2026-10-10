import assert from 'node:assert/strict'
import test from 'node:test'
import { createRenderer, h, nextTick, provide, ref } from 'vue'
import { ProjectObservabilityPage } from '../src/pages/project-observability/ProjectObservabilityPage.js'

const renderer = createRenderer({
  createElement: type => ({ type, children: [] }),
  createText: text => ({ text }),
  createComment: text => ({ comment: text }),
  setText: (node, text) => { node.text = text },
  setElementText: (node, text) => { node.text = text },
  patchProp: () => {},
  parentNode: node => node.parent,
  nextSibling: () => null,
  insert: (node, parent) => { node.parent = parent; parent.children.push(node) },
  remove: () => {},
  insertStaticContent: (content, parent) => { const node = { content, parent }; parent.children.push(node); return [node, node] }
})

function mountTelemetry({ superAdmin = false, api = async () => ({ users: [] }) } = {}) {
  const original = globalThis.EventSource
  const streams = []
  globalThis.EventSource = class {
    constructor(url) { this.url = url; streams.push(this) }
    close() { this.closed = true }
    emit(data) { this.onmessage({ data: JSON.stringify(data) }) }
  }
  let page
  const view = ref('project-observability')
  const isSuperAdministrator = ref(superAdmin)
  const app = renderer.createApp({
    setup() {
      provide('adminProjectObservabilityContext', { baseUrl: '/api', view, isSuperAdministrator, api })
      return () => h(ProjectObservabilityPage, { ref: value => { page = value } })
    }
  })
  app.mount({ children: [] })
  return { streams, view, isSuperAdministrator, get page() { return page }, close() { app.unmount(); globalThis.EventSource = original } }
}

test('identity detail is requested only for super administrators and clears after navigation', async () => {
  let calls = 0
  const user = { role: 'passenger', userId: 'u1', phone: '+852 12345678', region: '香港', active: true, connected: false }
  const view = mountTelemetry({ api: async () => { calls += 1; return { users: [user] } } })
  try {
    await nextTick()
    assert.equal(calls, 0)
    view.isSuperAdministrator.value = true
    await nextTick()
    await nextTick()
    assert.equal(calls, 1)
    assert.equal(view.page.identityGroups[0].users[0].phone, user.phone)
    view.view.value = 'dashboard'
    await nextTick()
    assert.equal(view.page.identityGroups[0].users.length, 0)
  } finally { view.close() }
})

test('health requests stay out of the live feed while region snapshot retains their counts', async () => {
  const view = mountTelemetry()
  try {
    const stream = view.streams[0]
    stream.emit({ type: 'request:end', source: 'backend', path: '/health/ready', category: 'health', status: 'error', httpStatus: 503 })
    stream.emit({ type: 'region:snapshot', day: '2026-10-08', checkedAt: new Date().toISOString(), stats: [{ region: '香港', source: 'backend', eventCount: 2 }], writeStatus: 'ok' })
    await nextTick()
    assert.equal(view.page.events.length, 0)
    assert.equal(view.page.anomalies.length, 0)
    assert.equal(view.page.nodeStats.backend, 0)
    assert.equal(view.page.regionStats[0].count, 2)
    assert.equal(view.page.regionDay, '2026-10-08')
  } finally { view.close() }
})

test('401 and 5xx anomalies have distinct severity and repeat counts', async () => {
  const view = mountTelemetry()
  try {
    const stream = view.streams[0]
    const base = { type: 'request:end', source: 'driver', method: 'GET', path: '/driver/trips', status: 'error' }
    stream.emit({ ...base, httpStatus: 401, timestamp: 'first' })
    stream.emit({ ...base, httpStatus: 401, timestamp: 'second' })
    stream.emit({ ...base, httpStatus: 503, timestamp: 'third' })
    await nextTick()
    assert.equal(view.page.anomalies.length, 2)
    assert.equal(view.page.anomalies[0].severity, 'critical')
    assert.equal(view.page.anomalies[1].severity, 'warning')
    assert.equal(view.page.anomalies[1].count, 2)
    assert.equal(view.page.anomalies[1].timestamp, 'second')
  } finally { view.close() }
})

test('408 and 429 are critical while ordinary 4xx remain warnings', async () => {
  const view = mountTelemetry()
  try {
    const stream = view.streams[0]
    const base = { type: 'request:end', source: 'backend', method: 'GET', path: '/limited', status: 'error' }
    for (const httpStatus of [400, 408, 429, 302, 500]) stream.emit({ ...base, httpStatus })
    await nextTick()
    assert.deepEqual(view.page.anomalies.map(item => [item.httpStatus, item.severity]), [[500, 'critical'], [302, 'critical'], [429, 'critical'], [408, 'critical'], [400, 'warning']])
  } finally { view.close() }
})

test('failed region read retains same-day data but discards previous-day data', async () => {
  const view = mountTelemetry()
  try {
    const stream = view.streams[0]
    stream.emit({ type: 'region:snapshot', day: '2026-10-08', stats: [{ region: '香港', source: 'backend', eventCount: 3 }] })
    stream.emit({ type: 'region:read-status', status: 'error', day: '2026-10-08', checkedAt: new Date().toISOString() })
    await nextTick()
    assert.equal(view.page.regionStats[0].count, 3)
    assert.equal(view.page.regionReadStatus, 'error')
    stream.emit({ type: 'region:read-status', status: 'error', day: '2026-10-09', checkedAt: new Date().toISOString() })
    await nextTick()
    assert.equal(view.page.regionDay, '2026-10-09')
    assert.equal(view.page.regionStats.length, 0)
  } finally { view.close() }
})

test('older snapshots and read failures cannot roll back a newer write result', async () => {
  const view = mountTelemetry()
  try {
    const stream = view.streams[0]
    stream.emit({ type: 'region:write-status', status: 'error', checkedAt: '2026-10-08T12:00:01.000Z', writeVersion: 2 })
    stream.emit({ type: 'region:snapshot', day: '2026-10-08', stats: [{ region: '香港', source: 'backend', eventCount: 4 }], writeStatus: 'ok', writeCheckedAt: '2026-10-08T12:00:00.000Z', writeVersion: 1 })
    stream.emit({ type: 'region:read-status', status: 'error', day: '2026-10-08', writeStatus: 'ok', writeCheckedAt: '2026-10-08T12:00:00.000Z', writeVersion: 1 })
    await nextTick()
    assert.equal(view.page.regionStats[0].count, 4)
    assert.equal(view.page.regionReadStatus, 'error')
    assert.equal(view.page.regionWriteStatus, 'error')
    assert.equal(view.page.regionWriteCheckedAt, '2026-10-08T12:00:01.000Z')
  } finally { view.close() }
})

test('legacy snapshots without a write timestamp cannot roll back a direct write event', async () => {
  const view = mountTelemetry()
  try {
    const stream = view.streams[0]
    stream.emit({ type: 'region:snapshot', day: '2026-10-08', stats: [], writeStatus: 'pending' })
    stream.emit({ type: 'region:write-status', status: 'ok', checkedAt: '2026-10-08T12:00:01.000Z' })
    stream.emit({ type: 'region:snapshot', day: '2026-10-08', stats: [{ region: '香港', source: 'backend', eventCount: 5 }], writeStatus: 'pending' })
    stream.emit({ type: 'region:read-status', status: 'error', day: '2026-10-08', writeStatus: 'pending' })
    await nextTick()
    assert.equal(view.page.regionStats[0].count, 5)
    assert.equal(view.page.regionWriteStatus, 'ok')
    assert.equal(view.page.regionWriteCheckedAt, '2026-10-08T12:00:01.000Z')
  } finally { view.close() }
})

test('reconnection resets region status until a fresh day snapshot arrives', async () => {
  const view = mountTelemetry()
  try {
    view.streams[0].emit({ type: 'region:snapshot', day: '2026-10-08', stats: [{ region: '香港', source: 'backend', eventCount: 3 }], writeStatus: 'ok' })
    view.streams[0].onerror()
    await nextTick()
    assert.equal(view.page.regionReadStatus, 'pending')
    assert.equal(view.page.regionWriteStatus, 'pending')
    assert.equal(view.page.regionStats.length, 0)
    assert.equal(view.page.regionDay, '')
    view.streams[0].emit({ type: 'region:snapshot', day: '2026-10-09', stats: [], writeStatus: 'error' })
    await nextTick()
    assert.equal(view.page.regionDay, '2026-10-09')
    assert.equal(view.page.regionStats.length, 0)
    assert.equal(view.page.regionWriteStatus, 'error')
  } finally { view.close() }
})
