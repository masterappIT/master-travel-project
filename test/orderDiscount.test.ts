import assert from 'node:assert/strict'
import test from 'node:test'
import { sumOrderDiscounts } from '../src/utils/orderDiscount'

test('sums all discount lines to cents without including fares or surcharges', () => {
  assert.equal(sumOrderDiscounts([
    { type: 'DISTANCE_TIER', totalAmount: 1369.79 },
    { type: 'EXTRA', totalAmount: 117.65 },
    { type: 'DISCOUNT', totalAmount: -148.74 },
    { type: 'DISCOUNT', totalAmount: -103.53 }
  ]), 252.27)
})

test('handles no discount and a single discount', () => {
  assert.equal(sumOrderDiscounts([]), 0)
  assert.equal(sumOrderDiscounts([{ type: 'DISCOUNT', totalAmount: -0.29 }]), 0.29)
  assert.equal(sumOrderDiscounts([{ type: 'DISCOUNT', totalAmount: 0 }]), 0)
})

test('rounds individual fractional discount amounts to cents', () => {
  assert.equal(sumOrderDiscounts([
    { type: 'DISCOUNT', totalAmount: -0.1 },
    { type: 'DISCOUNT', totalAmount: -0.2 }
  ]), 0.3)
})
