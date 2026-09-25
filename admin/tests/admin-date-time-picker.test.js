import assert from 'node:assert/strict'
import test from 'node:test'

import { formatDateTimeValue, parseDateTimeValue } from '../src/components/AdminDateTimePicker.js'

test('parses the existing datetime-local value contract', () => {
  assert.deepEqual(parseDateTimeValue('2026-09-25T15:28'), { date: '2026-09-25', hour: 15, minute: 28 })
})

test('rejects malformed or impossible date-time values', () => {
  assert.equal(parseDateTimeValue(''), null)
  assert.equal(parseDateTimeValue('2026-02-30T12:00'), null)
  assert.equal(parseDateTimeValue('2026-09-25T24:00'), null)
  assert.equal(parseDateTimeValue('2026-09-25 12:00'), null)
})

test('formats values without changing the API payload shape', () => {
  assert.equal(formatDateTimeValue('2026-09-25', 5, 7), '2026-09-25T05:07')
  assert.equal(formatDateTimeValue('2026-02-30', 5, 7), '')
})
