import assert from 'node:assert/strict'
import test from 'node:test'

import { createTripDetailController, normalizeTripDetail } from '../src/pages/trips/trip-detail.controller.js'

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((onResolve, onReject) => { resolve = onResolve; reject = onReject })
  return { promise, resolve, reject }
}

const ref = value => ({ value })
const createController = get => {
  const state = {
    selectedTrip: ref(null),
    loading: ref(false),
    error: ref(''),
    selectedId: ref('')
  }
  return {
    state,
    controller: createTripDetailController({
      tripsApi: { get },
      ...state,
      displayError: cause => cause.message
    })
  }
}

test('normalizes missing quote lines without changing other detail fields', () => {
  const detail = { id: 'trip-1', quote: { distanceKm: null, lines: null }, payment: { status: null } }

  assert.deepEqual(normalizeTripDetail(detail), {
    id: 'trip-1',
    quote: { distanceKm: null, lines: [] },
    payment: { status: null }
  })
  assert.equal(detail.quote.lines, null)
})

test('preserves valid quote lines and absent quotes', () => {
  const lines = [{ order: 1, label: 'Base fare' }]

  assert.strictEqual(normalizeTripDetail({ quote: { lines } }).quote.lines, lines)
  assert.deepEqual(normalizeTripDetail({ id: 'trip-2', quote: null }), { id: 'trip-2', quote: null })
})

test('ignores a detail response after the panel is closed', async () => {
  const request = deferred()
  const { controller, state } = createController(() => request.promise)

  const opening = controller.open({ id: 'trip-1', origin: '香港', destination: '廣州' })
  assert.deepEqual(state.selectedTrip.value, { id: 'trip-1', origin: '香港', destination: '廣州' })
  controller.close()
  request.resolve({ id: 'trip-1' })
  await opening

  assert.equal(state.selectedTrip.value, null)
  assert.equal(state.selectedId.value, '')
  assert.equal(state.loading.value, false)
})

test('only applies the latest detail request when switching orders', async () => {
  const first = deferred()
  const second = deferred()
  const { controller, state } = createController(id => id === 'trip-1' ? first.promise : second.promise)

  const openingFirst = controller.open({ id: 'trip-1' })
  const openingSecond = controller.open({ id: 'trip-2' })
  assert.deepEqual(state.selectedTrip.value, { id: 'trip-2' })
  assert.equal(state.loading.value, true)
  second.resolve({ id: 'trip-2' })
  await openingSecond
  first.resolve({ id: 'trip-1' })
  await openingFirst

  assert.deepEqual(state.selectedTrip.value, { id: 'trip-2', quote: undefined })
  assert.equal(state.selectedId.value, 'trip-2')
  assert.equal(state.error.value, '')
})

test('retry clears the previous error and loads the same order', async () => {
  let attempts = 0
  const { controller, state } = createController(async id => {
    attempts += 1
    if (attempts === 1) throw new Error('temporary failure')
    return { id }
  })

  await controller.open({ id: 'trip-1', origin: '香港' })
  assert.equal(state.error.value, 'temporary failure')
  assert.deepEqual(state.selectedTrip.value, { id: 'trip-1', origin: '香港' })

  const retrying = controller.retry()
  assert.deepEqual(state.selectedTrip.value, { id: 'trip-1', origin: '香港' })
  await retrying
  assert.deepEqual(state.selectedTrip.value, { id: 'trip-1', quote: undefined })
  assert.equal(state.error.value, '')
  assert.equal(state.loading.value, false)
})
