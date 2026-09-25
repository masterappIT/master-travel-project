import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCalendarDays, parseDateValue } from '../src/components/AdminDatePicker.js'

test('parses valid local calendar dates without timezone conversion', () => {
  const date = parseDateValue('2026-09-25')

  assert.equal(date.getFullYear(), 2026)
  assert.equal(date.getMonth(), 8)
  assert.equal(date.getDate(), 25)
})

test('rejects invalid and impossible date values', () => {
  assert.equal(parseDateValue(''), null)
  assert.equal(parseDateValue('2026-02-30'), null)
  assert.equal(parseDateValue('25/09/2026'), null)
})

test('builds a six-week Sunday-first calendar grid', () => {
  const days = buildCalendarDays(2026, 8)

  assert.equal(days.length, 42)
  assert.equal(days[0].value, '2026-08-30')
  assert.equal(days.at(-1).value, '2026-10-10')
  assert.equal(days.find(day => day.value === '2026-09-01').currentMonth, true)
  assert.equal(days.find(day => day.value === '2026-10-01').currentMonth, false)
})
