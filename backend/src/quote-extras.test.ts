import assert from 'node:assert/strict'
import { test } from 'node:test'
import { billableExtraSelections, withinImmediateWindow } from './quote-extras'

const extras = [
  { id: 'immediate', triggerType: 'IMMEDIATE', requiredForImmediate: true },
  { id: 'night', triggerType: 'NIGHT', requiredForImmediate: false },
  { id: 'weather', triggerType: 'WEATHER', requiredForImmediate: false },
  { id: 'luggage', triggerType: 'NONE', requiredForImmediate: false }
]

test('successive quotes discard a stale automatic selection outside the 90-minute window', () => {
  const stale = [{ id: 'immediate', quantity: 3 }, { id: 'luggage', quantity: 2 }]
  assert.deepEqual(billableExtraSelections(stale, extras, ['immediate']), [
    { id: 'luggage', quantity: 2 }, { id: 'immediate', quantity: 1 }
  ])
  assert.deepEqual(billableExtraSelections(stale, extras, []), [{ id: 'luggage', quantity: 2 }])
})

test('the configured 90-minute boundary determines automatic billing', () => {
  const now = new Date('2026-01-01T00:00:00.000Z')
  const quoteAt = (minutes: number) => billableExtraSelections(
    [{ id: 'immediate', quantity: 1 }], extras,
    withinImmediateWindow(new Date(now.getTime() + minutes * 60000), now, 90) ? ['immediate'] : []
  )
  assert.deepEqual(quoteAt(90), [{ id: 'immediate', quantity: 1 }])
  assert.deepEqual(quoteAt(91), [])
  assert.deepEqual(quoteAt(60), [{ id: 'immediate', quantity: 1 }])
  assert.deepEqual(quoteAt(180), [])
})

test('automatic selections are added only when triggered, regardless of quote order', () => {
  assert.deepEqual(billableExtraSelections([], extras, []), [])
  assert.deepEqual(billableExtraSelections([], extras, ['immediate']), [{ id: 'immediate', quantity: 1 }])
  assert.deepEqual(billableExtraSelections([{ id: 'night', quantity: 1 }, { id: 'weather', quantity: 1 }], extras, []), [])
  assert.deepEqual(billableExtraSelections([{ id: 'luggage', quantity: 2 }], extras, ['weather']), [
    { id: 'luggage', quantity: 2 }, { id: 'weather', quantity: 1 }
  ])
})
