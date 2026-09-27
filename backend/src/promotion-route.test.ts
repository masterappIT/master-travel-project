import assert from 'node:assert/strict'
import { test } from 'node:test'
import { promotionMatchesRoute } from './promotion-route'

const promotion = {
  originRegion: '香港',
  originCity: null,
  destinationRegion: '大陸',
  destinationCity: '珠海市',
  bidirectional: true,
}

test('bidirectional promotion matches the configured route in either direction', () => {
  assert.equal(promotionMatchesRoute(promotion, {
    originRegion: '香港', originCity: '香港', destinationRegion: '大陸', destinationCity: '珠海市'
  }), true)
  assert.equal(promotionMatchesRoute(promotion, {
    originRegion: '大陸', originCity: '珠海市', destinationRegion: '香港', destinationCity: '香港'
  }), true)
})

test('one-way promotion does not match the reverse route', () => {
  assert.equal(promotionMatchesRoute({ ...promotion, bidirectional: false }, {
    originRegion: '大陸', originCity: '珠海市', destinationRegion: '香港', destinationCity: '香港'
  }), false)
})

test('does not match a different route and preserves partial route constraints when reversed', () => {
  assert.equal(promotionMatchesRoute(promotion, {
    originRegion: '香港', originCity: '香港', destinationRegion: '大陸', destinationCity: '深圳市'
  }), false)
  assert.equal(promotionMatchesRoute({ ...promotion, originCity: '香港' }, {
    originRegion: '大陸', originCity: '珠海市', destinationRegion: '香港', destinationCity: '香港'
  }), true)
  assert.equal(promotionMatchesRoute({ ...promotion, destinationCity: null }, {
    originRegion: '大陸', originCity: '任何城市', destinationRegion: '香港', destinationCity: '香港'
  }), true)
})
