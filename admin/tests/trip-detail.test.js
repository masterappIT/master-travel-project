import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeTripDetail } from '../src/pages/trips/trips.actions.js'

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
